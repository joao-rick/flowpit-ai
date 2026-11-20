import { z } from "zod";
import type { PublicGitHubComment, PublicGitHubIssue } from "@/lib/github/schemas";

const repositoryResponseSchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().min(3),
  default_branch: z.string().nullable().optional(),
  private: z.boolean(),
});

const issueResponseSchema = z.object({
  id: z.number().int().positive(),
  number: z.number().int().positive(),
  title: z.string().min(1).max(500),
  body: z.string().nullable().optional(),
  state: z.enum(["open", "closed"]),
  user: z.object({ login: z.string() }).nullable().optional(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string(), color: z.string().optional() })])).optional(),
  html_url: z.url(),
  created_at: z.iso.datetime().nullable().optional(),
  updated_at: z.iso.datetime().nullable().optional(),
  pull_request: z.unknown().optional(),
});

const issueCommentResponseSchema = z.object({
  id: z.number().int().positive(),
  body: z.string().nullable().optional(),
  user: z.object({ login: z.string() }).nullable().optional(),
  html_url: z.url(),
  created_at: z.iso.datetime().nullable().optional(),
  updated_at: z.iso.datetime().nullable().optional(),
});

export class GitHubApiError extends Error {
  constructor(readonly code: "repository_not_found" | "private_repository" | "rate_limited" | "github_unavailable" | "invalid_response") {
    super(code);
    this.name = "GitHubApiError";
  }
}

const apiHeaders = {
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "FlowPilot-AI",
};

function apiError(response: Response): GitHubApiError {
  if (response.status === 404) return new GitHubApiError("repository_not_found");
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") return new GitHubApiError("rate_limited");
  return new GitHubApiError("github_unavailable");
}

export async function getPublicRepository(owner: string, repository: string) {
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, {
      headers: apiHeaders,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new GitHubApiError("github_unavailable");
  }
  if (!response.ok) throw apiError(response);
  const parsed = repositoryResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new GitHubApiError("invalid_response");
  if (parsed.data.private) throw new GitHubApiError("private_repository");
  return parsed.data;
}

export async function getOpenIssues(owner: string, repository: string, page: number): Promise<{ issues: PublicGitHubIssue[]; hasNextPage: boolean }> {
  let response: Response;
  try {
    const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`);
    url.searchParams.set("state", "open");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    response = await fetch(url, { headers: apiHeaders, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    throw new GitHubApiError("github_unavailable");
  }
  if (!response.ok) throw apiError(response);
  if (Number(response.headers.get("content-length")) > 5_000_000) throw new GitHubApiError("invalid_response");
  const parsed = z.array(issueResponseSchema).safeParse(await response.json());
  if (!parsed.success) throw new GitHubApiError("invalid_response");

  const issues = parsed.data.flatMap((issue): PublicGitHubIssue[] => {
    if (issue.pull_request) return [];
    return [{
      github_issue_id: issue.id,
      issue_number: issue.number,
      title: issue.title,
      body: (issue.body ?? "").slice(0, 20_000),
      state: issue.state,
      author_login: issue.user?.login ?? null,
      labels: (issue.labels ?? []).flatMap((label) => typeof label === "string" ? [{ name: label }] : [{ name: label.name, color: label.color }]),
      source_url: issue.html_url,
      source_created_at: issue.created_at ?? null,
      source_updated_at: issue.updated_at ?? null,
    }];
  });
  return { issues, hasNextPage: parsed.data.length === 100 };
}

export async function getPublicIssueComments(fullName: string, issueNumber: number): Promise<PublicGitHubComment[]> {
  const [owner, repository, ...extra] = fullName.split("/");
  if (!owner || !repository || extra.length || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repository) || !Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    throw new GitHubApiError("invalid_response");
  }
  const url = new URL(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues/${issueNumber}/comments`);
  url.searchParams.set("per_page", "20");
  url.searchParams.set("page", "1");
  const fetchPage = async (page: number) => {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("page", String(page));
    let response: Response;
    try {
      response = await fetch(pageUrl, { headers: apiHeaders, signal: AbortSignal.timeout(10_000), cache: "no-store" });
    } catch {
      throw new GitHubApiError("github_unavailable");
    }
    if (!response.ok) throw apiError(response);
    if (Number(response.headers.get("content-length")) > 2_000_000) throw new GitHubApiError("invalid_response");
    const parsed = z.array(issueCommentResponseSchema).safeParse(await response.json());
    if (!parsed.success) throw new GitHubApiError("invalid_response");
    return { response, comments: parsed.data };
  };

  const firstPage = await fetchPage(1);
  const lastLink = firstPage.response.headers.get("link")?.match(/<([^>]+)>;\s*rel="last"/i)?.[1];
  const lastPageNumber = lastLink ? Number(new URL(lastLink).searchParams.get("page")) : 1;
  let latestComments = firstPage.comments;
  if (Number.isSafeInteger(lastPageNumber) && lastPageNumber > 1) {
    const previousPage = lastPageNumber - 1;
    const secondLast = previousPage === 1 ? firstPage : await fetchPage(previousPage);
    const last = await fetchPage(lastPageNumber);
    latestComments = [...secondLast.comments, ...last.comments].slice(-20);
  }
  return latestComments.map((comment) => ({
    github_comment_id: comment.id,
    author_login: comment.user?.login ?? null,
    body: (comment.body ?? "").slice(0, 1_500),
    source_url: comment.html_url,
    source_created_at: comment.created_at ?? null,
    source_updated_at: comment.updated_at ?? null,
  }));
}
