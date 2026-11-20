import { z } from "zod";

export const githubRepositoryUrlSchema = z.string().trim().min(1).max(300).superRefine((value, context) => {
  let url: URL;
  try { url = new URL(value); } catch { context.addIssue({ code: "custom", message: "Enter a valid GitHub repository URL." }); return; }
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || segments.length !== 2 || !/^[\w.-]+$/.test(segments[0] ?? "") || !/^[\w.-]+$/.test(segments[1]?.replace(/\.git$/i, "") ?? "")) {
    context.addIssue({ code: "custom", message: "Enter a repository URL in the form https://github.com/owner/repository." });
  }
});

export const githubPageSchema = z.coerce.number().int().min(1).max(10).default(1);

export function parseGitHubRepositoryUrl(value: string) {
  const url = new URL(githubRepositoryUrlSchema.parse(value));
  const segments = url.pathname.split("/").filter(Boolean);
  return { owner: segments[0]!, repository: segments[1]!.replace(/\.git$/i, "") };
}

export type PublicGitHubIssue = {
  github_issue_id: number;
  issue_number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  author_login: string | null;
  labels: Array<{ name: string; color?: string }>;
  source_url: string;
  source_created_at: string | null;
  source_updated_at: string | null;
};

export type PublicGitHubComment = {
  github_comment_id: number;
  author_login: string | null;
  body: string;
  source_url: string;
  source_created_at: string | null;
  source_updated_at: string | null;
};
