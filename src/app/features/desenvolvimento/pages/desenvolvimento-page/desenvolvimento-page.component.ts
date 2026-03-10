import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

const STORAGE_KEY = 'gts-desenvolvimento-telas';

export interface Etapa {
  id: string;
  texto: string;
  concluida: boolean;
}

export interface TelaAndamento {
  id: string;
  nome: string;
  descricao: string;
  rota?: string;
  etapas: Etapa[];
}

export interface MapaMentalNode {
  id: string;
  label: string;
  tipo: 'centro' | 'ramo' | 'folha';
  children?: MapaMentalNode[];
  rota?: string;
}

@Component({
  selector: 'app-desenvolvimento-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './desenvolvimento-page.component.html',
  styleUrls: ['./desenvolvimento-page.component.scss'],
})
export class DesenvolvimentoPageComponent implements OnInit, AfterViewChecked {
  /** Telas que podem ser movimentadas (drag) e com etapas editáveis. */
  telas: TelaAndamento[] = [];

  private viewChecked = false;

  ngOnInit(): void {
    const saved = this.loadFromStorage();
    this.telas = saved ?? this.getTelasInicial();
  }

  ngAfterViewChecked(): void {
    if (this.viewChecked) return;
    this.viewChecked = true;
    setTimeout(() => this.resizeAllEtapaInputs(), 0);
  }

  /** Ajusta a altura do textarea ao conteúdo (expansão visível). */
  autoResizeEtapa(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  private resizeAllEtapaInputs(): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll<HTMLTextAreaElement>('textarea.etapa-input').forEach((el) => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }

  /** Carrega telas do localStorage; retorna null se inválido ou vazio. */
  private loadFromStorage(): TelaAndamento[] | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as unknown;
      if (!Array.isArray(data) || data.length === 0) return null;
      const ok = data.every(
        (t: unknown) =>
          t !== null &&
          typeof t === 'object' &&
          'id' in t &&
          'nome' in t &&
          'descricao' in t &&
          'etapas' in t &&
          Array.isArray((t as TelaAndamento).etapas)
      );
      if (!ok) return null;
      return data as TelaAndamento[];
    } catch {
      return null;
    }
  }

  /** Persiste telas no localStorage (chamar após qualquer alteração). */
  persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.telas));
    } catch {
      // quota ou localStorage desabilitado
    }
  }

  /** Agenda persistência após digitação (debounce). */
  persistDebounced(): void {
    if (this.persistTimeout != null) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => {
      this.persistTimeout = null;
      this.persist();
    }, 400);
  }

  /** Dados iniciais quando não há nada salvo. */
  private getTelasInicial(): TelaAndamento[] {
    return [
    {
      id: 'login',
      nome: 'Login',
      descricao: 'Autenticação e redirecionamento',
      rota: '/',
      etapas: [
        { id: 'e1', texto: 'Formulário de login', concluida: true },
        { id: 'e2', texto: 'Guard e redirect', concluida: true },
        { id: 'e3', texto: 'Redirect ao dashboard', concluida: true },
      ],
    },
    {
      id: 'layout',
      nome: 'Layout principal',
      descricao: 'Sidebar, topbar, tema',
      etapas: [
        { id: 'e1', texto: 'Sidebar', concluida: true },
        { id: 'e2', texto: 'Topbar', concluida: true },
        { id: 'e3', texto: 'Tema claro/escuro', concluida: true },
        { id: 'e4', texto: 'Layout mobile', concluida: true },
      ],
    },
    {
      id: 'dashboard',
      nome: 'Dashboard',
      descricao: 'Página inicial',
      rota: '/app/dashboard',
      etapas: [
        { id: 'e1', texto: 'Estrutura da página', concluida: true },
        { id: 'e2', texto: 'Widgets e métricas', concluida: false },
      ],
    },
    {
      id: 'cadastro-estacionamento',
      nome: 'Cadastro Estacionamento',
      descricao: 'Lista, novo, editar',
      rota: '/app/cadastro/estacionamento',
      etapas: [
        { id: 'e1', texto: 'Lista e busca', concluida: true },
        { id: 'e2', texto: 'Form stepper (novo/editar)', concluida: true },
        { id: 'e3', texto: 'Dados bancários', concluida: true },
        { id: 'e4', texto: 'Fotos e anexos', concluida: true },
        { id: 'e5', texto: 'Integração backend', concluida: false },
      ],
    },
    {
      id: 'cadastro-transportadora',
      nome: 'Cadastro Transportadora',
      descricao: 'Página de transportadora',
      rota: '/app/cadastro/transportadora',
      etapas: [{ id: 'e1', texto: 'Estrutura base', concluida: true }],
    },
    {
      id: 'cadastro-acessos',
      nome: 'Cadastro Acessos',
      descricao: 'Usuários e Perfis',
      rota: '/app/cadastro/acessos/usuarios',
      etapas: [
        { id: 'e1', texto: 'Usuários (lista e modal)', concluida: true },
        { id: 'e2', texto: 'Perfis (modal)', concluida: true },
        { id: 'e3', texto: 'Permissões por perfil', concluida: true },
        { id: 'e4', texto: 'Integração API usuários', concluida: false },
      ],
    },
    {
      id: 'movimentos',
      nome: 'Movimentos',
      descricao: 'Entrada/saída',
      rota: '/app/movimentos',
      etapas: [{ id: 'e1', texto: 'Estrutura base', concluida: true }],
    },
    {
      id: 'relatorios',
      nome: 'Relatórios',
      descricao: 'Relatórios do sistema',
      rota: '/app/relatorios',
      etapas: [{ id: 'e1', texto: 'Estrutura base', concluida: false }],
    },
    {
      id: 'financeiro',
      nome: 'Financeiro',
      descricao: 'Módulo financeiro',
      rota: '/app/financeiro',
      etapas: [{ id: 'e1', texto: 'Estrutura base', concluida: false }],
    },
    {
      id: 'configuracoes',
      nome: 'Configurações',
      descricao: 'Configurações gerais',
      rota: '/app/configuracoes',
      etapas: [{ id: 'e1', texto: 'Estrutura base', concluida: true }],
    },
  ];
  }

  /** Índice do card sendo arrastado (para reordenar). */
  dragIndex: number | null = null;

  private persistTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Mapa mental (somente leitura). */
  readonly mapaMental: MapaMentalNode = {
    id: 'root',
    label: 'GTS',
    tipo: 'centro',
    children: [
      {
        id: 'frontend',
        label: 'Frontend',
        tipo: 'ramo',
        children: [
          { id: 'layout', label: 'Layout', tipo: 'folha', rota: '/app/dashboard' },
          { id: 'auth', label: 'Auth / Login', tipo: 'folha' },
          { id: 'rotas', label: 'Rotas', tipo: 'folha' },
        ],
      },
      {
        id: 'cadastro',
        label: 'Cadastro',
        tipo: 'ramo',
        children: [
          { id: 'est', label: 'Estacionamento', tipo: 'folha', rota: '/app/cadastro/estacionamento' },
          { id: 'transp', label: 'Transportadora', tipo: 'folha', rota: '/app/cadastro/transportadora' },
          { id: 'acessos', label: 'Acessos', tipo: 'folha', rota: '/app/cadastro/acessos/usuarios' },
        ],
      },
      {
        id: 'operacao',
        label: 'Operação',
        tipo: 'ramo',
        children: [
          { id: 'mov', label: 'Movimentos', tipo: 'folha', rota: '/app/movimentos' },
          { id: 'fin', label: 'Financeiro', tipo: 'folha', rota: '/app/financeiro' },
          { id: 'rel', label: 'Relatórios', tipo: 'folha', rota: '/app/relatorios' },
        ],
      },
      {
        id: 'sistema',
        label: 'Sistema',
        tipo: 'ramo',
        children: [
          { id: 'config', label: 'Configurações', tipo: 'folha', rota: '/app/configuracoes' },
        ],
      },
    ],
  };

  /** Progresso da tela (0–100) com base nas etapas concluídas. */
  progresso(tela: TelaAndamento): number {
    const total = tela.etapas.length;
    if (total === 0) return 0;
    const concluidas = tela.etapas.filter((e) => e.concluida).length;
    return Math.round((concluidas / total) * 100);
  }

  /** Status derivado do progresso. */
  status(tela: TelaAndamento): 'concluido' | 'em-andamento' | 'planejado' {
    const p = this.progresso(tela);
    if (p >= 100) return 'concluido';
    if (p > 0) return 'em-andamento';
    return 'planejado';
  }

  getStatusLabel(s: 'concluido' | 'em-andamento' | 'planejado'): string {
    const map = { concluido: 'Concluído', 'em-andamento': 'Em andamento', planejado: 'Planejado' };
    return map[s];
  }

  getProgressGradient(progresso: number): string {
    if (progresso >= 100) return 'var(--success, #22c55e)';
    if (progresso >= 50) return 'var(--primary, #5b7cff)';
    return 'var(--warn, #eab308)';
  }

  /** Adiciona nova etapa na tela. */
  adicionarEtapa(tela: TelaAndamento): void {
    tela.etapas.push({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      texto: 'Nova etapa',
      concluida: false,
    });
    this.persist();
  }

  /** Remove etapa. */
  removerEtapa(tela: TelaAndamento, etapa: Etapa): void {
    const idx = tela.etapas.indexOf(etapa);
    if (idx !== -1) tela.etapas.splice(idx, 1);
    this.persist();
  }

  /** Alterna conclusão da etapa (atualiza porcentagem automaticamente). */
  toggleConcluida(etapa: Etapa): void {
    etapa.concluida = !etapa.concluida;
    this.persist();
  }

  /** Drag and drop: inicia arraste. */
  onDragStart(event: DragEvent, index: number): void {
    this.dragIndex = index;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(index));
  }

  onDragEnd(): void {
    this.dragIndex = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    if (this.dragIndex === null || this.dragIndex === dropIndex) return;
    const item = this.telas.splice(this.dragIndex, 1)[0];
    this.telas.splice(dropIndex, 0, item);
    this.dragIndex = null;
    this.persist();
  }

  get concluidosCount(): number {
    return this.telas.filter((t) => this.progresso(t) === 100).length;
  }

  get emAndamentoCount(): number {
    return this.telas.filter((t) => {
      const p = this.progresso(t);
      return p > 0 && p < 100;
    }).length;
  }

  get mediaProgresso(): number {
    if (this.telas.length === 0) return 0;
    const sum = this.telas.reduce((a, t) => a + this.progresso(t), 0);
    return Math.round(sum / this.telas.length);
  }
}
