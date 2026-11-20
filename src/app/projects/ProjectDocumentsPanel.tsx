"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpenText, FilePlus2 } from "lucide-react";

type ProjectDocument = { id: string; title: string; source_name: string; status: string; created_at: string };

export function ProjectDocumentsPanel({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadDocuments() {
    const response = await fetch(`/api/projects/${projectId}/documents`);
    if (!response.ok) throw new Error("Project documents could not be loaded.");
    const result = await response.json() as { documents: ProjectDocument[] };
    setDocuments(result.documents);
  }

  useEffect(() => { let active = true; fetch(`/api/projects/${projectId}/documents`).then(async (response) => { if (!response.ok) throw new Error("Project documents could not be loaded."); return response.json() as Promise<{ documents: ProjectDocument[] }>; }).then((result) => { if (active) setDocuments(result.documents); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Document list unavailable."); }); return () => { active = false; }; }, [projectId]);

  async function addDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, sourceName: `${title}.txt`, content }) });
      if (!response.ok) throw new Error(response.status === 413 ? "Text exceeds the 200 KB limit." : "Document could not be indexed. Check Supabase configuration.");
      const result = await response.json() as { duplicate: boolean; chunkCount?: number };
      await loadDocuments(); setNotice(result.duplicate ? "This content is already indexed." : `Document indexed into ${result.chunkCount} searchable excerpts.`); setTitle(""); setContent("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Document could not be saved."); }
    finally { setBusy(false); }
  }

  return <details className="project-documents"><summary><BookOpenText size={12} /> Project knowledge <span>{documents.length}</span></summary><div className="project-documents-body"><p>Add project requirements or technical notes as plain text. Relevant excerpts are retrieved for future analyses.</p>{documents.length > 0 && <ul>{documents.map((document) => <li key={document.id}><span><strong>{document.title}</strong><small>{document.status} · {new Date(document.created_at).toLocaleDateString("en")}</small></span></li>)}</ul>}<form onSubmit={addDocument}><label>Document title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /></label><label>Plain text<textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={80} maxLength={200000} rows={5} required placeholder="Paste a requirement, architecture note, or runbook excerpt (80 characters minimum)." /></label><small>{content.length.toLocaleString("en")} / 200,000 characters</small><button type="submit" disabled={busy || content.trim().length < 80}><FilePlus2 size={13} />{busy ? "Indexing…" : "Add project document"}</button></form>{error && <p role="alert" className="project-error">{error}</p>}{notice && <p role="status" className="project-success">{notice}</p>}</div></details>;
}
