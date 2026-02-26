import { Routes } from '@angular/router';

export const CONFIGURACOES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/configuracoes-page/configuracoes-page.component').then(
        (m) => m.ConfiguracoesPageComponent
      )
  }
];
