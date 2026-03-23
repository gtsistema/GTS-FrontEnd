/**
 * Desenvolvimento: API aponta direto para o backend Azure.
 * Assim o POST/GET de Transportadora aparecem no DevTools como gtsbackend.azurewebsites.net.
 * O backend deve permitir CORS para a origem do frontend (localhost:4200).
 */
export const environment = {
  production: false,
  /** Base do backend (sem /api no final). */
  apiUrl: 'https://gtsbackend.azurewebsites.net',
  /** Base URL da API — usada pelo TransportadoraService e demais services. */
  API_BASE_URL: 'https://gtsbackend.azurewebsites.net/api',
  /** Base URL ViaCEP: em dev usa proxy /viacep. */
  viacepBaseUrl: '/viacep',
  /** Base URL BrasilAPI (CNPJ): consulta direta na BrasilAPI. */
  brasilApiBaseUrl: 'https://brasilapi.com.br'
};
