import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { SessionAccessService } from '../services/session-access.service';

export const routeAccessGuard: CanActivateChildFn = (_route, state) => {
  const sessionAccess = inject(SessionAccessService);
  const router = inject(Router);

  if (sessionAccess.canAccessRoute(state.url)) {
    return true;
  }

  const fallback = sessionAccess.getDefaultRoute() ?? '/';
  return router.parseUrl(fallback);
};
