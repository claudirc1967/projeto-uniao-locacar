import { useEffect, useState } from "react";
import { secureStorage } from "./secureStorage";

const STORAGE_KEY = "adVisitorId";
const GUEST_VISITOR_ID = /^guest:[a-z0-9]{16,40}$/;

let memoryId: string | null = null;
let pending: Promise<string> | null = null;

function randomHex(byteLength: number): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let hex = "";
  for (let i = 0; i < byteLength; i++) {
    hex += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return hex;
}

function createGuestVisitorId(): string {
  return `guest:${randomHex(16)}`;
}

/** Id estável deste aparelho para o teto de impressões de quem não está logado. */
export function getAdVisitorId(): Promise<string> {
  if (memoryId && GUEST_VISITOR_ID.test(memoryId)) {
    return Promise.resolve(memoryId);
  }
  if (!pending) {
    pending = (async () => {
      const stored = (await secureStorage.getItemAsync(STORAGE_KEY))?.trim().toLowerCase();
      const id =
        stored && GUEST_VISITOR_ID.test(stored) ? stored : createGuestVisitorId();
      if (id !== stored) {
        await secureStorage.setItemAsync(STORAGE_KEY, id);
      }
      memoryId = id;
      return id;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

/** `enabled` falso enquanto houver sessão: a conta substitui o id do visitante. */
export function useAdVisitorId(enabled: boolean): string | null {
  const [visitorId, setVisitorId] = useState<string | null>(
    enabled && memoryId ? memoryId : null
  );

  useEffect(() => {
    if (!enabled) {
      setVisitorId(null);
      return;
    }
    if (memoryId) {
      setVisitorId(memoryId);
      return;
    }
    let cancelled = false;
    void getAdVisitorId().then((id) => {
      if (!cancelled) setVisitorId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? visitorId : null;
}
