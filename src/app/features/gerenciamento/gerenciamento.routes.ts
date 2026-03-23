import { Routes } from '@angular/router';
import { GerenciamentoLayoutComponent } from './gerenciamento-layout/gerenciamento-layout.component';
import { GerenciamentoPageComponent } from './pages/gerenciamento-page/gerenciamento-page.component';
import { permissionGuard } from '../../core/guards/permission.guard';

export const GERENCIAMENTO_ROUTES: Routes = [
  {
    path: '',
    component: GerenciamentoLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', component: GerenciamentoPageComponent },
      { path: 'permissoes', redirectTo: 'admin', pathMatch: 'full' },
      {
        path: 'admin',
        loadComponent: () =>
          import('./pages/menu-admin-page/menu-admin-page.component').then(
            (m) => m.MenuAdminPageComponent
          ),
        canActivate: [permissionGuard],
        data: { permissions: ['gerenciamento.permissoes'] },
      },
    ],
  },
];
