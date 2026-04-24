import { Injectable, inject } from '@angular/core';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import { VeiculoService } from '../../cadastro/services/veiculo.service';
import { TransportadoraService } from '../../cadastro/services/transportadora.service';

/** Dados do veículo/transportadora vindos do cadastro (backend). */
export interface DadosVeiculoCadastro {
  transportadora: string;
  modeloVeiculo: string;
  anoFabricacao: string;
  quantidadeEixos: string;
}

/** Lookup por placa reaproveitando endpoints já existentes (Veiculo/Buscar + Transportadora/ObterPorId). */
@Injectable({ providedIn: 'root' })
export class PlacaTransportadoraLookupService {
  private readonly veiculoService = inject(VeiculoService);
  private readonly transportadoraService = inject(TransportadoraService);

  /**
   * Busca dados do veículo/transportadora pela placa.
   * Se houver cadastro no banco da transportadora, retorna todas as informações;
   * se não, retorna null (formulário permanece em branco para preenchimento).
   */
  getDadosVeiculoPorPlaca(placa: string): Observable<DadosVeiculoCadastro | null> {
    const p = (placa || '').replace(/\s/g, '').trim().toUpperCase();
    if (!p) return of(null);
    return this.veiculoService
      .buscar({ Placa: p, NumeroPagina: 1, TamanhoPagina: 1 })
      .pipe(
        switchMap((paged) => {
          const item = paged.items?.[0];
          if (!item?.id) return of(null);
          return this.veiculoService.obterPorId(item.id).pipe(
            switchMap((detalhe) => {
              if (!detalhe) return of(null);
              const ext = detalhe as unknown as Record<string, unknown>;
              const transportadoraIdRaw =
                ext['transportadoraId'] ?? ext['TransportadoraId'] ?? item.transportadoraId;
              const transportadoraId =
                transportadoraIdRaw != null ? Number(transportadoraIdRaw) : NaN;
              const quantidadeEixosRaw = ext['quantidadeEixos'] ?? ext['QuantidadeEixos'];

              if (!Number.isFinite(transportadoraId) || transportadoraId <= 0) {
                return of({
                  transportadora: '—',
                  modeloVeiculo: detalhe.marcaModelo ?? item.marcaModelo ?? '',
                  anoFabricacao:
                    detalhe.anoFabricacao != null
                      ? String(detalhe.anoFabricacao)
                      : detalhe.anoModelo != null
                        ? String(detalhe.anoModelo)
                        : '',
                  quantidadeEixos:
                    quantidadeEixosRaw != null && String(quantidadeEixosRaw).trim() !== ''
                      ? String(quantidadeEixosRaw)
                      : '',
                } satisfies DadosVeiculoCadastro);
              }

              return this.transportadoraService.obterPorId(transportadoraId).pipe(
                map((t) => ({
                  transportadora:
                    t?.nomeFantasia?.trim() || t?.razaoSocial?.trim() || '—',
                  modeloVeiculo: detalhe.marcaModelo ?? item.marcaModelo ?? '',
                  anoFabricacao:
                    detalhe.anoFabricacao != null
                      ? String(detalhe.anoFabricacao)
                      : detalhe.anoModelo != null
                        ? String(detalhe.anoModelo)
                        : '',
                  quantidadeEixos:
                    quantidadeEixosRaw != null && String(quantidadeEixosRaw).trim() !== ''
                      ? String(quantidadeEixosRaw)
                      : '',
                }))
              );
            })
          );
        }),
        catchError(() => of(null))
      );
  }
}
