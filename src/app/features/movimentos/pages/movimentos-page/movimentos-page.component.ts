import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
}

export interface MovimentoHistorico {
  placa: string;
  motorista: string;
  cpf: string;
  transportadora: string;
  dataEntrada: string;
  dataSaida: string;
  valor: string;
  tempoEstacionado?: string;
}

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
  private buscandoTransportadora = false;

  /** Atualizado a cada 1 s para o tempo de permanência contar automaticamente. */
  tickAtualizacao = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** Ordenação da tabela "Em andamento agora". */
  ordenarColuna: keyof VeiculoEmAndamento | null = null;
  ordenarDirecao: 'asc' | 'desc' = 'asc';

  /** Opções de quantidade de eixos (2 a 9) para o select. */
  readonly eixosOpcoes = [2, 3, 4, 5, 6, 7, 8, 9];

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
   * Ao sair do campo Placa, busca no backend (futuro) se a placa está vinculada
   * a alguma transportadora cadastrada. Se tiver cadastro, preenche transportadora
   * e dados do veículo (modelo, ano, eixos, carregado/vazio); se não, mantém em branco.
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

  /** Lista "Em andamento" filtrada por placa. */
  get emAndamentoFiltrado(): VeiculoEmAndamento[] {
    const termo = (this.filtroPlaca || '').trim().toUpperCase();
    if (!termo) return this.emAndamento;
    return this.emAndamento.filter((v) => v.placa.toUpperCase().includes(termo));
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

  /** Movimentos do mês atual para a aba Histórico. */
  get historicoDoMes(): MovimentoHistorico[] {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth();
    return this.historicoMovimentos.filter((m) => {
      const parts = (m.dataSaida || '').split(/[/\s]/);
      const mes = parts[1];
      const ano = parts[2];
      const mesNum = mes ? parseInt(mes, 10) - 1 : -1;
      const anoNum = ano ? parseInt(ano, 10) : 0;
      return mesNum === mesAtual && anoNum === anoAtual;
    });
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
