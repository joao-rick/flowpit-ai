import { describe, expect, it } from "vitest";
import { loadDashboardOverview } from "@/lib/dashboard/service";

describe("dashboard overview", () => {
  it("keeps completed runs separate from per-issue assessment counts", async () => {
    const client = {
      from(table: string) {
        const filters: Record<string, string> = {};
        const query = {
          select: () => query,
          is: (column: string, value: string) => { filters[column] = value; return query; },
          eq: (column: string, value: string) => { filters[column] = value; return query; },
          not: () => query,
          order: () => query,
          limit: () => query,
          then(resolve: (value: unknown) => unknown) {
            const count = table === "agent_executions" && filters.status === "completed" ? 3
              : table === "agent_issue_assessments" && filters.priority === "critical" ? 2
              : table === "agent_issue_assessments" ? 7 : 0;
            return Promise.resolve({ count, data: [], error: null }).then(resolve);
          },
        };
        return query;
      },
    };
    const overview = await loadDashboardOverview(client as never);
    expect(overview.assessedIssueCount).toBe(7);
    expect(overview.completedCount).toBe(3);
    expect(overview.criticalFindingCount).toBe(2);
  });
});
