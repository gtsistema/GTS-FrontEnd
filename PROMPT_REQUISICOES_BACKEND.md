# Regra: Todas as requisições ao backend devem ser feitas pelo Angular

## Objetivo

O sistema (frontend Angular) **deve ser o único ponto de integração** com o backend. Toda comunicação com a API (ler, criar, editar, excluir, autenticar, etc.) deve ser feita **via Angular**, usando a camada HTTP do projeto.

## O que o sistema precisa fazer

1. **Centralizar requisições no Angular**
   - Todas as chamadas ao backend (REST/HTTP) devem ser feitas a partir do frontend Angular.
   - Nenhuma funcionalidade que dependa de dados ou ações do backend pode ser implementada sem uma requisição HTTP disparada pelo Angular (services, ApiService, HttpClient).

2. **Usar a camada de API do projeto**
   - Utilizar o **ApiService** (`src/app/core/api/services/api.service.ts`) para GET, POST, PUT, PATCH e DELETE, com base em `environment.API_BASE_URL`.
   - Ou serviços de domínio (ex.: EstacionamentoService, AuthService) que utilizem `HttpClient` e, quando aplicável, o ApiService ou a mesma base URL.
   - Todas as requisições devem passar pelos **interceptors** configurados (AuthInterceptor, ErrorInterceptor) para token, tratamento de erro e toasts.

3. **Alinhar ao contrato do backend**
   - Payloads de request e tipos de response devem seguir o contrato do backend (OpenAPI/Swagger).
   - Usar os **tipos gerados** em `src/app/core/api/generated/` (gerados com `npm run generate:api`) para tipar DTOs e respostas sempre que possível.
   - Ao adicionar ou alterar endpoints, atualizar o cliente (services) e, se necessário, rodar `npm run generate:api` e ajustar o código.

4. **Tratar sucesso e erro na UI**
   - Em cada fluxo (criar, editar, excluir, login, etc.): em **sucesso**, exibir toast de sucesso (ToastService); em **erro**, deixar o ErrorInterceptor exibir o toast de erro (ou exibir toast específico quando fizer sentido).
   - Não engolir erros com `catchError` que retornem valor sem propagar o erro, a menos que haja motivo explícito; do contrário o ErrorInterceptor não conseguirá exibir o toast de erro.

5. **Consistência**
   - Novos recursos que dependam do backend devem ter um **service** (ou uso direto do ApiService) que encapsule a URL, o método HTTP e a tipagem.
   - Evitar URLs hardcoded fora de `environment` e do ApiService; usar `environment.API_BASE_URL` e paths relativos.

## URL base única (environment)

- **Todas** as requisições devem usar a base da API definida em **`environment.API_BASE_URL`** (em `src/environments/environment.ts` e `environment.prod.ts`).
- Não usar URLs absolutas hardcoded (ex.: `https://gtsbackend...`). Usar sempre `${environment.API_BASE_URL}/caminho/do/endpoint`.
- Em desenvolvimento, `API_BASE_URL` é `/api` e o proxy (`proxy.conf.json`) encaminha para o backend; em produção, é a URL completa do backend. Assim todas as requisições passam pelo mesmo canal e pelos interceptors (auth, erro, toast).

## Resumo em uma frase

**O Angular deve realizar todas as requisições ao backend usando `environment.API_BASE_URL`; nenhuma operação de dados ou autenticação do backend pode existir no sistema sem ser acionada por uma requisição HTTP feita pelo frontend Angular.**
