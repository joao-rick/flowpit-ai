import { z } from "zod";

export const projectIdSchema = z.uuid();

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(""),
}).strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
