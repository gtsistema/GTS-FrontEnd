import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.API_BASE_URL;
const AUTH_USUARIO = `${API_BASE}/auth/Usuario`;

const STUB_ERROR = 'Endpoint não encontrado no backend.';

/** Mensagem exibida quando a criação falha por dados inválidos ou erro do backend. */
export const USUARIO_ENDPOINT_NAO_DISPONIVEL =
  'Não foi possível criar o usuário com os dados informados.';
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
  confirmPassword?: string | null;
  email?: string | null;
  estacionamentoId?: number;
  pessoa?: {
    id?: number;
    nome?: string | null;
    documento?: string | null;
    tipoPessoa?: number;
  };
  perfil?: {
    id?: string;
    name?: string | null;
    normalizedName?: string | null;
    concurrencyStamp?: string | null;
  };
}

/** Payload de criação utilizado no formulário legado de usuários. */
export interface UsuarioCreateInput {
  nome?: string;
  email?: string;
  login?: string;
  cpfCnpj?: string;
  cnpj?: string;
  senha?: string;
  perfilId?: string;
  perfilNome?: string;
  estacionamentoId?: number;
}

/**
 * Service para Usuários (Auth).
 * Endpoints reais: POST Login, POST Register.
 * Mapeamento aplicado:
 * - `gravar()` -> POST Register (endpoint confirmado)
 * Stubs remanescentes (sem endpoint no Swagger): Buscar, ObterPorId, Alterar e Delete.
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

  /** Mapeado para POST /Register (cadastro de usuário). */
  gravar(dto: unknown): Observable<unknown> {
    const input = dto as UsuarioCreateInput;
    const email = String(input?.email ?? '').trim();
    const login = String(input?.login ?? '').trim();
    const userName = login || email;
    const senha = String(input?.senha ?? '').trim();
    if (!userName || !senha) {
      return throwError(() => new Error('Dados inválidos para cadastro de usuário.'));
    }

    const perfilId = String(input?.perfilId ?? '').trim();
    const perfilNome = String(input?.perfilNome ?? '').trim();
    const documento = String(input?.cpfCnpj ?? input?.cnpj ?? '').trim();
    const nome = String(input?.nome ?? '').trim();

    const payload: RegisterInput = {
      userName,
      password: senha,
      confirmPassword: senha,
      email: email || undefined,
      estacionamentoId:
        typeof input?.estacionamentoId === 'number' && Number.isFinite(input.estacionamentoId)
          ? input.estacionamentoId
          : undefined,
      pessoa:
        nome || documento
          ? {
              nome: nome || undefined,
              documento: documento || undefined,
            }
          : undefined,
      perfil: perfilId || perfilNome
        ? {
            id: perfilId || undefined,
            name: perfilNome || undefined,
          }
        : undefined,
    };

    return this.register(payload);
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
