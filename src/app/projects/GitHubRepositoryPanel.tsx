"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownToLine, ExternalLink, GitBranch, RotateCw, Sparkles } from "lucide-react";
import type { ProjectRepository } from "@/lib/projects/service";

type Issue = { id?: string; issue_number: number; title: string; state?: string; source_url: string; source_updated_at: string | null };
type IssueResponse = { issues: Issue[]; count: number; page: number; pageSize: number };
type AnalysisSnapshot = { id: string; status: string; agent_steps: Array<{ step_key: string; agent_name: string; status: string }>; agent_results: null | { summary: string; priority: string; recommendations: unknown[] } };

const errorMessage: Record<string, string> = {
  supabase_not_configured: "Connect Supabase before saving a repository.",
  unauthorized: "Your session expired. Sign in again.",
  invalid_repository_url: "Enter a GitHub repository URL such as https://github.com/vercel/next.js.",
  project_not_found: "This project is not available in your workspace.",
  repository_not_found: "GitHub could not find that public repository. Check the URL; private repositories are not supported yet.",
  private_repository: "This repository is private. Private repository access is not configured yet.",
  project_repository_already_linked: "This project already has a repository. Changing it safely is not available yet.",
  rate_limited: "GitHub's public API rate limit has been reached. Wait and try again.",
  server_storage_not_configured: "The server Supabase secret key is missing. Add it to enable secure issue imports.",
  issue_sync_failed: "GitHub returned issues, but saving them failed. Try the import again.",
  github_unavailable: "GitHub could not be reached. Check the repository URL and try again.",
};

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return errorMessage[body.error ?? ""] ?? "The request failed. Your existing project data is unchanged; try again.";
  } catch {
    return "The request failed. Your existing project data is unchanged; try again.";
  }
}

export function GitHubRepositoryPanel({ projectId, repository }: { projectId: string; repository?: ProjectRepository }) {
  const [repositoryState, setRepositoryState] = useState(repository);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueCount, setIssueCount] = useState(0);
  const [issueListPage, setIssueListPage] = useState(1);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(Boolean(repository));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [analysisRequest, setAnalysisRequest] = useState("Triage these issues and explain their impact.");
  const [analysis, setAnalysis] = useState<AnalysisSnapshot>();
  const [startingAnalysis, setStartingAnalysis] = useState(false);
  const activeAnalysisId = analysis?.id;
  const activeAnalysisStatus = analysis?.status;

  const repositoryId = repositoryState?.id;
  useEffect(() => {
    if (!repositoryId) return;
    let active = true;
    fetch(`/api/repositories/${repositoryId}/issues?page=${issueListPage}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response));
        return response.json() as Promise<IssueResponse>;
      })
      .then((result) => {
        if (!active) return;
        setIssues(result.issues);
        setIssueCount(result.count);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Issues could not be loaded.");
      })
      .finally(() => { if (active) setLoadingIssues(false); });
    return () => { active = false; };
  }, [repositoryId, issueListPage]);

  useEffect(() => {
    if (!activeAnalysisId || !activeAnalysisStatus || !["queued", "running"].includes(activeAnalysisStatus)) return;
    const timer = window.setInterval(() => {
      fetch(`/api/analyses/${activeAnalysisId}`).then((response) => response.ok ? response.json() as Promise<AnalysisSnapshot> : null).then((value) => { if (value) setAnalysis(value); }).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [activeAnalysisId, activeAnalysisStatus]);

  async function decideAnalysis(decision: "approve" | "reject") {
    if (!analysis) return;
    try {
      const response = await fetch(`/api/analyses/${analysis.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { status: string };
      setAnalysis({ ...analysis, status: result.status });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review decision could not be saved."); }
  }

  async function startAnalysis() {
    setStartingAnalysis(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/projects/${projectId}/analyses`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestText: analysisRequest, issueIds: selectedIssueIds }) });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { executionId: string; status: string };
      setAnalysis({ id: result.executionId, status: result.status, agent_steps: [], agent_results: null });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis could not be started.");
    } finally { setStartingAnalysis(false); }
  }

  async function connectRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/projects/${projectId}/repository`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryUrl }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { repository: ProjectRepository };
      setLoadingIssues(true);
      setRepositoryState(result.repository);
      setRepositoryUrl("");
      setNotice("Public repository connected. Import open issues to start a real analysis.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Repository connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importIssues(requestedPage = 1) {
    if (!repositoryState) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const response = await fetch(`/api/repositories/${repositoryState.id}/sync?page=${requestedPage}`, { method: "POST" });
      if (!response.ok) throw new Error(await readError(response));
      const result = await response.json() as { imported: number; hasNextPage: boolean; limitReached: boolean; page: number; issues: Issue[] };
      setPage(result.page);
      setIssueListPage(1);
      setHasNextPage(result.hasNextPage && !result.limitReached);
      setLimitReached(result.limitReached);
      setRepositoryState((current) => current ? { ...current, last_synced_at: new Date().toISOString() } : current);
      setNotice(`${result.imported} open issue${result.imported === 1 ? "" : "s"} imported from ${repositoryState.full_name}.`);
      try {
        const refreshed = await fetch(`/api/repositories/${repositoryState.id}/issues?page=1`);
        if (refreshed.ok) {
          const persisted = await refreshed.json() as IssueResponse;
          setIssueCount(persisted.count);
          setIssues(persisted.issues);
        }
      } catch {
        // The import succeeded; the next visit will refresh the persisted issue list.
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Issue import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="github-panel">
      {repositoryState ? <div className="connected-repository"><span className="project-item-icon"><GitBranch size={15} /></span><span><strong>{repositoryState.full_name}</strong><small>{repositoryState.last_synced_at ? `Last imported ${new Date(repositoryState.last_synced_at).toLocaleDateString("en")}` : "No issues imported yet"}</small></span><a href={`https://github.com/${repositoryState.full_name}`} target="_blank" rel="noreferrer" aria-label={`Open ${repositoryState.full_name} on GitHub`}><ExternalLink size={14} /></a></div> : <div className="github-empty"><GitBranch size={15} /><span>No repository connected</span></div>}
      {!repositoryState && <form className="github-connect-form" onSubmit={connectRepository}>
        <label htmlFor={`repository-url-${projectId}`}>Public GitHub repository URL</label>
        <div><input id={`repository-url-${projectId}`} type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" required maxLength={300} /><button type="submit" disabled={busy}>{busy ? "Connecting…" : "Connect repository"}</button></div>
        <small>Public repositories only. Private repositories need a read-only GitHub App connection.</small>
      </form>}
      {repositoryState && <div className="issues-panel">
        <div className="issues-heading"><strong>Open issues</strong><span>{issueCount} imported</span></div>
        {loadingIssues ? <p className="issues-empty" role="status">Loading saved issues…</p> : issues.length ? <ul>{issues.map((issue) => <li key={issue.id ?? issue.issue_number}><input type="checkbox" aria-label={`Select issue ${issue.issue_number}`} checked={Boolean(issue.id && selectedIssueIds.includes(issue.id))} disabled={!issue.id || startingAnalysis || (!selectedIssueIds.includes(issue.id) && selectedIssueIds.length >= 10)} onChange={(event) => { if (event.target.checked && selectedIssueIds.length >= 10) { setError("Select up to ten issues per analysis."); event.currentTarget.checked = false; return; } setError(undefined); setSelectedIssueIds((current) => event.target.checked ? [...current, issue.id!] : current.filter((id) => id !== issue.id)); }} /><span>#{issue.issue_number}</span><a href={issue.source_url} target="_blank" rel="noreferrer">{issue.title}<ExternalLink size={11} /></a></li>)}</ul> : <p className="issues-empty">No open issues have been imported. Import the latest page to check GitHub.</p>}
        {issueCount > 50 && <div className="issues-actions"><button type="button" onClick={() => setIssueListPage((current) => Math.max(1, current - 1))} disabled={loadingIssues || issueListPage <= 1}>Newer issues</button><span className="issues-page-indicator">Page {issueListPage} / {Math.ceil(issueCount / 50)}</span><button type="button" onClick={() => setIssueListPage((current) => Math.min(Math.ceil(issueCount / 50), current + 1))} disabled={loadingIssues || issueListPage >= Math.ceil(issueCount / 50)}>Older issues</button></div>}
        {limitReached && <p className="issues-empty">More than 1,000 issues are open. This sync stops at 10 pages to stay within the request time limit.</p>}
        <div className="issues-actions"><button type="button" onClick={() => importIssues(1)} disabled={busy}><RotateCw size={13} /> {busy ? "Importing…" : "Import latest issues"}</button>{hasNextPage && <button type="button" onClick={() => importIssues(page + 1)} disabled={busy}><ArrowDownToLine size={13} /> Import next page</button>}</div>
        {issues.length > 0 && <div className="analysis-launch"><label htmlFor={`analysis-request-${projectId}`}>Analysis request</label><textarea id={`analysis-request-${projectId}`} value={analysisRequest} onChange={(event) => setAnalysisRequest(event.target.value)} maxLength={4000} /><button type="button" onClick={startAnalysis} disabled={startingAnalysis || !selectedIssueIds.length || !analysisRequest.trim()}><Sparkles size={13} />{startingAnalysis ? "Starting analysis…" : `Analyze ${selectedIssueIds.length || "selected"} issue${selectedIssueIds.length === 1 ? "" : "s"}`}</button></div>}
        {analysis && <section className="analysis-trace" aria-live="polite"><strong>Analysis · {analysis.status.replaceAll("_", " ")}</strong>{analysis.agent_steps.map((step) => <p key={step.step_key}><span>{step.status === "completed" ? "✓" : step.status === "failed" ? "!" : "·"}</span>{step.agent_name}<small>{step.status}</small></p>)}{analysis.agent_results && <div><b>{analysis.agent_results.priority} priority</b><p>{analysis.agent_results.summary}</p></div>}{analysis.status === "needs_review" && <div className="analysis-review"><p>Review the proposal. Approval records your decision; no GitHub change is made.</p><button type="button" onClick={() => decideAnalysis("approve")}>Approve analysis</button><button type="button" onClick={() => decideAnalysis("reject")}>Dismiss</button></div>}{analysis.status === "failed" && <p role="alert">Analysis failed. Check provider and queue configuration, then start another run.</p>}</section>}
      </div>}
      {error && <p className="github-feedback error" role="alert">{error}</p>}
      {notice && <p className="github-feedback success" role="status">{notice}</p>}
    </div>
  );
}
