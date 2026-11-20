import { describe, expect, it } from "vitest";
import { readBoundedJson } from "@/lib/http/read-json";

describe("readBoundedJson", () => {
  it("parses JSON bodies under the configured byte limit", async () => {
    const result = await readBoundedJson(new Request("https://app.test", { method: "POST", body: JSON.stringify({ value: "ok" }) }), 100);
    expect(result).toEqual({ ok: true, value: { value: "ok" } });
  });

  it("rejects oversized streaming request bodies", async () => {
    const result = await readBoundedJson(new Request("https://app.test", { method: "POST", body: JSON.stringify({ value: "large" }) }), 3);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects malformed JSON", async () => {
    const result = await readBoundedJson(new Request("https://app.test", { method: "POST", body: "{" }), 100);
    expect(result).toEqual({ ok: false, reason: "invalid_json" });
  });
});
