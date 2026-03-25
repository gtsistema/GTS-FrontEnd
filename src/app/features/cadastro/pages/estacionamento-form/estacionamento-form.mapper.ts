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
  responsavelLegalEmail?: string;
  contatoTelefone?: string;
  /** Até 5 contatos complementares (nome, cpf, telefone, email). */
  contatosComplementares?: Array<{ nome?: string; cpf?: string; telefone?: string; email?: string }>;
  /** Lista de endereços (pessoa.enderecos no backend). */
  enderecos?: Array<{
    principal?: boolean;
    tipoEndereco?: number;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  }>;
  capacidadeVeiculos?: number | null;
  tamanho?: string | number | null;
  possuiSeguranca?: boolean;
  possuiBanheiro?: boolean;
  tipoTaxaMensalidade?: 'taxa' | 'mensalidade' | null;
  taxaPercentual?: number | null;
  mensalidadeValor?: number | null;
  banco?: string;
  agenciaNumero?: string;
  agenciaDigito?: string;
  contaNumero?: string;
  contaDigito?: string;
  tipoConta?: string;
  chavePix?: string;
  /** Titular da conta (padrão = pessoa responsável). */
  titularRazaoSocial?: string;
  titularCnpj?: string;
}

/** TipoCobranca no backend: 0 = nenhum, 1 = taxa, 2 = mensalidade (ajustar se o backend usar outros valores). */
function mapTipoCobranca(tipo: 'taxa' | 'mensalidade' | null | undefined): number {
  if (tipo === 'taxa') return 1;
  if (tipo === 'mensalidade') return 2;
  return 0;
}

/** Monta string única de agência para o backend: "numero" ou "numero-digito". */
export function buildAgencia(numero: string | null | undefined, digito: string | null | undefined): string {
  const n = String(numero ?? '').trim().replace(/\D/g, '');
  const d = String(digito ?? '').trim().replace(/\D/g, '').slice(0, 1);
  if (!n) return '';
  return d ? `${n}-${d}` : n;
}

/** Monta string única de conta para o backend: "numero" ou "numero-digito". */
export function buildConta(numero: string | null | undefined, digito: string | null | undefined): string {
  const n = String(numero ?? '').trim().replace(/\D/g, '');
  const d = String(digito ?? '').trim().replace(/\D/g, '').slice(0, 1);
  if (!n) return '';
  return d ? `${n}-${d}` : n;
}

/** Endereço no formato do backend (para preservar ao editar). */
export type EnderecoPayload = Record<string, unknown>;

/**
 * Gera o payload para POST Gravar / PUT Alterar conforme contrato do backend.
 * @param value valor do formulário
 * @param enderecosCarregados endereços retornados por ObterPorId (preservados na alteração)
 * @param fotosBase64 fotos em base64 para envio ao backend (máx. 4)
 */
export function formValueToEstacionamentoPayload(
  value: FormValue,
  enderecosCarregados?: EnderecoPayload[] | null,
  fotosBase64?: string[]
): Record<string, unknown> {
  const doc = String(value.pessoa?.documento ?? '').replace(/\D/g, '');
  const cpf = String(value.responsavelLegalCpf ?? '').replace(/\D/g, '');
  const telefone = String(value.contatoTelefone ?? '').replace(/\D/g, '').trim();

  const pessoaId = value.pessoaId ?? value.pessoa?.id ?? 0;
  const contatos: Record<string, unknown>[] = [];
  if (telefone.length >= 10) {
    contatos.push({
      pessoaId,
      principal: true,
      tipoContato: 1,
      numero: telefone,
      observacao: ''
    });
  }
  const complementares = value.contatosComplementares ?? [];
  for (const c of complementares) {
    const num = String(c.telefone ?? '').replace(/\D/g, '').trim();
    if (num.length >= 10) {
      contatos.push({
        pessoaId,
        principal: false,
        tipoContato: 1,
        numero: num,
        observacao: ''
      });
    }
  }

  const enderecosForm = value.enderecos ?? [];
  const enderecos = enderecosForm.length > 0
    ? enderecosForm.map((e) => ({
        pessoaId,
        principal: e.principal ?? false,
        tipoEndereco: e.tipoEndereco ?? 1,
        cep: e.cep ?? '',
        logradouro: e.logradouro ?? '',
        numero: e.numero ?? '',
        complemento: e.complemento ?? '',
        bairro: e.bairro ?? '',
        cidade: e.cidade ?? '',
        estado: e.estado ?? ''
      }))
    : (enderecosCarregados && enderecosCarregados.length > 0 ? enderecosCarregados : []);

  const pessoa: Record<string, unknown> = {
    id: value.pessoa?.id ?? 0,
    tipoPessoa: value.pessoa?.tipoPessoa ?? 2,
    nomeRazaoSocial: value.pessoa?.nomeRazaoSocial ?? '',
    nomeFantasia: value.pessoa?.nomeFantasia ?? '',
    documento: doc,
    email: value.pessoa?.email ?? '',
    ativo: value.pessoa?.ativo ?? true,
    enderecos,
    contatos
  };

  const tipoCobranca = mapTipoCobranca(value.tipoTaxaMensalidade ?? null);
  const capacidade = value.capacidadeVeiculos != null ? Number(value.capacidadeVeiculos) : 0;

  const payload: Record<string, unknown> = {
    id: value.id ?? 0,
    descricao: value.descricao ?? '',
    dataCriacao: new Date().toISOString(),
    dataAtualizacao: new Date().toISOString(),
    pessoaId: value.pessoaId ?? 0,
    capacidadeVeiculo: capacidade,
    tamanhoTerreno: value.tamanho != null ? String(value.tamanho) : '',
    resposanvelLegal: value.responsavelLegalNome ?? '', // nome do backend (typo)
    responsavelCpf: cpf || '',
    possuiSeguranca: value.possuiSeguranca ?? false,
    possuiBanheiro: value.possuiBanheiro ?? false,
    tipoCobranca,
    cobrancaPorcentagem: value.tipoTaxaMensalidade === 'taxa' ? (value.taxaPercentual ?? 0) : 0,
    cobrancaValor: value.tipoTaxaMensalidade === 'mensalidade' ? (value.mensalidadeValor ?? 0) : 0,
    pessoa,
    banco: value.banco ?? '',
    agencia: buildAgencia(value.agenciaNumero, value.agenciaDigito),
    conta: buildConta(value.contaNumero, value.contaDigito),
    tipoConta: value.tipoConta ?? '',
    chavePix: value.chavePix ?? '',
    titularRazaoSocial: value.titularRazaoSocial ?? '',
    titularCnpj: String(value.titularCnpj ?? '').replace(/\D/g, '')
  };

  const fotos = fotosBase64?.filter((f) => typeof f === 'string' && f.length > 0) ?? [];
  if (fotos.length > 0) {
    payload['fotos'] = fotos;
  }

  return payload;
}
