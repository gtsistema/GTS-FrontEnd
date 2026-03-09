import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.API_BASE_URL;
const AUTH_USUARIO = `${API_BASE}/auth/Usuario`;

const STUB_ERROR = 'Endpoint não encontrado no backend.';

/** Mensagem exibida ao salvar quando não existe endpoint de criação/edição no backend. */
export const USUARIO_ENDPOINT_NAO_DISPONIVEL =
  'Backend não possui endpoint para criar usuário ainda.';
export const USUARIO_EDITAR_ENDPOINT_NAO_DISPONIVEL =
  'Backend não possui endpoint para editar usuário ainda.';

/** Modelo de item da listagem (para quando o backend expuser GET listagem). */
export interface UsuarioListItem {
  id?: string;
  nome?: string | null;
  emailOuLogin?: string | null;
  tipo?: string | null;
  ativo?: boolean;
  perfil?: string | null;
}

/** POST /api/auth/Usuario/Login (Swagger: LoginInput) */
export interface LoginInput {
  userName: string;
  password: string;
}

/** POST /api/auth/Usuario/Register (Swagger: RegisterInput) */
export interface RegisterInput {
  userName: string;
  password: string;
  confirmPassword: string;
}

/**
 * Service para Usuários (Auth).
 * Endpoints reais: POST Login, POST Register.
 * Não existem no Swagger: Buscar, ObterPorId, Gravar, Alterar, Delete — métodos stub retornam erro.
 * @see https://gtsbackend.azurewebsites.net/swagger/v1/swagger.json (tag Usuario)
 */
@Injectable({
  providedIn: 'root'
})
export class AcessosUsuariosService {
  constructor(private http: HttpClient) {}

  /** POST /api/auth/Usuario/Login */
  login(dto: LoginInput): Observable<unknown> {
    return this.http.post<unknown>(`${AUTH_USUARIO}/Login`, dto).pipe(timeout(15000));
  }

  /** POST /api/auth/Usuario/Register */
  register(dto: RegisterInput): Observable<unknown> {
    return this.http.post<unknown>(`${AUTH_USUARIO}/Register`, dto).pipe(timeout(15000));
  }

  /** Stub: endpoint de listagem de usuários não existe no Swagger. Quando existir, retornar GET listagem (termo opcional). */
  buscar(termo?: string): Observable<unknown> {
    return throwError(() => new Error(STUB_ERROR)) as Observable<unknown>;
  }

  /** Stub: endpoint ObterPorId de usuário não existe no Swagger. */
  obterPorId(_id: string): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: endpoint Gravar de usuário (CRUD) não existe no Swagger (apenas Register). */
  gravar(_dto: unknown): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: endpoint Alterar de usuário não existe no Swagger. */
  alterar(_dto: unknown): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: endpoint Delete de usuário não existe no Swagger. */
  delete(_id: string): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }
}
