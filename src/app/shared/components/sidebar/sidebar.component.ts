import { Component, OnInit, output, input, computed, signal } from '@angular/core';
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
  /** Controlado pelo MainLayout (hamburger na topbar). */
  collapsed = input<boolean>(false);
  mobileOpen = input<boolean>(false);
  isMobile = input<boolean>(false);
  closeMobile = output<void>();
  collapsedChange = output<boolean>();

  isCollapsed = computed(() => this.collapsed());
  currentRoute = '';
  /** Rota do menu com subitens que está expandido (ex: '/app/configuracoes' ou '/app/cadastro'). */
  expandedMenuRoute = signal<string | null>(null);

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
        { label: 'Estacionamento', route: '/app/cadastro/estacionamento' },
        { label: 'Transportadora', route: '/app/cadastro/transportadora' }
      ]
    }
  ];

  constructor(private router: Router, private authService: AuthService) {
    this.currentRoute = this.router.url;
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
      this.autoExpandFromRoute();
    });
    this.autoExpandFromRoute();
  }

  private autoExpandFromRoute(): void {
    if (this.currentRoute.startsWith('/app/cadastro')) {
      this.expandedMenuRoute.set('/app/cadastro');
    }
  }

  isMenuExpanded(route: string): boolean {
    return this.expandedMenuRoute() === route;
  }

  toggleMenu(route: string): void {
    this.expandedMenuRoute.set(this.expandedMenuRoute() === route ? null : route);
  }

  /** Botão hambúrguer no header da sidebar: no mobile fecha o drawer; no desktop alterna expandida/recolhida. */
  onToggleClick(): void {
    if (this.isMobile()) {
      if (this.mobileOpen()) {
        this.closeMobile.emit();
      }
    } else {
      this.collapsedChange.emit(!this.isCollapsed());
    }
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
