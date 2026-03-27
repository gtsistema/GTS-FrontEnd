/** Resposta paginada genérica da API */
export interface PagedResultDTO<T> {
  items: T[];
  totalCount: number;
  numeroPagina?: number;
  tamanhoPagina?: number;
}

/** Parâmetros para GET /api/Transportadora/Buscar */
export interface TransportadoraBuscarParams {
  Termo?: string;
  Propriedade?: string;
  NumeroPagina: number;
  TamanhoPagina: number;
}

/** Item da listagem (Buscar) */
export interface TransportadoraListItemDTO {
  id: number;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  ativo: boolean;
}

/** Endereço no formulário de transportadora */
export interface TransportadoraEnderecoDTO {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
}

/** Dados principais da transportadora (formulário / API) */
export interface TransportadoraDTO {
  id?: number;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  email: string;
  telefone?: string;
  ativo: boolean;
  /** Responsável principal */
  responsavelNome?: string;
  responsavelCpf?: string;
  responsavelCelular?: string;
  responsavelEmail?: string;
  responsavelCargo?: string;
  /** Acessos (informativo) */
  tipoAcesso?: string;
  observacaoInterna?: string;
  /** Endereço */
  endereco?: TransportadoraEnderecoDTO;
}

/** Resposta de ObterPorId (pode vir em result ou direto) */
export interface TransportadoraObterPorIdResultDTO {
  id: number;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  ativo?: boolean;
  responsavelNome?: string;
  responsavelCpf?: string;
  responsavelCelular?: string;
  responsavelEmail?: string;
  responsavelCargo?: string;
  tipoAcesso?: string;
  observacaoInterna?: string;
  endereco?: TransportadoraEnderecoDTO;
  [key: string]: unknown;
}
