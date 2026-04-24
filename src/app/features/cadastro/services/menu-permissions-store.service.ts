import { Injectable, signal, computed } from '@angular/core';

/**
 * Store em memória do vínculo permissões por nó do menu (menu / módulo / submenu).
 * Chave: id do nó (menu-dashboard, sub-estacionamento, etc.); valor: lista de chaves de permissão.
 */
@Injectable({ providedIn: 'root' })
export class MenuPermissionsStoreService {
  private readonly store = signal<Record<string, string[]>>({});

  getPermissions(nodeId: string): string[] {
    return this.store()[nodeId] ?? [];
  }

  setPermissions(nodeId: string, permissionKeys: string[]): void {
    this.store.update((m) => ({ ...m, [nodeId]: [...permissionKeys] }));
  }

  /** Adiciona uma chave ao nó, sem duplicar. */
  appendPermission(nodeId: string, permissionKey: string): void {
    const key = permissionKey.trim();
    if (!key) return;
    this.store.update((m) => {
      const prev = m[nodeId] ?? [];
      if (prev.includes(key)) return m;
      return { ...m, [nodeId]: [...prev, key] };
    });
  }

  getPermissionsSignal(nodeId: string) {
    return computed(() => this.store()[nodeId] ?? []);
  }
}
