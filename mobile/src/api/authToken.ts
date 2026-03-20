/** Token em memória para o link HTTP do tRPC (sincronizado com SecureStore no Auth). */
let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
}

export function getAuthToken() {
  return memoryToken;
}
