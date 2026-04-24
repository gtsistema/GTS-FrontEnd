/**
 * Tipos gerados a partir do OpenAPI do backend.
 * Gerado por: npm run generate:api
 * Não edite manualmente; para atualizar, rode o script quando o backend mudar.
 */
export type { paths, components, webhooks } from './api-types';
import type { components } from './api-types';

/** Atalho para os schemas (DTOs) do backend. Ex.: ApiSchemas['EstacionamentoPostInput'] */
export type ApiSchemas = components['schemas'];
