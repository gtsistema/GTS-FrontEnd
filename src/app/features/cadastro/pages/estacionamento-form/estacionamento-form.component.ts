import { ChangeDetectorRef, Component, NgZone, OnInit, OnDestroy, inject } from '@angular/core';
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

const MAX_FOTOS = 4;
const MAX_CONTATOS_COMPLEMENTARES = 5;

@Component({
  selector: 'app-estacionamento-form',
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
  /** Fotos: do backend (base64) ou novos (file). Máximo 4. Enviadas no payload como base64. */
  fotoItems: Array<{ url: string; file?: File; base64?: string }> = [];
  fotoError: string | null = null;
  /** URL da foto em exibição ampliada (lightbox). */
  fotoAmpliadaUrl: string | null = null;
  /** True quando o usuário arrasta arquivos sobre a zona de drop. */
  fotoDragOver = false;
  /** Índice da foto marcada como principal (opcional). Null = nenhuma principal. */
  fotoPrincipalIndex: number | null = null;

  private stepService = inject(EstacionamentoFormStepService);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private estacionamentoService: EstacionamentoService,
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
      // Dados bancários (passo 2 - novo cadastro)
      banco: [''],
      agencia: [''],
      conta: [''],
      tipoConta: ['' as 'corrente' | 'poupanca' | ''],
      chavePix: ['']
    });
    this.setupTaxaMensalidadeToggle();
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
    this.estacionamentoService.obterPorId(this.id).subscribe({
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
              agencia: trim(dto.agencia),
              conta: trim(dto.conta),
              tipoConta: trim(dto.tipoConta),
              chavePix: trim(dto.chavePix)
            });
            // Sincronizar estado dos combos com os dados carregados (exibição ao editar)
            this.bancoFiltro = this.form.get('banco')?.value ?? '';
            const tipoContaVal = this.form.get('tipoConta')?.value ?? '';
            const tipoContaOp = this.tipoContaOpcoes.find((o) => o.value === tipoContaVal);
            this.tipoContaFiltro = tipoContaOp ? tipoContaOp.label : '';
            this.fotoItems = (dto.loadedFotosBase64 ?? []).map((b64) => {
              const url = b64.startsWith('http') ? b64 : (b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`);
              const base64 = b64.startsWith('data:') ? b64.split(',')[1] ?? b64 : b64;
              return { url, base64 };
            });
            this.fotoPrincipalIndex = null;
            this.form.get('pessoa')?.patchValue({
              id: dto.pessoa.id,
              tipoPessoa: dto.pessoa.tipoPessoa ?? 2,
              nomeRazaoSocial: trim(dto.pessoa.nomeRazaoSocial),
              nomeFantasia: trim(dto.pessoa.nomeFantasia),
              email: trim(dto.pessoa.email),
              ativo: dto.pessoa.ativo ?? true,
              documento: (dto.pessoa.documento ?? '').replace(/\s/g, '')
            });
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    this.erro = null;
    this.buildFotosBase64().then((fotosBase64) => {
      const dto = formValueToEstacionamentoPayload(this.form.value, this.loadedEnderecos, fotosBase64);
      const request$ = this.id
        ? this.estacionamentoService.alterar(dto)
        : this.estacionamentoService.gravar(dto);
      request$.subscribe({
        next: () => {
          this.salvando = false;
          this.toast.success(this.id ? 'Estacionamento atualizado com sucesso.' : 'Estacionamento criado com sucesso.');
          this.router.navigate(['/app/cadastro/estacionamento']);
        },
        error: () => {
          this.erro = 'Erro ao salvar. Tente novamente.';
          this.salvando = false;
        }
      });
    }).catch(() => {
      this.erro = 'Erro ao processar fotos.';
      this.salvando = false;
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64 ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /** Ordem para envio: foto principal primeiro (se houver), depois as demais. */
  private getOrderedFotoItems(): Array<{ url: string; file?: File; base64?: string }> {
    const list = this.fotoItems;
    if (list.length === 0) return [];
    if (this.fotoPrincipalIndex == null || this.fotoPrincipalIndex < 0 || this.fotoPrincipalIndex >= list.length) {
      return [...list];
    }
    const principal = list[this.fotoPrincipalIndex];
    const rest = list.filter((_, i) => i !== this.fotoPrincipalIndex!);
    return [principal, ...rest];
  }

  private buildFotosBase64(): Promise<string[]> {
    const ordered = this.getOrderedFotoItems();
    const promises = ordered.map((i) =>
      i.base64 ? Promise.resolve(i.base64) : (i.file ? this.fileToBase64(i.file) : Promise.resolve(''))
    );
    return Promise.all(promises).then((arr) => arr.filter((b) => b.length > 0));
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
    const file = input.files?.[0];
    if (!file) return;
    this.addFotoFile(file);
    input.value = '';
  }

  onFotoDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fotoDragOver = false;
    this.fotoError = null;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length && this.fotoItems.length < MAX_FOTOS; i++) {
      this.addFotoFile(files[i]);
    }
    if (this.fotoItems.length >= MAX_FOTOS && files.length > 1) {
      this.fotoError = `Máximo ${MAX_FOTOS} fotos. As demais foram ignoradas.`;
    }
  }

  onFotoDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.fotoItems.length < MAX_FOTOS) this.fotoDragOver = true;
  }

  onFotoDragLeave(): void {
    this.fotoDragOver = false;
  }

  /** Adiciona um arquivo à lista de fotos se for válido. Retorna true se foi adicionado. */
  private addFotoFile(file: File): boolean {
    if (this.fotoItems.length >= MAX_FOTOS) {
      this.fotoError = `Máximo ${MAX_FOTOS} fotos por cadastro.`;
      return false;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.fotoError = 'Use apenas JPEG, PNG ou WebP.';
      return false;
    }
    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      this.fotoError = `Cada foto no máximo ${maxMb} MB.`;
      return false;
    }
    this.fotoItems.push({ file, url: URL.createObjectURL(file) });
    this.fotoError = null;
    return true;
  }

  removerFoto(index: number): void {
    const item = this.fotoItems[index];
    if (item) {
      if (item.file && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
      if (this.fotoAmpliadaUrl === item.url) this.fotoAmpliadaUrl = null;
      this.fotoItems.splice(index, 1);
      this.fotoError = null;
      if (this.fotoPrincipalIndex === index) this.fotoPrincipalIndex = null;
      else if (this.fotoPrincipalIndex != null && index < this.fotoPrincipalIndex) this.fotoPrincipalIndex--;
    }
  }

  /** Marca a foto no índice como principal (opcional). Se já for a principal, desmarca. */
  definirFotoPrincipal(index: number): void {
    this.fotoPrincipalIndex = this.fotoPrincipalIndex === index ? null : index;
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
