import type { createSupabaseServerClient } from "@/lib/supabase/server";

type UserClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type DashboardOverview = {
  projectCount: number;
  repositoryCount: number;
  analysisCount: number;
  assessedIssueCount: number;
  completedCount: number;
  criticalFindingCount: number;
  averageDurationMs: number | null;
  activeIssues: number;
  activity: Array<{ id: string; action: string; created_at: string; actor_type: string }>;
  recentRuns: Array<{ id: string; request_text: string; status: string; created_at: string; duration_ms: number | null }>;
  partial: boolean;
};

export async function loadDashboardOverview(client: UserClient): Promise<DashboardOverview> {
  const [projects, repositories, analyses, assessedIssues, completed, critical, durations, issues, activity, recentRuns] = await Promise.all([
    client.from("projects").select("id", { count: "exact", head: true }).is("archived_at", null),
    client.from("repositories").select("id", { count: "exact", head: true }),
    client.from("agent_executions").select("id", { count: "exact", head: true }),
    client.from("agent_issue_assessments").select("id", { count: "exact", head: true }),
    client.from("agent_executions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    client.from("agent_issue_assessments").select("id", { count: "exact", head: true }).eq("priority", "critical"),
    client.from("agent_executions").select("duration_ms").eq("status", "completed").not("duration_ms", "is", null).order("finished_at", { ascending: false }).limit(100),
    client.from("issues").select("id", { count: "exact", head: true }).eq("state", "open"),
    client.from("activity_logs").select("id, action, created_at, actor_type").order("created_at", { ascending: false }).limit(5),
    client.from("agent_executions").select("id, request_text, status, created_at, duration_ms").order("created_at", { ascending: false }).limit(5),
  ]);

  const results = [projects, repositories, analyses, assessedIssues, completed, critical, durations, issues, activity, recentRuns];
  const partial = results.some((result) => result.error !== null);
  const durationValues = (durations.data ?? []).flatMap((entry) => typeof entry.duration_ms === "number" ? [entry.duration_ms] : []);

  return {
    projectCount: projects.count ?? 0,
    repositoryCount: repositories.count ?? 0,
    analysisCount: analyses.count ?? 0,
    assessedIssueCount: assessedIssues.count ?? 0,
    completedCount: completed.count ?? 0,
    criticalFindingCount: critical.count ?? 0,
    averageDurationMs: durationValues.length ? Math.round(durationValues.reduce((total, value) => total + value, 0) / durationValues.length) : null,
    activeIssues: issues.count ?? 0,
    activity: activity.data ?? [],
    recentRuns: recentRuns.data ?? [],
    partial,
  };
}
