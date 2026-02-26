import { Routes } from '@angular/router';

export const CADASTRO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'estacionamento',
    pathMatch: 'full'
  },
  {
    path: 'estacionamento',
    loadComponent: () =>
      import(
        './pages/cadastro-estacionamento-page/cadastro-estacionamento-page.component'
      ).then((m) => m.CadastroEstacionamentoPageComponent)
  },
  {
    path: 'transportadora',
    loadComponent: () =>
      import(
        './pages/cadastro-transportadora-page/cadastro-transportadora-page.component'
      ).then((m) => m.CadastroTransportadoraPageComponent)
  }
];
