import { describe, expect, it } from "vitest";
import { githubRepositoryUrlSchema, parseGitHubRepositoryUrl } from "@/lib/github/schemas";

describe("GitHub repository URL", () => {
  it("accepts an HTTPS repository path and normalizes .git", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/vercel/next.js.git")).toEqual({
      owner: "vercel",
      repository: "next.js",
    });
  });

  it.each([
    "https://github.com.evil.test/owner/repo",
    "http://github.com/owner/repo",
    "https://github.com/owner/repo/tree/main",
    "https://github.com/owner/repo?token=secret",
  ])("rejects unsafe or non-repository URL %s", (value) => {
    expect(githubRepositoryUrlSchema.safeParse(value).success).toBe(false);
  });
});
