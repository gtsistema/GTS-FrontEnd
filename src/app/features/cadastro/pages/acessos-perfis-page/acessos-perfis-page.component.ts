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
import {
  PERMISSION_MODULES,
  PERMISSION_CATALOG,
  getAllPermissionKeys,
  type PermissionModule,
} from '../../constants/permission-catalog';

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
  expandedModules = signal<PermissionModule[]>([]);

  readonly PERMISSION_MODULES = PERMISSION_MODULES;
  readonly PERMISSION_CATALOG = PERMISSION_CATALOG;

  /** Permissões filtradas pelo termo de busca (para exibição no modal). */
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

  selectedPermissionsCount = computed(() => this.form.permissionIds.length);

  isModalOpen = computed(() => this.modalKind() !== null);
  isCreate = computed(() => this.modalKind() === 'create');
  isEdit = computed(() => this.modalKind() === 'edit');
  isDelete = computed(() => this.modalKind() === 'delete');

  ngOnInit(): void {
    this.carregar();
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
    const all = getAllPermissionKeys();
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

  /** Alterna expansão da linha do módulo (listagem estilo estacionamento). */
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

  /** Quantidade de permissões selecionadas no módulo. */
  getSelectedCountInModule(module: PermissionModule): number {
    const keys = PERMISSION_CATALOG[module] ?? [];
    return keys.filter((k) => this.form.permissionIds.includes(k)).length;
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
