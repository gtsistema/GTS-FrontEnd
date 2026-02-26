import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'dark' | 'light' | 'auto';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange';

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: AccentColor;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'appTheme';
  private readonly DEFAULT_THEME: ThemeConfig = {
    mode: 'dark',
    accentColor: 'blue'
  };

  private themeSubject = new BehaviorSubject<ThemeConfig>(this.loadTheme());
  public theme$: Observable<ThemeConfig> = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  /**
   * Carrega o tema salvo no localStorage
   */
  private loadTheme(): ThemeConfig {
    const saved = localStorage.getItem(this.THEME_KEY);
    return saved ? JSON.parse(saved) : this.DEFAULT_THEME;
  }

  /**
   * Obtém o tema atual
   */
  getCurrentTheme(): ThemeConfig {
    return this.themeSubject.value;
  }

  /**
   * Atualiza o tema
   */
  setTheme(theme: ThemeConfig): void {
    localStorage.setItem(this.THEME_KEY, JSON.stringify(theme));
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  /**
   * Atualiza apenas o modo de tema
   */
  setThemeMode(mode: ThemeMode): void {
    const current = this.themeSubject.value;
    this.setTheme({ ...current, mode });
  }

  /**
   * Atualiza apenas a cor de acentuação
   */
  setAccentColor(color: AccentColor): void {
    const current = this.themeSubject.value;
    this.setTheme({ ...current, accentColor: color });
  }

  /**
   * Aplica as variáveis CSS do tema ao documento
   */
  private applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement;

    // Aplicar variáveis de cor de acentuação
    const accentColors = {
      blue: '#5b7cff',
      purple: '#7b4cff',
      green: '#4caf50',
      orange: '#ff9800'
    };

    root.style.setProperty('--accent', accentColors[theme.accentColor]);

    // Aplicar classes de tema
    root.classList.remove('theme-dark', 'theme-light', 'theme-auto');
    root.classList.add(`theme-${theme.mode}`);

    // Detectar preferência do sistema se 'auto'
    if (theme.mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    }
  }

  /**
   * Obtém as cores de acentuação disponíveis
   */
  getAvailableAccentColors(): { value: AccentColor; label: string; color: string }[] {
    return [
      { value: 'blue', label: 'Azul', color: '#5b7cff' },
      { value: 'purple', label: 'Roxo', color: '#7b4cff' },
      { value: 'green', label: 'Verde', color: '#4caf50' },
      { value: 'orange', label: 'Laranja', color: '#ff9800' }
    ];
  }

  /**
   * Obtém os modos de tema disponíveis
   */
  getAvailableThemeModes(): { value: ThemeMode; label: string }[] {
    return [
      { value: 'dark', label: 'Escuro' },
      { value: 'light', label: 'Claro' },
      { value: 'auto', label: 'Automático' }
    ];
  }
}
