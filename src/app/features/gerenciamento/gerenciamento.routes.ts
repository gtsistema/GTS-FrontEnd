import { Routes } from '@angular/router';
import { GerenciamentoLayoutComponent } from './gerenciamento-layout/gerenciamento-layout.component';
import { permissionGuard } from '../../core/guards/permission.guard';

export const GERENCIAMENTO_ROUTES: Routes = [
  {
    path: '',
    component: GerenciamentoLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'menu',
      },
      { path: 'permissoes', redirectTo: 'menu', pathMatch: 'full' },
      { path: 'admin', redirectTo: 'menu', pathMatch: 'full' },
      {
        path: 'menu',
        loadComponent: () =>
          import('./pages/menu-admin-page/menu-admin-page.component').then(
            (m) => m.MenuAdminPageComponent
          ),
        canActivate: [permissionGuard],
        data: { permissions: ['menu.visualizar'] },
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('../cadastro/pages/acessos-perfis-page/acessos-perfis-page.component').then(
            (m) => m.AcessosPerfisPageComponent
          ),
      },
    ],
  },
];
