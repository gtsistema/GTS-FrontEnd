import { EntradaSaidaOutput, EntradaSaidaPostInput } from '../models/entrada-saida.models';
import { EntradaSaidaFormDisplayVm } from './entrada-saida-form.models';

export function buildEntradaSaidaPostPayload(params: {
  motoristaId: number;
  transportadoraId: number;
  veiculoId: number;
  dataHoraEntradaIso: string;
  dataHoraSaidaIso?: string;
  observacao: string;
}): EntradaSaidaPostInput {
  return {
    motoristaId: params.motoristaId,
    transportadoraId: params.transportadoraId,
    veiculoId: params.veiculoId,
    dataHoraEntrada: params.dataHoraEntradaIso,
    dataHoraSaida: params.dataHoraSaidaIso,
    observao: params.observacao.trim() ? params.observacao.trim() : undefined
  };
}

export function mapEntradaSaidaOutputToDisplay(api: EntradaSaidaOutput): EntradaSaidaFormDisplayVm {
  const motorista = (api.motorista ?? {}) as Record<string, unknown>;
  const transportadora = (api.transportadora ?? {}) as Record<string, unknown>;
  const veiculo = (api.veiculo ?? {}) as Record<string, unknown>;
  const obs = api as EntradaSaidaOutput & { observao?: string | null };
  return {
    motoristaTexto: String(motorista['nome'] ?? motorista['nomeCompleto'] ?? ''),
    transportadoraTexto: String(
      transportadora['nomeFantasia'] ?? transportadora['razaoSocial'] ?? ''
    ),
    veiculoTexto: String(veiculo['placa'] ?? ''),
    observacaoTexto: String(api.observacao ?? obs.observao ?? '')
  };
}
