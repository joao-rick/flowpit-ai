import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublicRepository, GitHubApiError } from "@/lib/github/public-api";
import { parseGitHubRepositoryUrl } from "@/lib/github/schemas";

const bodySchema = z.object({ repositoryUrl: z.string().min(1).max(300) }).strict();
const projectIdSchema = z.uuid();

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  if (!isSupabaseConfigured()) return errorResponse("supabase_not_configured", 503);
  const { projectId } = await params;
  if (!projectIdSchema.safeParse(projectId).success) return errorResponse("not_found", 404);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 2048) return errorResponse("invalid_request", 413);
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 2048) return errorResponse("invalid_request", 413);
    body = JSON.parse(rawBody);
  } catch { return errorResponse("invalid_request", 400); }
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) return errorResponse("invalid_repository_url", 400);

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  const ownerId = auth?.claims?.sub;
  if (typeof ownerId !== "string") return errorResponse("unauthorized", 401);

  const { data: project, error: projectError } = await supabase
    .from("projects").select("id, archived_at").eq("id", projectId).maybeSingle();
  if (projectError || !project) return errorResponse("project_not_found", 404);
  if (project.archived_at) return errorResponse("project_archived", 409);

  const { data: linkedRepository, error: repositoryError } = await supabase.from("repositories")
    .select("id, github_repository_id").eq("project_id", projectId).maybeSingle();
  if (repositoryError) return errorResponse("repository_load_failed", 500);

  let owner: string;
  let repository: string;
  try {
    ({ owner, repository } = parseGitHubRepositoryUrl(parsedBody.data.repositoryUrl));
  } catch {
    return errorResponse("invalid_repository_url", 400);
  }

  try {
    const githubRepository = await getPublicRepository(owner, repository);
    if (linkedRepository && linkedRepository.github_repository_id !== githubRepository.id) {
      return errorResponse("project_repository_already_linked", 409);
    }
    const { data, error } = await supabase.from("repositories").upsert({
      project_id: projectId,
      owner_id: ownerId,
      github_repository_id: githubRepository.id,
      full_name: githubRepository.full_name,
      default_branch: githubRepository.default_branch ?? null,
    }, { onConflict: "project_id" })
      .select("id, project_id, full_name, default_branch, last_synced_at")
      .single();

    if (error || !data) return errorResponse("repository_save_failed", 500);
    return NextResponse.json({ repository: data });
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
