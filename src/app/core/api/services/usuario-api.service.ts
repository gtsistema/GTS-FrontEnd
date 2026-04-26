import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapServiceResult } from '../utils/service-result.util';
import type {
  ConfirmarEmailRequest,
  RegistroResult,
  RegisterInput,
  UsuarioDetalheOutput,
  UsuarioOutput
} from '../types/usuario-api.types';

const API_BASE = environment.API_BASE_URL;
/** Contrato Swagger: tag Usuario — `GET|PUT|DELETE /api/auth/Usuario`, `GET /api/auth/Usuario/{id}` (id int32). */
const USUARIO_BASE = `${API_BASE}/auth/Usuario`;
const HTTP_TIMEOUT_MS = 60000;

function idSeg(id: string | number | undefined): string {
  if (id === undefined || id === null) return '';
  return String(id);
}

/**
 * Após `unwrapServiceResult`, o back pode devolver array direto ou um objeto paginado
 * (`itens`, `Items`, `data`, etc.) dentro de `result`.
 */
function extrairArrayUsuario(payload: unknown): UsuarioOutput[] {
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as UsuarioOutput[];
  }
  if (typeof payload !== 'object') {
    return [];
  }
  const p = payload as Record<string, unknown>;
  const candidatos = [
    'itens',
    'Items',
    'data',
    'Data',
    'results',
    'Results',
    'lista',
    'Lista',
    'usuarios',
    'Usuarios',
    'users',
    'Users',
    'rows',
    'Rows'
  ];
  for (const k of candidatos) {
    const v = p[k];
    if (Array.isArray(v)) {
      return v as UsuarioOutput[];
    }
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class UsuarioApiService {
  private http = inject(HttpClient);

  /** GET api/auth/Usuario — listagem (única rota de consulta em lote no Swagger). */
  listar(): Observable<UsuarioOutput[]> {
    return this.http.get<unknown>(USUARIO_BASE).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map((body) => {
        const unwrapped = unwrapServiceResult<unknown>(body);
        return extrairArrayUsuario(unwrapped);
      })
    );
  }

  /** GET api/auth/Usuario/{id} */
  obterPorId(id: string | number): Observable<UsuarioDetalheOutput> {
    return this.http.get<unknown>(`${USUARIO_BASE}/${encodeURIComponent(idSeg(id))}`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map((body) => unwrapServiceResult<UsuarioDetalheOutput>(body))
    );
  }

  /**
   * POST api/auth/Usuario/Register
   * @returns conteúdo de result (pode conter RegistroResult).
   */
  register(dto: RegisterInput): Observable<RegistroResult | unknown> {
    return this.http.post<unknown>(`${USUARIO_BASE}/Register`, dto).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map((body) => unwrapServiceResult<RegistroResult | unknown>(body))
    );
  }

  /** PUT api/auth/Usuario/{id} */
  atualizar(id: string | number, dto: RegisterInput): Observable<unknown> {
    return this.http
      .put<unknown>(`${USUARIO_BASE}/${encodeURIComponent(idSeg(id))}`, dto)
      .pipe(
        timeout(HTTP_TIMEOUT_MS),
        map((body) => unwrapServiceResult<unknown>(body))
      );
  }

  /** DELETE api/auth/Usuario/{id} */
  excluir(id: string | number): Observable<unknown> {
    return this.http.delete<unknown>(`${USUARIO_BASE}/${encodeURIComponent(idSeg(id))}`).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map((body) => {
        if (body == null) return null;
        if (typeof body === 'object' && body !== null && 'success' in (body as object)) {
          return unwrapServiceResult<unknown>(body);
        }
        return body;
      })
    );
  }

  /** POST api/auth/Usuario/confirmar-email (público). */
  confirmarEmail(dto: ConfirmarEmailRequest): Observable<unknown> {
    return this.http.post<unknown>(`${USUARIO_BASE}/confirmar-email`, dto).pipe(
      timeout(HTTP_TIMEOUT_MS),
      map((body) => {
        if (body == null) return null;
        if (typeof body === 'object' && 'success' in (body as object)) {
          return unwrapServiceResult<unknown>(body);
        }
        return body;
      })
    );
  }
}
