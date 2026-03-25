import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs';
import type { ApiError } from '../../../../core/api/models/api-error.model';
import { ToastService } from '../../../../core/api/services/toast.service';
import { MenuAdminService } from '../../services/menu-admin.service';
import { MenuApiService } from '../../services/menu-api.service';
import type { MenuCreateInput } from '../../services/menu-api.types';
import {
  computeNextIdFromMenus,
  mapBuscarResponseToMenuAdmins,
  menuAdminToUpdateInput,
} from '../../services/menu-api.mapper';
import {
  MenuAdmin,
  MenuPermissionRow,
  PERMISSOES_ACOES,
  SubMenuAdmin,
} from '../../models/menu-admin.model';
import {
  buildFullAcaoPermissao,
  hasMatchingPermissionAcao,
  removePermissionRowsForUi,
} from '../../services/menu-permission-acao';

@Component({
  selector: 'app-menu-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './menu-admin-page.component.html',
  styleUrls: ['./menu-admin-page.component.scss'],
})
export class MenuAdminPageComponent implements OnInit {
  protected readonly admin = inject(MenuAdminService);
  private readonly menuApi = inject(MenuApiService);
  private readonly toast = inject(ToastService);
  protected readonly acoes = PERMISSOES_ACOES;

  /** Carregamento inicial da lista (GET Buscar). */
  protected readonly carregandoLista = signal(false);
  protected readonly erroLista = signal<string | null>(null);

  /** Sincronização com API Menu (Gravar / Alterar / Delete). */
  protected readonly salvandoNoBackend = signal(false);

  /** Modal Novo/Editar menu — POST Gravar / PUT Alterar. */
  protected readonly salvandoMenuModal = signal(false);

  /** Rascunho de permissões por submenu até clicar em Salvar (chave `menuId:subId`). */
  private readonly permDrafts = new Map<string, MenuPermissionRow[]>();

  /** PUT Alterar permissões de um submenu (linha em salvamento). */
  protected readonly salvandoPermKey = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarMenusDoBackend();
  }

  /** Recarrega a grid a partir do servidor (mesmo contrato do Salvar após OrganizarMenus). */
  protected carregarMenusDoBackend(): void {
    if (this.carregandoLista()) return;
    this.carregandoLista.set(true);
    this.erroLista.set(null);
    this.menuApi
      .buscar()
      .pipe(finalize(() => this.carregandoLista.set(false)))
      .subscribe({
        next: (raw) => this.applyBuscarPayload(raw),
        error: (err: unknown) => {
          const apiMsg = this.apiErrorMessage(
            err,
            'Não foi possível carregar os menus do servidor.'
          );
          this.erroLista.set(apiMsg);
          // Mensagem já exibida pelo errorInterceptor (toast).
        },
      });
  }

  private applyBuscarPayload(raw: unknown): void {
    const menus = mapBuscarResponseToMenuAdmins(raw);
    const nextId = computeNextIdFromMenus(menus);
    this.admin.replaceMenusHidratar(menus, nextId);
    this.permDrafts.clear();
  }

  /** Atualiza lista após Gravar/Alterar sem bloquear a tela com o spinner inicial. */
  private refreshMenusAfterMutation(): void {
    this.menuApi.buscar().subscribe({
      next: (raw) => this.applyBuscarPayload(raw),
      // Falha no Buscar: toast já exibido pelo errorInterceptor.
    });
  }

  /** Erro vindo do `errorInterceptor` é `ApiError` com `message` na raiz. */
  private apiErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as ApiError).message;
      if (typeof m === 'string' && m.trim()) return m.trim();
    }
    const e = err as { error?: { message?: string } | string; message?: string };
    return typeof e?.error === 'string'
      ? e.error
      : e?.error?.message ?? e?.message ?? fallback;
  }

  /** Accordion: menus expandidos */
  protected readonly expandedMenuIds = signal<Set<number>>(new Set());

  /** Modal menu */
  protected readonly menuModalOpen = signal(false);
  protected readonly menuEditId = signal<number | null>(null);
  protected menuFormNome = '';
  protected menuFormIcon = '';
  protected menuFormAtivo = true;

  /** Modal submenu */
  protected readonly subModalOpen = signal(false);
  protected readonly subModalMenuId = signal<number | null>(null);
  protected readonly subEditId = signal<number | null>(null);
  protected subFormNome = '';
  protected subFormRota = '';
  protected subFormAtivo = true;

  protected toggleExpand(menuId: number): void {
    this.expandedMenuIds.update((set) => {
      const n = new Set(set);
      if (n.has(menuId)) n.delete(menuId);
      else n.add(menuId);
      return n;
    });
  }

  protected isExpanded(menuId: number): boolean {
    return this.expandedMenuIds().has(menuId);
  }

  // ——— Menu modal ———
  protected openNovoMenu(): void {
    this.menuEditId.set(null);
    this.menuFormNome = '';
    this.menuFormIcon = 'menu';
    this.menuFormAtivo = true;
    this.menuModalOpen.set(true);
  }

  protected openEditMenu(m: MenuAdmin): void {
    this.menuEditId.set(m.id);
    this.menuFormNome = m.nome;
    this.menuFormIcon = m.icone;
    this.menuFormAtivo = m.ativo;
    this.menuModalOpen.set(true);
  }

  protected salvarMenu(): void {
    const nome = this.menuFormNome.trim();
    if (!nome) return;
    if (this.salvandoMenuModal()) return;
    const id = this.menuEditId();
    const icone = this.menuFormIcon.trim() || 'menu';

    if (id == null) {
      const dto: MenuCreateInput = {
        id: 0,
        nome,
        descricao: nome,
        ordem: this.admin.menus().length,
        ativo: true,
        icone,
        subMenus: null,
      };
      this.salvandoMenuModal.set(true);
      this.menuApi
        .gravar(dto)
        .pipe(finalize(() => this.salvandoMenuModal.set(false)))
        .subscribe({
          next: () => {
            this.menuModalOpen.set(false);
            this.toast.success('Menu criado no servidor.');
            this.refreshMenusAfterMutation();
          },
          // Erro: toast do errorInterceptor.
        });
      return;
    }

    const m = this.admin.getSnapshot().menus.find((x) => x.id === id);
    if (!m) return;

    /** Id temporário/local (sem registro no servidor): só estado local. */
    if (id <= 0) {
      this.admin.updateMenu(id, { nome, icone, ativo: this.menuFormAtivo });
      this.menuModalOpen.set(false);
      return;
    }

    /** Qualquer menu com id vindo do Buscar deve usar PUT Alterar (nome, ícone, ativo, submenus). */
    const atualizado: MenuAdmin = { ...m, nome, icone, ativo: this.menuFormAtivo };
    this.salvandoMenuModal.set(true);
    this.menuApi
      .alterar(menuAdminToUpdateInput(atualizado))
      .pipe(finalize(() => this.salvandoMenuModal.set(false)))
      .subscribe({
        next: () => {
          this.menuModalOpen.set(false);
          this.toast.success('Menu atualizado no servidor.');
          this.refreshMenusAfterMutation();
        },
        // Erro: toast do errorInterceptor.
      });
  }

  protected excluirMenu(m: MenuAdmin): void {
    if (!confirm(`Excluir o menu "${m.nome}" e todos os submenus?`)) return;
    this.admin.deleteMenu(m.id);
  }

  /** Alterna visibilidade do menu na sidebar (somente menus ativos aparecem). */
  protected toggleMenuAtivo(m: MenuAdmin): void {
    this.admin.updateMenu(m.id, { ativo: !m.ativo });
  }

  /** Alterna visibilidade do submenu na sidebar (somente submenus ativos aparecem). */
  protected toggleSubAtivo(menuId: number, sub: SubMenuAdmin): void {
    this.admin.updateSubMenu(menuId, sub.id, { ativo: !sub.ativo });
  }

  protected onMenuDrop(e: CdkDragDrop<MenuAdmin[]>): void {
    this.admin.onMenuDrop(e);
  }

  // ——— Submenu modal ———
  protected openNovoSubmenu(menuId: number): void {
    this.subModalMenuId.set(menuId);
    this.subEditId.set(null);
    this.subFormNome = '';
    this.subFormRota = '';
    this.subFormAtivo = true;
    this.subModalOpen.set(true);
  }

  protected openEditSub(menuId: number, s: SubMenuAdmin): void {
    this.subModalMenuId.set(menuId);
    this.subEditId.set(s.id);
    this.subFormNome = s.nome;
    this.subFormRota = s.rota;
    this.subFormAtivo = s.ativo;
    this.subModalOpen.set(true);
  }

  protected salvarSub(): void {
    const menuId = this.subModalMenuId();
    if (menuId == null) return;
    const nome = this.subFormNome.trim();
    const rota = this.subFormRota.trim();
    if (!nome || !rota) return;
    const sid = this.subEditId();
    if (sid == null) {
      this.admin.addSubMenu(menuId, nome, rota);
    } else {
      this.admin.updateSubMenu(menuId, sid, {
        nome,
        rota,
        ativo: this.subFormAtivo,
      });
    }
    this.subModalOpen.set(false);
  }

  protected excluirSub(menuId: number, s: SubMenuAdmin): void {
    if (!confirm(`Excluir o submenu "${s.nome}"?`)) return;
    this.admin.deleteSubMenu(menuId, s.id);
  }

  protected onSubDrop(menuId: number, e: CdkDragDrop<SubMenuAdmin[]>): void {
    this.admin.onSubMenuDrop(menuId, e);
  }

  // ——— Permissões (rascunho + PUT Alterar; strings alinhadas à API: modulo.visualizar, etc.) ———

  protected permKey(menuId: number, subId: number): string {
    return `${menuId}:${subId}`;
  }

  protected temRascunhoPerm(menuId: number, sub: SubMenuAdmin): boolean {
    return this.permDrafts.has(this.permKey(menuId, sub.id));
  }

  protected isSalvandoPerm(menuId: number, sub: SubMenuAdmin): boolean {
    return this.salvandoPermKey() === this.permKey(menuId, sub.id);
  }

  private getDraftPermRows(menuId: number, sub: SubMenuAdmin): MenuPermissionRow[] {
    const k = this.permKey(menuId, sub.id);
    if (!this.permDrafts.has(k)) {
      this.permDrafts.set(
        k,
        sub.permissions.map((p) => ({ ...p }))
      );
    }
    return this.permDrafts.get(k)!;
  }

  protected hasPermUi(menuId: number, sub: SubMenuAdmin, uiAcao: string): boolean {
    if (this.permDrafts.has(this.permKey(menuId, sub.id))) {
      const rows = this.permDrafts.get(this.permKey(menuId, sub.id))!;
      return hasMatchingPermissionAcao(rows, sub.nome, uiAcao);
    }
    return this.admin.hasAcao(sub, uiAcao);
  }

  protected onTogglePermDraft(menuId: number, sub: SubMenuAdmin, uiAcao: string, ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const rows = this.getDraftPermRows(menuId, sub);
    if (el.checked) {
      if (hasMatchingPermissionAcao(rows, sub.nome, uiAcao)) return;
      rows.push({
        id: 0,
        ordem: rows.length,
        subModuleId: sub.id,
        acao: buildFullAcaoPermissao(sub.nome, uiAcao),
      });
    } else {
      const next = removePermissionRowsForUi(rows, sub.nome, uiAcao);
      rows.length = 0;
      rows.push(...next);
    }
  }

  protected selTodosPermDraft(menuId: number, sub: SubMenuAdmin): void {
    const rows = this.getDraftPermRows(menuId, sub);
    for (const acao of PERMISSOES_ACOES) {
      if (!hasMatchingPermissionAcao(rows, sub.nome, acao)) {
        rows.push({
          id: 0,
          ordem: rows.length,
          subModuleId: sub.id,
          acao: buildFullAcaoPermissao(sub.nome, acao),
        });
      }
    }
  }

  protected limparPermDraft(menuId: number, sub: SubMenuAdmin): void {
    const rows = this.getDraftPermRows(menuId, sub);
    rows.length = 0;
  }

  private mergeMenuComPermissoesSub(
    menuId: number,
    subId: number,
    permissionRows: MenuPermissionRow[]
  ): MenuAdmin | null {
    const snap = this.admin.getSnapshot();
    const m = snap.menus.find((x) => x.id === menuId);
    if (!m) return null;
    const normalized = permissionRows.map((p, i) => ({
      ...p,
      ordem: i,
      subModuleId: subId,
    }));
    return {
      ...m,
      subMenus: m.subMenus.map((s) =>
        s.id === subId ? { ...s, permissions: normalized } : s
      ),
    };
  }

  protected salvarPermissoesSubmenu(menuId: number, sub: SubMenuAdmin): void {
    const k = this.permKey(menuId, sub.id);
    if (!this.permDrafts.has(k)) {
      this.toast.show('Nenhuma alteração nas permissões.', 'info');
      return;
    }
    if (menuId <= 0 || sub.id <= 0) {
      this.toast.show('Sincronize o menu com o servidor antes de salvar permissões.', 'info');
      return;
    }
    const draft = this.permDrafts.get(k)!.map((p) => ({ ...p }));
    const merged = this.mergeMenuComPermissoesSub(menuId, sub.id, draft);
    if (!merged) return;

    this.salvandoPermKey.set(k);
    this.menuApi
      .alterar(menuAdminToUpdateInput(merged))
      .pipe(finalize(() => this.salvandoPermKey.set(null)))
      .subscribe({
        next: () => {
          this.permDrafts.delete(k);
          this.toast.success('Permissões salvas no servidor.');
          this.refreshMenusAfterMutation();
        },
        // Erro: toast do errorInterceptor.
      });
  }

  protected salvarNoBackend(): void {
    if (this.salvandoNoBackend()) return;
    this.salvandoNoBackend.set(true);
    this.menuApi
      .salvarAlteracoesNoBackend()
      .pipe(finalize(() => this.salvandoNoBackend.set(false)))
      .subscribe({
        next: () => this.toast.success('Ordem dos menus e submenus salva no servidor.'),
        // Erro: toast já exibido pelo errorInterceptor.
      });
  }
}
