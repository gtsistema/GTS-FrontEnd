import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  VeiculoDTO,
  VeiculoListItemDTO,
  VeiculoBuscarParams,
  PagedResultVeiculoDTO
} from '../models/veiculo.dto';

/**
 * Contrato: GET/POST/PUT `/api/Veiculo`, GET/DELETE `/api/Veiculo/{id}`.
 * Parâmetros de listagem: Placa, Descricao, DataInicial, DataFinal, paginação (OpenAPI).
 * `TransportadoraId` e `Termo` não estão no spec; o backend ASP.NET costuma aceitar parâmetros extras no mesmo GET.
 */
const API_BASE = environment.API_BASE_URL;
const VEICULO = `${API_BASE}/Veiculo`;

@Injectable({
  providedIn: 'root'
})
export class VeiculoService {
  constructor(private http: HttpClient) {}

  /** GET /api/Veiculo?... */
  buscar(params: VeiculoBuscarParams): Observable<PagedResultVeiculoDTO> {
    const query = new URLSearchParams();
    const termo = params.Termo?.trim();
    if (termo) query.set('Descricao', termo);
    const placaNorm = (params.Placa ?? '').replace(/\s/g, '').toUpperCase();
    if (placaNorm.length >= 7) query.set('Placa', placaNorm);
    if (params.TransportadoraId != null) query.set('TransportadoraId', String(params.TransportadoraId));
    query.set('NumeroPagina', String(params.NumeroPagina));
    query.set('TamanhoPagina', String(params.TamanhoPagina));
    const url = `${VEICULO}?${query.toString()}`;
    return this.http.get<unknown>(url).pipe(
      timeout(15000),
      map((body) => this.normalizeBuscar(body, params.NumeroPagina, params.TamanhoPagina)),
      catchError((err) => throwError(() => err))
    );
  }

  private normalizeBuscar(body: unknown, numeroPagina: number, tamanhoPagina: number): PagedResultVeiculoDTO {
    const raw = body as { result?: unknown; results?: unknown[]; items?: unknown[] } | unknown[];
    let list: unknown[] = [];
    let total = 0;
    if (Array.isArray(raw)) {
      list = raw;
      total = raw.length;
    } else if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      if (Array.isArray(r['results'])) {
        list = r['results'];
        total = Number((r as { rowCount?: number }).rowCount) ?? list.length;
      } else if (Array.isArray(r['items'])) {
        list = r['items'];
        total = Number(r['totalCount']) ?? list.length;
      } else if (Array.isArray(r['result'])) {
        list = r['result'];
        total = list.length;
      }
    }
    const items = list.map((row) => this.mapItem(row as Record<string, unknown>));
    return { items, totalCount: total, numeroPagina, tamanhoPagina };
  }

  private mapItem(row: Record<string, unknown>): VeiculoListItemDTO {
    const get = (k: string) => row[k] ?? row[k.charAt(0).toUpperCase() + k.slice(1)];
    const marca = get('marcaModelo') ?? get('MarcaModelo') ?? get('marca') ?? get('Marca') ?? '';
    const modelo = get('modelo') ?? get('Modelo') ?? '';
    const marcaModelo = [String(marca), String(modelo)].filter(Boolean).join(' / ') || String(marca || modelo);
    return {
      id: Number(get('id') ?? get('Id')) || 0,
      placa: String(get('placa') ?? get('Placa') ?? ''),
      marcaModelo: marcaModelo || '—',
      cor: get('cor') != null ? String(get('cor')) : undefined,
      anoFabricacao: get('anoFabricacao') != null ? Number(get('anoFabricacao')) : undefined,
      anoModelo: get('anoModelo') != null ? Number(get('anoModelo')) : undefined,
      tipoVeiculo: get('tipoVeiculo') != null ? String(get('tipoVeiculo')) : undefined,
      centroCusto: get('centroCusto') != null ? String(get('centroCusto')) : undefined,
      ativo: get('ativo') !== false && get('Ativo') !== false,
      transportadoraId: get('transportadoraId') != null ? Number(get('transportadoraId')) : undefined
    };
  }

  /** GET /api/Veiculo/{id} */
  obterPorId(id: number): Observable<VeiculoDTO | null> {
    return this.http.get<unknown>(`${VEICULO}/${id}`).pipe(
      timeout(15000),
      map((body) => {
        const res = body as Record<string, unknown> | VeiculoDTO;
        const result = (res && 'result' in res ? (res as Record<string, unknown>)['result'] : res) as Record<string, unknown> | undefined;
        if (result && typeof result === 'object') {
          const get = (k: string) => result[k] ?? result[k.charAt(0).toUpperCase() + k.slice(1)];
          return {
            id: Number(get('id')) || 0,
            transportadoraId: get('transportadoraId') != null ? Number(get('transportadoraId')) : undefined,
            placa: String(get('placa') ?? ''),
            veiculoModeloId: get('veiculoModeloId') != null ? Number(get('veiculoModeloId')) : undefined,
            marcaModelo: get('marcaModelo') != null ? String(get('marcaModelo')) : undefined,
            cor: get('cor') != null ? String(get('cor')) : undefined,
            anoFabricacao: get('anoFabricacao') != null ? Number(get('anoFabricacao')) : undefined,
            anoModelo: get('anoModelo') != null ? Number(get('anoModelo')) : undefined,
            tipoVeiculo: get('tipoVeiculo') != null ? String(get('tipoVeiculo')) : undefined,
            centroCusto: get('centroCusto') != null ? String(get('centroCusto')) : undefined,
            ativo: get('ativo') !== false
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /** POST /api/Veiculo */
  gravar(dto: VeiculoDTO): Observable<VeiculoDTO> {
    const payload = this.dtoToPayload(dto);
    return this.http.post<VeiculoDTO>(VEICULO, payload).pipe(
      timeout(15000),
      map((res) => (res && typeof res === 'object' ? { ...dto, id: (res as { id?: number }).id ?? (res as { Id?: number }).Id } : dto)),
      catchError((err) => throwError(() => err))
    );
  }

  /** PUT /api/Veiculo */
  alterar(dto: VeiculoDTO): Observable<VeiculoDTO> {
    const payload = this.dtoToPayload(dto);
    return this.http.put<VeiculoDTO>(VEICULO, payload).pipe(
      timeout(15000),
      catchError((err) => throwError(() => err))
    );
  }

  /** DELETE /api/Veiculo/{id} */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${VEICULO}/${id}`).pipe(
      timeout(15000),
      catchError((err) => throwError(() => err))
    );
  }

  /** Payload para POST Gravar e PUT Alterar (backend: placa obrigatória). */
  private dtoToPayload(dto: VeiculoDTO): Record<string, unknown> {
    const placa = (dto.placa ?? '').replace(/\s/g, '').toUpperCase();
    return {
      id: dto.id,
      transportadoraId: dto.transportadoraId,
      placa: placa || undefined,
      veiculoModeloId: dto.veiculoModeloId,
      marcaModelo: dto.marcaModelo,
      cor: dto.cor ?? undefined,
      anoFabricacao: dto.anoFabricacao ?? undefined,
      anoModelo: dto.anoModelo ?? undefined,
      tipoVeiculo: dto.tipoVeiculo ?? undefined,
      centroCusto: dto.centroCusto ?? undefined,
      ativo: dto.ativo
    };
  }
}
