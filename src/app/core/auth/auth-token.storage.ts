/**
 * Chave única do localStorage para o JWT / apiKey enviado como Bearer.
 * AuthService grava no login; authInterceptor lê em toda requisição ao backend.
 */
export const AUTH_TOKEN_STORAGE_KEY = 'authToken';

/**
 * Remove prefixo "Bearer " se a API devolver o valor já prefixado.
 */
export function normalizeBearerValue(raw: string): string {
  const t = raw.trim();
  if (t.length === 0) return t;
  if (t.toLowerCase().startsWith('bearer ')) {
    return t.slice(7).trim();
  }
  return t;
}
