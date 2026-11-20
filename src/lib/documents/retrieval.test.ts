import { describe, expect, it } from "vitest";
import { chunkDocumentText } from "@/lib/documents/chunking";
import { documentEvidenceSegments, retrieveRelevantChunks } from "@/lib/documents/retrieval";
import { verifyDocumentEvidence } from "@/lib/agents/evidence";
import { documentAgentSchema } from "@/lib/agents/schemas";

describe("project document indexing and retrieval", () => {
  it("chunks long text with stable indexes and source offsets", () => {
    const text = `${"A meaningful architecture detail. ".repeat(80)}\n\n${"The payment timeout is 3 seconds. ".repeat(80)}`;
    const chunks = chunkDocumentText(text, 600, 80);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0]?.chunkIndex).toBe(0);
    expect(chunks.at(-1)?.sourceLocation.end).toBe(text.trim().length);
  });

  it("ranks relevant chunks and validates document citations", () => {
    const chunks = [
      { id: "11111111-1111-4111-8111-111111111111", document_id: "22222222-2222-4222-8222-222222222222", content: "Payment requests must complete within three seconds or return a retryable timeout.", source_location: { start: 20, end: 100 } },
      { id: "33333333-3333-4333-8333-333333333333", document_id: "44444444-4444-4444-8444-444444444444", content: "The marketing site uses a compact editorial layout.", source_location: { start: 0, end: 50 } },
    ];
    const relevant = retrieveRelevantChunks("payment request timeout", chunks);
    expect(relevant[0]?.id).toBe(chunks[0]?.id);
    const catalog = documentEvidenceSegments(relevant);
    const valid = documentAgentSchema.parse({ findings: [{ statement: "Payment calls use a three second timeout.", evidence: [{ documentId: chunks[0]!.document_id, chunkId: chunks[0]!.id, quote: "within three seconds" }] }], missingInformation: [] });
    expect(verifyDocumentEvidence(valid, catalog).findings[0]?.evidence[0]?.sourceLocation).toEqual({ start: 20, end: 100 });
    expect(() => verifyDocumentEvidence({ ...valid, findings: [{ ...valid.findings[0]!, evidence: [{ ...valid.findings[0]!.evidence[0]!, quote: "five seconds" }] }] }, catalog)).toThrow();
  });
});
