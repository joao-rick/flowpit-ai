import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readBoundedJson } from "@/lib/http/read-json";

const idSchema = z.uuid();

export async function GET(_request: NextRequest, { params }: { params: Promise<{ executionId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { executionId } = await params;
  if (!idSchema.safeParse(executionId).success) return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("agent_executions").select("id,status,created_at,finished_at,error_code,estimated_cost_usd,model_usage,agent_steps(step_key,agent_name,sequence,status,duration_ms,error_code),agent_results(summary,priority,severity,impact,urgency,confidence,reasoning,evidence,recommendations),approval_requests(id,status,action_type)").eq("id", executionId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  return NextResponse.json(data);
}

const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(500).default("") }).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ executionId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { executionId } = await params;
  if (!idSchema.safeParse(executionId).success) return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  const json = await readBoundedJson(request, 2_000);
  let body: z.infer<typeof decisionSchema>;
  if (!json.ok && json.reason === "too_large") return NextResponse.json({ error: "invalid_decision" }, { status: 413 });
  try { if (!json.ok) throw new Error(); body = decisionSchema.parse(json.value); } catch { return NextResponse.json({ error: "invalid_decision" }, { status: 400 }); }
  const userDb = await createSupabaseServerClient();
  const { data: auth } = await userDb.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: execution } = await userDb.from("agent_executions").select("id,status,project_id").eq("id", executionId).maybeSingle();
  if (!execution) return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  if (execution.status !== "needs_review") return NextResponse.json({ error: "analysis_not_reviewable" }, { status: 409 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "review_service_unavailable" }, { status: 503 });
  const { data: status, error } = await admin.rpc("decide_analysis", {
    p_execution_id: executionId,
    p_owner_id: userId,
    p_decision: body.decision,
    p_note: body.note,
  });
  if (error) return NextResponse.json({ error: "approval_update_failed" }, { status: 500 });
  if (!status) return NextResponse.json({ error: "analysis_already_reviewed" }, { status: 409 });
  return NextResponse.json({ status });
}
