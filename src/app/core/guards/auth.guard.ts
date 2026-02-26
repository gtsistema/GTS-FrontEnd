import { Injectable } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = new AuthService(null as any, new Router());
  
  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirecionar para login se não está logado
  new Router().navigate(['/']);
  return false;
};
