import { Routes } from '@angular/router';
import { EstacionamentoLayoutComponent } from './estacionamento-layout.component';
import { CadastroAcessosPageComponent } from './pages/cadastro-acessos-page/cadastro-acessos-page.component';

export const CADASTRO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'estacionamento',
    pathMatch: 'full'
  },
  {
    path: 'estacionamento',
    component: EstacionamentoLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/estacionamento-list/estacionamento-list.component').then(
            (m) => m.EstacionamentoListComponent
          )
      },
      {
        path: 'novo',
        loadComponent: () =>
          import('./pages/estacionamento-form/estacionamento-form.component').then(
            (m) => m.EstacionamentoFormComponent
          )
      },
      {
        path: 'editar/:id',
        loadComponent: () =>
          import('./pages/estacionamento-form/estacionamento-form.component').then(
            (m) => m.EstacionamentoFormComponent
          )
      }
    ]
  },
  {
    path: 'transportadora',
    loadComponent: () =>
      import(
        './pages/cadastro-transportadora-page/cadastro-transportadora-page.component'
      ).then((m) => m.CadastroTransportadoraPageComponent)
  },
  {
    path: 'acessos',
    component: CadastroAcessosPageComponent,
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/acessos-usuarios-layout/acessos-usuarios-layout.component').then(
            (m) => m.AcessosUsuariosLayoutComponent
          ),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./pages/acessos-usuarios-page/acessos-usuarios-page.component').then(
                (m) => m.AcessosUsuariosPageComponent
              )
          }
        ]
      },
      {
        path: 'perfis',
        loadComponent: () =>
          import('./pages/acessos-perfis-page/acessos-perfis-page.component').then(
            (m) => m.AcessosPerfisPageComponent
          )
      }
    ]
  }
];
