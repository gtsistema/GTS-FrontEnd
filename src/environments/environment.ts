/**
 * Desenvolvimento: usar proxy local (`/api`) para evitar CORS no navegador.
 * O `proxy.conf.json` redireciona para o backend local.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',
  API_BASE_URL: '/api',
  emergencyAdmin: {
    enabled: true,
    username: 'teste.admin',
    password: 'GTS@12345'
  },
  /** Base URL ViaCEP: em dev usa proxy /viacep. */
  viacepBaseUrl: '/viacep',
  /** Base URL BrasilAPI (CNPJ): consulta direta na BrasilAPI. */
  brasilApiBaseUrl: 'https://brasilapi.com.br'
};
