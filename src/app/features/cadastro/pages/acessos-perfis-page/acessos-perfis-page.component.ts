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
  AcessosPerfisService,
  ApplicationRole,
} from '../../services/acessos-perfis.service';
import { ProfilePermissionsStoreService } from '../../services/profile-permissions-store.service';
import { MenuApiService } from '../../../gerenciamento/services/menu-api.service';
import { mapBuscarResponseToMenuAdmins } from '../../../gerenciamento/services/menu-api.mapper';
import type { MenuAdmin } from '../../../gerenciamento/models/menu-admin.model';

type ModalKind = 'create' | 'edit' | 'delete' | null;

const AVISO_SEM_ENDPOINT =
  'Backend não possui endpoints de perfis (roles) ainda.';

@Component({
  selector: 'app-acessos-perfis-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acessos-perfis-page.component.html',
  styleUrls: ['./acessos-perfis-page.component.scss'],
})
export class AcessosPerfisPageComponent implements OnInit {
  private perfisService = inject(AcessosPerfisService);
  private profilePermissionsStore = inject(ProfilePermissionsStoreService);
  private menuApi = inject(MenuApiService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  erro: string | null = null;
  itens: ApplicationRole[] = [];

  modalKind = signal<ModalKind>(null);
  editItem = signal<ApplicationRole | null>(null);
  deleteItem = signal<ApplicationRole | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  deleting = signal(false);

  form = { name: '', normalizedName: '', permissionIds: [] as string[] };
  permissionSearchTerm = signal('');
  /** Módulos com lista de permissões expandida (estilo listagem). */
  expandedModules = signal<string[]>([]);
  private backendPermissionGroups = signal<{ module: string; keys: string[] }[]>([]);
  private allBackendPermissionKeys = signal<string[]>([]);

  /** Permissões filtradas pelo termo de busca (para exibição no modal). */
  filteredPermissionsByModule = computed(() => {
    const term = this.permissionSearchTerm().trim().toLowerCase();
    const result: { module: string; keys: string[] }[] = [];
    for (const group of this.backendPermissionGroups()) {
      const keys = group.keys.filter((key) =>
        term
          ? key.toLowerCase().includes(term) || group.module.toLowerCase().includes(term)
          : true
      );
      if (keys.length) result.push({ module: group.module, keys });
    }
    return result;
  });

  get selectedPermissionsCount(): number {
    return this.form.permissionIds.length;
  }

  isModalOpen = computed(() => this.modalKind() !== null);
  isCreate = computed(() => this.modalKind() === 'create');
  isEdit = computed(() => this.modalKind() === 'edit');
  isDelete = computed(() => this.modalKind() === 'delete');

  ngOnInit(): void {
    this.carregarPermissoesDoBackend();
    this.carregar();
  }

  private carregarPermissoesDoBackend(): void {
    this.menuApi.buscar().subscribe({
      next: (body) => {
        const menus = mapBuscarResponseToMenuAdmins(body);
        const groups = this.buildPermissionGroupsFromMenus(menus);
        const keys = groups.flatMap((g) => g.keys);
        this.backendPermissionGroups.set(groups);
        this.allBackendPermissionKeys.set(keys);
        this.cdr.markForCheck();
      },
      error: () => {
        this.backendPermissionGroups.set([]);
        this.allBackendPermissionKeys.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.cdr.markForCheck();
    this.perfisService.buscar().subscribe({
      next: (body) => {
        this.loading = false;
        this.erro = null;
        this.itens = this.normalizeList(body);
        this.seedAdminProfilePermissions();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.erro = AVISO_SEM_ENDPOINT;
        this.itens = [];
        this.cdr.markForCheck();
      },
    });
  }

  retry(): void {
    this.carregar();
  }

  private normalizeList(body: unknown): ApplicationRole[] {
    if (Array.isArray(body)) return body as ApplicationRole[];
    if (body && typeof body === 'object' && 'result' in body) {
      const r = (body as { result?: unknown }).result;
      return Array.isArray(r) ? (r as ApplicationRole[]) : [];
    }
    if (body && typeof body === 'object' && 'results' in body) {
      const r = (body as { results?: unknown }).results;
      return Array.isArray(r) ? (r as ApplicationRole[]) : [];
    }
    return [];
  }

  /** Perfil Admin: seed com pelo menos 3 permissões para teste na criação de usuário. */
  private seedAdminProfilePermissions(): void {
    const admin = this.itens.find(
      (p) =>
        (p.name ?? '').toLowerCase().includes('admin') ||
        (p.normalizedName ?? '').toLowerCase().includes('admin')
    );
    if (!admin) return;
    const key = admin.name ?? admin.id ?? '';
    if (!key) return;
    const current = this.profilePermissionsStore.getProfilePermissions(key);
    if (current.length >= 3) return;
    const all = this.allBackendPermissionKeys();
    if (all.length === 0) return;
    const toSet = current.length > 0 ? current : all.slice(0, Math.max(3, all.length));
    if (toSet.length < 3) {
      toSet.push(...all.filter((k) => !toSet.includes(k)).slice(0, 3 - toSet.length));
    }
    this.profilePermissionsStore.setProfilePermissions(key, toSet);
  }

  openNovo(): void {
    this.saveError.set(null);
    this.form = { name: '', normalizedName: '', permissionIds: [] };
    this.permissionSearchTerm.set('');
    this.expandedModules.set([]);
    this.modalKind.set('create');
    this.cdr.markForCheck();
  }

  openEditar(item: ApplicationRole): void {
    this.saveError.set(null);
    this.editItem.set(item);
    const key = item.name ?? item.id ?? '';
    this.form = {
      name: item.name ?? '',
      normalizedName: item.normalizedName ?? '',
      permissionIds: [...this.profilePermissionsStore.getProfilePermissions(key)],
    };
    this.permissionSearchTerm.set('');
    this.expandedModules.set([]);
    this.modalKind.set('edit');
    this.cdr.markForCheck();
  }

  toggleProfilePermission(key: string): void {
    const idx = this.form.permissionIds.indexOf(key);
    if (idx >= 0) {
      this.form.permissionIds = this.form.permissionIds.filter((k) => k !== key);
    } else {
      this.form.permissionIds = [...this.form.permissionIds, key];
    }
    this.cdr.markForCheck();
  }

  selecionarTodasPermissoes(): void {
    this.form.permissionIds = [...this.allBackendPermissionKeys()];
    this.cdr.markForCheck();
  }

  limparPermissoesSelecionadas(): void {
    this.form.permissionIds = [];
    this.cdr.markForCheck();
  }

  /** Verifica se todas as permissões do tópico estão selecionadas. */
  isModuloTotalmenteSelecionado(module: string): boolean {
    const keys = this.getKeysByModule(module);
    if (keys.length === 0) return false;
    return keys.every((k) => this.form.permissionIds.includes(k));
  }

  /** Alterna: seleciona todas as permissões do tópico ou desmarca todas. */
  toggleTodasDoModulo(module: string): void {
    const keys = this.getKeysByModule(module);
    const current = new Set(this.form.permissionIds);
    if (keys.every((k) => current.has(k))) {
      keys.forEach((k) => current.delete(k));
    } else {
      keys.forEach((k) => current.add(k));
    }
    this.form.permissionIds = Array.from(current);
    this.cdr.markForCheck();
  }

  /** Alterna expansão da linha do módulo (listagem estilo estacionamento). */
  toggleModuleExpanded(module: string): void {
    const current = this.expandedModules();
    const idx = current.indexOf(module);
    if (idx >= 0) {
      this.expandedModules.set(current.filter((m) => m !== module));
    } else {
      this.expandedModules.set([...current, module]);
    }
    this.cdr.markForCheck();
  }

  isModuleExpanded(module: string): boolean {
    return this.expandedModules().includes(module);
  }

  /** Quantidade de permissões selecionadas no módulo. */
  getSelectedCountInModule(module: string): number {
    const keys = this.getKeysByModule(module);
    return keys.filter((k) => this.form.permissionIds.includes(k)).length;
  }

  private getKeysByModule(module: string): string[] {
    return this.backendPermissionGroups().find((g) => g.module === module)?.keys ?? [];
  }

  private buildPermissionGroupsFromMenus(menus: MenuAdmin[]): { module: string; keys: string[] }[] {
    const groups: { module: string; keys: string[] }[] = [];
    for (const menu of menus) {
      const menuLabel = (menu.nome ?? '').trim();
      const orderedSubs = [...(menu.subMenus ?? [])].sort((a, b) => a.ordem - b.ordem);
      for (const sub of orderedSubs) {
        const subLabel = (sub.nome ?? '').trim();
        const moduleLabel = menuLabel && subLabel ? `${menuLabel} / ${subLabel}` : subLabel || menuLabel;
        const keys = Array.from(
          new Set(
            (sub.permissions ?? [])
              .map((p) => (p.acao ?? '').trim())
              .filter((p) => p.length > 0)
          )
        );
        if (!moduleLabel || keys.length === 0) continue;
        groups.push({ module: moduleLabel, keys });
      }
    }
    return groups;
  }

  getProfilePermissionCount(item: ApplicationRole): number {
    const k = item.name ?? item.id ?? '';
    return this.profilePermissionsStore.getProfilePermissions(k).length;
  }

  openExcluir(item: ApplicationRole): void {
    this.deleteItem.set(item);
    this.modalKind.set('delete');
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.modalKind.set(null);
    this.editItem.set(null);
    this.deleteItem.set(null);
    this.saveError.set(null);
    this.cdr.markForCheck();
  }

  salvar(): void {
    const kind = this.modalKind();
    if (kind === 'delete') return;
    this.saveError.set(null);
    this.saving.set(true);
    this.cdr.markForCheck();

    const dto: ApplicationRole = {
      name: this.form.name.trim() || undefined,
      normalizedName: this.form.normalizedName.trim() || undefined,
    };

    if (kind === 'edit') {
      const item = this.editItem();
      if (item?.id) {
        dto.id = item.id;
        dto.concurrencyStamp = item.concurrencyStamp ?? undefined;
      }
    }

    const obs =
      kind === 'create'
        ? this.perfisService.gravar(dto)
        : this.perfisService.alterar(dto);

    obs.subscribe({
      next: () => {
        const key = this.editItem()?.name ?? this.editItem()?.id ?? this.form.name;
        if (key) {
          this.profilePermissionsStore.setProfilePermissions(key, this.form.permissionIds);
        }
        this.saving.set(false);
        this.closeModal();
        this.carregar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.message ?? 'Erro ao salvar.');
        this.cdr.markForCheck();
      },
    });
  }

  confirmarExclusao(): void {
    const item = this.deleteItem();
    if (!item?.id) {
      this.closeModal();
      return;
    }
    this.deleting.set(true);
    this.cdr.markForCheck();
    this.perfisService.delete(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeModal();
        this.carregar();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleting.set(false);
        this.closeModal();
        this.carregar();
        this.cdr.markForCheck();
      },
    });
  }

  get deleteItemName(): string {
    const item = this.deleteItem();
    return item?.name ?? item?.normalizedName ?? 'este perfil';
  }
}
