import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOpenIssues, GitHubApiError } from "@/lib/github/public-api";
import { githubPageSchema } from "@/lib/github/schemas";

const repositoryIdSchema = z.uuid();

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ repositoryId: string }> }) {
  if (!isSupabaseConfigured()) return errorResponse("supabase_not_configured", 503);
  const { repositoryId } = await params;
  if (!repositoryIdSchema.safeParse(repositoryId).success) return errorResponse("repository_not_found", 404);

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return errorResponse("unauthorized", 401);
  const { data: repository, error } = await supabase.from("repositories")
    .select("id, owner_id, full_name, project_id").eq("id", repositoryId).maybeSingle();
  if (error || !repository) return errorResponse("repository_not_found", 404);
  const { data: project } = await supabase.from("projects").select("id, archived_at").eq("id", repository.project_id).maybeSingle();
  if (!project) return errorResponse("project_not_found", 404);
  if (project.archived_at) return errorResponse("project_archived", 409);

  const admin = createSupabaseAdminClient();
  if (!admin) return errorResponse("server_storage_not_configured", 503);
  const pageParsed = githubPageSchema.safeParse(request.nextUrl.searchParams.get("page") ?? "1");
  if (!pageParsed.success) return errorResponse("invalid_page", 400);
  const [owner, repoName] = repository.full_name.split("/");
  if (!owner || !repoName) return errorResponse("repository_not_found", 404);

  try {
    const { issues, hasNextPage } = await getOpenIssues(owner, repoName, pageParsed.data);
    if (issues.length) {
      const { error: upsertError } = await admin.from("issues").upsert(
        issues.map((issue) => ({ ...issue, repository_id: repository.id })),
        { onConflict: "repository_id,github_issue_id" },
      );
      if (upsertError) return errorResponse("issue_sync_failed", 500);
    }
    const syncedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("repositories")
      .update({ last_synced_at: syncedAt }).eq("id", repository.id);
    if (updateError) return errorResponse("sync_cursor_update_failed", 500);
    return NextResponse.json({ imported: issues.length, hasNextPage, limitReached: hasNextPage && pageParsed.data === 10, page: pageParsed.data, issues: issues.map(({ issue_number, title, source_url, source_updated_at }) => ({ issue_number, title, source_url, source_updated_at })) });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      const statuses: Record<GitHubApiError["code"], number> = {
        repository_not_found: 404,
        private_repository: 422,
        rate_limited: 429,
        github_unavailable: 502,
        invalid_response: 502,
      };
      return errorResponse(error.code, statuses[error.code]);
    }
    return errorResponse("github_unavailable", 502);
  }
}
