import { Routes } from '@angular/router';
import { GerenciamentoLayoutComponent } from './gerenciamento-layout/gerenciamento-layout.component';
import { GerenciamentoPageComponent } from './pages/gerenciamento-page/gerenciamento-page.component';

export const GERENCIAMENTO_ROUTES: Routes = [
  {
    path: '',
    component: GerenciamentoLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: GerenciamentoPageComponent },
      {
        path: 'permissoes',
        loadComponent: () =>
          import('../cadastro/pages/acessos-permissoes-page/acessos-permissoes-page.component').then(
            (m) => m.AcessosPermissoesPageComponent
          ),
      },
    ],
  },
];
