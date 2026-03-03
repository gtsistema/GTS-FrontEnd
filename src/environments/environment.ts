/**
 * Desenvolvimento: /api é repassado ao backend pelo proxy (proxy.conf.json).
 * Assim o navegador não faz requisição cross-origin e não há bloqueio de CORS.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  /** Base URL da API (uso em ApiService e interceptors). */
  API_BASE_URL: '/api'
};
