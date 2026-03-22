const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toFetchBody(body: Blob | Uint8Array | ArrayBuffer): Blob | ArrayBuffer {
  if (body instanceof Blob) return body;
  if (body instanceof Uint8Array) {
    const sliced = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength
    );
    return sliced as ArrayBuffer;
  }
  return body;
}

export async function putWithRetry(
  uploadUrl: string,
  body: Blob | Uint8Array | ArrayBuffer,
  headers: Record<string, string>,
  maxAttempts = 2
): Promise<void> {
  const fetchBody = toFetchBody(body);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: fetchBody,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await sleep(400 * attempt);
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Falha no upload após tentativas");
}
