import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SidebarStateService } from '../../../../core/services/sidebar-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isOpen = false;
  isCollapsed = false;
  isPinned = false;
  isMobile = false;

  private readonly SIDEBAR_PIN_KEY = 'sidebarPinned';
  private readonly SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
  private readonly MOBILE_BREAKPOINT = 768;

  constructor(
    private authService: AuthService,
    private router: Router,
    private sidebarStateService: SidebarStateService
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    // Carregar estado collapsed do localStorage
    const savedCollapsed = localStorage.getItem(this.SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed) {
      this.isCollapsed = savedCollapsed === 'true';
    }
    
    // Carregar estado pinned do localStorage
    const saved = localStorage.getItem(this.SIDEBAR_PIN_KEY);
    if (saved) {
      this.isPinned = saved === 'true';
    }
    
    // Emitir estado inicial
    this.updateSidebarState();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < this.MOBILE_BREAKPOINT;
  }

  private updateSidebarState(): void {
    this.sidebarStateService.setCollapsed(this.isCollapsed);
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem(this.SIDEBAR_COLLAPSED_KEY, this.isCollapsed.toString());
    this.updateSidebarState();
  }

  togglePin(): void {
    // Em mobile, ignorar o pin (sempre funcionar como menu overlay)
    if (this.isMobile) {
      return;
    }

    this.isPinned = !this.isPinned;

    // Se fixar, expandir o menu
    if (this.isPinned) {
      this.isCollapsed = false;
    } else {
      // Se desafixar, recolher o menu
      this.isCollapsed = true;
    }

    // Persistir no localStorage
    localStorage.setItem(this.SIDEBAR_PIN_KEY, this.isPinned.toString());

    // Emitir novo estado
    this.updateSidebarState();
  }

  toggleSidebar(): void {
    // Toggle para mobile (overlay)
    this.isOpen = !this.isOpen;
  }

  closeSidebar(): void {
    this.isOpen = false;
  }

  navigateTo(route: string): void {
    this.closeSidebar();
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
  }
}
