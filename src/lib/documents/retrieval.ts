export type DocumentEvidenceSegment = { id: string; documentId: string; chunkId: string; sourceLocation: unknown; sourceUrl: string; content: string };

const stopWords = new Set(["about", "after", "again", "also", "from", "have", "into", "more", "most", "only", "that", "their", "there", "these", "this", "those", "with", "would", "could", "should", "issue", "error", "users", "user"]);

function terms(value: string) {
  return new Set(value.toLocaleLowerCase().match(/[a-z0-9_-]{3,}/g)?.filter((term) => !stopWords.has(term)) ?? []);
}

export function retrieveRelevantChunks<T extends { id: string; document_id: string; content: string; source_location: unknown }>(query: string, chunks: T[], limit = 4): Array<T & { score: number }> {
  const queryTerms = terms(query);
  if (!queryTerms.size) return [];
  return chunks.map((chunk) => {
    const chunkTerms = terms(chunk.content);
    let score = 0;
    for (const term of queryTerms) if (chunkTerms.has(term)) score += 1 + Math.min(1, chunk.content.toLocaleLowerCase().split(term).length - 1) * 0.05;
    return { ...chunk, score };
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score).slice(0, Math.max(1, limit));
}

export function documentEvidenceSegments<T extends { id: string; document_id: string; content: string; source_location: unknown }>(chunks: T[]): DocumentEvidenceSegment[] {
  return chunks.map((chunk) => ({ id: `document:${chunk.id}`, documentId: chunk.document_id, chunkId: chunk.id, sourceLocation: chunk.source_location, sourceUrl: `document://${chunk.document_id}#${chunk.id}`, content: chunk.content }));
}
