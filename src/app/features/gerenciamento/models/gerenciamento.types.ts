/**
 * Tipos e interfaces da tela de Gerenciamento (acessos centralizados).
 * Alinhado aos endpoints de Usuário, Perfil, Estacionamento e Transportadora.
 */

export type TipoVinculo = 'Transportadora' | 'Estacionamento';

export type StatusFiltro = '' | 'ativo' | 'inativo';

/** Item da listagem principal (quando o backend expuser listagem de usuários com vínculo). */
export interface UsuarioGerenciamentoItem {
  id?: string;
  nome?: string | null;
  emailOuLogin?: string | null;
  empresaVinculada?: string | null;
  tipo?: TipoVinculo | string | null;
  cnpj?: string | null;
  perfil?: string | null;
  permissoesResumo?: string | null;
  ativo?: boolean;
  ultimoAcesso?: string | null;
  dataCriacao?: string | null;
  estacionamentoId?: number | null;
  transportadoraId?: number | null;
}

/** Filtros da área de busca. */
export interface GerenciamentoFiltros {
  nomeUsuario: string;
  cnpj: string;
  razaoSocial: string;
  tipo: '' | TipoVinculo;
  perfilId: string;
  status: StatusFiltro;
}

/** Valores do formulário de novo/editar usuário. */
export interface UsuarioGerenciamentoForm {
  nome: string;
  email: string;
  login: string;
  senha: string;
  confirmarSenha: string;
  tipoVinculo: '' | TipoVinculo;
  empresaVinculadaId: number | null;
  empresaVinculadaLabel: string;
  cnpj: string;
  perfilId: string;
  useDefaultPermissions: boolean;
  userPermissionIds: string[];
  ativo: boolean;
}
