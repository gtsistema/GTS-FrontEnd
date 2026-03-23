/**
 * DTOs alinhados ao Swagger (tag Menu) — gtsbackend.azurewebsites.net
 * Campos extras (ex.: icone, rota em submenu) podem existir no modelo .NET mesmo fora do schema publicado.
 */

export interface MenuFilterInput {
  descricao?: string | null;
  dataInicial?: string | null;
  dataFinal?: string | null;
  numeroPagina?: number;
  tamanhoPagina?: number;
  propriedade?: string | null;
  sort?: string | null;
}

export interface PermissionInput {
  id?: number;
  ordem?: number;
  subModuleId?: number;
  acao?: string | null;
}

/** Swagger: SubMenuCreateInput — estendido com rota/ativo usados pelo front. */
export interface SubMenuCreateInput {
  id?: number;
  nome?: string | null;
  ordem?: number;
  permissions?: PermissionInput[] | null;
  rota?: string | null;
  ativo?: boolean;
}

export interface MenuCreateInput {
  id?: number;
  nome?: string | null;
  ordem?: number;
  ativo?: boolean;
  icone?: string | null;
  subMenus?: SubMenuCreateInput[] | null;
}

export interface MenuUpdateInput {
  id?: number;
  nome?: string | null;
  ordem?: number;
  ativo?: boolean;
  icone?: string | null;
  subMenus?: SubMenuCreateInput[] | null;
}
