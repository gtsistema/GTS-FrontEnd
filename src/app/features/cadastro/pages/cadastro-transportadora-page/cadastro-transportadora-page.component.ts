import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { TransportadoraService } from '../../services/transportadora.service';
import { VeiculoService } from '../../services/veiculo.service';
import { ViacepService } from '../../services/viacep.service';
import { CnpjBrasilApiService } from '../../services/cnpj-brasilapi.service';
import {
  TransportadoraDTO,
  TransportadoraListItemDTO,
  TransportadoraEnderecoDTO
} from '../../models/transportadora.dto';
import { VeiculoDTO, VeiculoListItemDTO } from '../../models/veiculo.dto';
import { CnpjFormValue } from '../../models/brasilapi-cnpj.model';
import { validarCnpj, cnpjTem14Digitos } from '../../utils/cnpj.utils';
import { CnpjFormatDirective, formatCnpj } from '../../directives/cnpj-format.directive';
import { CpfFormatDirective, formatCpf } from '../../directives/cpf-format.directive';
import { TelefoneFormatDirective } from '../../directives/telefone-format.directive';
import { ToastService } from '../../../../core/api/services/toast.service';
import {
  MotoristaDTO,
  MotoristaListItemDTO
} from '../../models/motorista.dto';
import { MotoristaService } from '../../services/motorista.service';

export type TransportadoraTab = 'cadastro' | 'frota' | 'motoristas';
type TransportadoraSearchField = 'geral' | 'cnpj' | 'razaoSocial' | 'nomeFantasia' | 'email' | 'id';

interface CondutorDraft {
  localId: number;
  transportadoraId?: number | null;
  nomeCompleto: string;
  cpf: string;
  email: string;
  cnh: string;
  vencimentoCnh: string;
  ativo: boolean;
}

interface VeiculoPendenteDraft {
  localId: number;
  placa: string;
  condutorId: number | null;
  veiculoModeloId: number | null;
  marca: string;
  modelo: string;
  marcaModelo: string;
  cor: string;
  anoFabricacao: number | null;
  anoModelo: number | null;
  tipoVeiculo: string;
  quantidadeEixos: string;
  tipoPeso: string;
  centroCusto: string;
  ativo: boolean;
}

const TAMANHO_PAGINA = 50;

@Component({
  selector: 'app-cadastro-transportadora-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CnpjFormatDirective,
    CpfFormatDirective,
    TelefoneFormatDirective
  ],
  templateUrl: './cadastro-transportadora-page.component.html',
  styleUrls: ['./cadastro-transportadora-page.component.scss']
})
export class CadastroTransportadoraPageComponent implements OnInit {
  private transportadoraService = inject(TransportadoraService);
  private veiculoService = inject(VeiculoService);
  private viacep = inject(ViacepService);
  private cnpjBrasilApi = inject(CnpjBrasilApiService);
  private motoristaService = inject(MotoristaService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  activeTab: TransportadoraTab = 'cadastro';

  // --- Aba Cadastro (Transportadora) ---
  listView = true;
  transportadoraList: TransportadoraListItemDTO[] = [];
  loadingList = false;
  erroList: string | null = null;
  jaBuscou = false;
  termoBusca = '';
  campoBusca: TransportadoraSearchField = 'geral';
  numeroPagina = 1;
  totalCount = 0;
  transportadoraForm!: FormGroup;
  salvando = false;
  erroForm: string | null = null;
  /** Busca automática CNPJ (BrasilAPI): loading e mensagem de erro abaixo do campo. */
  cnpjLoading = false;
  cnpjError: string | null = null;
  /** ID da transportadora em edição (usado na Frota e Motoristas). */
  transportadoraId: number | null = null;

  // --- Aba Frota (Veículos) ---
  veiculos: VeiculoListItemDTO[] = [];
  loadingVeiculos = false;
  showVeiculoForm = false;
  veiculoForm!: FormGroup;
  veiculoEditId: number | null = null;
  salvandoVeiculo = false;
  private veiculoDraftSeq = -1;
  private veiculosPendentes: VeiculoPendenteDraft[] = [];
  /** Opções para quantidade de eixos (modal frota). */
  eixosOpcoes: number[] = [2, 3, 4, 5, 6, 7, 8, 9];
  /** Opções para veículo leve/pesado. */
  tipoPesoOpcoes: { value: string; label: string }[] = [
    { value: 'leve', label: 'Leve' },
    { value: 'pesado', label: 'Pesado' }
  ];
  /** Modal Importar frota (Excel). */
  showImportarFrota = false;
  fileFrota: File | null = null;

  // --- Aba Motoristas ---
  condutores: MotoristaListItemDTO[] = [];
  loadingCondutores = false;
  private condutorDraftSeq = -1;
  private condutoresPendentes: CondutorDraft[] = [];
  showCondutorForm = false;
  condutorForm!: FormGroup;
  condutorEditId: number | null = null;
  showImportarCondutores = false;
  fileCondutores: File | null = null;

  ngOnInit(): void {
    this.criarFormTransportadora();
    this.setupCnpjBusca();
    this.criarFormVeiculo();
    this.criarFormCondutor();
  }

  setTab(tab: TransportadoraTab): void {
    this.activeTab = tab;
    if (tab === 'frota') {
      this.carregarVeiculos();
      this.carregarCondutores();
    }
    if (tab === 'motoristas') this.carregarCondutores();
  }

  // ---------- Aba Cadastro ----------
  criarFormTransportadora(): void {
    this.transportadoraForm = this.fb.group({
      id: [null as number | null],
      razaoSocial: ['', [Validators.required, Validators.minLength(2)]],
      nomeFantasia: [''],
      cnpj: ['', [Validators.required]],
      inscricaoEstadual: [''],
      email: ['', [Validators.email]],
      telefone: [''],
      ativo: [true],
      responsavelNome: [''],
      responsavelCpf: [''],
      responsavelCelular: [''],
      responsavelEmail: [''],
      responsavelCargo: [''],
      tipoAcesso: ['Unidade única'],
      observacaoInterna: [''],
      endereco: this.fb.group({
        cep: [''],
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: [''],
        estado: [''],
        complemento: ['']
      })
    });
  }

  /**
   * Configura busca automática de CNPJ (BrasilAPI): debounce 500ms no valueChanges e ao sair do campo (blur).
   * Só consulta quando tiver 14 dígitos e CNPJ válido. Preenche apenas campos vazios.
   */
  private setupCnpjBusca(): void {
    const cnpjControl = this.transportadoraForm.get('cnpj');
    if (!cnpjControl) return;
    cnpjControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((v) => cnpjTem14Digitos(v) && validarCnpj(v)),
        switchMap((v) => {
          this.cnpjLoading = true;
          this.cnpjError = null;
          this.cdr.markForCheck();
          return this.cnpjBrasilApi.buscar(v);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.cnpjLoading = false;
          if (res == null) {
            this.cnpjError = 'CNPJ não encontrado.';
          } else {
            this.cnpjError = null;
            this.applyCnpjToForm(res);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.cnpjLoading = false;
          this.cnpjError = 'Não foi possível buscar os dados do CNPJ.';
          this.cdr.markForCheck();
        }
      });
  }

  /** Aplica dados da consulta de CNPJ ao formulário apenas em campos vazios (não sobrescreve alterações do usuário). */
  private applyCnpjToForm(value: CnpjFormValue): void {
    const form = this.transportadoraForm;
    const isEmpty = (v: unknown) => v == null || String(v).trim() === '';

    if (value.razaoSocial && isEmpty(form.get('razaoSocial')?.value)) {
      form.get('razaoSocial')?.setValue(value.razaoSocial, { emitEvent: false });
    }
    if (value.nomeFantasia && isEmpty(form.get('nomeFantasia')?.value)) {
      form.get('nomeFantasia')?.setValue(value.nomeFantasia, { emitEvent: false });
    }
    form.get('ativo')?.setValue(value.ativo, { emitEvent: false });
    if (value.inscricaoEstadual != null && value.inscricaoEstadual.trim() && isEmpty(form.get('inscricaoEstadual')?.value)) {
      form.get('inscricaoEstadual')?.setValue(value.inscricaoEstadual.trim(), { emitEvent: false });
    }
    if (value.email != null && value.email.trim() && isEmpty(form.get('email')?.value)) {
      form.get('email')?.setValue(value.email.trim(), { emitEvent: false });
    }
    if (value.telefone != null && value.telefone.trim() && isEmpty(form.get('telefone')?.value)) {
      form.get('telefone')?.setValue(value.telefone.trim(), { emitEvent: false });
    }

    if (value.endereco) {
      const end = form.get('endereco');
      if (end) {
        if (value.endereco.logradouro && isEmpty(end.get('logradouro')?.value)) {
          end.get('logradouro')?.setValue(value.endereco.logradouro, { emitEvent: false });
        }
        if (value.endereco.numero && isEmpty(end.get('numero')?.value)) {
          end.get('numero')?.setValue(value.endereco.numero, { emitEvent: false });
        }
        if (value.endereco.complemento && isEmpty(end.get('complemento')?.value)) {
          end.get('complemento')?.setValue(value.endereco.complemento, { emitEvent: false });
        }
        if (value.endereco.bairro && isEmpty(end.get('bairro')?.value)) {
          end.get('bairro')?.setValue(value.endereco.bairro, { emitEvent: false });
        }
        if (value.endereco.cidade && isEmpty(end.get('cidade')?.value)) {
          end.get('cidade')?.setValue(value.endereco.cidade, { emitEvent: false });
        }
        if (value.endereco.estado && isEmpty(end.get('estado')?.value)) {
          end.get('estado')?.setValue(value.endereco.estado, { emitEvent: false });
        }
        if (value.endereco.cep && isEmpty(end.get('cep')?.value)) {
          end.get('cep')?.setValue(value.endereco.cep, { emitEvent: false });
        }
      }
    }
  }

  /** Dispara busca por CNPJ ao sair do campo (blur), se tiver 14 dígitos válidos. */
  onCnpjBlur(): void {
    const cnpj = this.transportadoraForm.get('cnpj')?.value ?? '';
    if (!cnpjTem14Digitos(cnpj) || !validarCnpj(cnpj) || this.cnpjLoading) return;
    this.cnpjLoading = true;
    this.cnpjError = null;
    this.cdr.markForCheck();
    this.cnpjBrasilApi.buscar(cnpj).subscribe({
      next: (res) => {
        this.cnpjLoading = false;
        if (res == null) {
          this.cnpjError = 'CNPJ não encontrado.';
        } else {
          this.cnpjError = null;
          this.applyCnpjToForm(res);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.cnpjLoading = false;
        this.cnpjError = 'Não foi possível buscar os dados do CNPJ.';
        this.cdr.markForCheck();
      }
    });
  }

  /** Listagem via GET /api/Transportadora?... */
  carregarLista(): void {
    this.jaBuscou = true;
    this.loadingList = true;
    this.erroList = null;
    const termo = this.normalizeSearchTerm(this.termoBusca, this.campoBusca);
    const propriedade = this.resolveSearchProperty(this.campoBusca);
    this.transportadoraService
      .buscar({
        Termo: termo || undefined,
        Propriedade: propriedade,
        NumeroPagina: this.numeroPagina,
        TamanhoPagina: TAMANHO_PAGINA
      })
      .subscribe({
        next: (paged) => {
          this.transportadoraList = paged.items;
          this.totalCount = paged.totalCount;
          this.loadingList = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.erroList = 'Erro ao carregar a lista.';
          this.loadingList = false;
          this.cdr.markForCheck();
        }
      });
  }

  onBuscar(): void {
    this.numeroPagina = 1;
    this.carregarLista();
  }

  get searchPlaceholder(): string {
    switch (this.campoBusca) {
      case 'cnpj':
        return 'Digite o CNPJ';
      case 'razaoSocial':
        return 'Digite a razão social';
      case 'nomeFantasia':
        return 'Digite o nome fantasia';
      case 'email':
        return 'Digite o e-mail';
      case 'id':
        return 'Digite o ID';
      default:
        return 'Pesquisar';
    }
  }

  private resolveSearchProperty(field: TransportadoraSearchField): string | undefined {
    switch (field) {
      case 'cnpj':
        return 'Cnpj';
      case 'razaoSocial':
        return 'RazaoSocial';
      case 'nomeFantasia':
        return 'NomeFantasia';
      case 'email':
        return 'Email';
      case 'id':
        return 'Id';
      default:
        return undefined;
    }
  }

  private normalizeSearchTerm(raw: string, field: TransportadoraSearchField): string {
    const base = (raw ?? '').trim();
    if (!base) return '';
    if (field === 'cnpj' || field === 'id') return base.replace(/\D/g, '');
    return base;
  }

  novoTransportadora(): void {
    this.listView = false;
    this.transportadoraId = null;
    this.transportadoraForm.reset({
      id: null,
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      inscricaoEstadual: '',
      email: '',
      telefone: '',
      ativo: true,
      responsavelNome: '',
      responsavelCpf: '',
      responsavelCelular: '',
      responsavelEmail: '',
      responsavelCargo: '',
      tipoAcesso: 'Unidade única',
      observacaoInterna: '',
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: ''
      }
    });
    this.erroForm = null;
    this.cnpjError = null;
    this.veiculosPendentes = [];
    this.veiculos = [];
    this.condutoresPendentes = [];
    this.condutores = [];
  }

  editarTransportadora(item: TransportadoraListItemDTO): void {
    this.listView = false;
    this.erroForm = null;
    this.cnpjError = null;
    this.transportadoraService.obterPorId(item.id).subscribe((dto) => {
      if (dto) {
        this.transportadoraId = dto.id ?? null;
        this.condutoresPendentes = [];
        this.transportadoraForm.patchValue({
          id: dto.id,
          razaoSocial: dto.razaoSocial,
          nomeFantasia: dto.nomeFantasia ?? '',
          cnpj: dto.cnpj,
          inscricaoEstadual: dto.inscricaoEstadual ?? '',
          email: dto.email ?? '',
          telefone: dto.telefone ?? '',
          ativo: dto.ativo,
          responsavelNome: dto.responsavelNome ?? '',
          responsavelCpf: dto.responsavelCpf ?? '',
          responsavelCelular: dto.responsavelCelular ?? '',
          responsavelEmail: dto.responsavelEmail ?? '',
          responsavelCargo: dto.responsavelCargo ?? '',
          tipoAcesso: dto.tipoAcesso ?? 'Unidade única',
          observacaoInterna: dto.observacaoInterna ?? '',
          endereco: dto.endereco
            ? {
                cep: dto.endereco.cep ?? '',
                logradouro: dto.endereco.logradouro ?? '',
                numero: dto.endereco.numero ?? '',
                bairro: dto.endereco.bairro ?? '',
                cidade: dto.endereco.cidade ?? '',
                estado: dto.endereco.estado ?? '',
                complemento: dto.endereco.complemento ?? ''
              }
            : { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', complemento: '' }
        });
        this.carregarCondutores();
      }
      this.cdr.markForCheck();
    });
  }

  voltarLista(): void {
    this.listView = true;
    this.activeTab = 'cadastro';
    this.carregarLista();
  }

  buscarCep(): void {
    const cep = this.transportadoraForm.get('endereco.cep')?.value?.replace(/\D/g, '') ?? '';
    if (cep.length !== 8) return;
    this.viacep.buscarPorCep(cep).subscribe((end) => {
      if (end) {
        this.transportadoraForm.get('endereco')?.patchValue({
          logradouro: end.logradouro,
          bairro: end.bairro,
          cidade: end.cidade,
          estado: end.estado
        });
        this.cdr.markForCheck();
      }
    });
  }

  salvarTransportadora(): void {
    if (this.transportadoraForm.invalid) {
      this.transportadoraForm.markAllAsTouched();
      return;
    }
    const v = this.transportadoraForm.value;
    const dto: TransportadoraDTO = {
      id: v.id ?? undefined,
      razaoSocial: v.razaoSocial,
      nomeFantasia: v.nomeFantasia,
      cnpj: v.cnpj.replace(/\D/g, ''),
      inscricaoEstadual: v.inscricaoEstadual || undefined,
      email: v.email,
      telefone: v.telefone || undefined,
      ativo: v.ativo,
      responsavelNome: v.responsavelNome || undefined,
      responsavelCpf: v.responsavelCpf?.replace(/\D/g, '') || undefined,
      responsavelCelular: v.responsavelCelular || undefined,
      responsavelEmail: v.responsavelEmail || undefined,
      responsavelCargo: v.responsavelCargo || undefined,
      tipoAcesso: v.tipoAcesso,
      observacaoInterna: v.observacaoInterna || undefined,
      endereco: v.endereco?.cep
        ? ({
            cep: v.endereco.cep,
            logradouro: v.endereco.logradouro,
            numero: v.endereco.numero,
            bairro: v.endereco.bairro,
            cidade: v.endereco.cidade,
            estado: v.endereco.estado,
            complemento: v.endereco.complemento
          } as TransportadoraEnderecoDTO)
        : undefined
    };
    this.salvando = true;
    this.erroForm = null;
    const obs = dto.id
      ? this.transportadoraService.alterar(dto)
      : this.transportadoraService.gravar(dto);
    obs.subscribe({
      next: (saved) => {
        this.transportadoraId = saved.id ?? null;
        this.transportadoraForm.patchValue({ id: saved.id ?? null }, { emitEvent: false });
        this.salvando = false;
        this.publicarVeiculosPendentes();
        this.publicarCondutoresPendentes();
        this.carregarVeiculos();
        this.carregarCondutores();
        this.toast.success(dto.id ? 'Transportadora atualizada com sucesso.' : 'Transportadora cadastrada com sucesso.');
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.erroForm = (err?.message && err.message.trim()) ? err.message : 'Erro ao salvar. Tente novamente.';
        this.salvando = false;
        this.cdr.markForCheck();
      }
    });
  }

  excluirTransportadora(): void {
    const id = this.transportadoraForm.get('id')?.value;
    if (!id) return;
    if (!confirm('Confirma a exclusão desta transportadora?')) return;
    this.transportadoraService.excluir(id).subscribe({
      next: () => {
        this.transportadoraId = null;
        this.voltarLista();
        this.cdr.markForCheck();
      },
      error: () => {
        this.erroForm = 'Erro ao excluir.';
        this.cdr.markForCheck();
      }
    });
  }

  formatCnpjList(doc: string): string {
    const d = (doc ?? '').replace(/\D/g, '');
    return d.length === 14 ? formatCnpj(d) : doc ?? '';
  }

  // ---------- Aba Frota (Veículos) ----------
  carregarVeiculos(): void {
    if (this.transportadoraId == null) {
      this.veiculos = this.mapVeiculosPendentesParaLista();
      this.loadingVeiculos = false;
      this.cdr.markForCheck();
      return;
    }
    this.loadingVeiculos = true;
    this.veiculoService
      .buscar({
        TransportadoraId: this.transportadoraId,
        NumeroPagina: 1,
        TamanhoPagina: 200
      })
      .subscribe({
        next: (paged) => {
          this.veiculos = [...paged.items, ...this.mapVeiculosPendentesParaLista()];
          this.loadingVeiculos = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.veiculos = this.mapVeiculosPendentesParaLista();
          this.loadingVeiculos = false;
          this.cdr.markForCheck();
        }
      });
  }

  criarFormVeiculo(): void {
    this.veiculoForm = this.fb.group({
      id: [null as number | null],
      placa: ['', [Validators.required, Validators.minLength(7)]],
      condutorId: [null as number | null],
      veiculoModeloId: [null as number | null],
      marca: [''],
      modelo: [''],
      marcaModelo: [''],
      cor: [''],
      anoFabricacao: [null as number | null],
      anoModelo: [null as number | null],
      tipoVeiculo: [''],
      quantidadeEixos: [''],
      tipoPeso: [''],
      transportadoraId: [null as number | null],
      centroCusto: [''],
      ativo: [true]
    });
  }

  /** Formata placa: só letras e números, maiúsculo, máx. 7 caracteres (padrão do modal Entrada). */
  formatarPlacaFrota(value: string): void {
    const formatted = (value || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 7);
    this.veiculoForm.patchValue({ placa: formatted }, { emitEvent: false });
  }

  /**
   * Ao sair do campo placa: busca no backend por essa placa.
   * Se encontrar um veículo, preenche o formulário com os dados do backend (modo edição).
   */
  onPlacaBlur(): void {
    if (this.veiculoEditId != null) return;
    if (this.transportadoraId == null) return;
    const placa = (this.veiculoForm.get('placa')?.value ?? '').replace(/\s/g, '').toUpperCase();
    if (placa.length < 7) return;
    this.veiculoService
      .buscar({ Placa: placa, NumeroPagina: 1, TamanhoPagina: 5 })
      .subscribe({
        next: (paged) => {
          if (paged.items.length === 0) return;
          const primeiro = paged.items[0];
          this.veiculoService.obterPorId(primeiro.id).subscribe((dto) => {
            if (!dto) return;
            const marcaModelo = (dto.marcaModelo ?? '').trim();
            const idx = marcaModelo.indexOf(' ');
            const marca = idx >= 0 ? marcaModelo.slice(0, idx) : marcaModelo;
            const modelo = idx >= 0 ? marcaModelo.slice(idx + 1) : '';
            const dtoExt = dto as unknown as Record<string, unknown>;
            this.veiculoEditId = dto.id ?? null;
            this.veiculoForm.patchValue({
              id: dto.id,
              placa: dto.placa,
              condutorId: dtoExt['condutorId'] ?? null,
              veiculoModeloId: dto.veiculoModeloId,
              marca,
              modelo,
              marcaModelo: dto.marcaModelo,
              cor: dto.cor,
              anoFabricacao: dto.anoFabricacao,
              anoModelo: dto.anoModelo,
              tipoVeiculo: dto.tipoVeiculo,
              quantidadeEixos: dtoExt['quantidadeEixos'] ?? '',
              tipoPeso: dtoExt['tipoPeso'] ?? '',
              transportadoraId: dto.transportadoraId ?? this.transportadoraId,
              centroCusto: dto.centroCusto,
              ativo: dto.ativo
            });
            this.cdr.markForCheck();
          });
        }
      });
  }

  abrirNovoVeiculo(): void {
    this.veiculoEditId = null;
    this.veiculoForm.reset({
      id: null,
      placa: '',
      condutorId: null,
      veiculoModeloId: null,
      marca: '',
      modelo: '',
      marcaModelo: '',
      cor: '',
      anoFabricacao: null,
      anoModelo: null,
      tipoVeiculo: '',
      quantidadeEixos: '',
      tipoPeso: '',
      transportadoraId: this.transportadoraId,
      centroCusto: '',
      ativo: true
    });
    this.ensureTransportadoraListForFrota();
    this.showVeiculoForm = true;
    this.cdr.markForCheck();
  }

  /** Garante lista de transportadoras para o select do modal (carrega se vazia). */
  private ensureTransportadoraListForFrota(): void {
    if (this.transportadoraList.length === 0) {
      this.loadingList = true;
      this.transportadoraService.buscar({ NumeroPagina: 1, TamanhoPagina: 100 }).subscribe({
        next: (res) => {
          this.transportadoraList = res.items;
          this.loadingList = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingList = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  editarVeiculo(v: VeiculoListItemDTO): void {
    if (v.id <= 0) {
      const draft = this.veiculosPendentes.find((item) => item.localId === v.id);
      if (!draft) return;
      this.veiculoEditId = draft.localId;
      this.veiculoForm.patchValue({
        id: draft.localId,
        placa: draft.placa,
        condutorId: draft.condutorId,
        veiculoModeloId: draft.veiculoModeloId,
        marca: draft.marca,
        modelo: draft.modelo,
        marcaModelo: draft.marcaModelo,
        cor: draft.cor,
        anoFabricacao: draft.anoFabricacao,
        anoModelo: draft.anoModelo,
        tipoVeiculo: draft.tipoVeiculo,
        quantidadeEixos: draft.quantidadeEixos,
        tipoPeso: draft.tipoPeso,
        transportadoraId: this.transportadoraId,
        centroCusto: draft.centroCusto,
        ativo: draft.ativo
      });
      this.showVeiculoForm = true;
      this.cdr.markForCheck();
      return;
    }

    const patchMarcaModelo = (marcaModelo: string | undefined) => {
      const s = (marcaModelo ?? '').trim();
      const idx = s.indexOf(' ');
      return idx >= 0 ? { marca: s.slice(0, idx), modelo: s.slice(idx + 1).trim() } : { marca: s, modelo: '' };
    };
    this.veiculoService.obterPorId(v.id).subscribe((dto) => {
      if (dto) {
        const { marca, modelo } = patchMarcaModelo(dto.marcaModelo);
        this.veiculoEditId = dto.id ?? null;
        const dtoExt = dto as unknown as Record<string, unknown>;
        this.veiculoForm.patchValue({
          id: dto.id,
          placa: dto.placa,
          condutorId: dtoExt['condutorId'] ?? null,
          veiculoModeloId: dto.veiculoModeloId,
          marca,
          modelo,
          marcaModelo: dto.marcaModelo,
          cor: dto.cor,
          anoFabricacao: dto.anoFabricacao,
          anoModelo: dto.anoModelo,
          tipoVeiculo: dto.tipoVeiculo,
          quantidadeEixos: dtoExt['quantidadeEixos'] ?? '',
          tipoPeso: dtoExt['tipoPeso'] ?? '',
          transportadoraId: dto.transportadoraId ?? this.transportadoraId,
          centroCusto: dto.centroCusto,
          ativo: dto.ativo
        });
        this.ensureTransportadoraListForFrota();
        this.showVeiculoForm = true;
        this.cdr.markForCheck();
      }
    });
  }

  salvarVeiculo(): void {
    if (this.veiculoForm.invalid) return;
    const v = this.veiculoForm.value;
    const transportadoraId = this.transportadoraId ?? v.transportadoraId;
    if (transportadoraId == null) {
      const draftId = this.veiculoEditId != null && this.veiculoEditId <= 0 ? this.veiculoEditId : this.veiculoDraftSeq--;
      const draft: VeiculoPendenteDraft = {
        localId: draftId,
        placa: (v.placa ?? '').replace(/\s/g, '').toUpperCase(),
        condutorId: v.condutorId ?? null,
        veiculoModeloId: v.veiculoModeloId ?? null,
        marca: v.marca ?? '',
        modelo: v.modelo ?? '',
        marcaModelo: v.marcaModelo ?? '',
        cor: v.cor ?? '',
        anoFabricacao: v.anoFabricacao ?? null,
        anoModelo: v.anoModelo ?? null,
        tipoVeiculo: v.tipoVeiculo ?? '',
        quantidadeEixos: v.quantidadeEixos ?? '',
        tipoPeso: v.tipoPeso ?? '',
        centroCusto: v.centroCusto ?? '',
        ativo: v.ativo !== false
      };
      const draftIndex = this.veiculosPendentes.findIndex((item) => item.localId === draft.localId);
      if (draftIndex >= 0) {
        this.veiculosPendentes[draftIndex] = draft;
      } else {
        this.veiculosPendentes.push(draft);
      }
      this.veiculoEditId = null;
      this.showVeiculoForm = false;
      this.veiculos = this.mapVeiculosPendentesParaLista();
      this.toast.success('Frota adicionada como pendente. Ela será salva junto quando a transportadora for salva.');
      this.cdr.markForCheck();
      return;
    }
    const marcaModelo = [v.marca, v.modelo].filter(Boolean).join(' ').trim() || undefined;
    const dto: VeiculoDTO = {
      id: v.id,
      transportadoraId,
      placa: (v.placa ?? '').replace(/\s/g, '').toUpperCase(),
      veiculoModeloId: v.veiculoModeloId || undefined,
      marcaModelo: marcaModelo ?? v.marcaModelo,
      cor: v.cor,
      anoFabricacao: v.anoFabricacao,
      anoModelo: v.anoModelo,
      tipoVeiculo: v.tipoVeiculo,
      centroCusto: v.centroCusto,
      ativo: v.ativo
    };
    this.salvandoVeiculo = true;
    const obs = dto.id ? this.veiculoService.alterar(dto) : this.veiculoService.gravar(dto);
    obs.subscribe({
      next: () => {
        this.salvandoVeiculo = false;
        this.veiculoEditId = null;
        this.showVeiculoForm = false;
        this.carregarVeiculos();
        this.cdr.markForCheck();
      },
      error: () => {
        this.salvandoVeiculo = false;
        this.cdr.markForCheck();
      }
    });
  }

  excluirVeiculo(veiculo: VeiculoListItemDTO): void {
    if (!confirm('Excluir este veículo?')) return;
    if (veiculo.id <= 0) {
      this.veiculosPendentes = this.veiculosPendentes.filter((item) => item.localId !== veiculo.id);
      this.veiculos = this.mapVeiculosPendentesParaLista();
      this.cdr.markForCheck();
      return;
    }
    this.veiculoService.excluir(veiculo.id).subscribe({
      next: () => this.carregarVeiculos(),
      error: () => this.cdr.markForCheck()
    });
  }

  /** Fecha o modal Cadastrar frota (Fechar, X ou clique fora). */
  fecharModalFrota(): void {
    this.showVeiculoForm = false;
  }

  /** Abre modal de importação de frota por Excel. */
  abrirImportarFrota(): void {
    this.fileFrota = null;
    this.showImportarFrota = true;
  }

  fecharImportarFrota(): void {
    this.showImportarFrota = false;
    this.fileFrota = null;
  }

  /** Abre modal de importação de condutores por Excel. */
  abrirImportarCondutores(): void {
    this.fileCondutores = null;
    this.showImportarCondutores = true;
    this.cdr.markForCheck();
  }

  fecharImportarCondutores(): void {
    this.showImportarCondutores = false;
    this.cdr.markForCheck();
  }

  onFileFrotaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileFrota = input.files?.[0] ?? null;
  }

  /** Importar frota por Excel. TODO: integrar com endpoint quando disponível. */
  importarFrota(): void {
    if (!this.fileFrota || this.transportadoraId == null) return;
    // TODO: chamar endpoint de importação de frota quando disponível no backend
    alert('Importação de frota: integrar com backend quando o endpoint estiver disponível.');
  }

  /** Download do modelo da planilha para importação de frota. */
  downloadModeloFrota(): void {
    // TODO: gerar ou servir arquivo modelo quando disponível
    window.open('#', '_blank');
  }

  // ---------- Aba Motoristas ----------
  criarFormCondutor(): void {
    this.condutorForm = this.fb.group({
      id: [null as number | null],
      transportadoraId: [null as number | null],
      nomeCompleto: ['', Validators.required],
      cpf: ['', Validators.required],
      email: ['', Validators.email],
      cnh: [''],
      vencimentoCnh: [''],
      ativo: [true]
    });
  }

  abrirNovoCondutor(): void {
    this.condutorEditId = null;
    this.condutorForm.reset({
      id: null,
      transportadoraId: this.transportadoraId,
      nomeCompleto: '',
      cpf: '',
      email: '',
      cnh: '',
      vencimentoCnh: '',
      ativo: true
    });
    this.showCondutorForm = true;
    this.cdr.markForCheck();
  }

  /** Fecha o modal Motorista (Fechar, X ou clique fora). */
  fecharModalCondutor(): void {
    this.showCondutorForm = false;
  }

  salvarCondutor(): void {
    if (this.condutorForm.invalid) return;
    const v = this.condutorForm.value;
    const transportadoraId = this.transportadoraId ?? v.transportadoraId ?? undefined;
    const dto: MotoristaDTO = {
      id: this.condutorEditId ?? undefined,
      transportadoraId,
      nomeCompleto: v.nomeCompleto,
      cpf: v.cpf,
      email: v.email || undefined,
      cnh: v.cnh || undefined,
      vencimentoCnh: v.vencimentoCnh || undefined,
      ativo: v.ativo !== false
    };

    if (this.transportadoraId == null) {
      this.salvarCondutorPendente(dto);
      return;
    }

    const request$ = dto.id ? this.motoristaService.alterar(dto) : this.motoristaService.gravar(dto);
    request$.subscribe({
      next: () => {
        this.showCondutorForm = false;
        this.condutorEditId = null;
        this.carregarCondutores();
        this.toast.success(dto.id ? 'Motorista atualizado com sucesso.' : 'Motorista cadastrado com sucesso.');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Erro ao salvar motorista.');
        this.cdr.markForCheck();
      }
    });
  }

  private salvarCondutorPendente(dto: MotoristaDTO): void {
    const draftId = dto.id != null && dto.id <= 0 ? dto.id : this.condutorDraftSeq--;
    const draft: CondutorDraft = {
      localId: draftId,
      transportadoraId: dto.transportadoraId ?? null,
      nomeCompleto: dto.nomeCompleto,
      cpf: dto.cpf,
      email: dto.email ?? '',
      cnh: dto.cnh ?? '',
      vencimentoCnh: dto.vencimentoCnh ?? '',
      ativo: dto.ativo
    };
    const draftIndex = this.condutoresPendentes.findIndex((item) => item.localId === draft.localId);
    if (draftIndex >= 0) {
      this.condutoresPendentes[draftIndex] = draft;
    } else {
      this.condutoresPendentes.push(draft);
    }
    this.showCondutorForm = false;
    this.condutorEditId = null;
    this.condutores = this.mapCondutoresPendentesParaLista();
    this.toast.success('Motorista adicionado como pendente. Ele será salvo junto quando a transportadora for salva.');
    this.cdr.markForCheck();
  }

  editarCondutor(c: MotoristaListItemDTO): void {
    this.condutorEditId = c.id;
    this.condutorForm.patchValue({
      id: c.id,
      transportadoraId: c.transportadoraId ?? null,
      nomeCompleto: c.nomeCompleto,
      cpf: c.cpf,
      email: c.email,
      cnh: c.cnh,
      vencimentoCnh: c.vencimentoCnh,
      ativo: c.ativo
    });
    this.showCondutorForm = true;
    this.cdr.markForCheck();
  }

  formatCpfCondutor(cpf: string): string {
    const d = (cpf ?? '').replace(/\D/g, '');
    return d.length === 11 ? formatCpf(d) : cpf ?? '';
  }

  onFileCondutores(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileCondutores = input.files?.[0] ?? null;
  }

  importarCondutores(): void {
    if (!this.fileCondutores || this.transportadoraId == null) return;
    this.fecharImportarCondutores();
  }

  downloadModeloCondutores(): void {
    window.open('#', '_blank');
  }

  carregarCondutores(): void {
    if (this.transportadoraId == null) {
      this.condutores = this.mapCondutoresPendentesParaLista();
      this.loadingCondutores = false;
      this.cdr.markForCheck();
      return;
    }
    this.loadingCondutores = true;
    this.motoristaService
      .buscar({
        TransportadoraId: this.transportadoraId,
        NumeroPagina: 1,
        TamanhoPagina: 200
      })
      .subscribe({
        next: (paged) => {
          this.condutores = [...paged.items, ...this.mapCondutoresPendentesParaLista()];
          this.loadingCondutores = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.condutores = this.mapCondutoresPendentesParaLista();
          this.loadingCondutores = false;
          this.cdr.markForCheck();
        }
      });
  }

  excluirCondutor(condutor: MotoristaListItemDTO): void {
    if (!confirm('Excluir este motorista?')) return;
    if (condutor.id <= 0) {
      this.condutoresPendentes = this.condutoresPendentes.filter((item) => item.localId !== condutor.id);
      this.condutores = this.mapCondutoresPendentesParaLista();
      this.cdr.markForCheck();
      return;
    }
    this.motoristaService.excluir(condutor.id).subscribe({
      next: () => this.carregarCondutores(),
      error: () => this.toast.error('Erro ao excluir motorista.')
    });
  }

  condutoresParaFrota(): MotoristaListItemDTO[] {
    if (this.transportadoraId == null) return this.mapCondutoresPendentesParaLista();
    return this.condutores.filter((item) => item.ativo && (item.transportadoraId == null || item.transportadoraId === this.transportadoraId));
  }

  private mapCondutoresPendentesParaLista(): MotoristaListItemDTO[] {
    return this.condutoresPendentes.map((item) => ({
      id: item.localId,
      transportadoraId: item.transportadoraId ?? undefined,
      nomeCompleto: item.nomeCompleto,
      cpf: item.cpf,
      email: item.email || undefined,
      cnh: item.cnh || undefined,
      vencimentoCnh: item.vencimentoCnh || undefined,
      ativo: item.ativo
    }));
  }

  private publicarCondutoresPendentes(): void {
    if (this.transportadoraId == null || this.condutoresPendentes.length === 0) return;
    const pendentes = [...this.condutoresPendentes];
    const falhas: CondutorDraft[] = [];
    let sucesso = 0;
    const salvarProximo = (index: number): void => {
      if (index >= pendentes.length) {
        this.condutoresPendentes = falhas;
        if (sucesso > 0) {
          this.toast.success(`${sucesso} motorista(s) foram salvos junto com a transportadora.`);
        }
        if (falhas.length > 0) {
          this.toast.warning(`Alguns motoristas (${falhas.length}) ficaram pendentes. Salve novamente para reenviar.`);
        }
        this.carregarCondutores();
        return;
      }
      const item = pendentes[index];
      const dto: MotoristaDTO = {
        transportadoraId: this.transportadoraId ?? undefined,
        nomeCompleto: item.nomeCompleto,
        cpf: item.cpf,
        email: item.email || undefined,
        cnh: item.cnh || undefined,
        vencimentoCnh: item.vencimentoCnh || undefined,
        ativo: item.ativo
      };
      this.motoristaService.gravar(dto).subscribe({
        next: () => {
          sucesso += 1;
          salvarProximo(index + 1);
        },
        error: () => {
          falhas.push(item);
          salvarProximo(index + 1);
        }
      });
    };
    salvarProximo(0);
  }

  private mapVeiculosPendentesParaLista(): VeiculoListItemDTO[] {
    return this.veiculosPendentes.map((draft) => {
      const marcaModelo = [draft.marca, draft.modelo].filter(Boolean).join(' ').trim() || draft.marcaModelo || '—';
      return {
        id: draft.localId,
        placa: draft.placa,
        marcaModelo,
        cor: draft.cor || undefined,
        anoFabricacao: draft.anoFabricacao ?? undefined,
        anoModelo: draft.anoModelo ?? undefined,
        tipoVeiculo: draft.tipoVeiculo || undefined,
        centroCusto: draft.centroCusto || undefined,
        ativo: draft.ativo,
        transportadoraId: this.transportadoraId ?? undefined
      };
    });
  }

  private publicarVeiculosPendentes(): void {
    if (this.transportadoraId == null || this.veiculosPendentes.length === 0) return;
    const pendentes = [...this.veiculosPendentes];
    const falhas: VeiculoPendenteDraft[] = [];
    let sucesso = 0;

    const salvarProximo = (index: number): void => {
      if (index >= pendentes.length) {
        this.veiculosPendentes = falhas;
        if (sucesso > 0) {
          this.toast.success(`${sucesso} veículo(s) da frota foram salvos junto com a transportadora.`);
        }
        if (falhas.length > 0) {
          this.toast.warning(`Alguns veículos (${falhas.length}) ficaram pendentes. Salve novamente para reenviar.`);
        }
        this.carregarVeiculos();
        return;
      }

      const item = pendentes[index];
      const marcaModelo = [item.marca, item.modelo].filter(Boolean).join(' ').trim() || item.marcaModelo || undefined;
      const dto: VeiculoDTO = {
        transportadoraId: this.transportadoraId ?? undefined,
        placa: item.placa,
        veiculoModeloId: item.veiculoModeloId ?? undefined,
        marcaModelo,
        cor: item.cor || undefined,
        anoFabricacao: item.anoFabricacao ?? undefined,
        anoModelo: item.anoModelo ?? undefined,
        tipoVeiculo: item.tipoVeiculo || undefined,
        centroCusto: item.centroCusto || undefined,
        ativo: item.ativo
      };

      this.veiculoService.gravar(dto).subscribe({
        next: () => {
          sucesso += 1;
          salvarProximo(index + 1);
        },
        error: () => {
          falhas.push(item);
          salvarProximo(index + 1);
        }
      });
    };

    salvarProximo(0);
  }
}
