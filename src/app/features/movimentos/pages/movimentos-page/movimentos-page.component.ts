import { Component, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlacaTransportadoraLookupService,
  DadosVeiculoCadastro,
} from '../../services/placa-transportadora-lookup.service';

export type MovimentosTab = 'operacao' | 'historico';

export interface EntradaForm {
  placa: string;
  modeloVeiculo: string;
  anoFabricacao: string;
  quantidadeEixos: string;
  transportadora: string;
  condutor: string;
  cpf: string;
  observacao: string;
}

/** Período em que a contagem ficou suspensa (ex.: 14:00 até 16:00). */
export interface SuspensaoPeriodo {
  inicio: string;
  fim: string | null;
}

export interface VeiculoEmAndamento {
  placa: string;
  dataHoraEntrada: string;
  transportadora: string;
  condutor: string;
  cpf: string;
  status: string;
  modeloVeiculo: string;
  anoFabricacao: string;
  quantidadeEixos: string;
  suspensoes?: SuspensaoPeriodo[];
  /** Indica se a entrada foi agendada (filtro "Agendados"). */
  agendado?: boolean;
}

/** Filtro rápido da tabela "Em andamento" pelos chips de resumo. */
export type FiltroResumoMovimentos = 'todos' | 'noPatio' | 'suspensos' | 'entradasHoje' | 'agendados';

export interface MovimentoHistorico {
  placa: string;
  motorista: string;
  cpf: string;
  transportadora: string;
  dataEntrada: string;
  dataSaida: string;
  valor: string;
  tempoEstacionado?: string;
  /** Status final do movimento (ex.: Finalizado, Com suspensão). */
  statusFinal?: string;
}

export type FiltroPeriodoHistorico = 'todos' | 'hoje' | 'semana' | 'mes';

@Component({
  selector: 'app-movimentos-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movimentos-page.component.html',
  styleUrls: ['./movimentos-page.component.scss'],
})
export class MovimentosPageComponent implements OnInit, OnDestroy {
  private placaTransportadoraLookup = inject(PlacaTransportadoraLookupService);

  activeTab: MovimentosTab = 'operacao';
  entradaModalOpen = false;
  entradaForm: EntradaForm = this.getEntradaFormVazio();
  emAndamento: VeiculoEmAndamento[] = [];
  historicoMovimentos: MovimentoHistorico[] = [];
  filtroPlaca = '';
  /** Filtro ativo dos chips de resumo (No pátio, Suspensos, etc.). */
  filtroResumo: FiltroResumoMovimentos = 'todos';
  private buscandoTransportadora = false;

  /** Aba Histórico: busca por placa. */
  filtroPlacaHistorico = '';
  /** Aba Histórico: período (hoje, semana, mês, todos). */
  filtroPeriodoHistorico: FiltroPeriodoHistorico = 'mes';
  /** Aba Histórico: status (todos ou valor do statusFinal). */
  filtroStatusHistorico = '';
  /** Aba Histórico: movimento selecionado para ver detalhes (modal). */
  detalheMovimento: MovimentoHistorico | null = null;
  /** Aba Histórico: chave da linha cujo menu de ações está aberto (placa|dataSaida). */
  menuAbertoKey: string | null = null;
  /** Movimento cujo menu está aberto (para renderizar dropdown fora da tabela). */
  movimentoMenuAberto: MovimentoHistorico | null = null;
  /** Posição do dropdown (fixed) para não ser cortado pelo overflow da tabela. */
  dropdownPos: { top: number; left: number } | null = null;

  /** Resumo da aba Histórico (mock). Substituir por backend quando disponível. */
  readonly resumoHistorico = {
    movimentosHoje: 24,
    saidasHoje: 18,
    suspensoes: 5,
    tempoMedio: '2h 15min',
    faturamento: 'R$ 12.450,00',
  };

  /** Atualizado a cada 1 s para o tempo de permanência contar automaticamente. */
  tickAtualizacao = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Ordenação da tabela "Em andamento agora". */
  ordenarColuna: keyof VeiculoEmAndamento | null = null;
  ordenarDirecao: 'asc' | 'desc' = 'asc';

  /** Opções de quantidade de eixos (2 a 9) para o select. */
  readonly eixosOpcoes = [2, 3, 4, 5, 6, 7, 8, 9];

  /** Resumo operacional (mock). Substituir por chamada ao backend quando disponível. */
  readonly resumoOperacional = {
    noPatioAgora: 18,
    suspensos: 3,
    entradasHoje: 42,
    agendadosHoje: 11,
  };

  /** Alterna o filtro: se clicar no já selecionado, desmarca e mostra todos. */
  setFiltroResumo(f: FiltroResumoMovimentos): void {
    this.filtroResumo = this.filtroResumo === f ? 'todos' : f;
  }

  /** Lista em andamento filtrada pelo chip de resumo (antes do filtro de placa). */
  get emAndamentoPorResumo(): VeiculoEmAndamento[] {
    const lista = this.emAndamento;
    switch (this.filtroResumo) {
      case 'noPatio':
        return lista.filter((v) => v.status === 'Em pátio');
      case 'suspensos':
        return lista.filter((v) => v.status === 'Suspenso');
      case 'entradasHoje': {
        const hoje = this.hojeStr();
        return lista.filter((v) => (v.dataHoraEntrada || '').slice(0, 10) === hoje);
      }
      case 'agendados':
        return lista.filter((v) => v.agendado === true);
      default:
        return lista;
    }
  }

  private hojeStr(): string {
    const d = new Date();
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  /** Título da tabela "Em andamento" conforme o filtro ativo. */
  get tituloTabelaEmAndamento(): string {
    const t: Record<FiltroResumoMovimentos, string> = {
      todos: 'Em andamento agora',
      noPatio: 'No pátio',
      suspensos: 'Suspensos',
      entradasHoje: 'Entradas hoje',
      agendados: 'Agendados',
    };
    return t[this.filtroResumo];
  }

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.tickAtualizacao++;
    }, 1_000);
  }

  ngOnDestroy(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setActiveTab(tab: MovimentosTab): void {
    this.activeTab = tab;
  }

  /**
   * Tempo de permanência até agora (descontando períodos suspensos).
   * Usado na coluna "Tempo de permanência" da tabela Em andamento.
   */
  tempoPermanenciaAgora(item: VeiculoEmAndamento): string {
    const entradaMs = this.parseDataHoraToMs(item.dataHoraEntrada);
    const agoraMs = Date.now();
    if (entradaMs == null || agoraMs <= entradaMs) return '—';

    let totalMs = agoraMs - entradaMs;
    const suspensoes = item.suspensoes ?? [];
    for (const s of suspensoes) {
      const ini = this.parseDataHoraToMs(s.inicio);
      if (ini == null) continue;
      const fimMs = s.fim === null ? agoraMs : this.parseDataHoraToMs(s.fim);
      if (fimMs != null && fimMs > ini) totalMs -= fimMs - ini;
    }

    if (totalMs <= 0) return '—';
    const minutos = Math.round(totalMs / 60000);
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  openEntradaModal(): void {
    this.entradaForm = this.getEntradaFormVazio();
    this.entradaModalOpen = true;
  }

  closeEntradaModal(): void {
    this.entradaModalOpen = false;
  }

  /** Formata placa: só letras e números, maiúsculo, máx. 7 caracteres. */
  formatarPlaca(value: string): void {
    this.entradaForm.placa = (value || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 7);
  }

  /** Formata CPF: 000.000.000-00 (11 dígitos). */
  formatarCpf(value: string): void {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    this.entradaForm.cpf =
      digits.length <= 3
        ? digits
        : digits.length <= 6
          ? `${digits.slice(0, 3)}.${digits.slice(3)}`
          : digits.length <= 9
            ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
            : `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  /**
   * Ao sair do campo Placa, busca no backend se a placa está vinculada
   * a alguma transportadora cadastrada. Se tiver cadastro, preenche transportadora
   * e dados do veículo (modelo, ano e eixos); se não, mantém em branco.
   */
  buscarTransportadoraPorPlaca(): void {
    const placa = (this.entradaForm.placa || '').trim();
    if (!placa || this.buscandoTransportadora) return;
    this.buscandoTransportadora = true;
    this.placaTransportadoraLookup.getDadosVeiculoPorPlaca(placa).subscribe({
      next: (dados: DadosVeiculoCadastro | null) => {
        if (dados) {
          this.entradaForm.transportadora = dados.transportadora ?? '';
          this.entradaForm.modeloVeiculo = dados.modeloVeiculo ?? '';
          this.entradaForm.anoFabricacao = dados.anoFabricacao ?? '';
          this.entradaForm.quantidadeEixos = dados.quantidadeEixos ?? '';
        }
        this.buscandoTransportadora = false;
      },
      error: () => {
        this.buscandoTransportadora = false;
      },
    });
  }

  registrarEntrada(): void {
    const f = this.entradaForm;
    if (!f.placa?.trim()) return;
    this.emAndamento = [
      ...this.emAndamento,
      {
        placa: f.placa.trim(),
        dataHoraEntrada: this.formatarDataHora(new Date()),
        transportadora: f.transportadora?.trim() || '—',
        condutor: f.condutor?.trim() || '—',
        cpf: f.cpf?.trim() || '—',
        status: 'Em pátio',
        modeloVeiculo: f.modeloVeiculo?.trim() || '—',
        anoFabricacao: f.anoFabricacao?.trim() || '—',
        quantidadeEixos: f.quantidadeEixos?.trim() || '—',
        suspensoes: [],
        agendado: false,
      },
    ];
    this.entradaForm = this.getEntradaFormVazio();
    this.closeEntradaModal();
  }

  /** Suspende a contagem do veículo (para a contagem até retomar). */
  suspender(item: VeiculoEmAndamento): void {
    const agora = this.formatarDataHora(new Date());
    this.emAndamento = this.emAndamento.map((v) =>
      v.placa === item.placa && v.dataHoraEntrada === item.dataHoraEntrada
        ? {
            ...v,
            status: 'Suspenso',
            suspensoes: [...(v.suspensoes ?? []), { inicio: agora, fim: null }],
          }
        : v
    );
  }

  /** Retoma a contagem do veículo (encerra o período de suspensão). */
  retomar(item: VeiculoEmAndamento): void {
    const agora = this.formatarDataHora(new Date());
    const suspensoes = [...(item.suspensoes ?? [])];
    const lastIndex = suspensoes.length - 1;
    if (lastIndex >= 0 && suspensoes[lastIndex].fim === null) {
      suspensoes[lastIndex] = { ...suspensoes[lastIndex], fim: agora };
    }
    this.emAndamento = this.emAndamento.map((v) =>
      v.placa === item.placa && v.dataHoraEntrada === item.dataHoraEntrada
        ? { ...v, status: 'Em pátio', suspensoes }
        : v
    );
  }

  registrarSaida(item: VeiculoEmAndamento): void {
    const agora = this.formatarDataHora(new Date());
    const tempoEstacionado = this.calcularTempoEstacionado(item, agora);
    this.historicoMovimentos = [
      ...this.historicoMovimentos,
      {
        placa: item.placa,
        motorista: item.condutor,
        cpf: item.cpf,
        transportadora: item.transportadora,
        dataEntrada: item.dataHoraEntrada,
        dataSaida: agora,
        valor: '—',
        tempoEstacionado,
        statusFinal: (item.suspensoes?.length ?? 0) > 0 ? 'Com suspensão' : 'Finalizado',
      },
    ];
    this.emAndamento = this.emAndamento.filter(
      (v) => v.placa !== item.placa || v.dataHoraEntrada !== item.dataHoraEntrada
    );
  }

  /** Calcula o tempo efetivamente estacionado (entrada → saída, descontando suspensões). */
  private calcularTempoEstacionado(item: VeiculoEmAndamento, dataSaida: string): string {
    const entradaMs = this.parseDataHoraToMs(item.dataHoraEntrada);
    const saidaMs = this.parseDataHoraToMs(dataSaida);
    if (entradaMs == null || saidaMs == null || saidaMs <= entradaMs) return '—';

    let totalMs = saidaMs - entradaMs;
    const suspensoes = item.suspensoes ?? [];
    for (const s of suspensoes) {
      if (s.fim == null) continue;
      const ini = this.parseDataHoraToMs(s.inicio);
      const fim = this.parseDataHoraToMs(s.fim);
      if (ini != null && fim != null && fim > ini) totalMs -= fim - ini;
    }

    if (totalMs <= 0) return '—';
    const minutos = Math.round(totalMs / 60000);
    if (minutos < 60) return `${minutos} min`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  /** Converte "dd/MM/yyyy HH:mm" para timestamp (ms). */
  private parseDataHoraToMs(str: string): number | null {
    if (!str || !str.trim()) return null;
    const parts = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})/);
    if (!parts) return null;
    const [, dia, mes, ano, h, min] = parts;
    const d = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10), parseInt(h, 10), parseInt(min, 10), 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  /** Lista "Em andamento" filtrada por resumo (chip) e depois por placa. */
  get emAndamentoFiltrado(): VeiculoEmAndamento[] {
    const base = this.emAndamentoPorResumo;
    const termo = (this.filtroPlaca || '').trim().toUpperCase();
    if (!termo) return base;
    return base.filter((v) => v.placa.toUpperCase().includes(termo));
  }

  /** Lista "Em andamento" filtrada e ordenada pela coluna selecionada. */
  get emAndamentoOrdenado(): VeiculoEmAndamento[] {
    const lista = [...this.emAndamentoFiltrado];
    const col = this.ordenarColuna;
    if (!col) return lista;
    const dir = this.ordenarDirecao === 'asc' ? 1 : -1;
    lista.sort((a, b) => {
      const va = String(a[col] ?? '').trim().toLowerCase();
      const vb = String(b[col] ?? '').trim().toLowerCase();
      return dir * va.localeCompare(vb, undefined, { numeric: true });
    });
    return lista;
  }

  /** Alterna ordenação ao clicar no cabeçalho da coluna. */
  ordenarPor(col: keyof VeiculoEmAndamento): void {
    if (this.ordenarColuna === col) {
      this.ordenarDirecao = this.ordenarDirecao === 'asc' ? 'desc' : 'asc';
    } else {
      this.ordenarColuna = col;
      this.ordenarDirecao = 'asc';
    }
  }

  /** Indica se a coluna está ordenada e em qual direção (para ícone no th). */
  ordenacaoColuna(col: keyof VeiculoEmAndamento): 'asc' | 'desc' | null {
    if (this.ordenarColuna !== col) return null;
    return this.ordenarDirecao;
  }

  /** Última suspensão do item (a em aberto quando status é Suspenso). */
  ultimaSuspensao(item: VeiculoEmAndamento): SuspensaoPeriodo | null {
    const list = item.suspensoes ?? [];
    return list.length > 0 ? list[list.length - 1] : null;
  }

  /** Lista do histórico filtrada por placa, período e status. */
  get historicoFiltrado(): MovimentoHistorico[] {
    let lista = this.historicoMovimentos;
    const termo = (this.filtroPlacaHistorico || '').trim().toUpperCase();
    if (termo) {
      lista = lista.filter((m) => m.placa.toUpperCase().includes(termo));
    }
    if (this.filtroPeriodoHistorico !== 'todos') {
      const now = new Date();
      const hojeStr = this.hojeStr();
      lista = lista.filter((m) => {
        const dataStr = (m.dataSaida || '').slice(0, 10);
        if (!dataStr) return false;
        if (this.filtroPeriodoHistorico === 'hoje') return dataStr === hojeStr;
        if (this.filtroPeriodoHistorico === 'semana') {
          const ms = this.parseDataSaidaToMs(m.dataSaida);
          if (ms == null) return false;
          const semanaAtras = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          return ms >= semanaAtras;
        }
        if (this.filtroPeriodoHistorico === 'mes') {
          const [d, mo, y] = dataStr.split('/').map((x) => parseInt(x, 10));
          return mo === now.getMonth() + 1 && y === now.getFullYear();
        }
        return true;
      });
    }
    if ((this.filtroStatusHistorico || '').trim()) {
      const status = this.filtroStatusHistorico.trim();
      lista = lista.filter((m) => (m.statusFinal || 'Finalizado') === status);
    }
    return lista;
  }

  /** Opções de status para o filtro da aba Histórico. */
  get opcoesStatusHistorico(): string[] {
    const set = new Set<string>(['Finalizado', 'Com suspensão']);
    this.historicoMovimentos.forEach((m) => {
      if (m.statusFinal) set.add(m.statusFinal);
    });
    return ['', ...Array.from(set)];
  }

  private parseDataSaidaToMs(str: string): number | null {
    if (!str || !str.trim()) return null;
    const parts = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!parts) return null;
    const [, dia, mes, ano] = parts;
    const d = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10), 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  openDetalheMovimento(m: MovimentoHistorico): void {
    this.detalheMovimento = m;
  }

  closeDetalheMovimento(): void {
    this.detalheMovimento = null;
  }

  /** Fecha o menu de ações ao clicar fora. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest?.('.historico-menu-wrap') || target.closest?.('.historico-dropdown-fixed')) return;
    this.closeMenuAcoes();
  }

  /** Chave única da linha para controlar qual menu está aberto. */
  menuKey(m: MovimentoHistorico): string {
    return `${m.placa}|${m.dataSaida}`;
  }

  isMenuAberto(m: MovimentoHistorico): boolean {
    return this.menuAbertoKey === this.menuKey(m);
  }

  toggleMenuAcoes(m: MovimentoHistorico, event: Event): void {
    event.stopPropagation();
    const key = this.menuKey(m);
    if (this.menuAbertoKey === key) {
      this.closeMenuAcoes();
      return;
    }
    const el = (event.currentTarget as HTMLElement);
    const rect = el.getBoundingClientRect();
    const dropdownWidth = 180;
    this.dropdownPos = {
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - dropdownWidth),
    };
    this.movimentoMenuAberto = m;
    this.menuAbertoKey = key;
  }

  closeMenuAcoes(): void {
    this.menuAbertoKey = null;
    this.movimentoMenuAberto = null;
    this.dropdownPos = null;
  }

  acaoVerDetalhes(m: MovimentoHistorico): void {
    this.closeMenuAcoes();
    this.openDetalheMovimento(m);
  }

  /** Abre janela de impressão com comprovante do movimento. */
  imprimirComprovante(m: MovimentoHistorico): void {
    this.closeMenuAcoes();
    const titulo = 'Comprovante de movimento';
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; color: #1e293b; padding: 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin: 0 0 20px 0; color: #0f172a; border-bottom: 2px solid #3B82F6; padding-bottom: 8px; }
    dl { margin: 0; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .row:last-child { border-bottom: none; }
    dt { margin: 0; font-weight: 500; color: #64748b; }
    dd { margin: 0; font-weight: 600; color: #0f172a; text-align: right; }
    .footer { margin-top: 24px; font-size: 0.75rem; color: #94a3b8; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <dl>
    <div class="row"><dt>Placa</dt><dd>${this.escapeHtml(m.placa)}</dd></div>
    <div class="row"><dt>Motorista</dt><dd>${this.escapeHtml(m.motorista)}</dd></div>
    <div class="row"><dt>CPF</dt><dd>${this.escapeHtml(m.cpf)}</dd></div>
    <div class="row"><dt>Transportadora</dt><dd>${this.escapeHtml(m.transportadora)}</dd></div>
    <div class="row"><dt>Data de entrada</dt><dd>${this.escapeHtml(m.dataEntrada)}</dd></div>
    <div class="row"><dt>Data de saída</dt><dd>${this.escapeHtml(m.dataSaida)}</dd></div>
    <div class="row"><dt>Tempo estacionado</dt><dd>${this.escapeHtml(m.tempoEstacionado ?? '—')}</dd></div>
    <div class="row"><dt>Status final</dt><dd>${this.escapeHtml(m.statusFinal ?? 'Finalizado')}</dd></div>
    <div class="row"><dt>Valor</dt><dd>${this.escapeHtml(m.valor)}</dd></div>
  </dl>
  <p class="footer">Documento gerado em ${new Date().toLocaleString('pt-BR')}.</p>
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };<\/script>
</body>
</html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  exportarHistorico(): void {
    const rows = this.historicoFiltrado;
    const headers = [
      'Placa',
      'Motorista',
      'CPF',
      'Transportadora',
      'DataEntrada',
      'DataSaida',
      'TempoEstacionado',
      'StatusFinal',
      'Valor',
    ];
    const csvLines = [
      headers.join(';'),
      ...rows.map((m) =>
        [
          this.escapeCsv(m.placa),
          this.escapeCsv(m.motorista),
          this.escapeCsv(m.cpf),
          this.escapeCsv(m.transportadora),
          this.escapeCsv(m.dataEntrada),
          this.escapeCsv(m.dataSaida),
          this.escapeCsv(m.tempoEstacionado ?? '—'),
          this.escapeCsv(m.statusFinal ?? 'Finalizado'),
          this.escapeCsv(m.valor),
        ].join(';')
      ),
    ];
    const content = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentos-historico-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private escapeCsv(value: string): string {
    const text = String(value ?? '');
    if (text.includes(';') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private formatarDataHora(d: Date): string {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${h}:${min}`;
  }

  private getEntradaFormVazio(): EntradaForm {
    return {
      placa: '',
      modeloVeiculo: '',
      anoFabricacao: '',
      quantidadeEixos: '',
      transportadora: '',
      condutor: '',
      cpf: '',
      observacao: '',
    };
  }
}
