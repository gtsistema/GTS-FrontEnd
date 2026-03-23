import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionCacheService } from '../services/permission-cache.service';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional: exige pelo menos uma das permissões listada em `data.permissions`.
 * Perfil **Admin** no JWT libera acesso (mesmo sem a chave explícita no claim Permission).
 * Ex.: { data: { permissions: ['gerenciamento.permissoes'] } }
 */
export const permissionGuard: CanActivateFn = (route) => {
  const required = route.data?.['permissions'] as string[] | undefined;
  if (!required?.length) return true;

  const cache = inject(PermissionCacheService);
  const router = inject(Router);
  const auth = inject(AuthService);

  const perfil = auth.getLoggedUser()?.perfil?.toLowerCase();
  if (perfil === 'admin' || perfil === 'administrator') {
    return true;
  }

  if (cache.hasAny(required)) return true;

  return router.parseUrl('/app/dashboard');
};
