import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { decodeJwtPayload, validateJwtPayload } from '../auth/jwt.util';
import { normalizeBearerValue } from '../auth/auth-token.storage';

/**
 * Protege rotas autenticadas. Se o JWT estiver expirado, encerra a sessão e manda para o login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  const token = authService.getAccessToken();
  if (!token) {
    authService.logout();
    return false;
  }

  const payload = decodeJwtPayload(normalizeBearerValue(token));
  if (!payload) {
    authService.logout();
    return false;
  }

  const v = validateJwtPayload(payload);
  if (!v.valid) {
    authService.logout();
    return false;
  }

  return true;
};
