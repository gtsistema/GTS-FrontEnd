import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TOKEN_KEY = 'authToken';

/** Requisições para APIs externas (ex.: BrasilAPI) não devem receber o token do backend. */
function isExternalApi(req: HttpRequest<unknown>): boolean {
  return req.url.includes('brasilapi.com.br') || req.url.includes('viacep.com.br');
}

/**
 * Adiciona o header Authorization: Bearer <token> quando houver token no storage.
 * Usa o mesmo key do AuthService (authToken).
 * Não adiciona token para APIs externas (BrasilAPI, ViaCEP).
 */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  if (isExternalApi(req)) return next(req);
  const platformId = inject(PLATFORM_ID);
  let token: string | null = null;
  if (isPlatformBrowser(platformId)) {
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      token = null;
    }
  }
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  return next(req);
}
