import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { finalize } from 'rxjs';
import { ToastService } from '../../../../core/api/services/toast.service';
import { MenuAdminService } from '../../services/menu-admin.service';
import { MenuApiService } from '../../services/menu-api.service';
import {
  MenuAdmin,
  PERMISSOES_ACOES,
  SubMenuAdmin,
} from '../../models/menu-admin.model';

@Component({
  selector: 'app-menu-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './menu-admin-page.component.html',
  styleUrls: ['./menu-admin-page.component.scss'],
})
export class MenuAdminPageComponent {
  protected readonly admin = inject(MenuAdminService);
  private readonly menuApi = inject(MenuApiService);
  private readonly toast = inject(ToastService);
  protected readonly acoes = PERMISSOES_ACOES;

  /** Sincronização com API Menu (Gravar / Alterar / Delete). */
  protected readonly salvandoNoBackend = signal(false);

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
    const id = this.menuEditId();
    if (id == null) {
      this.admin.addMenu(nome, this.menuFormIcon.trim());
    } else {
      this.admin.updateMenu(id, {
        nome,
        icone: this.menuFormIcon.trim(),
        ativo: this.menuFormAtivo,
      });
    }
    this.menuModalOpen.set(false);
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

  // ——— Permissões (ações) ———
  protected hasAcao(sub: SubMenuAdmin, acao: string): boolean {
    return this.admin.hasAcao(sub, acao);
  }

  protected toggleAcao(menuId: number, sub: SubMenuAdmin, acao: string, ev: Event): void {
    const el = ev.target as HTMLInputElement;
    this.admin.togglePermissaoAcao(menuId, sub.id, acao, el.checked);
  }

  protected selTodosAcoe(menuId: number, sub: SubMenuAdmin): void {
    this.admin.selecionarTodasAcoes(menuId, sub.id);
  }

  protected limparAcoe(menuId: number, sub: SubMenuAdmin): void {
    this.admin.limparAcoes(menuId, sub.id);
  }

  // ——— JSON ———
  protected exportar(): void {
    const blob = new Blob([this.admin.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gts-menus-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.admin.importJson(reader.result as string);
      } catch {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  protected resetSeed(): void {
    if (!confirm('Restaurar menus padrão do sistema? Isso substitui os dados atuais.')) return;
    this.admin.resetToSeed();
  }

  protected salvarNoBackend(): void {
    if (this.salvandoNoBackend()) return;
    this.salvandoNoBackend.set(true);
    this.menuApi
      .salvarAlteracoesNoBackend()
      .pipe(finalize(() => this.salvandoNoBackend.set(false)))
      .subscribe({
        next: () => this.toast.success('Alterações salvas no servidor.'),
        error: (err: { error?: { message?: string } | string; message?: string }) => {
          const apiMsg =
            typeof err?.error === 'string'
              ? err.error
              : err?.error?.message ?? err?.message ?? 'Falha ao sincronizar com o servidor.';
          this.toast.error(apiMsg);
        },
      });
  }
}
