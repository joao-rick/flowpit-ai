import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreateProjectInput, Project } from "@/lib/projects/schema";

type UserClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function listProjects(client: UserClient): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select("id, owner_id, name, description, created_at, updated_at, archived_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load projects.");
  return (data ?? []) as Project[];
}

export async function createProject(client: UserClient, ownerId: string, input: CreateProjectInput): Promise<Project> {
  const { data, error } = await client
    .from("projects")
    .insert({ owner_id: ownerId, name: input.name, description: input.description })
    .select("id, owner_id, name, description, created_at, updated_at, archived_at")
    .single();

  if (error) throw new Error(error.code === "23505" ? "A project with that name already exists." : "Could not create project.");
  return data as Project;
}

export async function updateProject(client: UserClient, projectId: string, input: CreateProjectInput): Promise<void> {
  const { error } = await client.from("projects").update({ name: input.name, description: input.description }).eq("id", projectId);
  if (error) throw new Error(error.code === "23505" ? "A project with that name already exists." : "Could not update project.");
}

export async function deleteProject(client: UserClient, projectId: string): Promise<void> {
  const { error } = await client.from("projects").delete().eq("id", projectId);
  if (error) throw new Error("Could not delete project.");
}

export type ProjectRepository = {
  id: string;
  project_id: string;
  full_name: string;
  default_branch: string | null;
  last_synced_at: string | null;
};

export async function listProjectRepositories(client: UserClient, projectIds: string[]): Promise<ProjectRepository[]> {
  if (projectIds.length === 0) return [];
  const { data, error } = await client
    .from("repositories")
    .select("id, project_id, full_name, default_branch, last_synced_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load repositories.");
  return (data ?? []) as ProjectRepository[];
}


export async function setProjectArchived(client: UserClient, projectId: string, archived: boolean): Promise<void> {
  const { data, error } = await client.from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Could not update project archive status.");
}
