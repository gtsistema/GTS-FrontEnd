import { Injectable, signal, computed } from '@angular/core';

/**
 * Estado compartilhado da toolbar da página Cadastro Estacionamento:
 * busca (layout) e gatilho de busca (list reage).
 */
@Injectable({ providedIn: 'root' })
export class EstacionamentoToolbarService {
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
