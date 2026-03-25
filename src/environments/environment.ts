/**
 * Desenvolvimento: API direta no Azure (requisições aparecem como gtsbackend.azurewebsites.net na Rede).
 * O backend deve expor CORS para `http://localhost:4200`.
 */
export const environment = {
  production: false,
  apiUrl: 'https://gtsbackend.azurewebsites.net',
  API_BASE_URL: 'https://gtsbackend.azurewebsites.net/api',
  /** Base URL ViaCEP: em dev usa proxy /viacep. */
  viacepBaseUrl: '/viacep',
  /** Base URL BrasilAPI (CNPJ): consulta direta na BrasilAPI. */
  brasilApiBaseUrl: 'https://brasilapi.com.br'
};
