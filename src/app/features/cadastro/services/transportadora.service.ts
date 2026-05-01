import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  TransportadoraDTO,
  TransportadoraListItemDTO,
  TransportadoraBuscarParams,
  PagedResultDTO,
  TransportadoraObterPorIdResultDTO,
  TransportadoraPostPayload
} from '../models/transportadora.dto';

/** Base da API. Contrato: GET/POST/PUT em `/api/Transportadora`, GET/DELETE em `/api/Transportadora/{id}`. */
const API_BASE = environment.API_BASE_URL;
const TRANSPORTADORA = `${API_BASE}/Transportadora`;

@Injectable({
  providedIn: 'root'
})
export class TransportadoraService {
  constructor(private http: HttpClient) {}

  /**
   * GET /api/Transportadora?RazaoSocial|Descricao|... — listagem.
   * `Termo` do legado mapeia para `Descricao` (OpenAPI).
   */
  buscar(params: TransportadoraBuscarParams): Observable<PagedResultDTO<TransportadoraListItemDTO>> {
    const query = new URLSearchParams();
    const termo = params.Termo?.trim();
    if (termo) query.set('Descricao', termo);
    if (params.Propriedade?.trim()) query.set('Propriedade', params.Propriedade.trim());
    query.set('NumeroPagina', String(params.NumeroPagina));
    query.set('TamanhoPagina', String(params.TamanhoPagina));
    const url = `${TRANSPORTADORA}?${query.toString()}`;
    return this.http.get<unknown>(url).pipe(
      timeout(15000),
      map((body) => this.normalizeBuscarResponse(body, params.NumeroPagina, params.TamanhoPagina)),
      catchError((err) => throwError(() => err))
    );
  }

  private normalizeBuscarResponse(
    body: unknown,
    numeroPagina: number,
    tamanhoPagina: number
  ): PagedResultDTO<TransportadoraListItemDTO> {
    const raw = body as { result?: unknown; results?: unknown[]; items?: unknown[]; itens?: unknown[] } | unknown[];
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
      } else if (Array.isArray(r['itens'])) {
        list = r['itens'];
        total = Number((r as { totalRegistros?: number }).totalRegistros) ?? list.length;
      } else if (Array.isArray(r['result'])) {
        list = r['result'];
        total = list.length;
      }
    }
    const items = list.map((row) => this.mapItem(row as Record<string, unknown>));
    return { items, totalCount: total, numeroPagina, tamanhoPagina };
  }

  private mapItem(row: Record<string, unknown>): TransportadoraListItemDTO {
    const get = (k: string) => row[k] ?? row[k.charAt(0).toUpperCase() + k.slice(1)];
    return {
      id: Number(get('id') ?? get('Id')) || 0,
      razaoSocial: String(get('razaoSocial') ?? get('RazaoSocial') ?? ''),
      nomeFantasia: String(get('nomeFantasia') ?? get('NomeFantasia') ?? ''),
      cnpj: String(get('cnpj') ?? get('Cnpj') ?? ''),
      email: String(get('email') ?? get('Email') ?? ''),
      ativo: get('ativo') !== false && get('Ativo') !== false
    };
  }

  /** GET /api/Transportadora/{id} */
  obterPorId(id: number): Observable<TransportadoraDTO | null> {
    return this.http.get<unknown>(`${TRANSPORTADORA}/${id}`).pipe(
      timeout(15000),
      map((body) => {
        const res = body as Record<string, unknown> | TransportadoraObterPorIdResultDTO;
        const result = (res && typeof res === 'object' && 'result' in res ? (res as Record<string, unknown>)['result'] : res) as TransportadoraObterPorIdResultDTO | undefined;
        if (result && typeof result === 'object' && (result.id != null || (result as Record<string, unknown>)['Id'] != null)) {
          return this.mapToDto(result);
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  private mapToDto(r: TransportadoraObterPorIdResultDTO & Record<string, unknown>): TransportadoraDTO {
    const get = (key: string) => r[key] ?? r[key.charAt(0).toUpperCase() + key.slice(1)];
    const pessoa = get('pessoa') as Record<string, unknown> | undefined;
    const end = (r.endereco as Record<string, unknown> | undefined) ??
      ((pessoa?.['enderecos'] as Record<string, unknown>[] | undefined)?.[0]);
    const contato = (pessoa?.['contatos'] as Record<string, unknown>[] | undefined)?.[0];
    const getPessoa = (key: string) => pessoa?.[key] ?? pessoa?.[key.charAt(0).toUpperCase() + key.slice(1)];
    const getEnd = (key: string) => end?.[key] ?? end?.[key.charAt(0).toUpperCase() + key.slice(1)];
    const getContato = (key: string) => contato?.[key] ?? contato?.[key.charAt(0).toUpperCase() + key.slice(1)];
    return {
      id: Number(get('id')) || 0,
      razaoSocial: String(get('razaoSocial') ?? getPessoa('nomeRazaoSocial') ?? ''),
      nomeFantasia: String(get('nomeFantasia') ?? getPessoa('nomeFantasia') ?? ''),
      cnpj: String(get('cnpj') ?? getPessoa('documento') ?? ''),
      inscricaoEstadual: get('inscricaoEstadual') != null ? String(get('inscricaoEstadual')) : undefined,
      email: String(get('email') ?? getPessoa('email') ?? ''),
      telefone: String(get('telefone') ?? getContato('numero') ?? ''),
      ativo: (get('ativo') ?? getPessoa('ativo')) !== false,
      responsavelNome: get('responsavelNome') != null ? String(get('responsavelNome')) : undefined,
      responsavelCpf: get('responsavelCpf') != null ? String(get('responsavelCpf')) : undefined,
      responsavelCelular: get('responsavelCelular') != null ? String(get('responsavelCelular')) : undefined,
      responsavelEmail: get('responsavelEmail') != null ? String(get('responsavelEmail')) : undefined,
      responsavelCargo: get('responsavelCargo') != null ? String(get('responsavelCargo')) : undefined,
      tipoAcesso: get('tipoAcesso') != null ? String(get('tipoAcesso')) : undefined,
      observacaoInterna: get('observacaoInterna') != null ? String(get('observacaoInterna')) : undefined,
      endereco: end && typeof end === 'object'
        ? {
            cep: String(getEnd('cep') ?? ''),
            logradouro: String(getEnd('logradouro') ?? ''),
            numero: String(getEnd('numero') ?? ''),
            bairro: String(getEnd('bairro') ?? ''),
            cidade: String(getEnd('cidade') ?? ''),
            estado: String(getEnd('estado') ?? ''),
            complemento: String(getEnd('complemento') ?? '')
          }
        : undefined
    };
  }

  /** POST /api/Transportadora */
  gravar(payload: TransportadoraPostPayload): Observable<TransportadoraDTO> {
    return this.http.post<TransportadoraDTO>(TRANSPORTADORA, payload).pipe(
      timeout(15000),
      map((res) => {
        const returnedId = res && typeof res === 'object'
          ? (res as { id?: number }).id ?? (res as { Id?: number }).Id
          : undefined;
        return this.mapPayloadToDto(payload, returnedId);
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /** PUT /api/Transportadora */
  alterar(payload: TransportadoraPostPayload): Observable<TransportadoraDTO> {
    return this.http.put<TransportadoraDTO>(TRANSPORTADORA, payload).pipe(
      timeout(15000),
      map((res) => {
        const returnedId = res && typeof res === 'object'
          ? (res as { id?: number }).id ?? (res as { Id?: number }).Id
          : undefined;
        return this.mapPayloadToDto(payload, returnedId);
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /** DELETE /api/Transportadora/{id} */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${TRANSPORTADORA}/${id}`).pipe(
      timeout(15000),
      catchError((err) => throwError(() => err))
    );
  }

  private mapPayloadToDto(payload: TransportadoraPostPayload, returnedId?: number): TransportadoraDTO {
    const endereco = payload.pessoa.enderecos?.[0];
    const contato = payload.pessoa.contatos?.[0];
    return {
      id: returnedId ?? payload.id,
      razaoSocial: payload.pessoa.nomeRazaoSocial ?? '',
      nomeFantasia: payload.pessoa.nomeFantasia ?? '',
      cnpj: payload.pessoa.documento ?? '',
      email: payload.pessoa.email ?? '',
      telefone: contato?.numero ? contato.numero : undefined,
      ativo: payload.pessoa.ativo !== false,
      endereco: endereco
        ? {
            cep: endereco.cep ?? '',
            logradouro: endereco.logradouro ?? '',
            numero: endereco.numero ?? '',
            bairro: endereco.bairro ?? '',
            cidade: endereco.cidade ?? '',
            estado: endereco.estado ?? '',
            complemento: endereco.complemento ?? ''
          }
        : undefined
    };
  }
}
