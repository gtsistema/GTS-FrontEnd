import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, timeout, throwError } from 'rxjs';
import {
  EstacionamentoDTO,
  EstacionamentoListItemDTO,
  EstacionamentoObterPorIdResultDTO,
  ApiResponseDTO,
  EstacionamentoBuscarParams,
  PagedResultDTO,
  EnderecoDTO
} from '../models/estacionamento.dto';
import { environment } from '../../../../environments/environment';

/** Base da API do backend (dev: /api com proxy; prod: URL completa). */
const API_BASE = environment.API_BASE_URL;
const ESTACIONAMENTO = `${API_BASE}/Estacionamento`;

/** Objeto no formato do formulário (para patchValue) após carregar ObterPorId */
export interface EstacionamentoFormValue {
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
  responsavelLegalNome: string;
  responsavelLegalCpf: string;
  contatoTelefone: string;
  capacidadeVeiculos: number | null;
  tamanho: string;
  possuiSeguranca: boolean;
  possuiBanheiro: boolean;
  tipoTaxaMensalidade: 'taxa' | 'mensalidade' | null;
  taxaPercentual: number | null;
  mensalidadeValor: number | null;
  latitude?: number | null;
  longitude?: number | null;
  responsavelLegalEmail?: string;
  contatoComplementarNome?: string;
  contatoComplementarCpf?: string;
  contatoComplementarTelefone?: string;
  contatoComplementarEmail?: string;
  /** Preservar ao alterar (payload pessoa.enderecos). */
  enderecos?: EnderecoDTO[];
  /** Dados bancários (backend) */
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  chavePix?: string;
  /** Fotos retornadas pela API (base64 ou URL); exibidas no passo Fotos. */
  loadedFotosBase64?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {
  constructor(private http: HttpClient) {}

  /** POST /api/Estacionamento/Gravar (Swagger: EstacionamentoPostInput). Erros propagam para o ErrorInterceptor (toast). */
  gravar(dto: EstacionamentoDTO | Record<string, unknown>): Observable<EstacionamentoDTO> {
    return this.http.post<EstacionamentoDTO>(`${ESTACIONAMENTO}/Gravar`, dto);
  }

  /** PUT /api/Estacionamento/Alterar (Swagger: EstacionamentoPutInput). Erros propagam para o ErrorInterceptor (toast). */
  alterar(dto: EstacionamentoDTO | Record<string, unknown>): Observable<EstacionamentoDTO> {
    return this.http.put<EstacionamentoDTO>(`${ESTACIONAMENTO}/Alterar`, dto);
  }

  /** DELETE /api/Estacionamento/Delete/{id} (Swagger). Erros propagam para o ErrorInterceptor (toast). */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${ESTACIONAMENTO}/Delete/${id}`);
  }

  /**
   * GET /api/Estacionamento/BuscarFotos/{id}
   * Retorna as fotos do estacionamento (base64 ou URLs). Resposta pode ser array ou { result: array }.
   */
  buscarFotos(id: number): Observable<string[]> {
    return this.http.get<unknown>(`${ESTACIONAMENTO}/BuscarFotos/${id}`).pipe(
      timeout(15000),
      map((body) => {
        const raw = body as ApiResponseDTO<string[]> | string[];
        const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'result' in raw ? (raw as ApiResponseDTO<string[]>).result : []);
        return Array.isArray(arr) ? arr : [];
      }),
      catchError(() => of([]))
    );
  }

  /**
   * GET /api/Estacionamento/Buscar (Swagger)
   * Paginação: 50 registros por página.
   */
  buscar(params: EstacionamentoBuscarParams): Observable<PagedResultDTO<EstacionamentoListItemDTO>> {
    const query = new URLSearchParams();
    const termo = params.Termo != null ? params.Termo.trim() : '';
    if (termo !== '') {
      query.set('Termo', termo);
    } else if (params.Descricao != null && params.Descricao.trim() !== '') {
      query.set('Descricao', params.Descricao.trim());
    }
    if (params.DataInicial != null) query.set('DataInicial', params.DataInicial);
    if (params.DataFinal != null) query.set('DataFinal', params.DataFinal);
    query.set('NumeroPagina', String(params.NumeroPagina));
    query.set('TamanhoPagina', String(params.TamanhoPagina));
    if (params.Propriedade != null) query.set('Propriedade', params.Propriedade);
    if (params.Sort != null) query.set('Sort', params.Sort);

    const url = `${ESTACIONAMENTO}/Buscar?${query.toString()}`;
    return this.http.get<unknown>(url).pipe(
      timeout(15000),
      map((body) => {
        try {
          return this.normalizeBuscarResponse(body, params.NumeroPagina, params.TamanhoPagina);
        } catch {
          return {
            items: [],
            totalCount: 0,
            numeroPagina: params.NumeroPagina,
            tamanhoPagina: params.TamanhoPagina
          } as PagedResultDTO<EstacionamentoListItemDTO>;
        }
      }),
      catchError((err) => throwError(() => err))
    );
  }

  private normalizeBuscarResponse(
    body: unknown,
    numeroPagina: number,
    tamanhoPagina: number
  ): PagedResultDTO<EstacionamentoListItemDTO> {
    const raw = body as ApiResponseDTO<unknown> | unknown;
    const result = (raw && typeof raw === 'object' && 'result' in raw)
      ? (raw as ApiResponseDTO<unknown>).result
      : raw;

    const empty = (): PagedResultDTO<EstacionamentoListItemDTO> => ({
      items: [],
      totalCount: 0,
      numeroPagina,
      tamanhoPagina
    });

    const toList = (arr: unknown[]): EstacionamentoListItemDTO[] => {
      const list: EstacionamentoListItemDTO[] = [];
      for (const row of arr) {
        if (row != null && typeof row === 'object') {
          try {
            list.push(this.mapBuscarItemToListItem(row as Record<string, unknown>));
          } catch {
            // ignora item com formato inesperado
          }
        }
      }
      return list;
    };

    // API retorna result.results + result.rowCount (gtsbackend.azurewebsites.net)
    if (result && typeof result === 'object' && 'results' in result) {
      const r = result as {
        results?: unknown[];
        rowCount?: number;
        currentPage?: number;
        pageSize?: number;
      };
      const list = toList(Array.isArray(r.results) ? r.results : []);
      return {
        items: list,
        totalCount: r.rowCount ?? list.length,
        numeroPagina: r.currentPage ?? numeroPagina,
        tamanhoPagina: r.pageSize ?? tamanhoPagina
      };
    }
    if (Array.isArray(result)) {
      const list = toList(result);
      return { items: list, totalCount: list.length, numeroPagina, tamanhoPagina };
    }
    if (result && typeof result === 'object' && 'items' in result) {
      const r = result as { items?: unknown[]; totalCount?: number };
      const list = Array.isArray(r.items) ? toList(r.items) : [];
      return {
        items: list,
        totalCount: r.totalCount ?? list.length,
        numeroPagina,
        tamanhoPagina
      };
    }
    if (result && typeof result === 'object' && 'itens' in result) {
      const r = result as { itens?: unknown[]; totalRegistros?: number };
      const items = Array.isArray(r.itens) ? toList(r.itens) : [];
      return {
        items,
        totalCount: (r as { totalRegistros?: number }).totalRegistros ?? items.length,
        numeroPagina,
        tamanhoPagina
      };
    }
    // result.data ou result.list (formatos alternativos)
    if (result && typeof result === 'object') {
      const r = result as Record<string, unknown>;
      if (Array.isArray(r['data'])) {
        const list = toList(r['data'] as unknown[]);
        return { items: list, totalCount: list.length, numeroPagina, tamanhoPagina };
      }
      if (Array.isArray(r['list'])) {
        const list = toList(r['list'] as unknown[]);
        return { items: list, totalCount: list.length, numeroPagina, tamanhoPagina };
      }
    }
    return empty();
  }

  /** Mapeia item do Buscar (API usa "tipo") para EstacionamentoListItemDTO (tipoPessoa). Defensivo contra null/undefined. */
  private mapBuscarItemToListItem(row: Record<string, unknown>): EstacionamentoListItemDTO {
    if (!row || typeof row !== 'object') {
      return { id: 0, descricao: '', tipoPessoa: 2, nomeRazaoSocial: '', documento: '', email: '', ativo: true };
    }
    return {
      id: Number(row['id']) || 0,
      descricao: String(row['descricao'] ?? ''),
      tipoPessoa: (Number(row['tipo']) === 1 ? 1 : 2) as 1 | 2,
      nomeRazaoSocial: String(row['nomeRazaoSocial'] ?? ''),
      documento: String(row['documento'] ?? ''),
      email: String(row['email'] ?? ''),
      ativo: row['ativo'] !== false
    };
  }

  /**
   * GET /api/Estacionamento/ObterPorId/:id
   * Retorna o valor já mapeado para o formulário de edição.
   */
  obterPorId(id: number): Observable<EstacionamentoFormValue | null> {
    return this.http.get<unknown>(`${ESTACIONAMENTO}/ObterPorId/${id}`).pipe(
      timeout(15000),
      map((body) => {
        const res = body as ApiResponseDTO<EstacionamentoObterPorIdResultDTO> | undefined;
        const result = res?.success && res?.result ? res.result : (body as EstacionamentoObterPorIdResultDTO);
        if (result && typeof result === 'object' && 'id' in result && result.pessoa) {
          return this.mapResultToFormValue(result as EstacionamentoObterPorIdResultDTO);
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  private mapResultToFormValue(r: EstacionamentoObterPorIdResultDTO): EstacionamentoFormValue {
    const p = r.pessoa;
    const telefone = p?.contatos?.find((c) => c.principal)?.numero ?? p?.contatos?.[0]?.numero ?? '';
    const tipoTaxa = r.tipoCobranca === 1 ? 'taxa' : r.tipoCobranca === 2 ? 'mensalidade' : null;
    return {
      id: r.id,
      descricao: p?.nomeFantasia ?? '',
      pessoaId: r.pessoaId,
      pessoa: {
        id: p?.id ?? 0,
        tipoPessoa: (p?.tipoPessoa === 1 ? 1 : 2) as 1 | 2,
        nomeRazaoSocial: p?.nomeRazaoSocial ?? '',
        nomeFantasia: p?.nomeFantasia ?? '',
        documento: p?.documento ?? '',
        email: p?.email ?? '',
        ativo: p?.ativo ?? true
      },
      responsavelLegalNome: r.resposanvelLegal ?? '',
      responsavelLegalCpf: r.responsavelCpf ?? '',
      contatoTelefone: telefone,
      capacidadeVeiculos: r.capacidadeVeiculo ?? null,
      tamanho: r.tamanhoTerreno ?? '',
      possuiSeguranca: r.possuiSeguranca ?? false,
      possuiBanheiro: r.possuiBanheiro ?? false,
      tipoTaxaMensalidade: tipoTaxa,
      taxaPercentual: r.cobrancaPorcentagem != null ? r.cobrancaPorcentagem : null,
      mensalidadeValor: r.cobrancaValor != null ? r.cobrancaValor : null,
      latitude: (r as unknown as Record<string, unknown>)['latitude'] as number | null ?? null,
      longitude: (r as unknown as Record<string, unknown>)['longitude'] as number | null ?? null,
      enderecos: p?.enderecos ?? [],
      banco: r.banco ?? '',
      agencia: r.agencia ?? '',
      conta: r.conta ?? '',
      tipoConta: r.tipoConta ?? '',
      chavePix: r.chavePix ?? '',
      loadedFotosBase64: r.fotos ?? []
    };
  }
}
