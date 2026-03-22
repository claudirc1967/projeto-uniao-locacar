import * as FileSystem from "expo-file-system/legacy";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Lê bytes da imagem (galeria/câmera). Sem `fetch(uri)` no Android (`content://`).
 * Usa `Uint8Array` em vez de `Blob` — no RN/Hermes, `new Blob([Uint8Array])` falha.
 */
export async function imageUriToUint8Array(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToUint8Array(base64);
}

export async function getUriByteSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === "number" && info.size > 0) {
      return info.size;
    }
  } catch {
    // content:// pode falhar getInfo; estima pelo base64
  }
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return Math.floor((base64.length * 3) / 4);
}
