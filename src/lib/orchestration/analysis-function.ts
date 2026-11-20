import "server-only";

import { inngest } from "@/lib/inngest/client";
import { estimateOpenAICostUsd } from "@/lib/ai/cost";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPublicIssueComments } from "@/lib/github/public-api";
import { makeEvidenceCatalog, runDocumentationAgent, runIssueAnalyst, runPriorityAgent, runRecommendations, runReport } from "@/lib/agents/run";
import { documentEvidenceSegments, retrieveRelevantChunks } from "@/lib/documents/retrieval";
import type { PublicGitHubComment, PublicGitHubIssue } from "@/lib/github/schemas";

type AnalysisEvent = { data: { executionId: string; ownerId: string; projectId: string } };

export const analyzeIssuesFunction = inngest.createFunction(
  { id: "analyze-project-issues", retries: 0, triggers: [{ event: "flowpilot/analysis.requested" }] },
  async ({ event, step }) => {
    const { executionId, ownerId, projectId } = (event as unknown as AnalysisEvent).data;
    const db = createSupabaseAdminClient();
    if (!db) throw new Error("Supabase admin configuration is missing.");

    const executionResult = await db.from("agent_executions").select("request_text, issue_ids, status, started_at").eq("id", executionId).eq("owner_id", ownerId).eq("project_id", projectId).single();
    if (executionResult.error || !executionResult.data) throw new Error("Execution was not found.");
    const execution = executionResult.data;
    if (execution.status !== "queued") return { skipped: true };
    const runStartedAt = execution.started_at ?? new Date().toISOString();
    await db.from("agent_executions").update({ status: "running", started_at: runStartedAt }).eq("id", executionId);

    const runStep = async (key: string, agentName: string, sequence: number, input: unknown, fn: () => Promise<{ value: unknown; model: string; usage: { inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null }; durationMs: number }>) => {
      const started = new Date().toISOString();
      await db.from("agent_steps").update({ status: "running", input, started_at: started, error_code: null, error_message: null }).eq("execution_id", executionId).eq("step_key", key);
      try {
        const result = await fn();
        const evidence: unknown[] = [];
        const collectEvidence = (value: unknown) => {
          if (Array.isArray(value)) { value.forEach(collectEvidence); return; }
          if (!value || typeof value !== "object") return;
          for (const [field, child] of Object.entries(value)) {
            if (field === "evidence" && Array.isArray(child)) evidence.push(...child);
            else collectEvidence(child);
          }
        };
        collectEvidence(result.value);
        await db.from("agent_steps").update({ status: "completed", output: result.value, evidence, model_name: result.model, prompt_version: "v1", input_tokens: result.usage.inputTokens, output_tokens: result.usage.outputTokens, duration_ms: result.durationMs, finished_at: new Date().toISOString() }).eq("execution_id", executionId).eq("step_key", key);
        return result;
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String(error.code) : "agent_failed";
        await db.from("agent_steps").update({ status: "failed", error_code: code.slice(0, 80), error_message: "This agent step did not complete.", finished_at: new Date().toISOString() }).eq("execution_id", executionId).eq("step_key", key);
        throw error;
      }
    };

    try {
      const fetched = await step.run("load-issues", async () => {
        const { data, error } = await db.from("issues").select("id, github_issue_id, issue_number, title, body, state, author_login, labels, source_url, source_created_at, source_updated_at, comments_synced_at").in("id", execution.issue_ids).eq("state", "open");
        if (error || !data || data.length !== execution.issue_ids.length) throw new Error("One or more selected issues are missing or closed.");
        return data;
      });
      const issues = (fetched as Array<PublicGitHubIssue & { id: string; comments_synced_at: string | null }>).map((issue) => ({ ...issue, body: issue.body.slice(0, 8_000) }));
      const repositoryResult = await db.from("repositories").select("full_name").eq("project_id", projectId).single();
      if (repositoryResult.error || !repositoryResult.data) throw new Error("Project repository is unavailable.");
      const commentsByIssue = await step.run("load-issue-comments", async () => {
        const startedAt = Date.now();
        await db.from("agent_steps").update({ status: "running", started_at: new Date().toISOString(), input: { issueCount: issues.length } }).eq("execution_id", executionId).eq("step_key", "comment_context");
        const comments: Record<string, PublicGitHubComment[]> = {};
        try {
          for (const issue of issues) {
            const fresh = issue.comments_synced_at && Date.now() - new Date(issue.comments_synced_at).getTime() < 6 * 60 * 60 * 1000;
            if (fresh) {
              const { data, error } = await db.from("issue_comments").select("github_comment_id,author_login,body,source_url,source_created_at,source_updated_at").eq("issue_id", issue.id).order("source_updated_at", { ascending: false }).limit(20);
              if (error) throw error;
              comments[issue.id] = (data ?? []) as PublicGitHubComment[];
              continue;
            }
            const records = await getPublicIssueComments(repositoryResult.data.full_name, issue.issue_number);
            if (records.length) {
              const { error } = await db.from("issue_comments").upsert(records.map((record) => ({ ...record, issue_id: issue.id })), { onConflict: "issue_id,github_comment_id" });
              if (error) throw error;
            }
            const syncedAt = new Date().toISOString();
            await db.from("issues").update({ comments_synced_at: syncedAt }).eq("id", issue.id);
            comments[issue.id] = records;
          }
          await db.from("agent_steps").update({ status: "completed", output: { commentCount: Object.values(comments).reduce((count, values) => count + values.length, 0) }, duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString() }).eq("execution_id", executionId).eq("step_key", "comment_context");
          return comments;
        } catch (error) {
          await db.from("agent_steps").update({ status: "failed", error_code: "comment_sync_failed", error_message: "Issue comments could not be loaded.", duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString() }).eq("execution_id", executionId).eq("step_key", "comment_context");
          throw error;
        }
      }) as Record<string, PublicGitHubComment[]>;
      const catalog = makeEvidenceCatalog(issues, commentsByIssue);
      const commentCount = Object.values(commentsByIssue).reduce((count, values) => count + values.length, 0);
      const analysis = await step.run("issue-analyst", () => runStep("issue_analyst", "Issue Analyst", 2, { issueIds: execution.issue_ids, commentCount }, () => runIssueAnalyst(execution.request_text, issues, catalog)));
      const documentationContext = await step.run("retrieve-project-docs", async () => {
        const { data: documents, error: documentError } = await db.from("documents").select("id,title").eq("project_id", projectId).eq("status", "indexed").limit(100);
        if (documentError) throw documentError;
        if (!documents?.length) return { count: 0, evidence: [] as ReturnType<typeof documentEvidenceSegments> };
        const { data: chunks, error: chunkError } = await db.from("document_chunks").select("id,document_id,content,source_location").in("document_id", documents.map((document) => document.id)).limit(500);
        if (chunkError) throw chunkError;
        const query = [execution.request_text, ...issues.map((issue) => `${issue.title} ${issue.body}`), ...Object.values(commentsByIssue).flat().map((comment) => comment.body)].join(" ").slice(0, 20_000);
        const relevantChunks = retrieveRelevantChunks(query, (chunks ?? []) as Array<{ id: string; document_id: string; content: string; source_location: unknown }>, 4);
        return { count: documents.length, evidence: documentEvidenceSegments(relevantChunks) };
      });
      let documentation: { value: unknown; model: string; usage: { inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null }; durationMs: number };
      if (documentationContext.evidence.length) {
        documentation = await step.run("documentation-agent", () => runStep("documentation", "Documentation Agent", 3, { documentCount: documentationContext.count, chunkCount: documentationContext.evidence.length }, () => runDocumentationAgent(execution.request_text, analysis.value, documentationContext.evidence)));
      } else {
        await db.from("agent_steps").update({ status: "skipped", input: { documentCount: documentationContext.count }, output: { reason: "No relevant project document excerpts were available." }, finished_at: new Date().toISOString(), duration_ms: 0 }).eq("execution_id", executionId).eq("step_key", "documentation");
        documentation = { value: { findings: [], missingInformation: ["No relevant project document excerpts were available."] }, model: "not_run", usage: { inputTokens: null, cachedInputTokens: null, outputTokens: null }, durationMs: 0 };
      }
      const priority = await step.run("priority-assessment", () => runStep("priority", "Priority Agent", 4, { analysis: analysis.value }, () => runPriorityAgent(execution.request_text, analysis.value, catalog)));
      const recommendations = await step.run("recommendations", () => runStep("recommendations", "Recommendation Agent", 5, { analysis: analysis.value, documentation: documentation.value, priority: priority.value }, () => runRecommendations(execution.request_text, analysis.value, documentation.value, priority.value, catalog)));
      const report = await step.run("final-report", () => runStep("report", "Report Agent", 6, { analysis: analysis.value, documentation: documentation.value, priority: priority.value, recommendations: recommendations.value }, () => runReport(execution.request_text, analysis.value, documentation.value, priority.value, recommendations.value)));

      await step.run("persist-result", async () => {
        const a = priority.value as { priority: string; severity: string; impact: string; urgency: string; confidence: number; reasoning: string; evidence: unknown[]; issuePriorities: Array<{ issueId: string; issueNumber: number; priority: string; severity: string; impact: string; urgency: string; confidence: number; reasoning: string; evidence: unknown[] }> };
        const r = recommendations.value as { recommendations: unknown[] };
        const reportValue = report.value as { summary: string };
        const recommendationsByIssue = new Map<string, unknown[]>();
        for (const recommendation of r.recommendations as Array<{ issueIds?: string[] }>) {
          for (const issueId of recommendation.issueIds ?? []) recommendationsByIssue.set(issueId, [...(recommendationsByIssue.get(issueId) ?? []), recommendation]);
        }
        const { error: issueAssessmentError } = await db.from("agent_issue_assessments").upsert(a.issuePriorities.map((assessment) => ({
          execution_id: executionId,
          issue_id: assessment.issueId,
          issue_number: assessment.issueNumber,
          priority: assessment.priority,
          severity: assessment.severity,
          impact: assessment.impact,
          urgency: assessment.urgency,
          confidence: assessment.confidence,
          reasoning: assessment.reasoning,
          evidence: assessment.evidence,
          recommendations: recommendationsByIssue.get(assessment.issueId) ?? [],
        })), { onConflict: "execution_id,issue_id" });
        if (issueAssessmentError) throw issueAssessmentError;
        const { error } = await db.from("agent_results").upsert({ execution_id: executionId, summary: reportValue.summary, priority: a.priority, severity: a.severity, impact: a.impact, urgency: a.urgency, confidence: a.confidence, reasoning: a.reasoning, evidence: a.evidence, recommendations: r.recommendations }, { onConflict: "execution_id" });
        if (error) throw error;
        await db.from("approval_requests").upsert({ owner_id: ownerId, execution_id: executionId, action_type: "review_recommendations", target: { projectId }, proposed_payload: { report: report.value, recommendations: r.recommendations } }, { onConflict: "execution_id,action_type" });
        const finishedAt = new Date();
        const modelUsage = [analysis, documentation, priority, recommendations, report].map(({ model, usage }) => ({ model, inputTokens: usage.inputTokens, cachedInputTokens: usage.cachedInputTokens, outputTokens: usage.outputTokens }));
        const estimatedCostUsd = estimateOpenAICostUsd(modelUsage);
        await db.from("agent_executions").update({ status: "needs_review", finished_at: finishedAt.toISOString(), duration_ms: Math.max(0, finishedAt.getTime() - new Date(runStartedAt).getTime()), model_usage: modelUsage, estimated_cost_usd: estimatedCostUsd }).eq("id", executionId);
        await db.from("activity_logs").insert({ owner_id: ownerId, project_id: projectId, execution_id: executionId, actor_type: "agent", action: "analysis.completed", details: { status: "needs_review" } });
        return { status: "needs_review" };
      });
      return { status: "needs_review" };
    } catch (error) {
      await db.from("agent_executions").update({ status: "failed", finished_at: new Date().toISOString(), error_code: error instanceof Error && "code" in error ? String(error.code).slice(0, 80) : "analysis_failed", error_message: "Analysis could not be completed." }).eq("id", executionId);
      throw error;
    }
  },
);
