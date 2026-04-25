/** Item da listagem GET /api/Veiculo?... */
export interface VeiculoListItemDTO {
  id: number;
  placa: string;
  marcaModelo: string;
  cor?: string;
  anoFabricacao?: number;
  anoModelo?: number;
  tipoVeiculo?: string;
  centroCusto?: string;
  ativo: boolean;
  transportadoraId?: number;
}

/** Dados do veículo (formulário / API) */
export interface VeiculoDTO {
  id?: number;
  transportadoraId?: number;
  placa: string;
  veiculoModeloId?: number;
  marcaModelo?: string;
  cor?: string;
  anoFabricacao?: number;
  anoModelo?: number;
  tipoVeiculo?: string;
  centroCusto?: string;
  ativo: boolean;
}

export interface VeiculoBuscarParams {
  /** Mapeado para query `Descricao` no serviço. */
  Termo?: string;
  /** Busca por placa (GET /api/Veiculo?Placa=xxx) */
  Placa?: string;
  TransportadoraId?: number;
  NumeroPagina: number;
  TamanhoPagina: number;
}

export interface PagedResultVeiculoDTO {
  items: VeiculoListItemDTO[];
  totalCount: number;
  numeroPagina: number;
  tamanhoPagina: number;
}
