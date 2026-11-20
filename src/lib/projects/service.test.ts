import { describe, expect, it, vi } from "vitest";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteProject, setProjectArchived, updateProject } from "@/lib/projects/service";

type UserClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function makeClient(result: { error: { code?: string } | null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn(() => ({ eq }));
  const remove = vi.fn(() => ({ eq }));
  const client = { from: vi.fn(() => ({ update, delete: remove })) } as unknown as UserClient;
  return { client, from: client.from as unknown as ReturnType<typeof vi.fn>, update, remove, eq };
}

describe("project management services", () => {
  it("updates project fields through the owner-scoped user client", async () => {
    const mocks = makeClient({ error: null });
    await updateProject(mocks.client, "project-uuid", { name: "Payments", description: "Checkout work" });
    expect(mocks.from).toHaveBeenCalledWith("projects");
    expect(mocks.update).toHaveBeenCalledWith({ name: "Payments", description: "Checkout work" });
    expect(mocks.eq).toHaveBeenCalledWith("id", "project-uuid");
  });

  it("reports duplicate names and failed deletes instead of claiming success", async () => {
    const duplicate = makeClient({ error: { code: "23505" } });
    await expect(updateProject(duplicate.client, "project-uuid", { name: "Payments", description: "" })).rejects.toThrow("already exists");
    const failedDelete = makeClient({ error: { code: "42501" } });
    await expect(deleteProject(failedDelete.client, "project-uuid")).rejects.toThrow("Could not delete project");
  });

  it("archives and restores a project through the owner-scoped client", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "project-uuid" }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const client = { from } as unknown as UserClient;
    await setProjectArchived(client, "project-uuid", true);
    expect(from).toHaveBeenCalledWith("projects");
    expect(update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
    await setProjectArchived(client, "project-uuid", false);
    expect(update).toHaveBeenLastCalledWith({ archived_at: null });
  });

  it("rejects archiving projects that are missing or not visible to the owner", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ update })) } as unknown as UserClient;
    await expect(setProjectArchived(client, "project-uuid", true)).rejects.toThrow("Could not update project archive status");
  });

  it("deletes only the requested project through the user client", async () => {
    const mocks = makeClient({ error: null });
    await deleteProject(mocks.client, "project-uuid");
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("id", "project-uuid");
  });
});
