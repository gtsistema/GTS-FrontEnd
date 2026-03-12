import { ChangeDetectorRef, Component, NgZone, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { EstacionamentoToolbarService } from '../../services/estacionamento-toolbar.service';
import { EstacionamentoListItemDTO, TipoPessoa } from '../../models/estacionamento.dto';
import { formatCnpj } from '../../directives/cnpj-format.directive';
import { formatCpf } from '../../directives/cpf-format.directive';
import { ApiError } from '../../../../core/api/models';

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
  private toolbar = inject(EstacionamentoToolbarService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  itens: EstacionamentoListItemDTO[] = [];
  loading = true;
  erro: string | null = null;
  numeroPagina = 1;
  totalCount = 0;
  tamanhoPagina = TAMANHO_PAGINA;

  constructor() {
    effect(() => {
      this.toolbar.trigger();
      this.buscar();
    });
  }

  get totalPaginas(): number {
    if (this.tamanhoPagina <= 0) return 0;
    return Math.max(1, Math.ceil(this.totalCount / this.tamanhoPagina));
  }

  carregar(): void {
    const term = this.toolbar.searchTerm().trim();
    this.loading = true;
    this.erro = null;
    this.estacionamentoService
      .buscar({
        NumeroPagina: this.numeroPagina,
        TamanhoPagina: this.tamanhoPagina,
        ...(term ? { Termo: term } : {})
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
}
