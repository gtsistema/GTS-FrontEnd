import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import {
  EstacionamentoDTO,
  EstacionamentoListItemDTO,
  EstacionamentoObterPorIdResultDTO,
  ApiResponseDTO,
  EstacionamentoBuscarParams,
  PagedResultDTO
} from '../models/estacionamento.dto';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.apiUrl;
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
}

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {
  constructor(private http: HttpClient) {}

  /** POST /api/Estacionamento/Gravar (Swagger: EstacionamentoPostInput) */
  gravar(dto: EstacionamentoDTO | Record<string, unknown>): Observable<EstacionamentoDTO | null> {
    return this.http
      .post<EstacionamentoDTO>(`${ESTACIONAMENTO}/Gravar`, dto)
      .pipe(catchError(() => of(null)));
  }

  /** PUT /api/Estacionamento/Alterar (Swagger: EstacionamentoPutInput) */
  alterar(dto: EstacionamentoDTO | Record<string, unknown>): Observable<EstacionamentoDTO | null> {
    return this.http
      .put<EstacionamentoDTO>(`${ESTACIONAMENTO}/Alterar`, dto)
      .pipe(catchError(() => of(null)));
  }

  /** DELETE /api/Estacionamento/Delete/{id} (Swagger) */
  excluir(id: number): Observable<boolean> {
    return this.http
      .delete(`${ESTACIONAMENTO}/Delete/${id}`)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  /**
   * GET /api/Estacionamento/Buscar (Swagger)
   * Paginação: 50 registros por página.
   */
  buscar(params: EstacionamentoBuscarParams): Observable<PagedResultDTO<EstacionamentoListItemDTO>> {
    const query = new URLSearchParams();
    if (params.Descricao != null && params.Descricao.trim() !== '') {
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
      map((body) => this.normalizeBuscarResponse(body, params.NumeroPagina, params.TamanhoPagina)),
      catchError(() =>
        of({
          items: [],
          totalCount: 0,
          numeroPagina: params.NumeroPagina,
          tamanhoPagina: params.TamanhoPagina
        })
      )
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

    if (Array.isArray(result)) {
      return {
        items: result as EstacionamentoListItemDTO[],
        totalCount: result.length,
        numeroPagina,
        tamanhoPagina
      };
    }
    if (result && typeof result === 'object' && 'items' in result) {
      const r = result as { items: EstacionamentoListItemDTO[]; totalCount?: number };
      return {
        items: r.items ?? [],
        totalCount: r.totalCount ?? r.items?.length ?? 0,
        numeroPagina,
        tamanhoPagina
      };
    }
    if (result && typeof result === 'object' && 'itens' in result) {
      const r = result as { itens: EstacionamentoListItemDTO[]; totalRegistros?: number };
      const items = r.itens ?? [];
      return {
        items,
        totalCount: (r as { totalRegistros?: number }).totalRegistros ?? items.length,
        numeroPagina,
        tamanhoPagina
      };
    }
    return {
      items: [],
      totalCount: 0,
      numeroPagina,
      tamanhoPagina
    };
  }

  /**
   * GET /api/Estacionamento/ObterPorId/:id
   * Retorna o valor já mapeado para o formulário de edição.
   */
  obterPorId(id: number): Observable<EstacionamentoFormValue | null> {
    return this.http
      .get<ApiResponseDTO<EstacionamentoObterPorIdResultDTO>>(
        `${ESTACIONAMENTO}/ObterPorId/${id}`
      )
      .pipe(
        map((res) => (res?.success && res?.result ? this.mapResultToFormValue(res.result) : null)),
        catchError(() => of(null))
      );
  }

  private mapResultToFormValue(r: EstacionamentoObterPorIdResultDTO): EstacionamentoFormValue {
    const p = r.pessoa;
    const telefone = p.contatos?.find((c) => c.principal)?.numero ?? p.contatos?.[0]?.numero ?? '';
    const tipoTaxa = r.tipoCobranca === 0 ? 'taxa' : r.tipoCobranca === 1 ? 'mensalidade' : null;
    return {
      id: r.id,
      descricao: p.nomeFantasia ?? '',
      pessoaId: r.pessoaId,
      pessoa: {
        id: p.id,
        tipoPessoa: p.tipoPessoa,
        nomeRazaoSocial: p.nomeRazaoSocial ?? '',
        nomeFantasia: p.nomeFantasia ?? '',
        documento: p.documento ?? '',
        email: p.email ?? '',
        ativo: p.ativo ?? true
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
      mensalidadeValor: r.cobrancaValor != null ? r.cobrancaValor : null
    };
  }
}
