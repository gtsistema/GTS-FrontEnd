import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { EstacionamentoListItemDTO, TipoPessoa } from '../../models/estacionamento.dto';

@Component({
  selector: 'app-estacionamento-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './estacionamento-list.component.html',
  styleUrls: ['./estacionamento-list.component.scss']
})
export class EstacionamentoListComponent implements OnInit {
  itens: EstacionamentoListItemDTO[] = [];
  filtrados: EstacionamentoListItemDTO[] = [];
  busca = '';
  loading = true;
  erro: string | null = null;

  constructor(private estacionamentoService: EstacionamentoService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.estacionamentoService.listar().subscribe({
      next: (lista) => {
        this.itens = lista;
        this.aplicarBusca();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar a lista.';
        this.loading = false;
      }
    });
  }

  aplicarBusca(): void {
    const q = this.busca.trim().toLowerCase();
    if (!q) {
      this.filtrados = [...this.itens];
      return;
    }
    this.filtrados = this.itens.filter(
      (x) =>
        (x.nomeRazaoSocial && x.nomeRazaoSocial.toLowerCase().includes(q)) ||
        (x.documento && x.documento.replace(/\D/g, '').includes(q.replace(/\D/g, '')))
    );
  }

  tipoPessoaLabel(tipo: TipoPessoa): string {
    return tipo === 1 ? 'PF' : 'PJ';
  }
}
