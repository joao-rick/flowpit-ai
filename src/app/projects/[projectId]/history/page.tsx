import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

const idSchema = z.uuid();
type RunRow = { id: string; request_text: string; status: string; created_at: string; duration_ms: number | null; agent_results: { priority: string | null; summary: string } | null };

export default async function ProjectHistoryPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!idSchema.safeParse(projectId).success) notFound();
  if (!isSupabaseConfigured()) return <main className="history-page"><div className="history-container"><Link className="projects-back" href="/projects"><ArrowLeft size={15} /> Projects</Link><section className="history-empty"><ListChecks size={20} /><h2>Storage is not connected</h2><p>Configure Supabase and apply the project migration to load analysis history.</p></section></div></main>;
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/auth/login");
  const { data: project } = await supabase.from("projects").select("id,name").eq("id", projectId).maybeSingle();
  if (!project) notFound();
  const { data, error } = await supabase.from("agent_executions").select("id,request_text,status,created_at,duration_ms,agent_results(priority,summary)").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
  const runs = (data ?? []) as unknown as RunRow[];
  return <main className="history-page"><div className="history-container"><Link className="projects-back" href="/projects"><ArrowLeft size={15} /> Projects</Link><header className="history-header"><p className="section-kicker">PROJECT HISTORY</p><h1>{project.name}</h1><p>Persisted analysis runs and their review status.</p></header>{error ? <p role="alert">Analysis history could not be loaded.</p> : runs.length ? <ul className="history-list">{runs.map((run) => <li key={run.id}><Link href={`/analyses/${run.id}`}><span className="history-status">{run.status.replaceAll("_", " ")}</span><strong>{run.request_text}</strong><small>{new Date(run.created_at).toLocaleString("en")} · {run.duration_ms == null ? "Duration pending" : `${(run.duration_ms / 1000).toFixed(1)} sec`}</small>{run.agent_results && <p><b>{run.agent_results.priority ?? "Unranked"}</b> · {run.agent_results.summary}</p>}</Link></li>)}</ul> : <section className="history-empty"><ListChecks size={20} /><h2>No analyses yet</h2><p>Import issues in the project and start an analysis to create its history.</p></section>}</div></main>;
}
