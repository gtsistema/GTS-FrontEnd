import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TOKEN_KEY = 'authToken';

/**
 * Adiciona o header Authorization: Bearer <token> quando houver token no storage.
 * Usa o mesmo key do AuthService (authToken).
 */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
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
