/**
 * Mapeia o valor do formulário para o payload esperado pelo backend (Estacionamento/Gravar e Alterar).
 * Backend: resposanvelLegal, responsavelCpf, capacidadeVeiculo, tamanhoTerreno, tipoCobranca (0-3), etc.
 */

export interface FormValue {
  id: number;
  descricao: string;
  pessoaId: number;
  pessoa: {
    id: number;
    tipoPessoa: 1 | 2;
    nomeRazaoSocial: string;
    nomeFantasia: string;
    documento: string;
    email: string;
    ativo: boolean;
  };
  responsavelLegalNome?: string;
  responsavelLegalCpf?: string;
  contatoTelefone?: string;
  capacidadeVeiculos?: number | null;
  tamanho?: string;
  possuiSeguranca?: boolean;
  possuiBanheiro?: boolean;
  tipoTaxaMensalidade?: 'taxa' | 'mensalidade' | null;
  taxaPercentual?: number | null;
  mensalidadeValor?: number | null;
}

/** TipoCobranca no backend: 0 = nenhum, 1 = taxa, 2 = mensalidade (ajustar se o backend usar outros valores). */
function mapTipoCobranca(tipo: 'taxa' | 'mensalidade' | null | undefined): number {
  if (tipo === 'taxa') return 1;
  if (tipo === 'mensalidade') return 2;
  return 0;
}

/** Endereço no formato do backend (para preservar ao editar). */
export type EnderecoPayload = Record<string, unknown>;

/**
 * Gera o payload para POST Gravar / PUT Alterar conforme contrato do backend.
 * @param value valor do formulário
 * @param enderecosCarregados endereços retornados por ObterPorId (preservados na alteração)
 */
export function formValueToEstacionamentoPayload(
  value: FormValue,
  enderecosCarregados?: EnderecoPayload[] | null
): Record<string, unknown> {
  const doc = String(value.pessoa?.documento ?? '').replace(/\D/g, '');
  const cpf = String(value.responsavelLegalCpf ?? '').replace(/\D/g, '');
  const telefone = String(value.contatoTelefone ?? '').replace(/\D/g, '').trim();

  const pessoaId = value.pessoaId ?? value.pessoa?.id ?? 0;
  const pessoa: Record<string, unknown> = {
    id: value.pessoa?.id ?? 0,
    tipoPessoa: value.pessoa?.tipoPessoa ?? 2,
    nomeRazaoSocial: value.pessoa?.nomeRazaoSocial ?? '',
    nomeFantasia: value.pessoa?.nomeFantasia ?? '',
    documento: doc,
    email: value.pessoa?.email ?? '',
    ativo: value.pessoa?.ativo ?? true,
    enderecos: enderecosCarregados && enderecosCarregados.length > 0 ? enderecosCarregados : [],
    contatos:
      telefone.length >= 10
        ? [
            {
              pessoaId,
              principal: true,
              tipoContato: 1,
              numero: telefone,
              observacao: ''
            }
          ]
        : []
  };

  const tipoCobranca = mapTipoCobranca(value.tipoTaxaMensalidade ?? null);
  const capacidade = value.capacidadeVeiculos != null ? Number(value.capacidadeVeiculos) : 0;

  return {
    id: value.id ?? 0,
    descricao: value.descricao ?? '',
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
    pessoaId: value.pessoaId ?? 0,
    capacidadeVeiculo: capacidade,
    tamanhoTerreno: value.tamanho ?? '',
    resposanvelLegal: value.responsavelLegalNome ?? '', // nome do backend (typo)
    responsavelCpf: cpf || '',
    possuiSeguranca: value.possuiSeguranca ?? false,
    possuiBanheiro: value.possuiBanheiro ?? false,
    tipoCobranca,
    cobrancaPorcentagem: value.tipoTaxaMensalidade === 'taxa' ? (value.taxaPercentual ?? 0) : 0,
    cobrancaValor: value.tipoTaxaMensalidade === 'mensalidade' ? (value.mensalidadeValor ?? 0) : 0,
    pessoa
  };
}
