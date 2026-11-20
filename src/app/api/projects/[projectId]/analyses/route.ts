import { NextResponse } from "next/server";
import { z } from "zod";
import { analysisRequestSchema } from "@/lib/agents/schemas";
import { inngest } from "@/lib/inngest/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readBoundedJson } from "@/lib/http/read-json";

const projectIdSchema = z.uuid();
const steps = [
  { step_key: "comment_context", agent_name: "GitHub Comment Context", sequence: 1 },
  { step_key: "issue_analyst", agent_name: "Issue Analyst", sequence: 2 },
  { step_key: "documentation", agent_name: "Documentation Agent", sequence: 3 },
  { step_key: "priority", agent_name: "Priority Agent", sequence: 4 },
  { step_key: "recommendations", agent_name: "Recommendation Agent", sequence: 5 },
  { step_key: "report", agent_name: "Report Agent", sequence: 6 },
];

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  let projectId: string;
  try { projectId = projectIdSchema.parse((await context.params).projectId); } catch { return NextResponse.json({ error: "Invalid project." }, { status: 400 }); }
  let body: z.infer<typeof analysisRequestSchema>;
  const json = await readBoundedJson(request, 8_000);
  if (!json.ok && json.reason === "too_large") return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  try {
    if (!json.ok) throw new Error("Invalid JSON.");
    body = analysisRequestSchema.parse(json.value);
  } catch { return NextResponse.json({ error: "Provide a request and one to ten valid issue IDs." }, { status: 400 }); }

  try {
    const userDb = await createSupabaseServerClient();
    const { data: claims } = await userDb.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const { data: project } = await userDb.from("projects").select("id, archived_at").eq("id", projectId).maybeSingle();
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.archived_at) return NextResponse.json({ error: "Project is archived." }, { status: 409 });
    const { data: issues } = await userDb.from("issues").select("id, state, repositories!inner(project_id)").in("id", body.issueIds).eq("repositories.project_id", projectId);
    if (!issues || issues.length !== body.issueIds.length || issues.some((issue) => issue.state !== "open")) return NextResponse.json({ error: "Select open issues from this project." }, { status: 400 });

    const admin = createSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Analysis service is not configured." }, { status: 503 });
    const { data: execution, error } = await admin.from("agent_executions").insert({ owner_id: userId, project_id: projectId, request_text: body.requestText, workflow_version: "1.0.0", issue_ids: body.issueIds, status: "queued" }).select("id").single();
    if (error || !execution) return NextResponse.json({ error: "Could not create analysis." }, { status: 500 });
    const { error: stepsError } = await admin.from("agent_steps").insert(steps.map((step) => ({ ...step, execution_id: execution.id })));
    if (stepsError) {
      await admin.from("agent_executions").delete().eq("id", execution.id);
      return NextResponse.json({ error: "Could not initialize analysis steps." }, { status: 500 });
    }
    try {
      await inngest.send({ name: "flowpilot/analysis.requested", data: { executionId: execution.id, ownerId: userId, projectId } });
    } catch {
      await admin.from("agent_executions").update({ status: "failed", error_code: "queue_unavailable", error_message: "Analysis queue is unavailable." }).eq("id", execution.id);
      return NextResponse.json({ error: "Analysis queue is unavailable. Check Inngest configuration." }, { status: 503 });
    }
    await admin.from("activity_logs").insert({ owner_id: userId, project_id: projectId, execution_id: execution.id, actor_type: "user", actor_id: userId, action: "analysis.queued", details: { issueCount: body.issueIds.length } });
    return NextResponse.json({ executionId: execution.id, status: "queued" }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Analysis service is not configured." }, { status: 503 });
  }
}
