"use client";

import { useActionState } from "react";
import { createProjectAction, type ProjectFormState } from "@/app/projects/actions";

const initialState: ProjectFormState = {};

const errorText: Record<string, string> = {
  supabase_missing: "Project storage is not configured yet. Add the Supabase URL and publishable key, then restart the app.",
  session_missing: "Your session expired. Sign in again before creating a project.",
  duplicate_name: "You already have a project with that name.",
  check_fields: "Add a project name between 1 and 100 characters.",
  save_failed: "We could not save the project. Your details are still in the form; try again.",
};

export function ProjectForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(createProjectAction, initialState);
  return (
    <form action={action} className="project-form">
      <label>Project name<input name="name" required minLength={1} maxLength={100} placeholder="e.g. Checkout platform" aria-describedby={state.fieldErrors?.name ? "project-name-error" : undefined} /></label>
      {state.fieldErrors?.name && <p className="field-error" id="project-name-error">{state.fieldErrors.name}</p>}
      <label>Description <span className="optional-label">OPTIONAL</span><textarea name="description" rows={3} maxLength={2000} placeholder="What does this team or repository own?" /></label>
      {state.error && <p className="project-error" role="alert">{errorText[state.error] ?? errorText.save_failed}</p>}
      <button className="project-submit" type="submit" disabled={!configured || pending}>
        {pending ? "Creating project…" : "Create project"}
      </button>
      {!configured && <p className="project-disabled-note">Supabase connection is required to save a project.</p>}
      <p className="project-form-foot">Projects are private to your account.</p>
    </form>
  );
}
