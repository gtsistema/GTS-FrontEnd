import { Component, signal, computed, OnInit, OnDestroy, HostListener, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { ThemeService, ThemeMode } from '../services/theme.service';
import { filter } from 'rxjs/operators';

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  sidebarCollapsed = false;
  private persistSidebarCollapsed(): void {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(this.sidebarCollapsed));
    }
  }
  private loadSidebarCollapsed(): void {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      this.sidebarCollapsed = v === 'true';
    }
  }
  private themeMode = signal<ThemeMode>('dark');
  isMobile = signal(false);
  mobileMenuOpen = signal(false);

  currentMode = computed(() => this.themeMode());
  private routerSub?: { unsubscribe: () => void };

  constructor() {
    this.themeMode.set(this.themeService.getCurrentTheme().mode);
    this.themeService.theme$.subscribe((t) => this.themeMode.set(t.mode));
  }

  ngOnInit(): void {
    this.loadSidebarCollapsed();
    this.checkMobile();
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(() => this.mobileMenuOpen.set(false));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('window:resize')
  checkMobile(): void {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth <= MOBILE_BREAKPOINT);
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        this.mobileMenuOpen.set(false);
      }
    }
  }

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    this.persistSidebarCollapsed();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleTheme(): void {
    const next = this.currentMode() === 'dark' ? 'light' : 'dark';
    this.themeService.setThemeMode(next);
  }
}
