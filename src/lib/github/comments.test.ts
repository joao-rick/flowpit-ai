import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicIssueComments } from "@/lib/github/public-api";

afterEach(() => vi.unstubAllGlobals());

describe("getPublicIssueComments", () => {
  it("requests a bounded recent comment page and maps public fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 31,
      body: "A".repeat(1800),
      user: { login: "maintainer" },
      html_url: "https://github.com/acme/app/issues/7#issuecomment-31",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    }]), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const comments = await getPublicIssueComments("acme/app", 7);
    const requestedUrl = new URL(fetchMock.mock.calls[0]?.[0] as URL);
    expect(requestedUrl.pathname).toBe("/repos/acme/app/issues/7/comments");
    expect(requestedUrl.searchParams.get("per_page")).toBe("20");
    expect(comments[0]?.body).toHaveLength(1500);
    expect(comments[0]?.author_login).toBe("maintainer");
  });

  it("rejects unsafe repository identifiers before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getPublicIssueComments("https://attacker.test/acme/app", 7)).rejects.toThrow("invalid_response");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("follows GitHub pagination to return the most recent comment page", async () => {
    const comments = (ids: number[]) => ids.map((id) => ({ id, body: `Comment ${id}`, user: { login: "maintainer" }, html_url: `https://github.com/acme/app/issues/7#issuecomment-${id}`, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(comments(Array.from({ length: 20 }, (_, index) => index + 1))), { status: 200, headers: { link: '<https://api.github.com/repos/acme/app/issues/7/comments?per_page=20&page=2>; rel="last"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(comments([21])), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getPublicIssueComments("acme/app", 7);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1]?.[0] as URL).searchParams.get("page")).toBe("2");
    expect(result).toHaveLength(20);
    expect(result[0]?.github_comment_id).toBe(2);
    expect(result.at(-1)?.github_comment_id).toBe(21);
  });
});
