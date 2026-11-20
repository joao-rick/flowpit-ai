import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkDocumentText } from "@/lib/documents/chunking";
import { readBoundedJson } from "@/lib/http/read-json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const projectIdSchema = z.uuid();
const documentSchema = z.object({ title: z.string().trim().min(1).max(160), sourceName: z.string().trim().min(1).max(200), content: z.string().trim().min(80).max(200_000) }).strict();

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  let projectId: string;
  try { projectId = projectIdSchema.parse((await context.params).projectId); } catch { return NextResponse.json({ error: "invalid_project" }, { status: 400 }); }
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  const { data, error } = await supabase.from("documents").select("id,title,source_name,status,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "documents_unavailable" }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  let projectId: string;
  try { projectId = projectIdSchema.parse((await context.params).projectId); } catch { return NextResponse.json({ error: "invalid_project" }, { status: 400 }); }
  const json = await readBoundedJson(request, 220_000);
  if (!json.ok && json.reason === "too_large") return NextResponse.json({ error: "document_too_large" }, { status: 413 });
  let body: z.infer<typeof documentSchema>;
  try { if (!json.ok) throw new Error(); body = documentSchema.parse(json.value); } catch { return NextResponse.json({ error: "invalid_document" }, { status: 400 }); }
  const userDb = await createSupabaseServerClient();
  const { data: claims } = await userDb.auth.getClaims();
  const ownerId = claims?.claims?.sub;
  if (typeof ownerId !== "string") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: project } = await userDb.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "document_storage_unavailable" }, { status: 503 });
  const contentHash = createHash("sha256").update(body.content).digest("hex");
  const { data: existing } = await admin.from("documents").select("id").eq("project_id", projectId).eq("content_hash", contentHash).maybeSingle();
  if (existing) return NextResponse.json({ documentId: existing.id, duplicate: true }, { status: 200 });
  const { data: document, error: insertError } = await admin.from("documents").insert({ project_id: projectId, owner_id: ownerId, title: body.title, source_name: body.sourceName, content_hash: contentHash, status: "pending" }).select("id").single();
  if (insertError || !document) {
    if (insertError?.code === "23505") {
      const { data: duplicate } = await admin.from("documents").select("id").eq("project_id", projectId).eq("content_hash", contentHash).maybeSingle();
      if (duplicate) return NextResponse.json({ documentId: duplicate.id, duplicate: true }, { status: 200 });
    }
    return NextResponse.json({ error: "document_save_failed" }, { status: 500 });
  }
  const chunks = chunkDocumentText(body.content);
  for (let start = 0; start < chunks.length; start += 100) {
    const rows = chunks.slice(start, start + 100).map((chunk) => ({ document_id: document.id, chunk_index: chunk.chunkIndex, content: chunk.content, source_location: chunk.sourceLocation }));
    const { error } = await admin.from("document_chunks").insert(rows);
    if (error) {
      await admin.from("documents").delete().eq("id", document.id);
      return NextResponse.json({ error: "document_index_failed" }, { status: 500 });
    }
  }
  const { error: updateError } = await admin.from("documents").update({ status: "indexed" }).eq("id", document.id);
  if (updateError) {
    await admin.from("documents").delete().eq("id", document.id);
    return NextResponse.json({ error: "document_index_failed" }, { status: 500 });
  }
  return NextResponse.json({ documentId: document.id, chunkCount: chunks.length, duplicate: false }, { status: 201 });
}
