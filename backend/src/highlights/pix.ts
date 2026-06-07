/** Gera referência legível para conciliação manual do PIX. */
export function generateHighlightOrderReference(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HLT-${suffix}`;
}

/**
 * Payload do QR no MVP: chave PIX estática.
 * Valor e referência do pedido são exibidos separadamente na UI.
 */
export function buildHighlightPixQrPayload(pixKey: string): string {
  return pixKey.trim();
}
