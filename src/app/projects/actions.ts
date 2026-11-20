"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectSchema, projectIdSchema } from "@/lib/projects/schema";
import { createProject, deleteProject, setProjectArchived, updateProject } from "@/lib/projects/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ProjectFormState = { error?: string; success?: boolean; fieldErrors?: { name?: string } };

export async function createProjectAction(_previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  if (!isSupabaseConfigured()) return { error: "supabase_missing" };

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: "check_fields", fieldErrors: { name: parsed.error.flatten().fieldErrors.name?.[0] } };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const ownerId = claims?.claims?.sub;
  if (typeof ownerId !== "string") return { error: "session_missing" };

  try {
    await createProject(supabase, ownerId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error && error.message.includes("already exists") ? "duplicate_name" : "save_failed" };
  }

  revalidatePath("/");
  revalidatePath("/projects");
  redirect("/projects?created=1");
}

export async function updateProjectAction(projectId: string, _previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  if (!isSupabaseConfigured()) return { error: "supabase_missing" };
  if (!projectIdSchema.safeParse(projectId).success) return { error: "save_failed" };
  const parsed = createProjectSchema.safeParse({ name: formData.get("name"), description: formData.get("description") ?? "" });
  if (!parsed.success) return { error: "check_fields", fieldErrors: { name: parsed.error.flatten().fieldErrors.name?.[0] } };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "session_missing" };
  try { await updateProject(supabase, projectId, parsed.data); }
  catch (error) { return { error: error instanceof Error && error.message.includes("already exists") ? "duplicate_name" : "save_failed" }; }
  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProjectAction(projectId: string, _previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  void formData;
  if (!isSupabaseConfigured()) return { error: "supabase_missing" };
  if (!projectIdSchema.safeParse(projectId).success) return { error: "save_failed" };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "session_missing" };
  try { await deleteProject(supabase, projectId); }
  catch { return { error: "save_failed" }; }
  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true };
}


export async function setProjectArchivedAction(projectId: string, archived: boolean, _previous: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  void formData;
  if (!isSupabaseConfigured()) return { error: "supabase_missing" };
  if (!projectIdSchema.safeParse(projectId).success || typeof archived !== "boolean") return { error: "save_failed" };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return { error: "session_missing" };
  try { await setProjectArchived(supabase, projectId, archived); }
  catch { return { error: "save_failed" }; }
  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true };
}
