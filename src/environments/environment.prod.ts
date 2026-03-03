/**
 * Ambiente de produção.
 * O backend deve permitir CORS para a origem do frontend.
 */
export const environment = {
  production: true,
  apiUrl: 'https://gtsbackend.azurewebsites.net/api',
  /** Base URL da API (uso em ApiService e interceptors). */
  API_BASE_URL: 'https://gtsbackend.azurewebsites.net/api'
};
