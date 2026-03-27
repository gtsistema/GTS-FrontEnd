import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.API_BASE_URL;
const AUTH_PERFIL = `${API_BASE}/auth/Perfil`;

/** Perfil (Role) conforme Swagger ApplicationRole */
export interface ApplicationRole {
  id?: string;
  name?: string | null;
  normalizedName?: string | null;
  concurrencyStamp?: string | null;
}

/** Parâmetros opcionais para Buscar (Swagger não detalha; seguindo padrão da API). */
export interface PerfilBuscarParams {
  NumeroPagina?: number;
  TamanhoPagina?: number;
  Propriedade?: string;
  Sort?: string;
}

/**
 * Service para CRUD de Perfis (Roles).
 * Endpoints reais:
 * GET /api/auth/Perfil
 * POST /api/auth/Perfil
 * PUT /api/auth/Perfil
 * GET /api/auth/Perfil/{id}
 * DELETE /api/auth/Perfil/{id}
 * GET /api/auth/Perfil/usuario/{usuarioId}
 * @see https://gtsbackend.azurewebsites.net/swagger/v1/swagger.json (tag Perfil)
 */
@Injectable({
  providedIn: 'root'
})
export class AcessosPerfisService {
  constructor(private http: HttpClient) {}

  /** GET /api/auth/Perfil */
  buscar(params?: PerfilBuscarParams): Observable<unknown> {
    const query = new URLSearchParams();
    if (params?.NumeroPagina != null) query.set('NumeroPagina', String(params.NumeroPagina));
    if (params?.TamanhoPagina != null) query.set('TamanhoPagina', String(params.TamanhoPagina));
    if (params?.Propriedade != null) query.set('Propriedade', params.Propriedade);
    if (params?.Sort != null) query.set('Sort', params.Sort);
    const qs = query.toString();
    const url = qs ? `${AUTH_PERFIL}?${qs}` : `${AUTH_PERFIL}`;
    return this.http.get<unknown>(url).pipe(timeout(15000));
  }

  /** GET /api/auth/Perfil/{id} (id: uuid) */
  obterPorId(id: string): Observable<ApplicationRole> {
    return this.http.get<ApplicationRole>(`${AUTH_PERFIL}/${id}`).pipe(timeout(15000));
  }

  /** POST /api/auth/Perfil */
  gravar(dto: ApplicationRole): Observable<unknown> {
    return this.http.post<unknown>(`${AUTH_PERFIL}`, dto).pipe(timeout(15000));
  }

  /** PUT /api/auth/Perfil */
  alterar(dto: ApplicationRole): Observable<unknown> {
    return this.http.put<unknown>(`${AUTH_PERFIL}`, dto).pipe(timeout(15000));
  }

  /** DELETE /api/auth/Perfil/{id} (id: uuid) */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${AUTH_PERFIL}/${id}`).pipe(timeout(15000));
  }

  /** GET /api/auth/Perfil/usuario/{usuarioId} */
  buscarPorUsuario(usuarioId: string): Observable<unknown> {
    return this.http.get<unknown>(`${AUTH_PERFIL}/usuario/${usuarioId}`).pipe(timeout(15000));
  }
}
