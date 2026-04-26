/**
 * Ambiente de produção.
 * O backend deve permitir CORS para a origem do frontend.
 */
export const environment = {
  production: true,
  /** Base do backend (sem /api no final). Ajuste para o host público da API em produção. */
  apiUrl: 'https://localhost:44317',
  /** Base URL da API (uso em serviços HTTP e interceptors). */
  API_BASE_URL: 'https://localhost:44317/api',
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
