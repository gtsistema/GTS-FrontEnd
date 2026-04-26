import { Routes } from '@angular/router';

export const LOGIN_ROUTES: Routes = [
  {
    path: 'auth/confirmar-email',
    loadComponent: () =>
      import('./pages/confirmar-email-page/confirmar-email-page.component').then(
        (m) => m.ConfirmarEmailPageComponent
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
];
