export type ExecutionStatus = "queued" | "running" | "needs_review" | "completed" | "failed" | "cancelled";

const transitions: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  queued: ["running", "cancelled", "failed"],
  running: ["needs_review", "completed", "failed", "cancelled"],
  needs_review: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionExecution(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return transitions[from].includes(to);
}

export function assertExecutionTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransitionExecution(from, to)) throw new Error(`Invalid execution transition: ${from} -> ${to}`);
}
