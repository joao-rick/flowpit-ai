import "server-only";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";
import type { ModelProvider, StructuredRequest, StructuredResult } from "@/lib/ai/types";
import { AIProviderError } from "@/lib/ai/types";

const DEFAULT_MODEL = "gpt-6-astra";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapProviderError(error: unknown): AIProviderError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return new AIProviderError("timeout", true);
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) return new AIProviderError("rate_limited", true);
    if (error.status === 408 || (error.status !== undefined && error.status >= 500)) return new AIProviderError("unavailable", true);
  }
  return new AIProviderError("unavailable", false);
}

function isRetryable(error: unknown): boolean {
  return error instanceof AIProviderError && error.retryable;
}

export class OpenAIProvider implements ModelProvider {
  async generateStructured<S extends z.ZodObject<z.ZodRawShape>>(
    request: StructuredRequest<S>,
  ): Promise<StructuredResult<z.infer<S>>> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIProviderError("not_configured");
    const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
    const client = new OpenAI({ apiKey, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });
    const startedAt = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await client.chat.completions.parse({
          model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: JSON.stringify(request.input) },
          ],
          response_format: zodResponseFormat(request.schema, request.schemaName),
          max_completion_tokens: request.maxOutputTokens ?? 1400,
        });

        const choice = response.choices[0];
        if (!choice) throw new AIProviderError("invalid_response");
        if (choice.message.refusal) throw new AIProviderError("refused");
        if (choice.finish_reason === "length" || choice.finish_reason === "content_filter" || !choice.message.parsed) {
          throw new AIProviderError("invalid_response");
        }

        const value = request.schema.parse(choice.message.parsed);
        return {
          value,
          model,
          provider: "openai",
          usage: {
            inputTokens: response.usage?.prompt_tokens ?? null,
            cachedInputTokens: response.usage?.prompt_tokens_details ? response.usage.prompt_tokens_details.cached_tokens ?? 0 : null,
            outputTokens: response.usage?.completion_tokens ?? null,
            totalTokens: response.usage?.total_tokens ?? null,
          },
          durationMs: Date.now() - startedAt,
        };
      } catch (error) {
        const mapped = error instanceof AIProviderError ? error : mapProviderError(error);
        if (!isRetryable(mapped) || attempt === MAX_RETRIES) throw mapped;
        await delay(200 * (2 ** attempt) + Math.floor(Math.random() * 100));
      }
    }

    throw new AIProviderError("unavailable");
  }
}
