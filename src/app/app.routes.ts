import { Routes } from '@angular/router';
import { LOGIN_ROUTES } from './features/login/login.routes';
import { CONFIGURACOES_ROUTES } from './features/configuracoes/configuracoes.routes';
import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';
import { MOVIMENTOS_ROUTES } from './features/movimentos/movimentos.routes';
import { RELATORIOS_ROUTES } from './features/relatorios/relatorios.routes';
import { FINANCEIRO_ROUTES } from './features/financeiro/financeiro.routes';
import { CADASTRO_ROUTES } from './features/cadastro/cadastro.routes';
import { CadastroLayoutComponent } from './features/cadastro/cadastro-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout.component';

export const routes: Routes = [
	// 1. LOGIN (Rota Pública - sem layout)
	{
		path: '',
		children: LOGIN_ROUTES,
	},

	// LAYOUT PRINCIPAL (Dashboard, Movimentos, Relatórios, Financeiro, Configurações)
	// Layout Component renderiza sidebar + router-outlet
	{
		path: 'app',
		component: MainLayoutComponent,
		canActivate: [authGuard],
		children: [
			// DASHBOARD
			{
				path: 'dashboard',
				children: DASHBOARD_ROUTES
			},
			// 3. MOVIMENTOS
			{
				path: 'movimentos',
				children: MOVIMENTOS_ROUTES
			},
			// 4. RELATÓRIOS
			{
				path: 'relatorios',
				children: RELATORIOS_ROUTES
			},
			// 5. FINANCEIRO
			{
				path: 'financeiro',
				children: FINANCEIRO_ROUTES
			},
			// 6. CONFIGURAÇÕES
			{
				path: 'configuracoes',
				children: CONFIGURACOES_ROUTES
			},
			// 7. CADASTRO
			{
				path: 'cadastro',
				component: CadastroLayoutComponent,
				children: CADASTRO_ROUTES
			},
			// Redirecionar /app para /app/dashboard
			{
				path: '',
				redirectTo: 'dashboard',
				pathMatch: 'full'
			}
		]
	},

	// Redirecionar raiz autenticada para /app/dashboard
	{
		path: '',
		redirectTo: '/app/dashboard',
		pathMatch: 'full'
	},

	// future routes can be added here
];
