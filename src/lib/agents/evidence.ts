import type { PublicGitHubComment, PublicGitHubIssue } from "@/lib/github/schemas";
import type { IssueAnalystOutput, PriorityAgentOutput, RecommendationAgentOutput } from "@/lib/agents/schemas";
import type { DocumentAgentOutput } from "@/lib/agents/schemas";
import type { DocumentEvidenceSegment } from "@/lib/documents/retrieval";

export type EvidenceSegment = {
  id: string;
  issueId: string;
  issueNumber: number;
  source: "title" | "body" | "label" | "comment";
  sourceUrl: string;
  content: string;
};

export type VerifiedEvidence = {
  issueId: string;
  issueNumber: number;
  source: EvidenceSegment["source"];
  segmentId: string;
  sourceUrl: string;
  quote: string;
};

export function buildEvidenceCatalog(issue: PublicGitHubIssue & { id: string }, comments: PublicGitHubComment[] = []): EvidenceSegment[] {
  const segments: EvidenceSegment[] = [
    { id: `${issue.id}:title`, issueId: issue.id, issueNumber: issue.issue_number, source: "title", sourceUrl: issue.source_url, content: issue.title },
  ];
  if (issue.body) segments.push({ id: `${issue.id}:body`, issueId: issue.id, issueNumber: issue.issue_number, source: "body", sourceUrl: issue.source_url, content: issue.body.slice(0, 20_000) });
  issue.labels.slice(0, 12).forEach((label, index) => segments.push({
    id: `${issue.id}:label:${index}`,
    issueId: issue.id,
    issueNumber: issue.issue_number,
    source: "label",
    sourceUrl: issue.source_url,
    content: label.name,
  }));
  comments.slice(0, 5).forEach((comment) => {
    if (!comment.body.trim()) return;
    segments.push({ id: `${issue.id}:comment:${comment.github_comment_id}`, issueId: issue.id, issueNumber: issue.issue_number, source: "comment", sourceUrl: comment.source_url, content: comment.body.slice(0, 1_500) });
  });
  return segments;
}

function normalizeEvidenceText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function verifyEvidenceReferences(
  references: Array<{ segmentId: string; quote: string }>,
  catalog: EvidenceSegment[],
): VerifiedEvidence[] {
  const byId = new Map(catalog.map((segment) => [segment.id, segment]));
  return references.map((reference) => {
    const segment = byId.get(reference.segmentId);
    if (!segment || !normalizeEvidenceText(segment.content).includes(normalizeEvidenceText(reference.quote))) {
      throw new Error("The agent returned evidence that does not match the source issue.");
    }
    return {
      issueId: segment.issueId,
      issueNumber: segment.issueNumber,
      source: segment.source,
      segmentId: segment.id,
      sourceUrl: segment.sourceUrl,
      quote: reference.quote.trim(),
    };
  });
}

export function verifyIssueAnalystEvidence(output: IssueAnalystOutput, catalog: EvidenceSegment[]) {
  return {
    ...output,
    facts: output.facts.map((fact) => ({ ...fact, evidence: verifyEvidenceReferences(fact.evidence, catalog) })),
    possibleCauses: output.possibleCauses.map((cause) => ({ ...cause, evidence: verifyEvidenceReferences(cause.evidence, catalog) })),
  };
}

export function verifyPriorityEvidence(output: PriorityAgentOutput, catalog: EvidenceSegment[]) {
  const expected = new Map<string, number>();
  for (const segment of catalog) expected.set(segment.issueId, segment.issueNumber);
  const returnedIds = new Set(output.issuePriorities.map((assessment) => assessment.issueId));
  if (returnedIds.size !== output.issuePriorities.length || returnedIds.size !== expected.size || [...expected.keys()].some((id) => !returnedIds.has(id))) {
    throw new Error("The priority agent must assess every selected issue exactly once.");
  }
  const issuePriorities = output.issuePriorities.map((assessment) => {
    if (expected.get(assessment.issueId) !== assessment.issueNumber) throw new Error("The priority agent returned an issue number that does not match the source.");
    const issueCatalog = catalog.filter((segment) => segment.issueId === assessment.issueId);
    return { ...assessment, evidence: verifyEvidenceReferences(assessment.evidence, issueCatalog) };
  });
  const priorityRank = { low: 0, medium: 1, high: 2, critical: 3 };
  const urgencyRank = { low: 0, normal: 1, soon: 2, immediate: 3, unknown: -1 };
  const aggregate = [...issuePriorities].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || urgencyRank[b.urgency] - urgencyRank[a.urgency] || b.confidence - a.confidence)[0]!;
  const verifiedAggregateEvidence = verifyEvidenceReferences(aggregate.evidence.map((item) => ({ segmentId: item.segmentId, quote: item.quote })), catalog.filter((segment) => segment.issueId === aggregate.issueId));
  return {
    ...output,
    priority: aggregate.priority,
    severity: aggregate.severity,
    impact: aggregate.impact,
    urgency: aggregate.urgency,
    confidence: aggregate.confidence,
    reasoning: aggregate.reasoning,
    evidence: verifiedAggregateEvidence,
    issuePriorities,
  };
}

export function verifyRecommendationEvidence(output: RecommendationAgentOutput, catalog: EvidenceSegment[]) {
  const validIssueIds = new Set(catalog.map((segment) => segment.issueId));
  return {
    ...output,
    recommendations: output.recommendations.map((recommendation) => ({
      ...recommendation,
      issueIds: (() => {
        const issueIds = [...new Set(recommendation.issueIds)];
        if (issueIds.length !== recommendation.issueIds.length || issueIds.some((id) => !validIssueIds.has(id))) throw new Error("The recommendation agent referenced an issue outside the selected scope.");
        return issueIds;
      })(),
      evidence: (() => {
        const evidence = verifyEvidenceReferences(recommendation.evidence, catalog);
        if (evidence.some((reference) => !recommendation.issueIds.includes(reference.issueId))) throw new Error("The recommendation agent cited evidence outside its affected issue scope.");
        return evidence;
      })(),
    })),
  };
}

export function verifyDocumentEvidence(output: DocumentAgentOutput, catalog: DocumentEvidenceSegment[]) {
  const byChunkId = new Map(catalog.map((segment) => [segment.chunkId, segment]));
  return {
    ...output,
    findings: output.findings.map((finding) => ({
      ...finding,
      evidence: finding.evidence.map((reference) => {
        const segment = byChunkId.get(reference.chunkId);
        if (!segment || segment.documentId !== reference.documentId || !normalizeEvidenceText(segment.content).includes(normalizeEvidenceText(reference.quote))) {
          throw new Error("The documentation agent returned a citation that does not match a project document.");
        }
        return { ...reference, quote: reference.quote.trim(), sourceUrl: segment.sourceUrl, sourceLocation: segment.sourceLocation };
      }),
    })),
  };
}
