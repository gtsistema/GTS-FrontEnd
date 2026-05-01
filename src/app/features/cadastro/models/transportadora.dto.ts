/** Resposta paginada genérica da API */
export interface PagedResultDTO<T> {
  items: T[];
  totalCount: number;
  numeroPagina?: number;
  tamanhoPagina?: number;
}

/** Parâmetros para GET /api/Transportadora?... (`Termo` mapeia para `Descricao` no client). */
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

export interface TransportadoraContatoPayload {
  pessoaId: number;
  principal: boolean;
  tipoContato: 1 | 2 | 3 | 4;
  numero: string;
  observacao: string;
}

export interface TransportadoraEnderecoPayload {
  pessoaId: number;
  principal: boolean;
  tipoEndereco: 1 | 2 | 3 | 4;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface TransportadoraPessoaPayload {
  id: number;
  descricao: string;
  dataCriacao: string;
  dataAtualizacao: string;
  tipoPessoa: 1 | 2;
  nomeRazaoSocial: string;
  nomeFantasia: string;
  documento: string;
  email: string;
  ativo: boolean;
  enderecos: TransportadoraEnderecoPayload[];
  contatos: TransportadoraContatoPayload[];
}

export interface TransportadoraPostPayload {
  id: number;
  descricao: string;
  dataCriacao: string;
  dataAtualizacao: string;
  cnh: string;
  validadeCNH: string;
  pessoaId: number;
  pessoa: TransportadoraPessoaPayload;
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
