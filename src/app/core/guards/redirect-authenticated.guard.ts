import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para a rota raiz (path: '').
 * Se o usuário estiver autenticado, redireciona para a primeira rota autorizada.
 * Caso contrário, permite a ativação (ex.: exibir login).
 */
export const redirectAuthenticatedToAppGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return router.createUrlTree([auth.getDefaultAuthorizedRoute()]);
  }

  return true;
};
