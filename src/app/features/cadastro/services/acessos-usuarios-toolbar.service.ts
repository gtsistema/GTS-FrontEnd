import { Injectable, signal } from '@angular/core';

/**
 * Estado compartilhado da toolbar da aba Usuários (Acessos):
 * termo de busca e gatilho para a listagem recarregar.
 */
@Injectable({ providedIn: 'root' })
export class AcessosUsuariosToolbarService {
  private readonly _searchTerm = signal('');
  private readonly _trigger = signal(0);

  searchTerm = this._searchTerm.asReadonly();
  trigger = this._trigger.asReadonly();

  setSearchTerm(value: string): void {
    this._searchTerm.set(value ?? '');
  }

  triggerSearch(): void {
    this._trigger.update((v) => v + 1);
  }
}
