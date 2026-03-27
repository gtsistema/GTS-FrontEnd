import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionCacheService } from '../services/permission-cache.service';

/**
 * Guard funcional: exige pelo menos uma das permissões listada em `data.permissions`.
 * A validação é estritamente pelas chaves do token (`Permission` / `permission`).
 * Ex.: { data: { permissions: ['gerenciamento.permissoes'] } }
 */
export const permissionGuard: CanActivateFn = (route) => {
  const required = route.data?.['permissions'] as string[] | undefined;
  if (!required?.length) return true;

  const cache = inject(PermissionCacheService);
  const router = inject(Router);

  if (cache.hasAny(required)) return true;

  return router.parseUrl('/app/dashboard');
};
