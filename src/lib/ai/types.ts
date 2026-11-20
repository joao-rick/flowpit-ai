import type { z } from "zod";

export type TokenUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type StructuredRequest<S extends z.ZodObject<z.ZodRawShape>> = {
  schema: S;
  schemaName: string;
  systemPrompt: string;
  input: unknown;
  maxOutputTokens?: number;
};

export type StructuredResult<T> = {
  value: T;
  model: string;
  provider: "openai";
  usage: TokenUsage;
  durationMs: number;
};

export interface ModelProvider {
  generateStructured<S extends z.ZodObject<z.ZodRawShape>>(
    request: StructuredRequest<S>,
  ): Promise<StructuredResult<z.infer<S>>>;
}

export type AIProviderErrorCode = "not_configured" | "timeout" | "rate_limited" | "unavailable" | "refused" | "invalid_response";

export class AIProviderError extends Error {
  constructor(readonly code: AIProviderErrorCode, readonly retryable = false) {
    super(code);
    this.name = "AIProviderError";
  }
}
