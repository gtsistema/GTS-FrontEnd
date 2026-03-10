import { Routes } from '@angular/router';

export const DESENVOLVIMENTO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/desenvolvimento-page/desenvolvimento-page.component').then(
        (m) => m.DesenvolvimentoPageComponent
      ),
  },
];
