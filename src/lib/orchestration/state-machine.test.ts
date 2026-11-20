import { describe, expect, it } from "vitest";
import { assertExecutionTransition, canTransitionExecution } from "@/lib/orchestration/state-machine";

describe("execution state transitions", () => {
  it("allows the analysis and review lifecycle", () => {
    expect(canTransitionExecution("queued", "running")).toBe(true);
    expect(canTransitionExecution("running", "needs_review")).toBe(true);
    expect(canTransitionExecution("needs_review", "completed")).toBe(true);
  });

  it("rejects transitions out of terminal states", () => {
    expect(canTransitionExecution("completed", "running")).toBe(false);
    expect(() => assertExecutionTransition("failed", "completed")).toThrow("Invalid execution transition");
  });
});
