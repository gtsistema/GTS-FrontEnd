import { Routes } from '@angular/router';
import { MovimentosPageComponent } from './pages/movimentos-page/movimentos-page.component';

export const MOVIMENTOS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'operacao',
    pathMatch: 'full',
  },
  {
    path: 'operacao',
    component: MovimentosPageComponent
  },
  {
    path: 'historico',
    component: MovimentosPageComponent
  },
];
