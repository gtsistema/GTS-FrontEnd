import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EntradaSaidaService } from '../../entrada-saida/entrada-saida.service';
import {
  EntradaSaidaOutput,
  EntradaSaidaPagedResult,
  EntradaSaidaPermanenciaInput,
  EntradaSaidaSearchOutput
} from '../../models/entrada-saida.models';
import { ToastService } from '../../../../core/api/services/toast.service';
import { PermissionCacheService } from '../../../../core/services/permission-cache.service';
import { ApiError } from '../../../../core/api/models';

type PermanenciaAcao = 'suspender' | 'retornar' | 'finalizar';

@Component({
  selector: 'app-movimentos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movimentos-page.component.html',
  styleUrls: ['./movimentos-page.component.scss']
})
export class MovimentosPageComponent implements OnInit {
  private readonly service = inject(EntradaSaidaService);
  private readonly toast = inject(ToastService);
  private readonly permissionCache = inject(PermissionCacheService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly canVisualizar = this.permissionCache.has('entradasaida.visualizar') || this.permissionCache.hasAny(['*']);
  readonly canGravar = this.permissionCache.has('entradasaida.gravar') || this.permissionCache.hasAny(['*']);
  readonly canAlterar = this.permissionCache.has('entradasaida.alterar') || this.permissionCache.hasAny(['*']);
  readonly canExcluir = this.permissionCache.has('entradasaida.excluir') || this.permissionCache.hasAny(['*']);

  filtro = { descricao: '', somenteEmAberto: true };

  registros: EntradaSaidaSearchOutput[] = [];
  numeroPagina = 1;
  tamanhoPagina = 20;
  totalCount = 0;
  loading = false;

  permanenciaOpen = false;
  permanenciaAcao: PermanenciaAcao = 'suspender';
  registroSelecionado: EntradaSaidaOutput | null = null;
  permanenciaDataHora = '';

  ngOnInit(): void {
    if (!this.canVisualizar) return;
    this.buscar();
  }

  buscar(): void {
    this.loading = true;
    this.service.buscar({
      placa: this.filtro.descricao || undefined,
      somenteEmAberto: this.filtro.somenteEmAberto,
      numeroPagina: this.numeroPagina,
      tamanhoPagina: this.tamanhoPagina
    }).subscribe({
      next: (paged) => this.applyPagedResult(paged),
      error: (err: ApiError) => this.handleApiError(err, 'Erro ao carregar movimentos.')
    });
  }

  abrirNovo(): void {
    if (!this.canGravar) return;
    void this.router.navigate(['novo'], { relativeTo: this.route.parent });
  }

  abrirEditar(id: number): void {
    if (!this.canAlterar) return;
    void this.router.navigate([String(id)], { relativeTo: this.route.parent });
  }

  abrirPermanencia(item: EntradaSaidaSearchOutput, acao: PermanenciaAcao): void {
    if (acao === 'finalizar' || acao === 'suspender' || acao === 'retornar') {
      this.permanenciaAcao = acao;
      this.permanenciaDataHora = '';
      this.service.getById(item.id).subscribe((detalhe) => {
        this.registroSelecionado = detalhe;
        this.permanenciaOpen = true;
      });
    }
  }

  confirmarPermanencia(): void {
    const item = this.registroSelecionado;
    if (!item) return;
    const isoData = this.toIsoOrUndefined(this.permanenciaDataHora);
    if (this.permanenciaAcao === 'finalizar') {
      this.service.finalizarPermanencia(item.id, isoData).subscribe({
        next: () => this.finalizarAcaoPermanencia('Permanência finalizada com sucesso.'),
        error: (err: ApiError) => this.handleApiError(err, 'Erro ao finalizar permanência.')
      });
      return;
    }
    const payload: EntradaSaidaPermanenciaInput = {
      retornarAoPatio: this.permanenciaAcao === 'retornar',
      dataHoraEvento: isoData
    };
    this.service.suspenderPermanencia(item.id, payload).subscribe({
      next: () =>
        this.finalizarAcaoPermanencia(
          payload.retornarAoPatio ? 'Retorno ao pátio realizado.' : 'Permanência suspensa com sucesso.'
        ),
      error: (err: ApiError) => this.handleApiError(err, 'Erro ao atualizar permanência.')
    });
  }

  excluir(item: EntradaSaidaSearchOutput): void {
    if (!this.canExcluir || !confirm(`Excluir o registro da placa ${item.placaVeiculo}?`)) return;
    this.service.excluir(item.id).subscribe({
      next: () => {
        this.toast.success('Registro excluído.');
        this.buscar();
      },
      error: (err: ApiError) => this.handleApiError(err, 'Erro ao excluir registro.')
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.tamanhoPagina));
  }

  irParaPagina(pagina: number): void {
    const p = Math.min(this.totalPaginas, Math.max(1, pagina));
    if (p === this.numeroPagina) return;
    this.numeroPagina = p;
    this.buscar();
  }

  statusLabel(item: EntradaSaidaSearchOutput): 'Em aberto' | 'Finalizado' {
    return item.dataHoraSaida ? 'Finalizado' : 'Em aberto';
  }

  formatarMinutos(minutos?: number | null): string {
    if (minutos == null || minutos <= 0) return '0 min';
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  podeSuspenderOuRetornar(): boolean {
    if (!this.registroSelecionado) return false;
    return !this.registroSelecionado.finalizado;
  }

  podeFinalizar(): boolean {
    if (!this.registroSelecionado) return false;
    return !this.registroSelecionado.finalizado;
  }

  placaSelecionada(): string {
    const veiculo = this.registroSelecionado?.veiculo as { placa?: string } | undefined;
    return veiculo?.placa ?? '—';
  }

  private finalizarAcaoPermanencia(msg: string): void {
    this.toast.success(msg);
    this.permanenciaOpen = false;
    this.buscar();
  }

  private applyPagedResult(paged: EntradaSaidaPagedResult<EntradaSaidaSearchOutput>): void {
    this.loading = false;
    this.registros = paged.items;
    this.totalCount = paged.totalCount;
    this.numeroPagina = paged.numeroPagina;
    this.tamanhoPagina = paged.tamanhoPagina;
  }

  private handleApiError(err: ApiError, fallback: string, extra?: () => void): void {
    this.loading = false;
    extra?.();
    this.toast.error(err?.message ?? fallback);
  }

  private toIsoOrUndefined(value: string | null | undefined): string | undefined {
    if (!value?.trim()) return undefined;
    return new Date(value).toISOString();
  }
}
