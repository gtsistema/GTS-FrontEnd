import {
  Component,
  inject,
  ChangeDetectorRef,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { GerenciamentoService } from '../../services/gerenciamento.service';
import { GerenciamentoFiltros, UsuarioGerenciamentoItem, UsuarioGerenciamentoForm, TipoVinculo } from '../../models/gerenciamento.types';
import { AcessosPerfisService, ApplicationRole } from '../../../cadastro/services/acessos-perfis.service';
import { EstacionamentoLookupService, LookupOption as EstacionamentoOption } from '../../../cadastro/services/estacionamento-lookup.service';
import { TransportadoraLookupService, LookupOption as TransportadoraOption } from '../../../cadastro/services/transportadora-lookup.service';
import { ProfilePermissionsStoreService } from '../../../cadastro/services/profile-permissions-store.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import {
  PERMISSION_MODULES,
  PERMISSION_CATALOG,
  getAllPermissionKeys,
  type PermissionModule
} from '../../../cadastro/constants/permission-catalog';

export type EmpresaOption = { id: number; label: string; cnpj: string };

@Component({
  selector: 'app-gerenciamento-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerenciamento-page.component.html',
  styleUrls: ['./gerenciamento-page.component.scss']
})
export class GerenciamentoPageComponent implements OnInit, OnDestroy {
  private gerenciamentoService = inject(GerenciamentoService);
  private perfisService = inject(AcessosPerfisService);
  private estacionamentoLookup = inject(EstacionamentoLookupService);
  private transportadoraLookup = inject(TransportadoraLookupService);
  private profileStore = inject(ProfilePermissionsStoreService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  filtros: GerenciamentoFiltros = {
    nomeUsuario: '',
    cnpj: '',
    razaoSocial: '',
    tipo: '',
    perfilId: '',
    status: ''
  };

  loading = false;
  erro: string | null = null;
  itens: UsuarioGerenciamentoItem[] = [];
  perfisList: ApplicationRole[] = [];

  modalFormOpen = signal(false);
  modalVerOpen = signal(false);
  isEdit = signal(false);
  editItem = signal<UsuarioGerenciamentoItem | null>(null);
  itemVer = signal<UsuarioGerenciamentoItem | null>(null);
  saveError = signal<string | null>(null);
  saving = signal(false);

  showNovoPerfilForm = false;
  novoPerfilNome = '';
  savingPerfil = false;

  form: UsuarioGerenciamentoForm = this.getEmptyForm();

  empresaSearchTerm = '';
  empresaOptions = signal<EmpresaOption[]>([]);
  empresaLoading = signal(false);
  empresaDropdownOpen = signal(false);
  private empresaSearch$ = new Subject<string>();
  private subs = new Subscription();

  permissionSearchTerm = signal('');
  expandedPermissionModules = signal<PermissionModule[]>([]);

  get profilePermissions(): string[] {
    const id = this.form.perfilId;
    if (!id) return [];
    const role = this.perfisList.find((r) => (r.id ?? r.name) === id);
    const key = String(role?.name ?? role?.id ?? id);
    const fromStore = this.profileStore.getProfilePermissions(key);
    if (fromStore.length > 0) return fromStore;
    return getAllPermissionKeys();
  }

  get profilePermissionsByModule(): { module: PermissionModule; keys: string[] }[] {
    const list = this.profilePermissions;
    const result: { module: PermissionModule; keys: string[] }[] = [];
    for (const mod of PERMISSION_MODULES) {
      const keys = (PERMISSION_CATALOG[mod] ?? []).filter((k) => list.includes(k));
      if (keys.length) result.push({ module: mod, keys });
    }
    return result;
  }

  /** Todas as permissões por módulo (catálogo completo) para seleção livre. */
  get allPermissionsByModule(): { module: PermissionModule; keys: string[] }[] {
    const result: { module: PermissionModule; keys: string[] }[] = [];
    for (const mod of PERMISSION_MODULES) {
      const keys = PERMISSION_CATALOG[mod] ?? [];
      if (keys.length) result.push({ module: mod, keys });
    }
    return result;
  }

  /** Permissões filtradas pelo termo de busca (layout listagem expandível). */
  get filteredPermissionsByModule(): { module: PermissionModule; keys: string[] }[] {
    const term = this.permissionSearchTerm().trim().toLowerCase();
    const result: { module: PermissionModule; keys: string[] }[] = [];
    for (const mod of PERMISSION_MODULES) {
      const allKeys = PERMISSION_CATALOG[mod] ?? [];
      const keys = term
        ? allKeys.filter((key) => key.toLowerCase().includes(term) || mod.toLowerCase().includes(term))
        : allKeys;
      if (keys.length) result.push({ module: mod, keys });
    }
    return result;
  }

  get selectedPermissionsCount(): number {
    return this.form.userPermissionIds.length;
  }

  togglePermissionModuleExpanded(module: PermissionModule): void {
    const current = this.expandedPermissionModules();
    if (current.includes(module)) {
      this.expandedPermissionModules.set(current.filter((m) => m !== module));
    } else {
      this.expandedPermissionModules.set([...current, module]);
    }
    this.cdr.markForCheck();
  }

  isPermissionModuleExpanded(module: PermissionModule): boolean {
    return this.expandedPermissionModules().includes(module);
  }

  /** Quantidade selecionada no módulo; se keys for passado (ex.: grupo filtrado), conta só entre essas. */
  getSelectedCountInPermissionModule(module: PermissionModule, keys?: string[]): number {
    const list = keys ?? (PERMISSION_CATALOG[module] ?? []);
    return list.filter((k) => this.form.userPermissionIds.includes(k)).length;
  }

  /** Verifica se todas as permissões do tópico estão selecionadas. */
  isModuloTotalmenteSelecionado(module: PermissionModule): boolean {
    const keys = PERMISSION_CATALOG[module] ?? [];
    if (keys.length === 0) return false;
    return keys.every((k) => this.form.userPermissionIds.includes(k));
  }

  /** Alterna: seleciona todas as permissões do tópico ou desmarca todas. */
  toggleTodasDoModulo(module: PermissionModule): void {
    if (this.form.useDefaultPermissions) return;
    const keys = PERMISSION_CATALOG[module] ?? [];
    const current = new Set(this.form.userPermissionIds);
    if (keys.every((k) => current.has(k))) {
      keys.forEach((k) => current.delete(k));
    } else {
      keys.forEach((k) => current.add(k));
    }
    this.form.userPermissionIds = Array.from(current);
    this.cdr.markForCheck();
  }

  empresaSearchDisplay(): string {
    return this.form.empresaVinculadaLabel || this.empresaSearchTerm;
  }

  ngOnInit(): void {
    this.carregarPerfis();
    this.buscar();
    this.setupEmpresaSearch();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private getEmptyForm(): UsuarioGerenciamentoForm {
    return {
      nome: '',
      email: '',
      login: '',
      senha: '',
      confirmarSenha: '',
      tipoVinculo: '',
      empresaVinculadaId: null,
      empresaVinculadaLabel: '',
      cnpj: '',
      perfilId: '',
      useDefaultPermissions: true,
      userPermissionIds: [],
      ativo: true
    };
  }

  private setupEmpresaSearch(): void {
    this.subs.add(
      this.empresaSearch$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter(() => this.form.tipoVinculo === 'Estacionamento' || this.form.tipoVinculo === 'Transportadora'),
        switchMap((term) => {
          this.empresaLoading.set(true);
          this.cdr.markForCheck();
          if (this.form.tipoVinculo === 'Estacionamento') {
            return this.estacionamentoLookup.search(term);
          }
          return this.transportadoraLookup.search(term);
        })
      ).subscribe({
        next: (opts) => {
          this.empresaLoading.set(false);
          this.empresaOptions.set(opts.map((o) => ({ id: o.id, label: o.label, cnpj: o.cnpj })));
          this.empresaDropdownOpen.set(true);
          this.cdr.markForCheck();
        },
        error: () => {
          this.empresaLoading.set(false);
          this.empresaOptions.set([]);
          this.toast.error('Erro ao buscar empresa.');
          this.cdr.markForCheck();
        }
      })
    );
  }

  private carregarPerfis(): void {
    this.gerenciamentoService.getPerfis().subscribe({
      next: (list) => {
        this.perfisList = list;
        this.seedProfilePermissionsIfEmpty();
        this.cdr.markForCheck();
      }
    });
  }

  private seedProfilePermissionsIfEmpty(): void {
    const allKeys = getAllPermissionKeys();
    for (const role of this.perfisList) {
      const key = String(role?.name ?? role?.id ?? '');
      if (!key) continue;
      if (this.profileStore.getProfilePermissions(key).length === 0) {
        this.profileStore.setProfilePermissions(key, [...allKeys]);
      }
    }
  }

  buscar(): void {
    this.loading = true;
    this.erro = null;
    this.cdr.markForCheck();
    this.gerenciamentoService.buscar(this.filtros).subscribe({
      next: (list) => {
        this.loading = false;
        this.erro = null;
        this.itens = list;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.erro = err?.message ?? 'Erro ao carregar a lista.';
        this.itens = [];
        this.cdr.markForCheck();
      }
    });
  }

  limparFiltros(): void {
    this.filtros = {
      nomeUsuario: '',
      cnpj: '',
      razaoSocial: '',
      tipo: '',
      perfilId: '',
      status: ''
    };
    this.buscar();
  }

  abrirNovo(): void {
    this.saveError.set(null);
    this.form = this.getEmptyForm();
    this.empresaSearchTerm = '';
    this.empresaOptions.set([]);
    this.empresaDropdownOpen.set(false);
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.permissionSearchTerm.set('');
    this.expandedPermissionModules.set([]);
    this.isEdit.set(false);
    this.editItem.set(null);
    this.modalFormOpen.set(true);
    this.cdr.markForCheck();
  }

  abrirEditar(item: UsuarioGerenciamentoItem): void {
    this.saveError.set(null);
    this.editItem.set(item);
    const ext = item as UsuarioGerenciamentoItem & { login?: string };
    this.form = {
      nome: item.nome ?? '',
      email: item.emailOuLogin ?? '',
      login: ext.login ?? item.emailOuLogin ?? '',
      senha: '',
      confirmarSenha: '',
      tipoVinculo: (item.tipo as TipoVinculo) ?? '',
      empresaVinculadaId: item.estacionamentoId ?? item.transportadoraId ?? null,
      empresaVinculadaLabel: item.empresaVinculada ?? '',
      cnpj: item.cnpj ?? '',
      perfilId: '',
      useDefaultPermissions: true,
      userPermissionIds: [],
      ativo: item.ativo ?? true
    };
    this.empresaSearchTerm = this.form.empresaVinculadaLabel;
    this.empresaOptions.set([]);
    this.empresaDropdownOpen.set(false);
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.permissionSearchTerm.set('');
    this.expandedPermissionModules.set([]);
    this.isEdit.set(true);
    this.modalFormOpen.set(true);
    this.cdr.markForCheck();
  }

  abrirVisualizar(item: UsuarioGerenciamentoItem): void {
    this.itemVer.set(item);
    this.modalVerOpen.set(true);
    this.cdr.markForCheck();
  }

  fecharModalForm(): void {
    this.modalFormOpen.set(false);
    this.saveError.set(null);
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.permissionSearchTerm.set('');
    this.expandedPermissionModules.set([]);
    this.cdr.markForCheck();
  }

  fecharModalVer(): void {
    this.modalVerOpen.set(false);
    this.itemVer.set(null);
    this.cdr.markForCheck();
  }

  onTipoVinculoChange(): void {
    this.form.empresaVinculadaId = null;
    this.form.empresaVinculadaLabel = '';
    this.form.cnpj = '';
    this.empresaSearchTerm = '';
    this.empresaOptions.set([]);
    this.empresaDropdownOpen.set(false);
    this.cdr.markForCheck();
    this.loadEmpresaList();
  }

  /** Carrega a listagem de empresas (transportadoras ou estacionamentos) já cadastradas no banco. */
  loadEmpresaList(): void {
    if (this.form.tipoVinculo !== 'Estacionamento' && this.form.tipoVinculo !== 'Transportadora') {
      return;
    }
    this.empresaLoading.set(true);
    this.cdr.markForCheck();
    const request =
      this.form.tipoVinculo === 'Estacionamento'
        ? this.estacionamentoLookup.list()
        : this.transportadoraLookup.list();
    request.subscribe({
      next: (opts) => {
        this.empresaLoading.set(false);
        this.empresaOptions.set(opts.map((o) => ({ id: o.id, label: o.label, cnpj: o.cnpj })));
        this.empresaDropdownOpen.set(true);
        this.cdr.markForCheck();
      },
      error: () => {
        this.empresaLoading.set(false);
        this.empresaOptions.set([]);
        this.empresaDropdownOpen.set(false);
        this.toast.error('Erro ao carregar listagem de empresas.');
        this.cdr.markForCheck();
      }
    });
  }

  onEmpresaFocus(): void {
    if (this.form.tipoVinculo !== 'Estacionamento' && this.form.tipoVinculo !== 'Transportadora') return;
    if (this.empresaOptions().length > 0) {
      this.empresaDropdownOpen.set(true);
      this.cdr.markForCheck();
      return;
    }
    if (!this.empresaLoading()) {
      this.loadEmpresaList();
    }
  }

  onEmpresaSearchInput(value: string): void {
    this.empresaSearchTerm = value;
    if (!value.trim()) {
      this.form.empresaVinculadaId = null;
      this.form.empresaVinculadaLabel = '';
      this.form.cnpj = '';
      this.empresaOptions.set([]);
      this.empresaDropdownOpen.set(false);
      this.cdr.markForCheck();
      return;
    }
    this.empresaSearch$.next(value);
  }

  selectEmpresa(opt: EmpresaOption): void {
    this.form.empresaVinculadaId = opt.id;
    this.form.empresaVinculadaLabel = opt.label;
    this.form.cnpj = opt.cnpj || '';
    this.empresaSearchTerm = opt.label;
    this.empresaOptions.set([]);
    this.empresaDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  limparEmpresa(): void {
    this.form.empresaVinculadaId = null;
    this.form.empresaVinculadaLabel = '';
    this.form.cnpj = '';
    this.empresaSearchTerm = '';
    this.empresaOptions.set([]);
    this.empresaDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  onPerfilChange(): void {
    const profile = this.profilePermissions;
    if (this.form.useDefaultPermissions) {
      this.form.userPermissionIds = [...profile];
    } else {
      this.form.userPermissionIds = this.form.userPermissionIds.filter((p) => profile.includes(p));
    }
    this.cdr.markForCheck();
  }

  onUseDefaultPermissionsChange(): void {
    if (this.form.useDefaultPermissions) {
      this.form.userPermissionIds = [...this.profilePermissions];
    }
    this.cdr.markForCheck();
  }

  toggleUserPermission(key: string): void {
    if (this.form.useDefaultPermissions) return;
    const idx = this.form.userPermissionIds.indexOf(key);
    if (idx >= 0) {
      this.form.userPermissionIds = this.form.userPermissionIds.filter((k) => k !== key);
    } else {
      this.form.userPermissionIds = [...this.form.userPermissionIds, key];
    }
    this.cdr.markForCheck();
  }

  isUserPermissionChecked(key: string): boolean {
    return this.form.userPermissionIds.includes(key);
  }

  selecionarTodasPermissoes(): void {
    this.form.useDefaultPermissions = false;
    this.form.userPermissionIds = [...getAllPermissionKeys()];
    this.cdr.markForCheck();
  }

  limparFiltroPermissoes(): void {
    this.permissionSearchTerm.set('');
    this.cdr.markForCheck();
  }

  /** Remove todas as permissões selecionadas do usuário. */
  limparPermissoesSelecionadas(): void {
    this.form.useDefaultPermissions = false;
    this.form.userPermissionIds = [];
    this.cdr.markForCheck();
  }

  abrirNovoPerfil(): void {
    this.showNovoPerfilForm = true;
    this.novoPerfilNome = '';
    this.cdr.markForCheck();
  }

  cancelarNovoPerfil(): void {
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.cdr.markForCheck();
  }

  criarPerfil(): void {
    const name = this.novoPerfilNome?.trim();
    if (!name) {
      this.toast.error('Informe o nome do perfil.');
      return;
    }
    this.savingPerfil = true;
    this.cdr.markForCheck();
    this.perfisService.gravar({ name }).subscribe({
      next: (res) => {
        this.savingPerfil = false;
        this.showNovoPerfilForm = false;
        this.novoPerfilNome = '';
        const created = res as { id?: string; name?: string };
        this.form.perfilId = created?.id ?? created?.name ?? name;
        this.carregarPerfis();
        this.toast.success('Perfil criado.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.savingPerfil = false;
        this.toast.error(err?.error?.message ?? err?.message ?? 'Erro ao criar perfil.');
        this.cdr.markForCheck();
      }
    });
  }

  salvar(): void {
    this.saveError.set(null);
    if (!this.form.nome?.trim() || !this.form.email?.trim()) {
      this.saveError.set('Preencha nome e e-mail.');
      this.cdr.markForCheck();
      return;
    }
    if (!this.isEdit() && (!this.form.senha || this.form.senha !== this.form.confirmarSenha)) {
      this.saveError.set('Senha e confirmar senha devem ser iguais.');
      this.cdr.markForCheck();
      return;
    }
    this.saving.set(true);
    this.cdr.markForCheck();
    const payload = {
      nome: this.form.nome.trim(),
      email: this.form.email.trim(),
      login: this.form.login?.trim() || undefined,
      senha: this.form.senha || undefined,
      ativo: this.form.ativo,
      perfilId: this.form.perfilId || undefined,
      estacionamentoId: this.form.tipoVinculo === 'Estacionamento' ? this.form.empresaVinculadaId ?? undefined : undefined,
      transportadoraId: this.form.tipoVinculo === 'Transportadora' ? this.form.empresaVinculadaId ?? undefined : undefined,
      userPermissionIds: this.form.userPermissionIds,
      ...(this.editItem()?.id ? { id: this.editItem()!.id } : {})
    };
    const req = this.isEdit()
      ? this.gerenciamentoService.alterar(payload)
      : this.gerenciamentoService.gravar(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Usuário atualizado.' : 'Usuário criado.');
        this.fecharModalForm();
        this.buscar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? err?.message ?? 'Erro ao salvar.');
        this.cdr.markForCheck();
      }
    });
  }

  toggleAtivo(item: UsuarioGerenciamentoItem): void {
    if (!item.id) return;
    const novoAtivo = !item.ativo;
    this.gerenciamentoService.ativarInativar(item.id, novoAtivo).subscribe({
      next: () => {
        this.toast.success(novoAtivo ? 'Usuário ativado.' : 'Usuário inativado.');
        this.buscar();
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Ação não disponível no backend.');
        this.cdr.markForCheck();
      }
    });
  }
}
