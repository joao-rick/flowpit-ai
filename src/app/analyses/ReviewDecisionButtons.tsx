"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewDecisionButtons({ executionId }: { executionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/analyses/${executionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw new Error("The review decision could not be saved.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed."); }
    finally { setBusy(false); }
  }
  return <div className="history-review"><p>Review the result. Approval records your decision and does not make repository changes.</p><button disabled={busy} onClick={() => decide("approve")}>{busy ? "Saving…" : "Approve analysis"}</button><button disabled={busy} onClick={() => decide("reject")}>Dismiss</button>{error && <span role="alert">{error}</span>}</div>;
}
