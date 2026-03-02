import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { EstacionamentoListItemDTO, TipoPessoa } from '../../models/estacionamento.dto';

const TAMANHO_PAGINA = 50;

@Component({
  selector: 'app-estacionamento-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './estacionamento-list.component.html',
  styleUrls: ['./estacionamento-list.component.scss']
})
export class EstacionamentoListComponent implements OnInit {
  itens: EstacionamentoListItemDTO[] = [];
  busca = '';
  loading = true;
  erro: string | null = null;
  numeroPagina = 1;
  totalCount = 0;
  tamanhoPagina = TAMANHO_PAGINA;

  constructor(private estacionamentoService: EstacionamentoService) {}

  get totalPaginas(): number {
    if (this.tamanhoPagina <= 0) return 0;
    return Math.max(1, Math.ceil(this.totalCount / this.tamanhoPagina));
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.estacionamentoService
      .buscar({
        NumeroPagina: this.numeroPagina,
        TamanhoPagina: this.tamanhoPagina,
        ...(this.busca.trim() ? { Descricao: this.busca.trim() } : {})
      })
      .subscribe({
        next: (paged) => {
          this.itens = paged.items;
          this.totalCount = paged.totalCount;
          this.numeroPagina = paged.numeroPagina;
          this.tamanhoPagina = paged.tamanhoPagina;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar a lista.';
          this.loading = false;
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
}
