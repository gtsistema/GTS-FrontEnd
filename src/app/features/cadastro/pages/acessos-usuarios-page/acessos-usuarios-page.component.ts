import {
  Component,
  inject,
  ChangeDetectorRef,
  effect,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { AcessosUsuariosService, UsuarioListItem } from '../../services/acessos-usuarios.service';
import { AcessosUsuariosToolbarService } from '../../services/acessos-usuarios-toolbar.service';
import { AcessosPerfisService, ApplicationRole } from '../../services/acessos-perfis.service';
import { ProfilePermissionsStoreService } from '../../services/profile-permissions-store.service';
import { EstacionamentoLookupService, LookupOption as EstacionamentoOption } from '../../services/estacionamento-lookup.service';
import { TransportadoraLookupService, LookupOption as TransportadoraOption } from '../../services/transportadora-lookup.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import { PERMISSION_MODULES, PERMISSION_CATALOG, type PermissionModule } from '../../constants/permission-catalog';

const PERFIL_KEY_ADMIN = 'ADMIN';
const PERFIL_KEY_ESTACIONAMENTO = 'ESTACIONAMENTO';
const PERFIL_KEY_TRANSPORTADORA = 'TRANSPORTADORA';

@Component({
  selector: 'app-acessos-usuarios-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acessos-usuarios-page.component.html',
  styleUrls: ['./acessos-usuarios-page.component.scss'],
})
export class AcessosUsuariosPageComponent implements OnDestroy {
  private usuariosService = inject(AcessosUsuariosService);
  private perfisService = inject(AcessosPerfisService);
  private profileStore = inject(ProfilePermissionsStoreService);
  private toolbar = inject(AcessosUsuariosToolbarService);
  private estacionamentoLookup = inject(EstacionamentoLookupService);
  private transportadoraLookup = inject(TransportadoraLookupService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  erro: string | null = null;
  itens: UsuarioListItem[] = [];

  modalOpen = signal(false);
  isEdit = signal(false);
  editItem = signal<UsuarioListItem | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  perfisList: ApplicationRole[] = [];
  loadingPerfis = false;

  form = {
    nome: '',
    email: '',
    cpfCnpj: '',
    senha: '',
    ativo: true,
    perfilId: '' as string,
    estacionamentoId: null as number | null,
    estacionamentoLabel: '' as string,
    transportadoraId: null as number | null,
    transportadoraLabel: '' as string,
    useDefaultPermissions: true,
    userPermissionIds: [] as string[],
  };

  /** Chave do perfil selecionado (normalizada: ADMIN, ESTACIONAMENTO, TRANSPORTADORA). */
  get perfilKey(): string {
    const id = this.form.perfilId;
    if (!id) return '';
    const role = this.findPerfilBySelectedValue(id);
    const name = (
      role?.name ??
      role?.perfil ??
      role?.nome ??
      role?.normalizedName ??
      id
    ).toString().toUpperCase();
    if (name.includes(PERFIL_KEY_ADMIN)) return PERFIL_KEY_ADMIN;
    if (name.includes(PERFIL_KEY_ESTACIONAMENTO)) return PERFIL_KEY_ESTACIONAMENTO;
    if (name.includes(PERFIL_KEY_TRANSPORTADORA)) return PERFIL_KEY_TRANSPORTADORA;
    return '';
  }

  get showEstacionamentoField(): boolean {
    return this.perfilKey === PERFIL_KEY_ESTACIONAMENTO;
  }

  get showTransportadoraField(): boolean {
    return this.perfilKey === PERFIL_KEY_TRANSPORTADORA;
  }

  get estacionamentoObrigatorio(): boolean {
    return this.perfilKey === PERFIL_KEY_ESTACIONAMENTO;
  }

  get transportadoraObrigatorio(): boolean {
    return this.perfilKey === PERFIL_KEY_TRANSPORTADORA;
  }

  /** Listagem Estacionamento (layout tipo Banco em Dados Bancários) */
  estacionamentoList = signal<EstacionamentoOption[]>([]);
  estacionamentoListLoaded = signal(false);
  estacionamentoLoading = signal(false);
  estacionamentoFiltro = '';
  estacionamentoDropdownOpen = signal(false);
  private subs = new Subscription();

  /** Autocomplete Transportadora */
  transportadoraSearchTerm = '';
  transportadoraOptions = signal<TransportadoraOption[]>([]);
  transportadoraLoading = signal(false);
  transportadoraDropdownOpen = signal(false);
  private transportadoraSearch$ = new Subject<string>();
  private listaSub?: Subscription;

  readonly PERMISSION_MODULES = PERMISSION_MODULES;
  readonly PERMISSION_CATALOG = PERMISSION_CATALOG;

  /** Permissões do perfil selecionado (store ou catálogo como fallback para sempre exibir a seção). */
  get profilePermissions(): string[] {
    const id = this.form.perfilId;
    if (!id) return [];
    const role = this.findPerfilBySelectedValue(id);
    const key = String(
      role?.name ?? role?.perfil ?? role?.nome ?? role?.normalizedName ?? role?.id ?? id
    );
    const fromStore = this.profileStore.getProfilePermissions(key);
    return fromStore;
  }

  private findPerfilBySelectedValue(value: string | number): ApplicationRole | undefined {
    const selected = String(value ?? '').trim().toLowerCase();
    if (!selected) return undefined;
    return this.perfisList.find((p) => {
      const candidates = [p.name, p.perfil, p.nome, p.normalizedName, p.id]
        .filter((v) => v != null)
        .map((v) => String(v).trim().toLowerCase());
      return candidates.includes(selected);
    });
  }

  private resolvePerfilNomeForPayload(selectedValue: string): string | undefined {
    const role = this.findPerfilBySelectedValue(selectedValue);
    const nome = String(
      role?.name ?? role?.perfil ?? role?.nome ?? role?.normalizedName ?? selectedValue ?? ''
    ).trim();
    return nome || undefined;
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

  get estacionamentoDisplay(): string {
    return this.estacionamentoDropdownOpen() ? this.estacionamentoFiltro : this.form.estacionamentoLabel;
  }

  get estacionamentoFiltrados(): EstacionamentoOption[] {
    const list = this.estacionamentoList();
    const t = (this.estacionamentoFiltro ?? '').trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (o) =>
        o.label.toLowerCase().includes(t) ||
        (o.cnpj && o.cnpj.replace(/\D/g, '').includes(t.replace(/\D/g, '')))
    );
  }

  constructor() {
    effect(() => {
      this.toolbar.trigger();
      this.carregarLista();
    });
    this.setupTransportadoraSearch();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.listaSub?.unsubscribe();
  }

  private carregarListaEstacionamentos(): void {
    if (this.estacionamentoListLoaded() || this.estacionamentoLoading()) return;
    this.estacionamentoLoading.set(true);
    this.cdr.markForCheck();
    this.estacionamentoLookup.list().subscribe({
      next: (opts) => {
        this.estacionamentoList.set(opts);
        this.estacionamentoListLoaded.set(true);
        this.estacionamentoLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.estacionamentoLoading.set(false);
        this.estacionamentoList.set([]);
        this.toast.error('Endpoint de busca não disponível no backend.');
        this.cdr.markForCheck();
      },
    });
  }

  onEstacionamentoFocus(): void {
    this.estacionamentoDropdownOpen.set(true);
    this.estacionamentoFiltro = this.form.estacionamentoLabel;
    this.carregarListaEstacionamentos();
    this.cdr.markForCheck();
  }

  toggleEstacionamentoDropdown(event: Event): void {
    event.preventDefault();
    const open = !this.estacionamentoDropdownOpen();
    this.estacionamentoDropdownOpen.set(open);
    if (open) {
      this.estacionamentoFiltro = this.form.estacionamentoLabel;
      this.carregarListaEstacionamentos();
    }
    this.cdr.markForCheck();
  }

  onEstacionamentoInput(event: Event): void {
    this.estacionamentoFiltro = (event.target as HTMLInputElement).value;
    this.estacionamentoDropdownOpen.set(true);
    this.cdr.markForCheck();
  }

  onEstacionamentoBlur(): void {
    setTimeout(() => {
      this.estacionamentoDropdownOpen.set(false);
      this.estacionamentoFiltro = this.form.estacionamentoLabel;
      this.cdr.markForCheck();
    }, 200);
  }

  private setupTransportadoraSearch(): void {
    this.subs.add(
      this.transportadoraSearch$.pipe(
        debounceTime(300),
        map((term) => term.trim()),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term) {
            this.transportadoraLoading.set(false);
            this.transportadoraOptions.set([]);
            this.transportadoraDropdownOpen.set(false);
            this.cdr.markForCheck();
            return of([]);
          }
          this.transportadoraLoading.set(true);
          this.cdr.markForCheck();
          return this.transportadoraLookup.search(term);
        })
      ).subscribe({
        next: (opts) => {
          this.transportadoraLoading.set(false);
          this.transportadoraOptions.set(opts);
          this.transportadoraDropdownOpen.set(opts.length > 0);
          this.cdr.markForCheck();
        },
        error: () => {
          this.transportadoraLoading.set(false);
          this.transportadoraOptions.set([]);
          this.toast.error('Endpoint de busca não disponível no backend.');
          this.cdr.markForCheck();
        },
      })
    );
  }

  carregarLista(): void {
    this.listaSub?.unsubscribe();
    this.loading = true;
    this.erro = null;
    this.cdr.markForCheck();
    const termo = this.toolbar.searchTerm().trim();
    this.listaSub = this.usuariosService.buscar(termo || undefined).subscribe({
      next: (body) => {
        this.loading = false;
        this.erro = null;
        this.itens = this.normalizeList(body);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.erro = err?.message ?? 'Endpoint não encontrado no backend.';
        this.itens = [];
        this.cdr.markForCheck();
      },
    });
  }

  retry(): void {
    this.carregarLista();
  }

  private normalizeList(body: unknown): UsuarioListItem[] {
    if (Array.isArray(body)) return body as UsuarioListItem[];
    if (body && typeof body === 'object' && 'result' in body) {
      const r = (body as { result?: unknown }).result;
      return Array.isArray(r) ? (r as UsuarioListItem[]) : [];
    }
    if (body && typeof body === 'object' && 'results' in body) {
      const r = (body as { results?: unknown }).results;
      return Array.isArray(r) ? (r as UsuarioListItem[]) : [];
    }
    return [];
  }

  openNovo(): void {
    this.saveError.set(null);
    this.form = {
      nome: '',
      email: '',
      cpfCnpj: '',
      senha: '',
      ativo: true,
      perfilId: '',
      estacionamentoId: null,
      estacionamentoLabel: '',
      transportadoraId: null,
      transportadoraLabel: '',
      useDefaultPermissions: true,
      userPermissionIds: [],
    };
    this.estacionamentoFiltro = '';
    this.transportadoraSearchTerm = '';
    this.estacionamentoList.set([]);
    this.estacionamentoListLoaded.set(false);
    this.transportadoraOptions.set([]);
    this.estacionamentoDropdownOpen.set(false);
    this.transportadoraDropdownOpen.set(false);
    this.isEdit.set(false);
    this.editItem.set(null);
    this.carregarPerfis();
    this.modalOpen.set(true);
    this.cdr.markForCheck();
  }

  openEditar(item: UsuarioListItem): void {
    this.saveError.set(null);
    this.editItem.set(item);
    const ext = item as { estacionamentoId?: number; transportadoraId?: number; estacionamentoLabel?: string; transportadoraLabel?: string };
    this.form = {
      nome: item.nome ?? '',
      email: item.emailOuLogin ?? '',
      cpfCnpj: (item as { cpfCnpj?: string }).cpfCnpj ?? '',
      senha: '',
      ativo: item.ativo ?? true,
      perfilId: '',
      estacionamentoId: ext.estacionamentoId ?? null,
      estacionamentoLabel: ext.estacionamentoLabel ?? '',
      transportadoraId: ext.transportadoraId ?? null,
      transportadoraLabel: ext.transportadoraLabel ?? '',
      useDefaultPermissions: true,
      userPermissionIds: [],
    };
    this.estacionamentoFiltro = this.form.estacionamentoLabel || '';
    this.transportadoraSearchTerm = this.form.transportadoraLabel || '';
    this.estacionamentoList.set([]);
    this.estacionamentoListLoaded.set(false);
    this.transportadoraOptions.set([]);
    this.isEdit.set(true);
    this.carregarPerfis();
    this.modalOpen.set(true);
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.saveError.set(null);
    this.cdr.markForCheck();
  }

  private carregarPerfis(): void {
    this.loadingPerfis = true;
    this.perfisService.buscar().subscribe({
      next: (body) => {
        this.loadingPerfis = false;
        this.perfisList = this.normalizePerfis(body);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPerfis = false;
        this.perfisList = [];
        this.cdr.markForCheck();
      },
    });
  }

  private normalizePerfis(body: unknown): ApplicationRole[] {
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

  onPerfilChange(): void {
    this.form.estacionamentoId = null;
    this.form.estacionamentoLabel = '';
    this.form.transportadoraId = null;
    this.form.transportadoraLabel = '';
    this.estacionamentoFiltro = '';
    this.transportadoraSearchTerm = '';
    this.estacionamentoList.set([]);
    this.estacionamentoListLoaded.set(false);
    this.transportadoraOptions.set([]);
    this.estacionamentoDropdownOpen.set(false);
    this.transportadoraDropdownOpen.set(false);
    const profile = this.profilePermissions;
    if (this.form.useDefaultPermissions) {
      this.form.userPermissionIds = [...profile];
    } else {
      this.form.userPermissionIds = this.form.userPermissionIds.filter((p) =>
        profile.includes(p)
      );
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

  selectEstacionamento(opt: EstacionamentoOption): void {
    this.form.estacionamentoId = opt.id;
    this.form.estacionamentoLabel = opt.label;
    this.estacionamentoFiltro = opt.label;
    this.estacionamentoDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  clearEstacionamento(): void {
    this.form.estacionamentoId = null;
    this.form.estacionamentoLabel = '';
    this.estacionamentoFiltro = '';
    this.estacionamentoDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  onTransportadoraInput(): void {
    this.transportadoraSearch$.next(this.transportadoraSearchTerm);
    if (!this.transportadoraSearchTerm.trim()) {
      this.form.transportadoraId = null;
      this.form.transportadoraLabel = '';
      this.transportadoraOptions.set([]);
      this.transportadoraLoading.set(false);
      this.transportadoraDropdownOpen.set(false);
      this.cdr.markForCheck();
    }
  }

  selectTransportadora(opt: TransportadoraOption): void {
    this.form.transportadoraId = opt.id;
    this.form.transportadoraLabel = opt.label;
    this.transportadoraSearchTerm = opt.label;
    this.transportadoraOptions.set([]);
    this.transportadoraDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  clearTransportadora(): void {
    this.form.transportadoraId = null;
    this.form.transportadoraLabel = '';
    this.transportadoraSearchTerm = '';
    this.transportadoraOptions.set([]);
    this.transportadoraDropdownOpen.set(false);
    this.cdr.markForCheck();
  }

  validarFormulario(): boolean {
    if (!this.form.nome.trim()) return false;
    if (!this.form.email.trim()) return false;
    if (!this.isEdit() && !this.form.senha.trim()) return false;
    if (this.estacionamentoObrigatorio && (this.form.estacionamentoId == null || this.form.estacionamentoId === 0)) {
      return false;
    }
    if (this.transportadoraObrigatorio && (this.form.transportadoraId == null || this.form.transportadoraId === 0)) {
      return false;
    }
    return true;
  }

  salvar(): void {
    this.saveError.set(null);
    if (!this.validarFormulario()) {
      this.saveError.set('Preencha os campos obrigatórios (nome, email, senha no cadastro e vínculo quando exigido).');
      this.cdr.markForCheck();
      return;
    }
    const perfilNome = this.resolvePerfilNomeForPayload(this.form.perfilId);
    const payload = {
      nome: this.form.nome.trim(),
      email: this.form.email.trim(),
      cpfCnpj: this.form.cpfCnpj.trim() || undefined,
      senha: this.form.senha || undefined,
      ativo: this.form.ativo,
      perfilId: this.form.perfilId || undefined,
      perfilNome,
      estacionamentoId: this.showEstacionamentoField ? this.form.estacionamentoId ?? undefined : undefined,
      transportadoraId: this.showTransportadoraField ? this.form.transportadoraId ?? undefined : undefined,
      userPermissionIds: this.form.userPermissionIds,
      ...(this.editItem()?.id ? { id: this.editItem()!.id } : {}),
    };
    this.saving.set(true);
    const obs = this.isEdit()
      ? this.usuariosService.alterar({
          id: this.editItem()!.id,
          nome: payload.nome,
          email: payload.email,
          login: (this.editItem() as { userName?: string })?.userName,
          senha: payload.senha,
          confirmarSenha: payload.senha,
          cpfCnpj: payload.cpfCnpj,
          perfilId: payload.perfilId,
          perfilNome: payload.perfilNome,
          estacionamentoId: payload.estacionamentoId,
          transportadoraId: payload.transportadoraId,
        })
      : this.usuariosService.gravar(payload);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          this.isEdit() ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado no backend com sucesso.'
        );
        this.closeModal();
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const e = err as { message?: string };
        this.saveError.set(e?.message?.trim() || 'Não foi possível cadastrar o usuário no backend.');
        this.cdr.markForCheck();
      }
    });
  }
}
