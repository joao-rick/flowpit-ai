import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/config";

afterEach(() => vi.unstubAllEnvs());

describe("Supabase public configuration", () => {
  it("is unavailable until both public values are provided", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabasePublicConfig()).toBeNull();
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns the configured public client values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
    expect(isSupabaseConfigured()).toBe(true);
  });
});
