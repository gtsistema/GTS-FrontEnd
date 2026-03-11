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

  getPermissionsSignal(nodeId: string) {
    return computed(() => this.store()[nodeId] ?? []);
  }
}
