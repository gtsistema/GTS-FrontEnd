export interface MotoristaDTO {
  id?: number;
  transportadoraId?: number;
  nomeCompleto: string;
  cpf: string;
  email?: string;
  cnh?: string;
  vencimentoCnh?: string;
  ativo: boolean;
}

export interface MotoristaListItemDTO {
  id: number;
  transportadoraId?: number;
  nomeCompleto: string;
  cpf: string;
  email?: string;
  cnh?: string;
  vencimentoCnh?: string;
  ativo: boolean;
}

export interface MotoristaBuscarParams {
  Termo?: string;
  TransportadoraId?: number;
  NumeroPagina: number;
  TamanhoPagina: number;
}

export interface PagedResultMotoristaDTO {
  items: MotoristaListItemDTO[];
  totalCount: number;
  numeroPagina: number;
  tamanhoPagina: number;
}
