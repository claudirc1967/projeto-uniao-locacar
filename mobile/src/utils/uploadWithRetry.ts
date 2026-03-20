const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function putWithRetry(
  uploadUrl: string,
  body: Blob,
  headers: Record<string, string>,
  maxAttempts = 2
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body,
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
