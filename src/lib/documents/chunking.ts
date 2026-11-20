export type TextChunk = { chunkIndex: number; content: string; sourceLocation: { start: number; end: number } };

export function chunkDocumentText(text: string, maxChunkLength = 1_600, overlap = 180): TextChunk[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  if (maxChunkLength < 300 || overlap < 0 || overlap >= maxChunkLength) throw new Error("Invalid chunk settings.");
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChunkLength, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\n\n", end);
      if (boundary > start + maxChunkLength * 0.55) end = boundary;
    }
    const content = normalized.slice(start, end).trim();
    if (content) chunks.push({ chunkIndex: chunks.length, content, sourceLocation: { start, end } });
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
