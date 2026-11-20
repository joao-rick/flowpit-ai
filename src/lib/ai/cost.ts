export type ModelUsageRecord = {
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
};

type PricingConfig = {
  model?: string;
  inputUsdPerMillionTokens?: string;
  outputUsdPerMillionTokens?: string;
  cachedInputUsdPerMillionTokens?: string;
};

function parseUsdRate(value: string | undefined): number | null {
  if (!value || !/^\d+(?:\.\d{1,8})?$/.test(value)) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
}

export function estimateOpenAICostUsd(
  usage: ModelUsageRecord[],
  config: PricingConfig = {
    model: process.env.OPENAI_PRICING_MODEL,
    inputUsdPerMillionTokens: process.env.OPENAI_INPUT_USD_PER_MILLION_TOKENS,
    outputUsdPerMillionTokens: process.env.OPENAI_OUTPUT_USD_PER_MILLION_TOKENS,
    cachedInputUsdPerMillionTokens: process.env.OPENAI_CACHED_INPUT_USD_PER_MILLION_TOKENS,
  },
): number | null {
  const inputRate = parseUsdRate(config.inputUsdPerMillionTokens);
  const outputRate = parseUsdRate(config.outputUsdPerMillionTokens);
  const cachedInputRate = parseUsdRate(config.cachedInputUsdPerMillionTokens);
  if (!config.model || inputRate === null || outputRate === null) return null;

  const calls = usage.filter((entry) => entry.model !== "not_run");
  if (calls.length === 0 || calls.some((entry) => entry.model !== config.model
    || !Number.isSafeInteger(entry.inputTokens) || (entry.inputTokens ?? -1) < 0
    || !Number.isSafeInteger(entry.outputTokens) || (entry.outputTokens ?? -1) < 0
    || !Number.isSafeInteger(entry.cachedInputTokens) || (entry.cachedInputTokens ?? -1) < 0
    || (entry.cachedInputTokens ?? 0) > (entry.inputTokens ?? -1)
    || ((entry.cachedInputTokens ?? 0) > 0 && cachedInputRate === null))) return null;

  const cost = calls.reduce((total, entry) => {
    const cachedTokens = entry.cachedInputTokens!;
    return total + ((entry.inputTokens! - cachedTokens) * inputRate
      + cachedTokens * (cachedInputRate ?? inputRate)
      + entry.outputTokens! * outputRate) / 1_000_000;
  }, 0);
  return Number.isFinite(cost) ? Math.round((cost + Number.EPSILON) * 1_000_000) / 1_000_000 : null;
}
