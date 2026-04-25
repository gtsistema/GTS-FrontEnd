import { ChangeDetectorRef, Component, NgZone, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstacionamentoService } from '../../services/estacionamento.service';
import {
  EstacionamentoSearchField,
  EstacionamentoToolbarService
} from '../../services/estacionamento-toolbar.service';
import { EstacionamentoListItemDTO, TipoPessoa } from '../../models/estacionamento.dto';
import { formatCnpj } from '../../directives/cnpj-format.directive';
import { formatCpf } from '../../directives/cpf-format.directive';
import { ApiError } from '../../../../core/api/models';
import { ToastService } from '../../../../core/api/services/toast.service';

const TAMANHO_PAGINA = 50;

@Component({
  selector: 'app-estacionamento-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './estacionamento-list.component.html',
  styleUrls: ['./estacionamento-list.component.scss']
})
export class EstacionamentoListComponent {
  private estacionamentoService = inject(EstacionamentoService);
  /** Exposto para o template: `trigger() === 0` = ainda não houve clique em Buscar. */
  readonly toolbar = inject(EstacionamentoToolbarService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private toast = inject(ToastService);

  itens: EstacionamentoListItemDTO[] = [];
  /** Só vira true durante GET Buscar; antes do primeiro clique em "Buscar" não há requisição. */
  loading = false;
  erro: string | null = null;
  /** Durante DELETE /api/Estacionamento/{id} */
  excluindoId: number | null = null;
  numeroPagina = 1;
  totalCount = 0;
  tamanhoPagina = TAMANHO_PAGINA;

  constructor() {
    effect(() => {
      const t = this.toolbar.trigger();
      // Gatilho 0 = ainda não clicou em "Buscar" no layout; não chama a API.
      if (t === 0) {
        this.ngZone.run(() => {
          this.loading = false;
          this.itens = [];
          this.erro = null;
          this.totalCount = 0;
          this.cdr.markForCheck();
        });
        return;
      }
      this.buscar();
    });
  }

  get totalPaginas(): number {
    if (this.tamanhoPagina <= 0) return 0;
    return Math.max(1, Math.ceil(this.totalCount / this.tamanhoPagina));
  }

  carregar(): void {
    const field = this.toolbar.searchField();
    const term = this.normalizeSearchTerm(this.toolbar.searchTerm(), field);
    const propriedade = this.resolveSearchProperty(field);
    this.loading = true;
    this.erro = null;
    this.estacionamentoService
      .buscar({
        NumeroPagina: this.numeroPagina,
        TamanhoPagina: this.tamanhoPagina,
        ...(term ? { Termo: term } : {}),
        ...(propriedade ? { Propriedade: propriedade } : {})
      })
      .subscribe({
        next: (paged) => {
          this.ngZone.run(() => {
            this.itens = paged.items;
            this.totalCount = paged.totalCount;
            this.numeroPagina = paged.numeroPagina;
            this.tamanhoPagina = paged.tamanhoPagina;
            this.loading = false;
            this.cdr.markForCheck();
          });
        },
        error: (err: unknown) => {
          this.ngZone.run(() => {
            const msg = (err && typeof err === 'object' && 'message' in err && typeof (err as ApiError).message === 'string')
              ? (err as ApiError).message
              : 'Erro ao carregar a lista.';
            this.erro = msg;
            this.loading = false;
            this.cdr.markForCheck();
          });
        }
      });
  }

  private resolveSearchProperty(field: EstacionamentoSearchField): string | undefined {
    switch (field) {
      case 'cnpj':
        return 'Documento';
      case 'nomeRazaoSocial':
        return 'NomeRazaoSocial';
      case 'descricao':
        return 'Descricao';
      case 'email':
        return 'Email';
      case 'id':
        return 'Id';
      default:
        return undefined;
    }
  }

  private normalizeSearchTerm(raw: string, field: EstacionamentoSearchField): string {
    const base = (raw ?? '').trim();
    if (!base) return '';
    if (field === 'cnpj') return base.replace(/\D/g, '');
    if (field === 'id') return base.replace(/\D/g, '');
    return base;
  }

  buscar(): void {
    this.numeroPagina = 1;
    this.carregar();
  }

  irParaPagina(pagina: number): void {
    const p = Math.max(1, Math.min(pagina, this.totalPaginas));
    if (p === this.numeroPagina) return;
    this.numeroPagina = p;
    this.carregar();
  }

  tipoPessoaLabel(tipo: TipoPessoa): string {
    return tipo === 1 ? 'PF' : 'PJ';
  }

  /** Exibe documento formatado: CNPJ para PJ, CPF para PF. */
  formatDocumento(item: EstacionamentoListItemDTO): string {
    const doc = String(item.documento ?? '').replace(/\D/g, '');
    if (item.tipoPessoa === 2 && doc.length === 14) return formatCnpj(doc);
    if (item.tipoPessoa === 1 && doc.length === 11) return formatCpf(doc);
    return item.documento ?? '';
  }

  excluir(item: EstacionamentoListItemDTO): void {
    const label = item.descricao?.trim() || `Id ${item.id}`;
    if (!confirm(`Excluir o estacionamento "${label}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    this.excluindoId = item.id;
    this.estacionamentoService.excluir(item.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.excluindoId = null;
          this.toast.success('Estacionamento excluído.');
          this.carregar();
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.excluindoId = null;
          this.cdr.markForCheck();
        });
      }
    });
  }
}
