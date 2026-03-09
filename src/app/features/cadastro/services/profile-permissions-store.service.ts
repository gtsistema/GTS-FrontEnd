import { Injectable, signal, computed } from '@angular/core';

/**
 * Store em memória (session) das permissões por perfil.
 * Usado quando não há backend para perfis com permissões.
 * Chave: profileId ou profileName (quando id não existe).
 */
@Injectable({ providedIn: 'root' })
export class ProfilePermissionsStoreService {
  private readonly store = signal<Record<string, string[]>>({});

  getProfilePermissions(key: string): string[] {
    return this.store()[key] ?? [];
  }

  setProfilePermissions(key: string, permissions: string[]): void {
    this.store.update((m) => ({ ...m, [key]: [...permissions] }));
  }

  getProfilePermissionsSignal(key: string) {
    return computed(() => this.store()[key] ?? []);
  }
}
