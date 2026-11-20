import { describe, expect, it } from "vitest";
import { createProjectSchema } from "@/lib/projects/schema";

describe("createProjectSchema", () => {
  it("trims accepted project names and defaults the description", () => {
    expect(createProjectSchema.parse({ name: "  Checkout  " })).toEqual({
      name: "Checkout",
      description: "",
    });
  });

  it("rejects blank names and names longer than 100 characters", () => {
    expect(createProjectSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });

  it("rejects descriptions above the database limit and unexpected fields", () => {
    expect(createProjectSchema.safeParse({ name: "Checkout", description: "x".repeat(2001) }).success).toBe(false);
    expect(createProjectSchema.safeParse({ name: "Checkout", owner_id: "attacker" }).success).toBe(false);
  });
});
