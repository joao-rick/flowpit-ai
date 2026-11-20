"use client";

import { useActionState } from "react";
import { deleteProjectAction, updateProjectAction } from "@/app/projects/actions";
import type { Project } from "@/lib/projects/schema";
import type { ProjectFormState } from "@/app/projects/actions";

const initialState: ProjectFormState = {};

export function ProjectManageForm({ project }: { project: Project }) {
  const updateAction = updateProjectAction.bind(null, project.id);
  const [state, action, pending] = useActionState(updateAction, initialState);
  const deleteAction = deleteProjectAction.bind(null, project.id);
  const [deleteState, deleteFormAction, deleting] = useActionState(deleteAction, initialState);
  return (
    <details className="project-settings">
      <summary>Project settings</summary>
      <form action={action} className="project-settings-form">
        <label>Project name<input name="name" defaultValue={project.name} required minLength={1} maxLength={100} /></label>
        <label>Description<textarea name="description" defaultValue={project.description} rows={3} maxLength={2000} /></label>
        {state.error && <p className="project-error" role="alert">{state.error === "duplicate_name" ? "A project with that name already exists." : "Project changes could not be saved."}</p>}
        {state.success && <span className="project-settings-note" aria-live="polite">Changes saved.</span>}
        <button className="project-settings-save" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </form>
      <form action={deleteFormAction} className="project-delete-form" onSubmit={(event) => { if (!window.confirm(`Delete “${project.name}” and its imported issues and analysis history? This cannot be undone.`)) event.preventDefault(); }}>
        <button type="submit" disabled={deleting}>{deleting ? "Deleting…" : "Delete project"}</button>
        {deleteState.error && <p className="project-error" role="alert">Project could not be deleted. Try again.</p>}
      </form>
    </details>
  );
}
