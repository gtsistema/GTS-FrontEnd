import { Routes } from '@angular/router';
import { EstacionamentoLayoutComponent } from './estacionamento-layout.component';

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
  }
];
