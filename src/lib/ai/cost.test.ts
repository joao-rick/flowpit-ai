import { describe, expect, it } from "vitest";
import { estimateOpenAICostUsd } from "@/lib/ai/cost";

const pricing = { model: "test-model", inputUsdPerMillionTokens: "2", outputUsdPerMillionTokens: "8" };

describe("OpenAI cost estimation", () => {
  it("estimates cost from configured model pricing and complete token usage", () => {
    expect(estimateOpenAICostUsd([
      { model: "test-model", inputTokens: 1_000, cachedInputTokens: 0, outputTokens: 500 },
      { model: "test-model", inputTokens: 2_000, cachedInputTokens: 0, outputTokens: 0 },
      { model: "not_run", inputTokens: null, cachedInputTokens: null, outputTokens: null },
    ], pricing)).toBe(0.01);
  });

  it("leaves the estimate unavailable when pricing is missing or mismatched", () => {
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 }], {})).toBeNull();
    expect(estimateOpenAICostUsd([{ model: "different-model", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 }], pricing)).toBeNull();
  });

  it("uses a separately configured rate for cached input tokens", () => {
    const config = { ...pricing, cachedInputUsdPerMillionTokens: "0.2" };
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1_000, cachedInputTokens: 600, outputTokens: 100 }], config)).toBe(0.00172);
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1_000, cachedInputTokens: 600, outputTokens: 100 }], pricing)).toBeNull();
  });

  it("requires complete non-negative integer token counts and valid rates", () => {
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: null, cachedInputTokens: null, outputTokens: 1 }], pricing)).toBeNull();
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1, cachedInputTokens: null, outputTokens: 1 }], pricing)).toBeNull();
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: -1, cachedInputTokens: 0, outputTokens: 1 }], pricing)).toBeNull();
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1, cachedInputTokens: 2, outputTokens: 1 }], { ...pricing, cachedInputUsdPerMillionTokens: "0.2" })).toBeNull();
    expect(estimateOpenAICostUsd([{ model: "test-model", inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 }], { ...pricing, inputUsdPerMillionTokens: "NaN" })).toBeNull();
  });
});
