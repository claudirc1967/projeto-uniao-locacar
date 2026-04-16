/** Validações de formulário de autenticação (evita erro genérico do Zod no servidor). */

export function validateEmailForAuth(email: string): string | null {
  const t = email.trim();
  if (!t) return "E-mail é obrigatório.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return "E-mail: informe um endereço válido.";
  }
  return null;
}

export function validatePasswordForAuth(password: string): string | null {
  if (password == null || password.length === 0) {
    return "Senha é obrigatória.";
  }
  if (password.length < 6) {
    return "Senha: use pelo menos 6 caracteres.";
  }
  return null;
}

export function validateResetToken(token: string): string | null {
  const t = token.trim();
  if (!t) return "Token é obrigatório.";
  if (t.length < 10) {
    return "Token: cole o token completo recebido (mínimo 10 caracteres).";
  }
  return null;
}
