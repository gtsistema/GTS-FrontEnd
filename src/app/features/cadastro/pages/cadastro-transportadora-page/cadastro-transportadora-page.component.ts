import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { TransportadoraService } from '../../services/transportadora.service';
import { VeiculoService } from '../../services/veiculo.service';
import { VeiculoModeloService } from '../../services/veiculo-modelo.service';
import { ViacepService } from '../../services/viacep.service';
import { CnpjBrasilApiService } from '../../services/cnpj-brasilapi.service';
import {
  TransportadoraDTO,
  TransportadoraListItemDTO,
  TransportadoraEnderecoDTO
} from '../../models/transportadora.dto';
import { VeiculoDTO, VeiculoListItemDTO } from '../../models/veiculo.dto';
import { VeiculoModeloListItemDTO } from '../../models/veiculo-modelo.dto';
import { CnpjFormValue } from '../../models/brasilapi-cnpj.model';
import { validarCnpj, cnpjTem14Digitos } from '../../utils/cnpj.utils';
import { CnpjFormatDirective, formatCnpj } from '../../directives/cnpj-format.directive';
import { CpfFormatDirective, formatCpf } from '../../directives/cpf-format.directive';
import { TelefoneFormatDirective } from '../../directives/telefone-format.directive';
import { ToastService } from '../../../../core/api/services/toast.service';
import { environment } from '../../../../../environments/environment';

export type TransportadoraTab = 'cadastro' | 'frota' | 'condutores';

/** Condutor (mock até existir endpoint). Estrutura pronta para futura integração. */
export interface CondutorMock {
  id: number;
  transportadoraId?: number | null;
  nomeCompleto: string;
  cpf: string;
  celular: string;
  email: string;
  cnh: string;
  categoriaCnh: string;
  vencimentoCnh: string;
  ativo: boolean;
}

interface VeiculoDemoItem extends VeiculoListItemDTO {
  veiculoModeloId?: number | null;
  condutorId?: number | null;
  quantidadeEixos?: string;
  tipoPeso?: string;
}

const TAMANHO_PAGINA = 50;
const DEMO_TRANSPORTADORAS: TransportadoraDTO[] = [
  {
    id: -1,
    razaoSocial: 'Transportes Horizonte Logistica LTDA',
    nomeFantasia: 'Horizonte Log',
    cnpj: '12345678000190',
    email: 'contato@horizontelog.com.br',
    telefone: '(11) 4000-1001',
    ativo: true,
    responsavelNome: 'Marcelo Dias',
    responsavelCelular: '(11) 98888-1001',
    responsavelEmail: 'marcelo.dias@horizontelog.com.br',
    responsavelCargo: 'Supervisor Operacional',
    tipoAcesso: 'Unidade única',
    endereco: {
      cep: '01001000',
      logradouro: 'Rua das Palmeiras',
      numero: '145',
      bairro: 'Centro',
      cidade: 'Sao Paulo',
      estado: 'SP',
      complemento: 'Galpao A'
    }
  },
  {
    id: -2,
    razaoSocial: 'Via Carga Express Transportes SA',
    nomeFantasia: 'Via Carga',
    cnpj: '23456789000101',
    email: 'operacao@viacarga.com.br',
    telefone: '(21) 4000-2002',
    ativo: true,
    responsavelNome: 'Fernanda Gomes',
    responsavelCelular: '(21) 97777-2002',
    responsavelEmail: 'fernanda.gomes@viacarga.com.br',
    responsavelCargo: 'Coordenadora',
    tipoAcesso: 'Unidade única',
    endereco: {
      cep: '20040002',
      logradouro: 'Avenida Rio Branco',
      numero: '300',
      bairro: 'Centro',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      complemento: 'Sala 502'
    }
  },
  {
    id: -3,
    razaoSocial: 'Norte Sul Frotas e Servicos LTDA',
    nomeFantasia: 'Norte Sul Frotas',
    cnpj: '34567890000112',
    email: 'suporte@nortesul.com.br',
    telefone: '(31) 4000-3003',
    ativo: true,
    responsavelNome: 'Paulo Henrique',
    responsavelCelular: '(31) 96666-3003',
    responsavelEmail: 'paulo.henrique@nortesul.com.br',
    responsavelCargo: 'Gerente de Frota',
    tipoAcesso: 'Unidade única',
    endereco: {
      cep: '30130010',
      logradouro: 'Rua da Bahia',
      numero: '880',
      bairro: 'Lourdes',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      complemento: 'Andar 3'
    }
  }
];

const DEMO_CONDUTORES: CondutorMock[] = [
  {
    id: -1,
    transportadoraId: -1,
    nomeCompleto: 'Carlos Eduardo Lima',
    cpf: '12345678901',
    celular: '(11) 98888-7001',
    email: 'carlos.lima@demo.com.br',
    cnh: '12345678900',
    categoriaCnh: 'E',
    vencimentoCnh: '12/08/2027',
    ativo: true
  },
  {
    id: -2,
    transportadoraId: -2,
    nomeCompleto: 'Juliana Ferreira Souza',
    cpf: '23456789012',
    celular: '(21) 97777-7002',
    email: 'juliana.souza@demo.com.br',
    cnh: '23456789011',
    categoriaCnh: 'D',
    vencimentoCnh: '03/11/2026',
    ativo: true
  },
  {
    id: -3,
    transportadoraId: -3,
    nomeCompleto: 'Roberto Alves Santos',
    cpf: '34567890123',
    celular: '(31) 96666-7003',
    email: 'roberto.santos@demo.com.br',
    cnh: '34567890122',
    categoriaCnh: 'E',
    vencimentoCnh: '25/05/2028',
    ativo: true
  }
];

const DEMO_VEICULOS: VeiculoDemoItem[] = [
  {
    id: -101,
    transportadoraId: -1,
    placa: 'ABC1D23',
    marcaModelo: 'Volvo FH 540',
    veiculoModeloId: null,
    cor: 'Branco',
    anoFabricacao: 2022,
    anoModelo: 2023,
    tipoVeiculo: 'Cavalo mecanico',
    centroCusto: 'Operacao SP',
    quantidadeEixos: '6',
    tipoPeso: 'pesado',
    condutorId: -1,
    ativo: true
  },
  {
    id: -102,
    transportadoraId: -2,
    placa: 'QWE4R56',
    marcaModelo: 'Mercedes-Benz Atego 3030',
    veiculoModeloId: null,
    cor: 'Prata',
    anoFabricacao: 2021,
    anoModelo: 2021,
    tipoVeiculo: 'Truck',
    centroCusto: 'Distribuicao RJ',
    quantidadeEixos: '4',
    tipoPeso: 'pesado',
    condutorId: -2,
    ativo: true
  },
  {
    id: -103,
    transportadoraId: -3,
    placa: 'JKL8M90',
    marcaModelo: 'Fiat Fiorino',
    veiculoModeloId: null,
    cor: 'Cinza',
    anoFabricacao: 2023,
    anoModelo: 2024,
    tipoVeiculo: 'Utilitario',
    centroCusto: 'Coletas MG',
    quantidadeEixos: '2',
    tipoPeso: 'leve',
    condutorId: -3,
    ativo: true
  }
];

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
  private veiculoModeloService = inject(VeiculoModeloService);
  private viacep = inject(ViacepService);
  private cnpjBrasilApi = inject(CnpjBrasilApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private transportadorasDemo: TransportadoraDTO[] = DEMO_TRANSPORTADORAS.map((item) => ({ ...item }));
  private veiculosDemo: VeiculoDemoItem[] = DEMO_VEICULOS.map((item) => ({ ...item }));

  activeTab: TransportadoraTab = 'cadastro';

  // --- Aba Cadastro (Transportadora) ---
  listView = true;
  transportadoraList: TransportadoraListItemDTO[] = [];
  loadingList = false;
  erroList: string | null = null;
  termoBusca = '';
  numeroPagina = 1;
  totalCount = 0;
  transportadoraForm!: FormGroup;
  salvando = false;
  erroForm: string | null = null;
  /** Busca automática CNPJ (BrasilAPI): loading e mensagem de erro abaixo do campo. */
  cnpjLoading = false;
  cnpjError: string | null = null;
  /** ID da transportadora em edição (usado na Frota e Condutores). */
  transportadoraId: number | null = null;

  // --- Aba Frota (Veículos) ---
  veiculos: VeiculoListItemDTO[] = [];
  loadingVeiculos = false;
  modeloOpcoes: VeiculoModeloListItemDTO[] = [];
  /** Modal Cadastrar frota (abre ao clicar em "Cadastrar frota"). */
  showVeiculoForm = false;
  veiculoForm!: FormGroup;
  veiculoEditId: number | null = null;
  salvandoVeiculo = false;
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

  // --- Aba Condutores (mock) ---
  condutoresMock: CondutorMock[] = [];
  showCondutorForm = false;
  condutorForm!: FormGroup;
  condutorEditId: number | null = null;
  /** Modal Importar condutores (Excel). */
  showImportarCondutores = false;
  /** TODO: integrar quando existir endpoint de Condutor no backend. */

  // --- Aba Importação ---
  fileClientes: File | null = null;
  filePlacas: File | null = null;
  fileCondutores: File | null = null;

  ngOnInit(): void {
    this.criarFormTransportadora();
    this.setupCnpjBusca();
    this.criarFormVeiculo();
    this.criarFormCondutor();
    if (!environment.production) {
      this.condutoresMock = DEMO_CONDUTORES.map((item) => ({ ...item }));
    }
    this.carregarLista();
    this.veiculoModeloService.buscar().subscribe((opcoes) => {
      this.modeloOpcoes = opcoes;
      this.cdr.markForCheck();
    });
  }

  setTab(tab: TransportadoraTab): void {
    this.activeTab = tab;
    if (tab === 'frota') this.carregarVeiculos();
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

  /** Listagem sempre via GET /api/Transportadora/Buscar (backend). */
  carregarLista(): void {
    this.loadingList = true;
    this.erroList = null;
    this.transportadoraService
      .buscar({
        Termo: this.termoBusca.trim() || undefined,
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
  }

  editarTransportadora(item: TransportadoraListItemDTO): void {
    this.listView = false;
    this.erroForm = null;
    this.cnpjError = null;
    if (this.isDemoId(item.id)) {
      const dto = this.transportadorasDemo.find((transportadora) => transportadora.id === item.id);
      if (!dto) return;
      this.transportadoraId = dto.id ?? null;
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
      this.cdr.markForCheck();
      return;
    }
    this.transportadoraService.obterPorId(item.id).subscribe((dto) => {
      if (dto) {
        this.transportadoraId = dto.id ?? null;
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
    if (this.isDemoId(dto.id)) {
      this.salvarTransportadoraDemo(dto);
      return;
    }
    this.salvando = true;
    this.erroForm = null;
    const obs = dto.id
      ? this.transportadoraService.alterar(dto)
      : this.transportadoraService.gravar(dto);
    obs.subscribe({
      next: (saved) => {
        this.transportadoraId = saved.id ?? null;
        this.salvando = false;
        this.toast.success(dto.id ? 'Transportadora atualizada com sucesso.' : 'Transportadora cadastrada com sucesso.');
        this.voltarLista();
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
    if (this.isDemoId(id)) {
      this.transportadorasDemo = this.transportadorasDemo.filter((item) => item.id !== id);
      this.veiculosDemo = this.veiculosDemo.filter((item) => item.transportadoraId !== id);
      this.transportadoraId = null;
      this.voltarLista();
      this.cdr.markForCheck();
      return;
    }
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
      if (this.usarDadosDemo()) {
        this.aplicarVeiculosDemoPreview();
      }
      return;
    }
    if (this.isDemoId(this.transportadoraId)) {
      this.veiculos = this.veiculosDemo
        .filter((item) => item.transportadoraId === this.transportadoraId)
        .map((item) => this.mapVeiculoDemoToListItem(item));
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
          this.veiculos = paged.items;
          this.loadingVeiculos = false;
          this.cdr.markForCheck();
        },
        error: () => {
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
    if (this.transportadoraId == null || this.isDemoId(this.transportadoraId)) return;
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
    const patchMarcaModelo = (marcaModelo: string | undefined) => {
      const s = (marcaModelo ?? '').trim();
      const idx = s.indexOf(' ');
      return idx >= 0 ? { marca: s.slice(0, idx), modelo: s.slice(idx + 1).trim() } : { marca: s, modelo: '' };
    };
    if (this.isDemoId(v.id)) {
      const dto = this.veiculosDemo.find((item) => item.id === v.id);
      if (!dto) return;
      const { marca, modelo } = patchMarcaModelo(dto.marcaModelo);
      this.veiculoEditId = dto.id ?? null;
      this.veiculoForm.patchValue({
        id: dto.id,
        placa: dto.placa,
        condutorId: dto.condutorId ?? null,
        veiculoModeloId: dto.veiculoModeloId ?? null,
        marca,
        modelo,
        marcaModelo: dto.marcaModelo,
        cor: dto.cor,
        anoFabricacao: dto.anoFabricacao,
        anoModelo: dto.anoModelo,
        tipoVeiculo: dto.tipoVeiculo,
        quantidadeEixos: dto.quantidadeEixos ?? '',
        tipoPeso: dto.tipoPeso ?? '',
        transportadoraId: dto.transportadoraId ?? this.transportadoraId,
        centroCusto: dto.centroCusto,
        ativo: dto.ativo
      });
      this.ensureTransportadoraListForFrota();
      this.showVeiculoForm = true;
      this.cdr.markForCheck();
      return;
    }
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
    if (transportadoraId == null) return;
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
    if (this.isDemoId(dto.id) || this.isDemoId(transportadoraId)) {
      this.salvarVeiculoDemo(v, transportadoraId);
      return;
    }
    this.salvandoVeiculo = true;
    const obs = dto.id ? this.veiculoService.alterar(dto) : this.veiculoService.gravar(dto);
    obs.subscribe({
      next: () => {
        this.salvandoVeiculo = false;
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
    if (this.isDemoId(veiculo.id)) {
      this.veiculosDemo = this.veiculosDemo.filter((item) => item.id !== veiculo.id);
      this.carregarVeiculos();
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

  // ---------- Aba Condutores (mock) ----------
  criarFormCondutor(): void {
    this.condutorForm = this.fb.group({
      id: [null as number | null],
      transportadoraId: [null as number | null],
      nomeCompleto: ['', Validators.required],
      cpf: ['', Validators.required],
      celular: [''],
      email: ['', Validators.email],
      cnh: [''],
      categoriaCnh: [''],
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
      celular: '',
      email: '',
      cnh: '',
      categoriaCnh: '',
      vencimentoCnh: '',
      ativo: true
    });
    this.ensureTransportadoraListForFrota();
    this.showCondutorForm = true;
    this.cdr.markForCheck();
  }

  /** Fecha o modal Condutor (Fechar, X ou clique fora). */
  fecharModalCondutor(): void {
    this.showCondutorForm = false;
  }

  salvarCondutor(): void {
    if (this.condutorForm.invalid) return;
    const v = this.condutorForm.value;
    const transportadoraIdCondutor = this.transportadoraId ?? v.transportadoraId ?? undefined;
    if (this.condutorEditId != null) {
      const idx = this.condutoresMock.findIndex((c) => c.id === this.condutorEditId);
      if (idx >= 0) {
        this.condutoresMock[idx] = {
          id: this.condutorEditId,
          transportadoraId: transportadoraIdCondutor,
          nomeCompleto: v.nomeCompleto,
          cpf: v.cpf,
          celular: v.celular,
          email: v.email,
          cnh: v.cnh,
          categoriaCnh: v.categoriaCnh,
          vencimentoCnh: v.vencimentoCnh,
          ativo: v.ativo
        };
      }
    } else {
      const newId = Math.max(0, ...this.condutoresMock.map((c) => c.id)) + 1;
      this.condutoresMock.push({
        id: newId,
        transportadoraId: transportadoraIdCondutor,
        nomeCompleto: v.nomeCompleto,
        cpf: v.cpf,
        celular: v.celular,
        email: v.email,
        cnh: v.cnh,
        categoriaCnh: v.categoriaCnh,
        vencimentoCnh: v.vencimentoCnh,
        ativo: v.ativo
      });
    }
    this.showCondutorForm = false;
    this.cdr.markForCheck();
  }

  editarCondutor(c: CondutorMock): void {
    this.condutorEditId = c.id;
    this.condutorForm.patchValue({
      id: c.id,
      transportadoraId: c.transportadoraId ?? null,
      nomeCompleto: c.nomeCompleto,
      cpf: c.cpf,
      celular: c.celular,
      email: c.email,
      cnh: c.cnh,
      categoriaCnh: c.categoriaCnh,
      vencimentoCnh: c.vencimentoCnh,
      ativo: c.ativo
    });
    this.ensureTransportadoraListForFrota();
    this.showCondutorForm = true;
    this.cdr.markForCheck();
  }

  formatCpfCondutor(cpf: string): string {
    const d = (cpf ?? '').replace(/\D/g, '');
    return d.length === 11 ? formatCpf(d) : cpf ?? '';
  }

  private usarDadosDemo(): boolean {
    return !environment.production;
  }

  private isDemoId(id: number | null | undefined): boolean {
    return typeof id === 'number' && id < 0;
  }

  private aplicarTransportadorasDemo(): void {
    this.transportadoraList = this.transportadorasDemo.map((item) => ({
      id: item.id ?? 0,
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia,
      cnpj: item.cnpj,
      email: item.email,
      ativo: item.ativo
    }));
    this.totalCount = this.transportadoraList.length;
    this.loadingList = false;
    this.erroList = null;
    this.cdr.markForCheck();
  }

  private aplicarVeiculosDemoPreview(): void {
    this.veiculos = this.veiculosDemo.map((item) => this.mapVeiculoDemoToListItem(item));
    this.loadingVeiculos = false;
    this.cdr.markForCheck();
  }

  private mapVeiculoDemoToListItem(item: VeiculoDemoItem): VeiculoListItemDTO {
    const { quantidadeEixos, tipoPeso, condutorId, veiculoModeloId, ...listItem } = item;
    return { ...listItem };
  }

  private salvarTransportadoraDemo(dto: TransportadoraDTO): void {
    const idx = this.transportadorasDemo.findIndex((item) => item.id === dto.id);
    if (idx >= 0) {
      this.transportadorasDemo[idx] = {
        ...this.transportadorasDemo[idx],
        ...dto
      };
    }
    this.transportadoraId = dto.id ?? null;
    this.voltarLista();
    this.cdr.markForCheck();
  }

  private salvarVeiculoDemo(v: Record<string, unknown>, transportadoraId: number): void {
    const marcaModeloStr = [v['marca'], v['modelo']].filter(Boolean).join(' ').trim() || String(v['marcaModelo'] ?? '');
    const novoOuEditado: VeiculoDemoItem = {
      id: typeof v['id'] === 'number' ? (v['id'] as number) : this.getProximoIdDemoVeiculo(),
      transportadoraId,
      placa: String(v['placa'] ?? ''),
      condutorId: typeof v['condutorId'] === 'number' ? (v['condutorId'] as number) : null,
      veiculoModeloId: typeof v['veiculoModeloId'] === 'number' ? (v['veiculoModeloId'] as number) : null,
      marcaModelo: marcaModeloStr,
      cor: v['cor'] ? String(v['cor']) : undefined,
      anoFabricacao: typeof v['anoFabricacao'] === 'number' ? (v['anoFabricacao'] as number) : undefined,
      anoModelo: typeof v['anoModelo'] === 'number' ? (v['anoModelo'] as number) : undefined,
      tipoVeiculo: v['tipoVeiculo'] ? String(v['tipoVeiculo']) : undefined,
      centroCusto: v['centroCusto'] ? String(v['centroCusto']) : undefined,
      quantidadeEixos: v['quantidadeEixos'] ? String(v['quantidadeEixos']) : '',
      tipoPeso: v['tipoPeso'] ? String(v['tipoPeso']) : '',
      ativo: Boolean(v['ativo'])
    };

    const idx = this.veiculosDemo.findIndex((item) => item.id === novoOuEditado.id);
    if (idx >= 0) {
      this.veiculosDemo[idx] = novoOuEditado;
    } else {
      this.veiculosDemo = [novoOuEditado, ...this.veiculosDemo];
    }

    this.salvandoVeiculo = false;
    this.showVeiculoForm = false;
    this.carregarVeiculos();
    this.cdr.markForCheck();
  }

  private getProximoIdDemoVeiculo(): number {
    return Math.min(0, ...this.veiculosDemo.map((item) => item.id)) - 1;
  }

  // ---------- Aba Importação ----------
  onFileClientes(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileClientes = input.files?.[0] ?? null;
  }
  onFilePlacas(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filePlacas = input.files?.[0] ?? null;
  }
  onFileCondutores(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileCondutores = input.files?.[0] ?? null;
  }

  importarClientes(): void {
    // TODO: chamar endpoint de importação quando disponível
    alert('Importação de clientes: integrar com backend quando o endpoint estiver disponível.');
  }
  importarPlacas(): void {
    alert('Importação de placas: integrar com backend quando o endpoint estiver disponível.');
  }
  importarCondutores(): void {
    if (!this.fileCondutores || this.transportadoraId == null) return;
    // TODO: integrar com backend quando o endpoint estiver disponível.
    alert('Importação de condutores: integrar com backend quando o endpoint estiver disponível.');
    this.fecharImportarCondutores();
  }

  downloadModeloClientes(): void {
    // Placeholder: gerar ou baixar modelo Excel
    window.open('#', '_blank');
  }
  downloadModeloPlacas(): void {
    window.open('#', '_blank');
  }
  downloadModeloCondutores(): void {
    window.open('#', '_blank');
  }
}
