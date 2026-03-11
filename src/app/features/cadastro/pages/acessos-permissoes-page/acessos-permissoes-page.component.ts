import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MENU_STRUCTURE,
  MenuNode,
  MenuSubItem,
} from '../../constants/menu-structure';
import { MenuPermissionsStoreService } from '../../services/menu-permissions-store.service';
import {
  PERMISSION_MODULES,
  PERMISSION_CATALOG,
  type PermissionModule,
} from '../../constants/permission-catalog';

@Component({
  selector: 'app-acessos-permissoes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acessos-permissoes-page.component.html',
  styleUrls: ['./acessos-permissoes-page.component.scss'],
})
export class AcessosPermissoesPageComponent implements OnInit {
  private menuPermissionsStore = inject(MenuPermissionsStoreService);
  private cdr = inject(ChangeDetectorRef);

  readonly menuStructure = MENU_STRUCTURE;
  readonly PERMISSION_MODULES = PERMISSION_MODULES;
  readonly PERMISSION_CATALOG = PERMISSION_CATALOG;

  /** Nó em edição no modal (id) e permissões selecionadas. */
  editingNodeId = signal<string | null>(null);
  formPermissionIds = signal<string[]>([]);
  permissionSearchTerm = signal('');
  expandedModules = signal<PermissionModule[]>([]);

  filteredPermissionsByModule = computed(() => {
    const term = this.permissionSearchTerm().trim().toLowerCase();
    const result: { module: PermissionModule; keys: string[] }[] = [];
    for (const mod of PERMISSION_MODULES) {
      const keys = (PERMISSION_CATALOG[mod] ?? []).filter((key) =>
        term ? key.toLowerCase().includes(term) : true
      );
      if (keys.length) result.push({ module: mod, keys });
    }
    return result;
  });

  selectedCount = computed(() => this.formPermissionIds().length);
  isModalOpen = computed(() => this.editingNodeId() !== null);

  ngOnInit(): void {
    this.cdr.markForCheck();
  }

  getPermissionsForNode(nodeId: string): string[] {
    return this.menuPermissionsStore.getPermissions(nodeId);
  }

  getNodeLabel(node: MenuNode, sub?: MenuSubItem): string {
    return sub ? sub.label : node.label;
  }

  openVincular(nodeId: string): void {
    this.editingNodeId.set(nodeId);
    this.formPermissionIds.set([...this.menuPermissionsStore.getPermissions(nodeId)]);
    this.permissionSearchTerm.set('');
    this.expandedModules.set([]);
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.editingNodeId.set(null);
    this.cdr.markForCheck();
  }

  togglePermission(key: string): void {
    const current = this.formPermissionIds();
    const idx = current.indexOf(key);
    if (idx >= 0) {
      this.formPermissionIds.set(current.filter((k) => k !== key));
    } else {
      this.formPermissionIds.set([...current, key]);
    }
    this.cdr.markForCheck();
  }

  toggleModuleExpanded(module: PermissionModule): void {
    const current = this.expandedModules();
    const idx = current.indexOf(module);
    if (idx >= 0) {
      this.expandedModules.set(current.filter((m) => m !== module));
    } else {
      this.expandedModules.set([...current, module]);
    }
    this.cdr.markForCheck();
  }

  isModuleExpanded(module: PermissionModule): boolean {
    return this.expandedModules().includes(module);
  }

  getSelectedCountInModule(module: PermissionModule): number {
    const keys = PERMISSION_CATALOG[module] ?? [];
    return keys.filter((k) => this.formPermissionIds().includes(k)).length;
  }

  salvarVinculos(): void {
    const nodeId = this.editingNodeId();
    if (!nodeId) return;
    this.menuPermissionsStore.setPermissions(nodeId, this.formPermissionIds());
    this.closeModal();
    this.cdr.markForCheck();
  }

  getEditingNodeLabel(): string {
    const id = this.editingNodeId();
    if (!id) return '';
    for (const node of MENU_STRUCTURE) {
      if (node.id === id) return node.label;
      for (const sub of node.children ?? []) {
        if (sub.id === id) return sub.label;
      }
    }
    return id;
  }
}
