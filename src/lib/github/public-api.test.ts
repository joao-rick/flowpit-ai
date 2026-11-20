import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenIssues, getPublicRepository } from "@/lib/github/public-api";

afterEach(() => vi.unstubAllGlobals());

describe("GitHub public API adapter", () => {
  it("excludes pull requests and maps source issues to persisted fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([
      {
        id: 101, number: 12, title: "Checkout fails", body: "Observed error", state: "open",
        user: { login: "octocat" }, labels: [{ name: "bug", color: "d73a4a" }],
        html_url: "https://github.com/acme/app/issues/12", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-03T00:00:00Z",
      },
      {
        id: 102, number: 13, title: "A pull request", body: null, state: "open",
        user: { login: "octocat" }, labels: [], html_url: "https://github.com/acme/app/pull/13",
        created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-03T00:00:00Z", pull_request: { url: "..." },
      },
    ]), { status: 200 })));

    const result = await getOpenIssues("acme", "app", 1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ issue_number: 12, title: "Checkout fails", author_login: "octocat", state: "open" });
    expect(result.hasNextPage).toBe(false);
  });

  it("reports rate limiting without treating it as an empty issue list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } })));
    await expect(getOpenIssues("acme", "app", 1)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("rejects a private repository response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 1, full_name: "acme/private", default_branch: "main", private: true,
    }), { status: 200 })));
    await expect(getPublicRepository("acme", "private")).rejects.toMatchObject({ code: "private_repository" });
  });
});
