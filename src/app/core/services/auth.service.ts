import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { LoggedUser } from './user.service';

const LOGIN_URL = 'https://gtsbackend.azurewebsites.net/api/auth/Usuario/Login';

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
   * Retorna Observable: true = sucesso, false = credenciais inválidas.
   */
  login(username: string, password: string): Observable<boolean> {
    const body: LoginRequest = {
      userName: username,
      password
    };

    return this.http.post<LoginResponse>(LOGIN_URL, body).pipe(
      map((res) => {
        this.saveSession(username, res);
        return true;
      }),
      catchError(() => of(false))
    );
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
