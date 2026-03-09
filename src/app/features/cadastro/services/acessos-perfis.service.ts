import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, throwError } from 'rxjs';
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
 * Endpoints reais: GET Buscar, GET ObterPorId/{id}, POST Gravar, PUT Alterar, DELETE Delete/{id}.
 * @see https://gtsbackend.azurewebsites.net/swagger/v1/swagger.json (tag Perfil)
 */
@Injectable({
  providedIn: 'root'
})
export class AcessosPerfisService {
  constructor(private http: HttpClient) {}

  /** GET /api/auth/Perfil/Buscar */
  buscar(params?: PerfilBuscarParams): Observable<unknown> {
    const query = new URLSearchParams();
    if (params?.NumeroPagina != null) query.set('NumeroPagina', String(params.NumeroPagina));
    if (params?.TamanhoPagina != null) query.set('TamanhoPagina', String(params.TamanhoPagina));
    if (params?.Propriedade != null) query.set('Propriedade', params.Propriedade);
    if (params?.Sort != null) query.set('Sort', params.Sort);
    const qs = query.toString();
    const url = qs ? `${AUTH_PERFIL}/Buscar?${qs}` : `${AUTH_PERFIL}/Buscar`;
    return this.http.get<unknown>(url).pipe(timeout(15000));
  }

  /** GET /api/auth/Perfil/ObterPorId/{id} (id: uuid) */
  obterPorId(id: string): Observable<ApplicationRole> {
    return this.http.get<ApplicationRole>(`${AUTH_PERFIL}/ObterPorId/${id}`).pipe(timeout(15000));
  }

  /** POST /api/auth/Perfil/Gravar */
  gravar(dto: ApplicationRole): Observable<unknown> {
    return this.http.post<unknown>(`${AUTH_PERFIL}/Gravar`, dto).pipe(timeout(15000));
  }

  /** PUT /api/auth/Perfil/Alterar */
  alterar(dto: ApplicationRole): Observable<unknown> {
    return this.http.put<unknown>(`${AUTH_PERFIL}/Alterar`, dto).pipe(timeout(15000));
  }

  /** DELETE /api/auth/Perfil/Delete/{id} (id: uuid) */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${AUTH_PERFIL}/Delete/${id}`).pipe(timeout(15000));
  }
}
