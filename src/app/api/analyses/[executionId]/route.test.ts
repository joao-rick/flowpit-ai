import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
  getClaims: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));

import { PATCH } from "@/app/api/analyses/[executionId]/route";

const executionId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/analyses/${executionId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("analysis review route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: ownerId } } });
    mocks.maybeSingle.mockResolvedValue({ data: { id: executionId, status: "needs_review", project_id: "33333333-3333-4333-8333-333333333333" } });
    const executionQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.maybeSingle };
    executionQuery.select.mockReturnValue(executionQuery);
    executionQuery.eq.mockReturnValue(executionQuery);
    const userDb = { auth: { getClaims: mocks.getClaims }, from: vi.fn(() => executionQuery) };
    mocks.createSupabaseServerClient.mockResolvedValue(userDb);
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("records the authenticated decision through the transactional database function", async () => {
    mocks.rpc.mockResolvedValue({ data: "completed", error: null });
    const response = await PATCH(makeRequest({ decision: "approve", note: "Looks good" }), { params: Promise.resolve({ executionId }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "completed" });
    expect(mocks.rpc).toHaveBeenCalledWith("decide_analysis", {
      p_execution_id: executionId,
      p_owner_id: ownerId,
      p_decision: "approve",
      p_note: "Looks good",
    });
  });

  it("returns a conflict when the decision was already made", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(makeRequest({ decision: "reject" }), { params: Promise.resolve({ executionId }) });
    expect(response.status).toBe(409);
  });
});
