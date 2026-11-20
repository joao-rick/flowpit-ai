export type BoundedJsonResult = { ok: true; value: unknown } | { ok: false; reason: "too_large" | "invalid_json" };

export async function readBoundedJson(request: Request, maxBytes: number): Promise<BoundedJsonResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, reason: "invalid_json" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
