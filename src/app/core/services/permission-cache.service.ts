import { Injectable, signal } from '@angular/core';

const LS_KEY = 'gts-user-permission-keys';

/**
 * Cache local de chaves de permissão do usuário logado (preenchido a partir do claim `Permission` do JWT).
 */
@Injectable({ providedIn: 'root' })
export class PermissionCacheService {
  private readonly keys = signal<string[]>(this.load());

  readonly permissionKeys = this.keys.asReadonly();

  private load(): string[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as string[];
        if (Array.isArray(p)) return p;
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  setKeys(keys: string[]): void {
    this.keys.set(keys);
    localStorage.setItem(LS_KEY, JSON.stringify(keys));
  }

  /** Logout: remove permissões em memória e no storage. */
  clear(): void {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
    this.keys.set([]);
  }

  hasAny(required: string[]): boolean {
    const k = this.keys();
    if (k.includes('*')) return true;
    if (k.length === 0) return false;
    return required.some((r) => k.includes(r));
  }

  has(key: string): boolean {
    return this.hasAny([key]);
  }
}
