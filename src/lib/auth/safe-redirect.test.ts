import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-redirect";

describe("safeNextPath", () => {
  it("allows local in-app paths", () => {
    expect(safeNextPath("/auth/update-password")).toBe("/auth/update-password");
  });

  it("rejects missing and external redirect targets", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath("/\\example.com")).toBe("/");
  });
});
