import { Component, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MenuSubItem {
  label: string;
  route: string;
}

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  children?: MenuSubItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isCollapsed = signal(false);
  collapsedChange = output<boolean>();
  currentRoute = '';
  cadastroExpanded = signal(false);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
    { label: 'Movimentos', route: '/app/movimentos', icon: 'swap_horiz' },
    { label: 'Relatórios', route: '/app/relatorios', icon: 'assessment' },
    { label: 'Financeiro', route: '/app/financeiro', icon: 'payments' },
    { label: 'Configurações', route: '/app/configuracoes', icon: 'settings' },
    {
      label: 'Cadastro',
      route: '/app/cadastro',
      icon: 'playlist_add',
      children: [
        { label: 'Cadastro Estacionamento', route: '/app/cadastro/estacionamento' },
        { label: 'Cadastro Transportadora', route: '/app/cadastro/transportadora' }
      ]
    }
  ];

  constructor(private router: Router, private authService: AuthService) {
    this.currentRoute = this.router.url;
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
      if (this.currentRoute.startsWith('/app/cadastro')) {
        this.cadastroExpanded.set(true);
      }
    });
    if (this.currentRoute.startsWith('/app/cadastro')) {
      this.cadastroExpanded.set(true);
    }
  }

  toggleCadastro(): void {
    this.cadastroExpanded.set(!this.cadastroExpanded());
  }

  toggleSidebar() {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    this.collapsedChange.emit(next);
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
