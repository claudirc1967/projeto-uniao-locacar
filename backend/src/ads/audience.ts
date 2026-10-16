/** Identificador anônimo persistido no aparelho. Não pode ser um id de usuário. */
const GUEST_VISITOR_ID = /^guest:[a-z0-9]{16,40}$/;

/**
 * Conta de impressões: usuário logado tem prioridade.
 * Visitante só entra com o id gerado pelo app (`guest:` + hex).
 */
export function impressionAudienceId(
  userId: string | null | undefined,
  visitorId: string | null | undefined
): string | null {
  if (userId) return userId;
  const visitor = visitorId?.trim().toLowerCase() ?? "";
  if (!GUEST_VISITOR_ID.test(visitor)) return null;
  return visitor;
}
