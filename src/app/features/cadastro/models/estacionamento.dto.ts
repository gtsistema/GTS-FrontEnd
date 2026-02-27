/** 1 = Pessoa Física, 2 = Pessoa Jurídica */
export type TipoPessoa = 1 | 2;

export interface PessoaDTO {
  id: number;
  tipoPessoa: TipoPessoa;
  nomeRazaoSocial: string;
  nomeFantasia: string;
  documento: string;
  email: string;
  ativo: boolean;
}

export interface EstacionamentoDTO {
  id: number;
  descricao: string;
  pessoaId: number;
  pessoa: PessoaDTO;
}

/** Item resumido para listagem (conforme retorno da API de listagem) */
export interface EstacionamentoListItemDTO {
  id: number;
  descricao: string;
  tipoPessoa: TipoPessoa;
  nomeRazaoSocial: string;
  documento: string;
  email: string;
  ativo: boolean;
}
