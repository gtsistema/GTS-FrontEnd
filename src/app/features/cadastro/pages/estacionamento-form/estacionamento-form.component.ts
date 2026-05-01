import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { EstacionamentoFotosService, type FotoItem } from '../../services/estacionamento-fotos.service';
import { ViacepService } from '../../services/viacep.service';
import { EstacionamentoFormStepService } from '../../services/estacionamento-form-step.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import { documentoValidator } from '../../validators/documento.validator';
import { TipoPessoa } from '../../models/estacionamento.dto';
import { CnpjFormatDirective, formatCnpj } from '../../directives/cnpj-format.directive';
import { CpfFormatDirective, formatCpf } from '../../directives/cpf-format.directive';
import { TelefoneFormatDirective, formatTelefone } from '../../directives/telefone-format.directive';
import { formValueToEstacionamentoPayload } from './estacionamento-form.mapper';
import { BANCOS_BRASIL, bancoToOption } from '../../data/bancos-brasil';
import { CnpjFormValue } from '../../models/brasilapi-cnpj.model';
import { CnpjLookupResult, CnpjService } from '../../services/cnpj.service';

const MAX_FOTOS = 4;
const MAX_CONTATOS_COMPLEMENTARES = 5;

@Component({
  selector: 'app-Estacionamento-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CnpjFormatDirective,
    CpfFormatDirective,
    TelefoneFormatDirective
  ],
  templateUrl: './estacionamento-form.component.html',
  styleUrls: ['./estacionamento-form.component.scss']
})
export class EstacionamentoFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  id: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  /** Accordion "Dados complementares": inicia fechado. */
  complementaresOpen = false;
  /** Accordion "Contatos (Responsável legal e complementares)": inicia fechado. */
  contatosOpen = false;
  /** PDF do contrato anexado (não enviado na API atual; preparado para integração futura). */
  contratoPdf: File | null = null;
  contratoPdfError: string | null = null;
  /** Endereços retornados por ObterPorId; preservados no payload ao alterar. */
  loadedEnderecos: Record<string, unknown>[] = [];
  /** Fotos do backend (listar/upload/deletar via API Azure). Máximo 4. */
  fotoItems: FotoItem[] = [];
  fotoError: string | null = null;
  /** Loading da listagem de fotos (BuscarFotos). */
  fotoLoading = false;
  /** Loading do upload (UploadFotos). */
  fotoUploading = false;
  /** Loading da remoção (DeletarFotos). */
  fotoDeleting = false;
  /** URL da foto em exibição ampliada (lightbox). */
  fotoAmpliadaUrl: string | null = null;
  /** True quando o usuário arrasta arquivos sobre a zona de drop. */
  fotoDragOver = false;
  /** True se o backend não expõe endpoint para definir foto principal após envio (apenas PadraoIndex no upload). */
  readonly endpointPrincipalFalta = true;

  /** Consulta de CNPJ unificada (via `CnpjService`) com tratamento de timeout/erros por status. */
  cnpjLoading = false;
  cnpjError: string | null = null;
  cnpjSuccess: string | null = null;
  private ultimoCnpjConsultado = '';

  private stepService = inject(EstacionamentoFormStepService);
  private destroyRef = inject(DestroyRef);
  private cnpjService = inject(CnpjService);
  private titularSyncSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private EstacionamentoService: EstacionamentoService,
    private fotosService: EstacionamentoFotosService,
    private viacep: ViacepService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  get isTaxa(): boolean {
    return this.form.get('tipoTaxaMensalidade')?.value === 'taxa';
  }

  get isMensalidade(): boolean {
    return this.form.get('tipoTaxaMensalidade')?.value === 'mensalidade';
  }

  get isNovo(): boolean {
    return this.id == null;
  }

  get currentStep(): 1 | 2 | 3 {
    return this.stepService.currentStep();
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? +idParam : null;
    this.criarFormulario();
    if (this.id) {
      this.stepService.reset(); // edição: tudo na mesma tela, step 1 para estado consistente
      this.carregar();
    } else {
      this.stepService.reset();
      this.atualizarValidadoresDocumento();
    }
  }

  ngOnDestroy(): void {
    this.titularSyncSub?.unsubscribe();
    this.fotoItems.forEach((item) => {
      if (item.file && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
    });
    this.fotoItems = [];
  }

  private criarFormulario(): void {
    this.form = this.fb.group({
      id: [0],
      descricao: ['', [Validators.required, Validators.minLength(2)]],
      pessoaId: [0],
      pessoa: this.fb.group({
        id: [0],
        tipoPessoa: [2 as TipoPessoa, Validators.required], // apenas PJ
        nomeRazaoSocial: ['', [Validators.required, Validators.minLength(2)]],
        nomeFantasia: [''],
        documento: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        ativo: [true]
      }),
      // Dados complementares: Estrutura, Valores, Localização
      capacidadeVeiculos: [null as number | null, [Validators.min(0)]],
      tamanho: [null as number | null, [Validators.min(0)]],
      possuiSeguranca: [false],
      possuiBanheiro: [false],
      tipoTaxaMensalidade: [null as 'taxa' | 'mensalidade' | null],
      taxaPercentual: [{ value: null as number | null, disabled: true }, [Validators.min(0), Validators.max(100)]],
      mensalidadeValor: [{ value: null as number | null, disabled: true }, [Validators.min(0)]],
      latitude: [null as number | null],
      longitude: [null as number | null],
      // Endereços (lista para o backend)
      enderecos: this.fb.array([]),
      // Contatos (accordion): responsável legal + até 5 contatos complementares (FormArray)
      responsavelLegalNome: [''],
      responsavelLegalCpf: [''],
      responsavelLegalEmail: ['', [Validators.email]],
      contatoTelefone: [''],
      contatosComplementares: this.fb.array([]),
      contrato: [''],
      // Dados bancários (passo 2 - novo cadastro): agência e conta com número + dígito
      banco: [''],
      agenciaNumero: [''],
      agenciaDigito: [''],
      contaNumero: [''],
      contaDigito: [''],
      tipoConta: ['' as 'corrente' | 'poupanca' | ''],
      chavePix: [''],
      contaBancariaId: [null as number | null],
      titularMesmoResponsavel: [true],
      titularRazaoSocial: [''],
      titularCnpj: ['']
    });
    this.setupTaxaMensalidadeToggle();
    this.setupTitularBancarioSync();
    this.setupCnpjBusca();
  }

  /**
   * Busca automática por CNPJ com debounce, distinct e cancelamento.
   * Mantém blur como reforço, sem botão dedicado.
   */
  private setupCnpjBusca(): void {
    const docControl = this.form.get('pessoa.documento');
    if (!docControl) return;
    docControl.valueChanges
      .pipe(
        map((v) => this.cnpjService.normalizeCnpj(v)),
        debounceTime(700),
        distinctUntilChanged(),
        filter((v) => v.length > 0),
        switchMap((v) => {
          this.cnpjLoading = true;
          this.cnpjError = null;
          this.cnpjSuccess = null;
          this.cdr.markForCheck();
          return this.cnpjService.consultarCnpj(v);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => {
          this.cnpjLoading = false;
          this.handleConsultaCnpjResult(result);
          this.cdr.markForCheck();
        },
        error: () => {
          this.cnpjLoading = false;
          this.cnpjError = 'Não foi possível consultar os dados do CNPJ no momento.';
          this.cnpjSuccess = null;
          this.cdr.markForCheck();
        }
      });
  }

  /** Dispara busca ao sair do CNPJ (evita depender só do debounce). */
  onDocumentoCnpjBlur(): void {
    const docControl = this.form.get('pessoa.documento');
    docControl?.markAsTouched();
    const cnpj = docControl?.value ?? '';
    const normalized = this.cnpjService.normalizeCnpj(cnpj);
    if (this.cnpjLoading || !normalized) return;
    if (normalized === this.ultimoCnpjConsultado && !this.cnpjError) return;
    this.cnpjLoading = true;
    this.cnpjError = null;
    this.cnpjSuccess = null;
    this.cdr.markForCheck();
    this.cnpjService.consultarCnpj(normalized).subscribe({
      next: (result) => {
        this.cnpjLoading = false;
        this.handleConsultaCnpjResult(result);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cnpjLoading = false;
        this.cnpjError = 'Não foi possível consultar os dados do CNPJ no momento.';
        this.cnpjSuccess = null;
        this.cdr.markForCheck();
      }
    });
  }

  private handleConsultaCnpjResult(result: CnpjLookupResult): void {
    this.ultimoCnpjConsultado = result.normalizedCnpj;
    this.cnpjError = null;
    this.cnpjSuccess = null;

    if (result.status === 'success' && result.data) {
      this.applyCnpjBrasilApiToForm(result.data);
      this.cnpjSuccess = result.message;
      return;
    }

    if (result.status !== 'incomplete') {
      this.cnpjError = result.message;
      return;
    }

    if (this.form.get('pessoa.documento')?.touched) {
      this.cnpjError = result.message;
    }
  }

  private applyCnpjBrasilApiToForm(value: CnpjFormValue): void {
    const isEmpty = (v: unknown) => v == null || String(v).trim() === '';
    const pessoa = this.form.get('pessoa');
    if (!pessoa) return;

    if (value.razaoSocial && isEmpty(pessoa.get('nomeRazaoSocial')?.value)) {
      pessoa.get('nomeRazaoSocial')?.setValue(value.razaoSocial, { emitEvent: false });
    }
    if (value.nomeFantasia && isEmpty(pessoa.get('nomeFantasia')?.value)) {
      pessoa.get('nomeFantasia')?.setValue(value.nomeFantasia, { emitEvent: false });
    }
    const ativoControl = pessoa.get('ativo');
    if (ativoControl?.pristine) {
      ativoControl.setValue(value.ativo, { emitEvent: false });
    }
    if (value.email?.trim() && isEmpty(pessoa.get('email')?.value)) {
      pessoa.get('email')?.setValue(value.email.trim(), { emitEvent: false });
    }
    const telDigits = (value.telefone ?? '').replace(/\D/g, '');
    if (telDigits.length >= 10 && isEmpty(this.form.get('contatoTelefone')?.value)) {
      this.form.get('contatoTelefone')?.setValue(formatTelefone(telDigits), { emitEvent: false });
    }

    const desc = this.form.get('descricao');
    if (desc && isEmpty(desc.value)) {
      const nome =
        (value.nomeFantasia && value.nomeFantasia.trim()) ||
        (value.razaoSocial && value.razaoSocial.trim()) ||
        '';
      if (nome) {
        desc.setValue(nome, { emitEvent: false });
      }
    }

    if (value.endereco) {
      const arr = this.enderecosArray;
      const patchEndereco = (end: FormGroup) => {
        const e = value.endereco!;
        if (e.logradouro && isEmpty(end.get('logradouro')?.value)) {
          end.get('logradouro')?.setValue(e.logradouro, { emitEvent: false });
        }
        if (e.numero && isEmpty(end.get('numero')?.value)) {
          end.get('numero')?.setValue(e.numero, { emitEvent: false });
        }
        if (e.complemento && isEmpty(end.get('complemento')?.value)) {
          end.get('complemento')?.setValue(e.complemento, { emitEvent: false });
        }
        if (e.bairro && isEmpty(end.get('bairro')?.value)) {
          end.get('bairro')?.setValue(e.bairro, { emitEvent: false });
        }
        if (e.cidade && isEmpty(end.get('cidade')?.value)) {
          end.get('cidade')?.setValue(e.cidade, { emitEvent: false });
        }
        if (e.estado && isEmpty(end.get('estado')?.value)) {
          end.get('estado')?.setValue(e.estado, { emitEvent: false });
        }
        if (e.cep && isEmpty(end.get('cep')?.value)) {
          end.get('cep')?.setValue(e.cep, { emitEvent: false });
        }
      };

      if (arr.length === 0) {
        arr.push(
          this.criarGrupoEndereco({
            principal: true,
            tipoEndereco: 1,
            cep: value.endereco.cep ?? '',
            logradouro: value.endereco.logradouro ?? '',
            numero: value.endereco.numero ?? '',
            complemento: value.endereco.complemento ?? '',
            bairro: value.endereco.bairro ?? '',
            cidade: value.endereco.cidade ?? '',
            estado: value.endereco.estado ?? ''
          })
        );
      } else {
        patchEndereco(arr.at(0) as FormGroup);
      }
      this.complementaresOpen = true;
    }

    if (this.form.get('titularMesmoResponsavel')?.value === true) {
      this.syncTitularFromPessoa();
    }
  }

  /** Habilita/desabilita campos Taxa e Mensalidade conforme o radio selecionado. */
  private setupTaxaMensalidadeToggle(): void {
    const tipo = this.form.get('tipoTaxaMensalidade');
    const taxa = this.form.get('taxaPercentual');
    const mensalidade = this.form.get('mensalidadeValor');
    tipo?.valueChanges.subscribe((v: 'taxa' | 'mensalidade' | null) => {
      if (v === 'taxa') {
        taxa?.enable();
        mensalidade?.disable();
        mensalidade?.setValue(null);
      } else if (v === 'mensalidade') {
        taxa?.disable();
        taxa?.setValue(null);
        mensalidade?.enable();
      } else {
        taxa?.disable();
        mensalidade?.disable();
        taxa?.setValue(null);
        mensalidade?.setValue(null);
      }
    });
  }

  /** Sincroniza titular bancário com Pessoa (responsável) quando titularMesmoResponsavel é true. */
  private setupTitularBancarioSync(): void {
    const pessoa = this.form.get('pessoa');
    const razao = pessoa?.get('nomeRazaoSocial');
    const doc = pessoa?.get('documento');
    const titularMesmo = this.form.get('titularMesmoResponsavel');
    if (!razao || !doc || !titularMesmo) return;
    const sub = new Subscription();
    sub.add(
      combineLatest([
        razao.valueChanges.pipe(startWith(razao.value)),
        doc.valueChanges.pipe(startWith(doc.value)),
        titularMesmo.valueChanges.pipe(startWith(titularMesmo.value))
      ]).subscribe(() => {
        if (this.form.get('titularMesmoResponsavel')?.value === true) {
          this.syncTitularFromPessoa();
        }
      })
    );
    sub.add(
      titularMesmo.valueChanges.pipe(startWith(titularMesmo.value)).subscribe((usaPadrao: boolean) => {
        this.atualizarValidadoresTitular(!!usaPadrao);
      })
    );
    this.titularSyncSub = sub;
    this.syncTitularFromPessoa();
    this.atualizarValidadoresTitular(titularMesmo.value);
  }

  private syncTitularFromPessoa(): void {
    const pessoa = this.form.get('pessoa');
    const razao = pessoa?.get('nomeRazaoSocial')?.value ?? '';
    const doc = pessoa?.get('documento')?.value ?? '';
    this.form.patchValue({
      titularRazaoSocial: razao,
      titularCnpj: doc
    }, { emitEvent: false });
  }

  private atualizarValidadoresTitular(usaTitularPadrao: boolean): void {
    const razao = this.form.get('titularRazaoSocial');
    const cnpj = this.form.get('titularCnpj');
    if (!razao || !cnpj) return;
    razao.clearValidators();
    cnpj.clearValidators();
    if (!usaTitularPadrao) {
      razao.addValidators([Validators.required, Validators.minLength(2)]);
      cnpj.addValidators([Validators.required, documentoValidator(2 as TipoPessoa)]);
    }
    razao.updateValueAndValidity();
    cnpj.updateValueAndValidity();
  }

  /** Usuário clicou em "Titular diferente?" — revela bloco e permite editar titular. */
  abrirTitularDiferente(): void {
    this.form.patchValue({ titularMesmoResponsavel: false });
    this.atualizarValidadoresTitular(false);
  }

  /** Volta a usar o titular do responsável (Pessoa). */
  usarTitularDoResponsavel(): void {
    this.form.patchValue({ titularMesmoResponsavel: true });
    this.syncTitularFromPessoa();
    this.atualizarValidadoresTitular(true);
  }

  get titularMesmoResponsavel(): boolean {
    return this.form.get('titularMesmoResponsavel')?.value === true;
  }

  /** CNPJ do titular formatado para exibição no resumo. */
  get titularCnpjFormatted(): string {
    const raw = this.form.get('titularCnpj')?.value ?? '';
    const digits = String(raw).replace(/\D/g, '');
    return digits.length === 14 ? formatCnpj(digits) : raw;
  }

  private atualizarValidadoresDocumento(): void {
    const doc = this.form.get('pessoa.documento');
    doc?.clearValidators();
    doc?.addValidators([Validators.required, documentoValidator(2 as TipoPessoa)]); // CNPJ
    doc?.updateValueAndValidity();
  }

  private carregar(): void {
    if (this.id == null) return;
    this.loading = true;
    this.erro = null;
    this.EstacionamentoService.obterPorId(this.id).subscribe({
      next: (dto) => {
        this.ngZone.run(() => {
          if (dto) {
            this.loadedEnderecos = (dto.enderecos ?? []).map((e) => ({ ...e })) as Record<string, unknown>[];
            this.preencherEnderecosDoDto((dto.enderecos ?? []) as unknown as Record<string, unknown>[]);
            const trim = (s: string | null | undefined) => (s == null ? '' : String(s).trim());
            const cpfRaw = (dto.responsavelLegalCpf ?? '').replace(/\D/g, '');
            const telRaw = (dto.contatoTelefone ?? '').replace(/\D/g, '');
            const tamanhoNum = dto.tamanho != null && dto.tamanho !== '' ? Number(dto.tamanho) : null;
            this.form.patchValue({
              id: dto.id,
              descricao: trim(dto.descricao),
              pessoaId: dto.pessoaId,
              responsavelLegalNome: dto.responsavelLegalNome,
              responsavelLegalCpf: cpfRaw.length === 11 ? formatCpf(cpfRaw) : trim(dto.responsavelLegalCpf),
              responsavelLegalEmail: trim(dto.responsavelLegalEmail ?? ''),
              contatoTelefone: telRaw.length >= 10 ? formatTelefone(telRaw) : trim(dto.contatoTelefone),
              capacidadeVeiculos: dto.capacidadeVeiculos,
              tamanho: tamanhoNum,
              possuiSeguranca: dto.possuiSeguranca,
              possuiBanheiro: dto.possuiBanheiro,
              tipoTaxaMensalidade: dto.tipoTaxaMensalidade,
              taxaPercentual: dto.taxaPercentual,
              mensalidadeValor: dto.mensalidadeValor,
              latitude: dto.latitude ?? null,
              longitude: dto.longitude ?? null,
              banco: trim(dto.banco),
              ...this.parseAgenciaContaDoDto(trim(dto.agencia ?? ''), trim(dto.conta ?? '')),
              tipoConta: trim(dto.tipoConta),
              chavePix: trim(dto.chavePix),
              contaBancariaId: dto.contaBancariaId ?? null,
              titularRazaoSocial: trim(dto.titularRazaoSocial ?? ''),
              titularCnpj: trim(dto.titularCnpj ?? '')
            });
            // Sincronizar estado dos combos com os dados carregados (exibição ao editar)
            this.bancoFiltro = this.form.get('banco')?.value ?? '';
            const tipoContaVal = this.form.get('tipoConta')?.value ?? '';
            const tipoContaOp = this.tipoContaOpcoes.find((o) => o.value === tipoContaVal);
            this.tipoContaFiltro = tipoContaOp ? tipoContaOp.label : '';
            if (this.form.get('titularMesmoResponsavel')?.value === true) {
              this.syncTitularFromPessoa();
            }
            this.fotoItems = [];
            this.carregarFotos();
            this.form.get('pessoa')?.patchValue({
              id: dto.pessoa.id,
              tipoPessoa: dto.pessoa.tipoPessoa ?? 2,
              nomeRazaoSocial: trim(dto.pessoa.nomeRazaoSocial),
              nomeFantasia: trim(dto.pessoa.nomeFantasia),
              email: trim(dto.pessoa.email),
              ativo: dto.pessoa.ativo ?? true,
              documento: (dto.pessoa.documento ?? '').replace(/\s/g, '')
            });
            const titularDto = trim(dto.titularRazaoSocial ?? '');
            const titularCnpjDto = trim(dto.titularCnpj ?? '');
            const pessoaRazao = trim(dto.pessoa.nomeRazaoSocial ?? '');
            const pessoaCnpj = String(dto.pessoa.documento ?? '').replace(/\D/g, '');
            const titularCnpjDigits = titularCnpjDto.replace(/\D/g, '');
            const titularDiferente = Boolean(
              titularDto &&
              ((titularDto.toLowerCase() !== pessoaRazao.toLowerCase()) || (titularCnpjDigits && titularCnpjDigits !== pessoaCnpj))
            );
            if (titularDiferente) {
              this.form.patchValue({ titularMesmoResponsavel: false }, { emitEvent: false });
              this.atualizarValidadoresTitular(false);
            } else {
              this.form.patchValue({ titularMesmoResponsavel: true }, { emitEvent: false });
              this.syncTitularFromPessoa();
              this.atualizarValidadoresTitular(true);
            }
            const doc = this.form.get('pessoa.documento')?.value;
            if (doc != null && String(doc).replace(/\D/g, '').length === 14) {
              this.form.get('pessoa')?.patchValue({ documento: formatCnpj(String(doc)) });
            }
            this.atualizarValidadoresDocumento();
            if (dto.capacidadeVeiculos != null || dto.tamanho || dto.tipoTaxaMensalidade ||
                dto.possuiSeguranca || dto.possuiBanheiro || dto.latitude != null || dto.longitude != null) {
              this.complementaresOpen = true;
            }
            this.preencherContatosComplementaresDoDto(dto);
            const hasContato = dto.responsavelLegalNome || dto.responsavelLegalCpf || dto.contatoTelefone ||
              dto.responsavelLegalEmail || (this.contatosComplementaresArray.length > 0);
            if (hasContato) {
              this.contatosOpen = true;
            }
            if (this.form.invalid) {
              this.form.markAllAsTouched();
            }
          } else {
            this.erro = 'Registro não encontrado.';
          }
          this.loading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.erro = 'Erro ao carregar os dados.';
          this.loading = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  /**
   * Salva o Estacionamento (gravar ou alterar conforme id).
   * @param stayOnPage se true, não navega para a lista; atualiza id/rota quando for criação (para Fotos usarem o id do backend).
   */
  onSubmit(stayOnPage = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (stayOnPage) {
        this.toast.warning('Preencha os dados obrigatórios do cadastro antes de adicionar fotos.');
      }
      return;
    }
    this.salvando = true;
    this.erro = null;
    // Fotos são gerenciadas apenas pelos endpoints BuscarFotos / UploadFotos / DeletarFotos (Azure); não enviamos no payload Gravar/Alterar.
    const dto = formValueToEstacionamentoPayload(this.form.value, this.loadedEnderecos, []);
    const request$ = this.id
        ? this.EstacionamentoService.alterar(dto)
        : this.EstacionamentoService.gravar(dto);
      request$.subscribe({
        next: (res) => {
          this.salvando = false;
          if (stayOnPage) {
            if (this.id == null && res?.id != null) {
              this.id = res.id;
              this.form.patchValue({ id: res.id }, { emitEvent: false });
              this.router.navigate(['/app/cadastro/estacionamento', res.id], { replaceUrl: true });
            }
            this.toast.success(this.id ? 'Alterações salvas.' : 'Cadastro salvo.');
          } else {
            this.toast.success(this.id ? 'Estacionamento atualizado com sucesso.' : 'Estacionamento criado com sucesso.');
            this.router.navigate(['/app/cadastro/estacionamento']);
          }
        },
        error: () => {
          this.erro = 'Erro ao salvar. Tente novamente.';
          this.salvando = false;
        }
      });
  }

  /**
   * Carrega fotos do backend (GET BuscarFotos). Chamado após obterPorId e após upload/delete.
   */
  carregarFotos(): void {
    if (this.id == null || !Number.isFinite(this.id)) return;
    this.fotoLoading = true;
    this.fotoError = null;
    this.fotosService.buscarFotos(this.id).subscribe({
      next: (items) => {
        this.ngZone.run(() => {
          this.fotoItems = items;
          this.fotoLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.fotoError = 'Erro ao carregar fotos.';
          this.fotoLoading = false;
          this.toast.show('Erro ao carregar fotos.', 'error');
          this.cdr.markForCheck();
        });
      }
    });
  }

  cancelar(): void {
    this.stepService.reset();
    this.router.navigate(['/app/cadastro/estacionamento']);
  }

  proximoStep(): void {
    this.stepService.nextStep();
  }

  stepAnterior(): void {
    this.stepService.previousStep();
  }

  onFotoChange(event: Event): void {
    this.fotoError = null;
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    const files = fileList ? Array.from(fileList) : [];
    input.value = '';
    if (!files.length) return;
    this.uploadarArquivosFotos(files);
  }

  onFotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fotoDragOver = false;
    this.fotoError = null;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    this.uploadarArquivosFotos(Array.from(files));
  }

  onFotoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.fotoItems.length < MAX_FOTOS) this.fotoDragOver = true;
  }

  onFotoDragLeave(): void {
    this.fotoDragOver = false;
  }

  /**
   * Upload de fotos via API UploadFotos (Azure). Valida quantidade e tipo; após sucesso recarrega a lista.
   */
  private uploadarArquivosFotos(files: File[]): void {
    if (this.id == null || !Number.isFinite(this.id)) {
      this.toast.warning('Salve o cadastro antes de adicionar fotos.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxMb = 5;
    const valid: File[] = [];
    for (const file of files) {
      if (this.fotoItems.length + valid.length >= MAX_FOTOS) {
        this.fotoError = `Máximo ${MAX_FOTOS} fotos. As demais foram ignoradas.`;
        break;
      }
      if (!allowed.includes(file.type)) {
        this.fotoError = 'Use apenas JPEG, PNG ou WebP.';
        continue;
      }
      if (file.size > maxMb * 1024 * 1024) {
        this.fotoError = `Cada foto no máximo ${maxMb} MB.`;
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;
    this.fotoError = null;
    this.fotoUploading = true;
    this.fotosService.uploadFotos(this.id, valid).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.fotoUploading = false;
          this.toast.success('Fotos enviadas.');
          this.cdr.markForCheck();
          // Pequeno delay para o backend persistir antes de listar
          setTimeout(() => this.carregarFotos(), 400);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.fotoUploading = false;
          this.fotoError = 'Erro ao enviar fotos. Tente novamente.';
          this.toast.show('Erro ao enviar fotos.', 'error');
          this.cdr.markForCheck();
        });
      }
    });
  }

  removerFoto(index: number): void {
    const item = this.fotoItems[index];
    if (!item) return;
    if (item.file && item.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.url);
      this.fotoItems.splice(index, 1);
      this.fotoError = null;
      this.cdr.markForCheck();
      return;
    }
    if (item.id == null || !Number.isFinite(item.id)) {
      this.toast.warning('Esta foto não pode ser removida pelo backend (sem id).');
      return;
    }
    if (!confirm('Remover esta foto?')) return;
    this.fotoDeleting = true;
    this.fotosService.deletarFoto(item.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.fotoDeleting = false;
          this.toast.success('Foto removida.');
          this.carregarFotos();
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.fotoDeleting = false;
          this.toast.show('Erro ao remover foto.', 'error');
          this.cdr.markForCheck();
        });
      }
    });
  }

  /** Marca a foto no índice como principal. Não existe endpoint no backend para alterar principal em fotos já salvas; apenas PadraoIndex no upload. */
  definirFotoPrincipal(index: number): void {
    this.toast.show('Definir como principal não possui endpoint no backend. A ordem principal pode ser enviada no upload (PadraoIndex).', 'info');
  }

  abrirFotoAmpliada(url: string): void {
    this.fotoAmpliadaUrl = url;
  }

  fecharFotoAmpliada(): void {
    this.fotoAmpliadaUrl = null;
  }

  get maxFotos(): number {
    return MAX_FOTOS;
  }

  readonly maxContatosComplementares = MAX_CONTATOS_COMPLEMENTARES;

  get enderecosArray(): FormArray {
    return this.form.get('enderecos') as FormArray;
  }

  private criarGrupoEndereco(valor?: Record<string, unknown>): FormGroup {
    const v = valor ?? {};
    return this.fb.group({
      principal: [v['principal'] ?? false],
      tipoEndereco: [v['tipoEndereco'] ?? 1],
      cep: [v['cep'] ?? ''],
      logradouro: [v['logradouro'] ?? ''],
      numero: [v['numero'] ?? ''],
      complemento: [v['complemento'] ?? ''],
      bairro: [v['bairro'] ?? ''],
      cidade: [v['cidade'] ?? ''],
      estado: [v['estado'] ?? '']
    });
  }

  adicionarEndereco(): void {
    this.enderecosArray.push(this.criarGrupoEndereco());
  }

  removerEndereco(index: number): void {
    this.enderecosArray.removeAt(index);
  }

  /** Busca endereço pelo CEP (ViaCEP) e preenche logradouro, bairro, cidade, estado no bloco. */
  onCepBlur(index: number): void {
    const group = this.enderecosArray.at(index) as FormGroup;
    const cep = group.get('cep')?.value ?? '';
    if ((cep ?? '').replace(/\D/g, '').length !== 8) return;
    this.viacep.buscarPorCep(cep).subscribe((endereco) => {
      if (endereco) {
        group.patchValue({
          logradouro: endereco.logradouro,
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado
        });
      } else {
        this.toast.warning('CEP não encontrado.');
      }
    });
  }

  /** Preenche o FormArray de endereços a partir do DTO (edição). */
  private preencherEnderecosDoDto(lista: Record<string, unknown>[]): void {
    const arr = this.enderecosArray;
    while (arr.length) arr.removeAt(0);
    lista.forEach((e) => arr.push(this.criarGrupoEndereco(e)));
  }

  readonly bancosBrasil = BANCOS_BRASIL;
  readonly bancoToOption = bancoToOption;
  /** Texto para filtrar a lista de bancos no combobox. */
  bancoFiltro = '';
  bancoDropdownOpen = false;

  get bancosFiltrados(): typeof BANCOS_BRASIL {
    const t = (this.bancoFiltro ?? '').trim().toLowerCase();
    if (!t) return this.bancosBrasil;
    return this.bancosBrasil.filter(
      (b) =>
        b.codigo.toLowerCase().includes(t) ||
        b.nome.toLowerCase().includes(t) ||
        bancoToOption(b).toLowerCase().includes(t)
    );
  }

  get bancoDisplay(): string {
    return this.bancoDropdownOpen ? this.bancoFiltro : (this.form.get('banco')?.value ?? '');
  }

  onBancoFocus(): void {
    this.bancoDropdownOpen = true;
    this.bancoFiltro = this.form.get('banco')?.value ?? '';
  }

  toggleBancoDropdown(event: Event): void {
    event.preventDefault();
    this.bancoDropdownOpen = !this.bancoDropdownOpen;
  }

  onBancoInput(event: Event): void {
    this.bancoFiltro = (event.target as HTMLInputElement).value;
    this.bancoDropdownOpen = true;
  }

  onBancoBlur(): void {
    setTimeout(() => {
      this.bancoDropdownOpen = false;
      this.bancoFiltro = this.form.get('banco')?.value ?? '';
    }, 200);
  }

  selecionarBanco(option: string): void {
    this.form.patchValue({ banco: option });
    this.bancoFiltro = option;
    this.bancoDropdownOpen = false;
  }

  // --- Tipo de conta (combobox) ---
  readonly tipoContaOpcoes: { value: 'corrente' | 'poupanca'; label: string }[] = [
    { value: 'corrente', label: 'Corrente' },
    { value: 'poupanca', label: 'Poupança' }
  ];
  tipoContaDropdownOpen = false;
  tipoContaFiltro = '';

  get tipoContaFiltrados(): { value: 'corrente' | 'poupanca'; label: string }[] {
    const t = (this.tipoContaFiltro ?? '').trim().toLowerCase();
    if (!t) return this.tipoContaOpcoes;
    return this.tipoContaOpcoes.filter((o) => o.label.toLowerCase().includes(t));
  }

  get tipoContaDisplay(): string {
    if (this.tipoContaDropdownOpen) return this.tipoContaFiltro;
    const val = this.form.get('tipoConta')?.value ?? '';
    const op = this.tipoContaOpcoes.find((o) => o.value === val);
    return op ? op.label : '';
  }

  onTipoContaFocus(): void {
    this.tipoContaDropdownOpen = true;
    const val = this.form.get('tipoConta')?.value ?? '';
    const op = this.tipoContaOpcoes.find((o) => o.value === val);
    this.tipoContaFiltro = op ? op.label : '';
  }

  onTipoContaInput(event: Event): void {
    this.tipoContaFiltro = (event.target as HTMLInputElement).value;
    this.tipoContaDropdownOpen = true;
  }

  onTipoContaBlur(): void {
    setTimeout(() => {
      this.tipoContaDropdownOpen = false;
      const val = this.form.get('tipoConta')?.value ?? '';
      const op = this.tipoContaOpcoes.find((o) => o.value === val);
      this.tipoContaFiltro = op ? op.label : '';
    }, 200);
  }

  toggleTipoContaDropdown(event: Event): void {
    event.preventDefault();
    this.tipoContaDropdownOpen = !this.tipoContaDropdownOpen;
  }

  selecionarTipoConta(value: 'corrente' | 'poupanca'): void {
    this.form.patchValue({ tipoConta: value });
    const op = this.tipoContaOpcoes.find((o) => o.value === value);
    this.tipoContaFiltro = op ? op.label : '';
    this.tipoContaDropdownOpen = false;
  }

  /**
   * Parse agência no formato "1216-0" ou "12160" (último char = dígito).
   * Retorna { numero, digito } para preencher os campos do form.
   */
  parseAgencia(valor: string): { numero: string; digito: string } {
    const v = (valor ?? '').trim();
    if (!v) return { numero: '', digito: '' };
    if (v.includes('-')) {
      const [numero, digito] = v.split('-');
      return { numero: (numero ?? '').replace(/\D/g, ''), digito: (digito ?? '').replace(/\D/g, '').slice(0, 1) };
    }
    const digits = v.replace(/\D/g, '');
    if (digits.length <= 1) return { numero: digits, digito: '' };
    return { numero: digits.slice(0, -1), digito: digits.slice(-1) };
  }

  /**
   * Parse conta no mesmo padrão: "12345-6" ou "123456" (último char = dígito).
   */
  parseConta(valor: string): { numero: string; digito: string } {
    const v = (valor ?? '').trim();
    if (!v) return { numero: '', digito: '' };
    if (v.includes('-')) {
      const [numero, digito] = v.split('-');
      return { numero: (numero ?? '').replace(/\D/g, ''), digito: (digito ?? '').replace(/\D/g, '').slice(0, 1) };
    }
    const digits = v.replace(/\D/g, '');
    if (digits.length <= 1) return { numero: digits, digito: '' };
    return { numero: digits.slice(0, -1), digito: digits.slice(-1) };
  }

  /** Preenche agenciaNumero, agenciaDigito, contaNumero, contaDigito a partir dos valores únicos do backend. */
  private parseAgenciaContaDoDto(agencia: string, conta: string): {
    agenciaNumero: string;
    agenciaDigito: string;
    contaNumero: string;
    contaDigito: string;
  } {
    const a = this.parseAgencia(agencia);
    const c = this.parseConta(conta);
    return {
      agenciaNumero: a.numero,
      agenciaDigito: a.digito,
      contaNumero: c.numero,
      contaDigito: c.digito
    };
  }

  /** Restringe o input a apenas dígitos (0-9). Dígito: 1 char. Chamar no (input). */
  apenasDigitosInput(controlName: 'agenciaNumero' | 'agenciaDigito' | 'contaNumero' | 'contaDigito', event: Event): void {
    const el = event.target as HTMLInputElement;
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    const maxLen = controlName === 'agenciaDigito' || controlName === 'contaDigito' ? 1 : 20;
    const next = (el.value ?? '').replace(/\D/g, '').slice(0, maxLen);
    if (next !== el.value) {
      ctrl.setValue(next, { emitEvent: false });
      el.value = next;
    }
  }

  toggleComplementares(): void {
    this.complementaresOpen = !this.complementaresOpen;
  }

  toggleContatos(): void {
    this.contatosOpen = !this.contatosOpen;
  }

  get contatosComplementaresArray(): FormArray {
    return this.form.get('contatosComplementares') as FormArray;
  }

  get podeAdicionarContatoComplementar(): boolean {
    return this.contatosComplementaresArray.length < MAX_CONTATOS_COMPLEMENTARES;
  }

  private criarGrupoContatoComplementar(valor?: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
  }): FormGroup {
    return this.fb.group({
      nome: [valor?.nome ?? ''],
      cpf: [valor?.cpf ?? ''],
      telefone: [valor?.telefone ?? ''],
      email: [valor?.email ?? '', [Validators.email]]
    });
  }

  adicionarContatoComplementar(): void {
    if (!this.podeAdicionarContatoComplementar) return;
    this.contatosComplementaresArray.push(this.criarGrupoContatoComplementar());
  }

  removerContatoComplementar(index: number): void {
    this.contatosComplementaresArray.removeAt(index);
  }

  /** Preenche o FormArray de contatos complementares a partir do DTO (edição). */
  private preencherContatosComplementaresDoDto(dto: import('../../services/estacionamento.service').EstacionamentoFormValue): void {
    const arr = this.contatosComplementaresArray;
    while (arr.length) arr.removeAt(0);
    const d = dto as unknown as Record<string, unknown>;
    const nome = d['contatoComplementarNome'] as string | undefined;
    const cpf = d['contatoComplementarCpf'] as string | undefined;
    const tel = d['contatoComplementarTelefone'] as string | undefined;
    const email = d['contatoComplementarEmail'] as string | undefined;
    const trim = (s: string | undefined) => (s == null ? '' : String(s).trim());
    if (nome || cpf || tel || email) {
      const telRaw = (tel ?? '').replace(/\D/g, '');
      arr.push(this.criarGrupoContatoComplementar({
        nome: trim(nome),
        cpf: telRaw.length === 11 ? formatCpf(telRaw) : trim(cpf),
        telefone: telRaw.length >= 10 ? formatTelefone(telRaw) : trim(tel),
        email: trim(email)
      }));
    }
    const complementares = d['contatosComplementares'] as Array<{ nome?: string; cpf?: string; telefone?: string; email?: string }> | undefined;
    if (Array.isArray(complementares)) {
      complementares.slice(0, MAX_CONTATOS_COMPLEMENTARES).forEach((c) => {
        if (arr.length >= MAX_CONTATOS_COMPLEMENTARES) return;
        arr.push(this.criarGrupoContatoComplementar(c));
      });
    }
  }

  onContratoPdfChange(event: Event): void {
    this.contratoPdfError = null;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.contratoPdfError = 'Apenas arquivos PDF são aceitos.';
      input.value = '';
      return;
    }
    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      this.contratoPdfError = `O arquivo deve ter no máximo ${maxMb} MB.`;
      input.value = '';
      return;
    }
    this.contratoPdf = file;
  }

  removerContratoPdf(): void {
    this.contratoPdf = null;
    this.contratoPdfError = null;
  }

  get documentoErrorMessage(): string | null {
    const errors = this.form.get('pessoa.documento')?.errors;
    if (!errors) return null;
    if (errors['required']) return 'Documento é obrigatório.';
    const doc = errors['documento'];
    return doc && typeof doc === 'object' && 'message' in doc ? String(doc.message) : null;
  }
}
