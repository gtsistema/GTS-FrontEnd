import { Routes } from '@angular/router';
import { EntradaSaidaShellComponent } from './entrada-saida/entrada-saida-shell.component';
import { EntradaSaidaFormComponent } from './entrada-saida/entrada-saida-form.component';
import { MovimentosPageComponent } from './pages/movimentos-page/movimentos-page.component';

export const MOVIMENTOS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'entrada-saida',
    pathMatch: 'full'
  },
  {
    path: 'entrada-saida',
    component: EntradaSaidaShellComponent,
    children: [
      {
        path: '',
        component: MovimentosPageComponent
      },
      {
        path: 'novo',
        component: EntradaSaidaFormComponent
      },
      {
        path: ':id',
        component: EntradaSaidaFormComponent
      }
    ]
  }
];
