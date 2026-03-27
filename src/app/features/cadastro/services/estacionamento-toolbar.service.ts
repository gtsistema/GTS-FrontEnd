import { Injectable, signal, computed } from '@angular/core';

export type EstacionamentoSearchField =
  | 'geral'
  | 'cnpj'
  | 'nomeRazaoSocial'
  | 'descricao'
  | 'email'
  | 'id';

/**
 * Estado compartilhado da toolbar da página Cadastro Estacionamento:
 * busca (layout) e gatilho de busca (list reage).
 */
@Injectable({ providedIn: 'root' })
export class EstacionamentoToolbarService {
  private readonly _searchTerm = signal('');
  private readonly _searchField = signal<EstacionamentoSearchField>('geral');
  private readonly _trigger = signal(0);

  searchTerm = this._searchTerm.asReadonly();
  searchField = this._searchField.asReadonly();
  trigger = this._trigger.asReadonly();

  setSearchTerm(value: string): void {
    this._searchTerm.set(value ?? '');
  }

  setSearchField(value: EstacionamentoSearchField): void {
    this._searchField.set(value);
  }

  triggerSearch(): void {
    this._trigger.update((v) => v + 1);
  }
}
