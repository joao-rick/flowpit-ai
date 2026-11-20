import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const idSchema = z.uuid();
const pageSchema = z.coerce.number().int().min(1).max(20).default(1);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ repositoryId: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const { repositoryId } = await params;
  if (!idSchema.safeParse(repositoryId).success) return NextResponse.json({ error: "repository_not_found" }, { status: 404 });
  const pageResult = pageSchema.safeParse(_request.nextUrl.searchParams.get("page") ?? 1);
  if (!pageResult.success) return NextResponse.json({ error: "invalid_page" }, { status: 400 });
  const page = pageResult.data;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error, count } = await supabase.from("issues")
    .select("id, issue_number, title, state, source_url, source_updated_at", { count: "exact" })
    .eq("repository_id", repositoryId)
    .order("source_updated_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (error) return NextResponse.json({ error: "issue_load_failed" }, { status: 500 });
  return NextResponse.json({ issues: data ?? [], count: count ?? 0, page, pageSize: 50 });
}
