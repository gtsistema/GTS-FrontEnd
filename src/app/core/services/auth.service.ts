import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { LoggedUser } from './user.service';
import { environment } from '../../../environments/environment';
import { ApiError } from '../api/models';

export interface LoginRequest {
  userName: string;
  password: string;
}

/** Resposta esperada do backend (ajustar conforme contrato real da API). */
export interface LoginResponse {
  token?: string;
  usuario?: {
    userName?: string;
    nome?: string;
    perfil?: string;
    permissoes?: { acessoConfiguracoes?: boolean; verHome?: boolean };
  };
  [key: string]: unknown;
}

export type LoginResult = { success: true } | { success: false; message: string };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly LOGGED_USER_KEY = 'loggedUser';
  private readonly TOKEN_KEY = 'authToken';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Faz login via API (POST).
   * Retorna Observable com success e, em caso de erro, a mensagem da API.
   */
  login(username: string, password: string): Observable<LoginResult> {
    const body: LoginRequest = {
      userName: username,
      password
    };

    const url = `${environment.API_BASE_URL}/auth/Usuario/Login`;
    return this.http.post<LoginResponse>(url, body).pipe(
      map((res) => {
        this.saveSession(username, res);
        return { success: true as const };
      }),
      catchError((err: unknown) => {
        const message = this.getLoginErrorMessage(err);
        return of({ success: false, message });
      })
    );
  }

  private getLoginErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as ApiError).message === 'string') {
      return (err as ApiError).message.trim();
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && !(body instanceof ProgressEvent)) {
        const b = body as { notifications?: string[]; message?: string; title?: string };
        if (Array.isArray(b.notifications) && b.notifications.length > 0) {
          const text = b.notifications.filter((n): n is string => typeof n === 'string').join(' ').trim();
          if (text) return text;
        }
        const msg = b.message ?? b.title;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
      if (typeof body === 'string' && body.trim()) return body.trim();
      const fallback: Record<number, string> = {
        401: 'Usuário ou senha inválidos.',
        400: 'Usuário ou senha inválido.',
        0: 'Sem conexão. Verifique sua rede.'
      };
      return fallback[err.status] ?? `Erro na requisição (${err.status ?? 0}).`;
    }
    return 'Usuário ou senha inválidos.';
  }

  private saveSession(username: string, res: LoginResponse): void {
    if (res.token) {
      localStorage.setItem(this.TOKEN_KEY, res.token);
    }

    const u = res.usuario;
    const loggedUser: LoggedUser = {
      username: u?.userName ?? username,
      perfil: u?.perfil ?? 'Operador',
      permissoes: {
        acessoConfiguracoes: u?.permissoes?.acessoConfiguracoes ?? true,
        verHome: u?.permissoes?.verHome ?? true
      }
    };

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem(this.LOGGED_USER_KEY, JSON.stringify(loggedUser));
    sessionStorage.setItem('welcomeSeen', 'false');
  }

  /**
   * Faz logout
   */
  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem(this.LOGGED_USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem('welcomeSeen');
    this.router.navigate(['/']);
  }

  /**
   * Verifica se o usuário está logado
   */
  isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  }

  /**
   * Obtém o usuário logado
   */
  getLoggedUser(): LoggedUser | null {
    const data = localStorage.getItem(this.LOGGED_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Verifica se a tela de boas-vindas já foi vista
   */
  hasSeenWelcome(): boolean {
    return sessionStorage.getItem('welcomeSeen') === 'true';
  }

  /**
   * Marcar tela de boas-vindas como vista
   */
  markWelcomeAsSeen(): void {
    sessionStorage.setItem('welcomeSeen', 'true');
  }
}
