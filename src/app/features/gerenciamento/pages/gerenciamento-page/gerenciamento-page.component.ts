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
import { Subscription } from 'rxjs';
import { GerenciamentoService } from '../../services/gerenciamento.service';
import {
  GerenciamentoFiltros,
  UsuarioGerenciamentoForm,
  UsuarioGerenciamentoItem
} from '../../models/gerenciamento.types';
import { AcessosPerfisService, ApplicationRole } from '../../../cadastro/services/acessos-perfis.service';
import {
  EstacionamentoLookupService,
  LookupOption as EstacionamentoOption
} from '../../../cadastro/services/estacionamento-lookup.service';
import { ProfilePermissionsStoreService } from '../../../cadastro/services/profile-permissions-store.service';
import { PermissionCacheService } from '../../../../core/services/permission-cache.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import type { UsuarioDetalheOutput, RegistroResult } from '../../../../core/api/types/usuario-api.types';
import { ApiError } from '../../../../core/api/models';

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
  private EstacionamentoLookup = inject(EstacionamentoLookupService);
  private profileStore = inject(ProfilePermissionsStoreService);
  private permissionCache = inject(PermissionCacheService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  /** Permissões alinhadas ao back ([PermissionAuthorize]). */
  canVisualizar = this.permissionCache.has('usuario.visualizar') || this.permissionCache.hasAny(['*']);
  canGravar = this.permissionCache.has('usuario.gravar') || this.permissionCache.hasAny(['*']);
  canAlterar = this.permissionCache.has('usuario.alterar') || this.permissionCache.hasAny(['*']);
  canExcluir = this.permissionCache.has('usuario.excluir') || this.permissionCache.hasAny(['*']);

  filtros: GerenciamentoFiltros = { nomeOuEmail: '', perfilNome: '' };

  loading = false;
  erro: string | null = null;
  itens: UsuarioGerenciamentoItem[] = [];
  buscaRealizada = false;
  perfisList: ApplicationRole[] = [];

  modalFormOpen = signal(false);
  modalVerOpen = signal(false);
  isEdit = signal(false);
  editItem = signal<UsuarioGerenciamentoItem | null>(null);
  itemVer = signal<UsuarioGerenciamentoItem | null>(null);
  saveError = signal<string | null>(null);
  saving = signal(false);
  carregandoDetalhe = signal(false);

  showNovoPerfilForm = false;
  novoPerfilNome = '';
  savingPerfil = false;

  form: UsuarioGerenciamentoForm = this.getEmptyForm();

  EstacionamentoOptions = signal<EstacionamentoOption[]>([]);
  EstacionamentoCarregando = signal(false);
  private subs = new Subscription();
  private buscaSub?: Subscription;

  ngOnInit(): void {
    this.carregarPerfis();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.buscaSub?.unsubscribe();
  }

  get profilePermissions(): string[] {
    const id = this.form.perfilId;
    if (!id) return [];
    const role = this.findPerfilBySelectedValue(id);
    const key = String(
      role?.name ?? role?.perfil ?? role?.nome ?? role?.normalizedName ?? role?.id ?? id
    );
    return this.profileStore.getProfilePermissions(key);
  }

  onPerfilFormChange(): void {
    this.profilePermissions;
    this.cdr.markForCheck();
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

  private getEmptyForm(): UsuarioGerenciamentoForm {
    return {
      nome: '',
      email: '',
      login: '',
      senha: '',
      confirmarSenha: '',
      EstacionamentoId: 0,
      EstacionamentoLabel: '',
      documento: '',
      tipoPessoa: 1,
      pessoaId: null,
      perfilId: '',
      ativo: true
    };
  }

  private carregarPerfis(): void {
    this.gerenciamentoService.getPerfis().subscribe({
      next: (list) => {
        this.perfisList = list;
        this.cdr.markForCheck();
      }
    });
  }

  private carregarEstacionamentosParaModal(): void {
    if (this.EstacionamentoOptions().length > 0 || this.EstacionamentoCarregando()) {
      return;
    }
    this.EstacionamentoCarregando.set(true);
    this.cdr.markForCheck();
    this.EstacionamentoLookup.list().subscribe({
      next: (opts) => {
        this.EstacionamentoCarregando.set(false);
        this.EstacionamentoOptions.set(opts);
        this.cdr.markForCheck();
      },
      error: () => {
        this.EstacionamentoCarregando.set(false);
        this.toast.error('Não foi possível carregar Estacionamentos.');
        this.cdr.markForCheck();
      }
    });
  }

  buscar(): void {
    this.buscaSub?.unsubscribe();
    this.buscaRealizada = true;
    this.loading = true;
    this.erro = null;
    this.cdr.markForCheck();
    this.buscaSub = this.gerenciamentoService.buscar(this.filtros).subscribe({
      next: (list) => {
        this.loading = false;
        this.erro = null;
        this.itens = list;
        this.cdr.markForCheck();
      },
      error: (err: ApiError) => {
        this.loading = false;
        this.erro = err?.message ?? 'Erro ao carregar a lista de usuários.';
        this.itens = [];
        this.cdr.markForCheck();
      }
    });
  }

  limparFiltros(): void {
    this.filtros = { nomeOuEmail: '', perfilNome: '' };
    this.buscaRealizada = false;
    this.itens = [];
    this.erro = null;
    this.loading = false;
    this.cdr.markForCheck();
  }

  abrirNovo(): void {
    if (!this.canGravar) {
      this.toast.error('Você não possui permissão para cadastrar usuários (usuario.gravar).');
      return;
    }
    this.saveError.set(null);
    this.form = this.getEmptyForm();
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.isEdit.set(false);
    this.editItem.set(null);
    this.carregarEstacionamentosParaModal();
    this.modalFormOpen.set(true);
    this.cdr.markForCheck();
  }

  abrirEditar(item: UsuarioGerenciamentoItem): void {
    if (!this.canAlterar) {
      this.toast.error('Você não possui permissão para editar usuários (usuario.alterar).');
      return;
    }
    if (!item.id) {
      return;
    }
    this.saveError.set(null);
    this.editItem.set(item);
    this.isEdit.set(true);
    this.showNovoPerfilForm = false;
    this.novoPerfilNome = '';
    this.form = this.getEmptyForm();
    this.carregarEstacionamentosParaModal();
    this.carregandoDetalhe.set(true);
    this.modalFormOpen.set(true);
    this.cdr.markForCheck();
    this.gerenciamentoService.obterDetalhe(item.id).subscribe({
      next: (d) => {
        this.preencherFormDoDetalhe(d);
        this.carregandoDetalhe.set(false);
        this.cdr.markForCheck();
      },
      error: (err: ApiError) => {
        this.carregandoDetalhe.set(false);
        this.saveError.set(err?.message ?? 'Não foi possível carregar o usuário.');
        this.cdr.markForCheck();
      }
    });
  }

  private preencherFormDoDetalhe(
    d: UsuarioDetalheOutput & { nome?: string; emailOuLogin?: string; cpfCnpj?: string }
  ): void {
    const p = d.pessoa;
    const perf = d.perfil;
    const matchPerfil = this.perfisList.find(
      (r) =>
        (r.name && perf?.name && r.name.toLowerCase() === String(perf.name).toLowerCase()) ||
        (r.id && perf?.id && r.id === perf.id) ||
        (r.name && r.name === (perf as { name?: string })?.name)
    );
    this.form = {
      nome: p?.nome ?? '',
      email: String(d.email ?? '').trim(),
      login: String(d.userName ?? '').trim(),
      senha: '',
      confirmarSenha: '',
      EstacionamentoId:
        typeof d.EstacionamentoId === 'number' && Number.isFinite(d.EstacionamentoId)
          ? d.EstacionamentoId
          : 0,
      EstacionamentoLabel: '',
      documento: p?.documento ?? d.cpfCnpj ?? '',
      tipoPessoa: p?.tipoPessoa === 2 ? 2 : 1,
      pessoaId: typeof p?.id === 'number' ? p.id : null,
      perfilId: (matchPerfil?.id ?? matchPerfil?.name ?? perf?.id ?? perf?.name ?? '') as string,
      ativo: this.form.ativo
    };
    if (this.form.EstacionamentoId != null) {
      const fromList = this.EstacionamentoOptions().find(
        (o) => o.id === this.form.EstacionamentoId
      );
      if (fromList) {
        this.form.EstacionamentoLabel = fromList.label;
      }
    }
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
    this.cdr.markForCheck();
  }

  fecharModalVer(): void {
    this.modalVerOpen.set(false);
    this.itemVer.set(null);
    this.cdr.markForCheck();
  }

  limparEstacionamento(): void {
    this.form.EstacionamentoId = 0;
    this.form.EstacionamentoLabel = '';
    this.cdr.markForCheck();
  }

  onEstacionamentoIdChange(v: number | null | undefined): void {
    if (v == null || v === 0) {
      this.form.EstacionamentoId = 0;
      this.form.EstacionamentoLabel = '';
    } else {
      this.form.EstacionamentoId = v;
      const o = this.EstacionamentoOptions().find((e) => e.id === v);
      this.form.EstacionamentoLabel = o?.label ?? '';
    }
    this.cdr.markForCheck();
  }

  onEstacionamentoFieldFocus(): void {
    this.carregarEstacionamentosParaModal();
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
    if (!this.form.login?.trim() && !this.form.email?.trim()) {
      this.saveError.set('Informe o login (userName) ou e-mail para credenciais.');
      this.cdr.markForCheck();
      return;
    }
    if (!this.isEdit()) {
      if (!this.form.senha || this.form.senha !== this.form.confirmarSenha) {
        this.saveError.set('Senha e confirmar senha devem ser iguais no cadastro.');
        this.cdr.markForCheck();
        return;
      }
    } else {
      if (this.form.senha || this.form.confirmarSenha) {
        if (this.form.senha !== this.form.confirmarSenha) {
          this.saveError.set('Se alterar a senha, confirmação deve coincidir.');
          this.cdr.markForCheck();
          return;
        }
      }
    }
    if (!this.canGravar && !this.isEdit()) {
      this.toast.error('Sem permissão para cadastrar.');
      return;
    }
    if (this.isEdit() && !this.canAlterar) {
      this.toast.error('Sem permissão para alterar.');
      return;
    }
    this.saving.set(true);
    this.cdr.markForCheck();
    const pessoaId =
      this.form.pessoaId != null && Number.isFinite(this.form.pessoaId) ? this.form.pessoaId : 0;
    const perfilNome = this.resolvePerfilNomeForPayload(this.form.perfilId);
    const payload: Record<string, unknown> = {
      nome: this.form.nome.trim(),
      email: this.form.email.trim(),
      login: (this.form.login || this.form.email).trim(),
      senha: this.form.senha || undefined,
      confirmarSenha: this.form.confirmarSenha || undefined,
      cpfCnpj: this.form.documento?.trim() || undefined,
      tipoPessoa: this.form.tipoPessoa,
      pessoaId,
      ativo: this.form.ativo,
      perfilId: this.form.perfilId || undefined,
      perfilNome,
      EstacionamentoId: typeof this.form.EstacionamentoId === 'number' ? this.form.EstacionamentoId : 0,
      ...(this.editItem()?.id ? { id: this.editItem()!.id } : {})
    };
    const req = this.isEdit()
      ? this.gerenciamentoService.alterar(payload)
      : this.gerenciamentoService.gravar(payload);
    req.subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!this.isEdit() && res && typeof res === 'object') {
          const r = res as RegistroResult;
          const msg =
            r.mensagem ?? r.message ?? (r as { Message?: string }).Message ?? 'Usuário cadastrado.';
          const emailOk = r.emailDeConfirmacaoEnviado ?? (r as { EmailDeConfirmacaoEnviado?: boolean }).EmailDeConfirmacaoEnviado;
          if (emailOk === true) {
            this.toast.success(
              String(msg) + (r.linkConfirmacaoNoFrontend ? ' Use o link enviado ou o informado abaixo (' + r.linkConfirmacaoNoFrontend + ').' : '')
            );
          } else {
            this.toast.success('Usuário criado. ' + String(msg));
          }
        } else {
          this.toast.success(this.isEdit() ? 'Usuário atualizado.' : 'Usuário criado.');
        }
        this.fecharModalForm();
        this.buscar();
        this.cdr.markForCheck();
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.saveError.set(
          (err as { error?: { message?: string } })?.error?.message ??
            (err as { message?: string })?.message ??
            'Erro ao salvar.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  excluir(item: UsuarioGerenciamentoItem): void {
    if (!this.canExcluir || !item.id) {
      this.toast.error('Sem permissão para excluir (usuario.excluir) ou dado inválido.');
      return;
    }
    if (!window.confirm('Excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }
    this.gerenciamentoService.excluir(item.id).subscribe({
      next: () => {
        this.toast.success('Usuário excluído.');
        this.buscar();
        this.cdr.markForCheck();
      },
      error: (err: ApiError) => {
        this.toast.error(err?.message ?? 'Falha ao excluir.');
        this.cdr.markForCheck();
      }
    });
  }
}
