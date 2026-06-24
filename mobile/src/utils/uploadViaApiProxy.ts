import { getAuthToken } from "../api/authToken";
import { getApiBaseUrl, getTrpcNgrokHeaders } from "./trpcUrl";

export async function putViaApiProxy(
  path: string,
  query: Record<string, string>,
  body: Uint8Array | ArrayBuffer | Blob,
  contentType: string
): Promise<void> {
  const qs = new URLSearchParams(query).toString();
  const url = `${getApiBaseUrl()}${path}?${qs}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getTrpcNgrokHeaders(),
    },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      detail.trim()
        ? `Upload via API falhou (${res.status}): ${detail.slice(0, 200)}`
        : `Upload via API falhou (HTTP ${res.status})`
    );
  }
}
