/**
 * Desenvolvimento: chamadas da API vão direto para o backend na Azure.
 * Request URL no Network aparecerá como https://gtsbackend.azurewebsites.net/...
 * O backend deve permitir CORS para http://localhost:4200.
 */
export const environment = {
  production: false,
  apiUrl: 'https://gtsbackend.azurewebsites.net/api',
  /** Base URL da API — sempre Azure para que listar/upload/deletar fotos usem o backend real. */
  API_BASE_URL: 'https://gtsbackend.azurewebsites.net/api',
  /** Base URL ViaCEP: em dev usa proxy /viacep. */
  viacepBaseUrl: '/viacep'
};
