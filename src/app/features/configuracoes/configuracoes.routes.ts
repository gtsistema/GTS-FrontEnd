import { Routes } from '@angular/router';
import { ConfiguracoesLayoutComponent } from './configuracoes-layout/configuracoes-layout.component';

export const CONFIGURACOES_ROUTES: Routes = [
  {
    path: '',
    component: ConfiguracoesLayoutComponent,
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../cadastro/pages/acessos-usuarios-layout/acessos-usuarios-layout.component').then(
            (m) => m.AcessosUsuariosLayoutComponent
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('../cadastro/pages/acessos-usuarios-page/acessos-usuarios-page.component').then(
                (m) => m.AcessosUsuariosPageComponent
              ),
          },
        ],
      },
      {
        path: 'permissoes',
        loadComponent: () =>
          import('../cadastro/pages/acessos-permissoes-page/acessos-permissoes-page.component').then(
            (m) => m.AcessosPermissoesPageComponent
          ),
      },
      {
        path: 'perfis',
        loadComponent: () =>
          import('../cadastro/pages/acessos-perfis-page/acessos-perfis-page.component').then(
            (m) => m.AcessosPerfisPageComponent
          ),
      },
    ],
  },
];
