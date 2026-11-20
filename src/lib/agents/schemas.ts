import { z } from "zod";

export const evidenceReferenceInputSchema = z.object({
  segmentId: z.string().min(1).max(120),
  quote: z.string().min(1).max(400),
}).strict();

export const issueAnalystSchema = z.object({
  summary: z.string().min(10).max(1200),
  facts: z.array(z.object({ statement: z.string().min(3).max(400), evidence: z.array(evidenceReferenceInputSchema).max(5) }).strict()).max(12),
  possibleCauses: z.array(z.object({ hypothesis: z.string().min(3).max(400), evidence: z.array(evidenceReferenceInputSchema).max(5) }).strict()).max(8),
  missingInformation: z.array(z.string().min(3).max(300)).max(10),
}).strict();

const issuePrioritySchema = z.object({
  issueId: z.uuid(),
  issueNumber: z.number().int().positive(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  severity: z.enum(["critical", "major", "moderate", "minor", "unknown"]),
  impact: z.enum(["system_wide", "many_users", "some_users", "single_user", "unknown"]),
  urgency: z.enum(["immediate", "soon", "normal", "low", "unknown"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(1000),
  evidence: z.array(evidenceReferenceInputSchema).max(8),
}).strict();

export const priorityAgentSchema = z.object({
  issuePriorities: z.array(issuePrioritySchema).min(1).max(10),
}).strict();

export const recommendationAgentSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string().min(3).max(120),
    issueIds: z.array(z.uuid()).min(1).max(10),
    description: z.string().min(10).max(800),
    rationale: z.string().min(5).max(500),
    evidence: z.array(evidenceReferenceInputSchema).max(5),
    suggestedSteps: z.array(z.string().min(3).max(300)).min(1).max(6),
    affectedAreas: z.array(z.string().min(2).max(100)).max(8),
    risks: z.array(z.string().min(3).max(300)).max(6),
  }).strict()).max(5),
}).strict();

export const reportAgentSchema = z.object({
  summary: z.string().min(10).max(1200),
  keyFindings: z.array(z.string().min(3).max(400)).max(10),
  recommendedNextStep: z.string().min(3).max(400),
  caveats: z.array(z.string().min(3).max(300)).max(8),
}).strict();

export const documentAgentSchema = z.object({
  findings: z.array(z.object({
    statement: z.string().min(3).max(500),
    evidence: z.array(z.object({ documentId: z.uuid(), chunkId: z.uuid(), quote: z.string().min(1).max(400) }).strict()).max(4),
  }).strict()).max(10),
  missingInformation: z.array(z.string().min(3).max(300)).max(8),
}).strict();

export const analysisRequestSchema = z.object({
  requestText: z.string().trim().min(1).max(4000),
  issueIds: z.array(z.uuid()).min(1).max(10),
}).strict();

export type IssueAnalystOutput = z.infer<typeof issueAnalystSchema>;
export type PriorityAgentOutput = z.infer<typeof priorityAgentSchema>;
export type RecommendationAgentOutput = z.infer<typeof recommendationAgentSchema>;
export type ReportAgentOutput = z.infer<typeof reportAgentSchema>;
export type DocumentAgentOutput = z.infer<typeof documentAgentSchema>;
