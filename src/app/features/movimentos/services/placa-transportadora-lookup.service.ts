import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

/** Dados do veículo/transportadora vindos do cadastro (backend). */
export interface DadosVeiculoCadastro {
  transportadora: string;
  modeloVeiculo: string;
  anoFabricacao: string;
  quantidadeEixos: string;
}

/**
 * Serviço para buscar por placa se o veículo está vinculado a alguma transportadora
 * cadastrada no sistema. Retorna transportadora e dados do veículo quando houver cadastro.
 * Quando o backend estiver disponível, substituir por chamada HTTP.
 */
@Injectable({ providedIn: 'root' })
export class PlacaTransportadoraLookupService {
  /**
   * Busca dados do veículo/transportadora pela placa.
   * Se houver cadastro no banco da transportadora, retorna todas as informações;
   * se não, retorna null (formulário permanece em branco para preenchimento).
   *
   * TODO: Integrar com backend. Ex.: GET /api/Veiculo/PorPlaca?placa=XXX
   * e mapear a resposta para DadosVeiculoCadastro.
   */
  getDadosVeiculoPorPlaca(placa: string): Observable<DadosVeiculoCadastro | null> {
    const p = (placa || '').trim().toUpperCase();
    if (!p) return of(null);
    // Sem backend: sempre retorna null. Quando houver API, fazer GET e mapear a resposta.
    return of(null).pipe(delay(0));
  }
}
