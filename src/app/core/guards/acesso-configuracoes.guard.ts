import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const acessoConfiguracoeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/']);
    return false;
  }

  const loggedUser = authService.getLoggedUser();

  if (loggedUser?.permissoes.acessoConfiguracoes) {
    return true;
  }

  // Sem permissão, redirecionar para home
  router.navigate(['/app/dashboard']);
  return false;
};
