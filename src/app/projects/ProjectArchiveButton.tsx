"use client";

import { useActionState } from "react";
import { setProjectArchivedAction } from "@/app/projects/actions";
import type { ProjectFormState } from "@/app/projects/actions";
import type { Project } from "@/lib/projects/schema";

const initialState: ProjectFormState = {};

export function ProjectArchiveButton({ project, archived }: { project: Project; archived: boolean }) {
  const actionWithProject = setProjectArchivedAction.bind(null, project.id, !archived);
  const [state, action, pending] = useActionState(actionWithProject, initialState);
  return <form action={action} className="project-archive-form">
    <button type="submit" disabled={pending}>{pending ? "Saving…" : archived ? "Restore project" : "Archive project"}</button>
    {state.success && <span role="status">{archived ? "Project restored." : "Project archived."}</span>}
    {state.error && <span role="alert">Project status could not be updated.</span>}
  </form>;
}
