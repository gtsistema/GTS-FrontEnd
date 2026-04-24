/**
 * Ambiente de produção.
 * O backend deve permitir CORS para a origem do frontend.
 */
export const environment = {
  production: true,
  /** Base do backend (sem /api no final). */
  apiUrl: 'https://gtsbackend.azurewebsites.net',
  /** Base URL da API (uso em TransportadoraService, ApiService e interceptors). */
  API_BASE_URL: 'https://gtsbackend.azurewebsites.net/api',
  emergencyAdmin: {
    enabled: false,
    username: '',
    password: ''
  },
  /** Base URL ViaCEP (chamada direta em prod; ViaCEP permite CORS). */
  viacepBaseUrl: 'https://viacep.com.br',
  /** Base URL BrasilAPI (CNPJ). */
  brasilApiBaseUrl: 'https://brasilapi.com.br'
};
