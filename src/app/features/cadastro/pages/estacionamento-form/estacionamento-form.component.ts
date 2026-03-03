import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import { documentoValidator } from '../../validators/documento.validator';
import { TipoPessoa } from '../../models/estacionamento.dto';
import { CnpjFormatDirective, formatCnpj } from '../../directives/cnpj-format.directive';
import { CpfFormatDirective, formatCpf } from '../../directives/cpf-format.directive';
import { TelefoneFormatDirective, formatTelefone } from '../../directives/telefone-format.directive';
import { formValueToEstacionamentoPayload } from './estacionamento-form.mapper';

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
export class EstacionamentoFormComponent implements OnInit {
  form!: FormGroup;
  id: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  /** Accordion "Dados complementares": inicia fechado. */
  complementaresOpen = false;
  /** PDF do contrato anexado (não enviado na API atual; preparado para integração futura). */
  contratoPdf: File | null = null;
  contratoPdfError: string | null = null;
  /** Endereços retornados por ObterPorId; preservados no payload ao alterar. */
  loadedEnderecos: Record<string, unknown>[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private estacionamentoService: EstacionamentoService,
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

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? +idParam : null;
    this.criarFormulario();
    if (this.id) {
      this.carregar();
    } else {
      this.atualizarValidadoresDocumento();
    }
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
      // TODO: backend não possui no Swagger - integrar quando existir
      responsavelLegalNome: [''],
      responsavelLegalCpf: [''],
      contatoTelefone: [''],
      capacidadeVeiculos: [null as number | null],
      tamanho: [''],
      possuiSeguranca: [false],
      possuiBanheiro: [false],
      tipoTaxaMensalidade: [null as 'taxa' | 'mensalidade' | null],
      taxaPercentual: [null as number | null],
      mensalidadeValor: [null as number | null],
      contrato: [''],
      latitude: [null as number | null],
      longitude: [null as number | null]
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
            const trim = (s: string | null | undefined) => (s == null ? '' : String(s).trim());
            const cpfRaw = (dto.responsavelLegalCpf ?? '').replace(/\D/g, '');
            const telRaw = (dto.contatoTelefone ?? '').replace(/\D/g, '');
            this.form.patchValue({
              id: dto.id,
              descricao: trim(dto.descricao),
              pessoaId: dto.pessoaId,
              responsavelLegalNome: dto.responsavelLegalNome,
              responsavelLegalCpf: cpfRaw.length === 11 ? formatCpf(cpfRaw) : trim(dto.responsavelLegalCpf),
              contatoTelefone: telRaw.length >= 10 ? formatTelefone(telRaw) : trim(dto.contatoTelefone),
              capacidadeVeiculos: dto.capacidadeVeiculos,
              tamanho: dto.tamanho,
              possuiSeguranca: dto.possuiSeguranca,
              possuiBanheiro: dto.possuiBanheiro,
              tipoTaxaMensalidade: dto.tipoTaxaMensalidade,
              taxaPercentual: dto.taxaPercentual,
              mensalidadeValor: dto.mensalidadeValor
            });
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
            if (dto.responsavelLegalNome || dto.responsavelLegalCpf || dto.contatoTelefone ||
                dto.capacidadeVeiculos != null || dto.tamanho || dto.tipoTaxaMensalidade) {
              this.complementaresOpen = true;
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
    const dto = formValueToEstacionamentoPayload(this.form.value, this.loadedEnderecos);
    this.salvando = true;
    this.erro = null;
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
  }

  cancelar(): void {
    this.router.navigate(['/app/cadastro/estacionamento']);
  }

  toggleComplementares(): void {
    this.complementaresOpen = !this.complementaresOpen;
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
