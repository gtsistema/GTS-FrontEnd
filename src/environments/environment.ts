/**
 * Desenvolvimento: usa proxy (/api) para evitar CORS e ver respostas de erro do backend.
 * O proxy (proxy.conf.json) encaminha /api para https://gtsbackend.azurewebsites.net.
 * Assim as requisições são same-origin (localhost:4200) e 500/erros não são bloqueados por CORS.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  /** Base URL da API — em dev usa proxy para não depender de CORS no backend. */
  API_BASE_URL: '/api',
  /** Base URL ViaCEP: em dev usa proxy /viacep. */
  viacepBaseUrl: '/viacep'
};
