import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { documentoValidator } from '../../validators/documento.validator';
import { TipoPessoa } from '../../models/estacionamento.dto';
import { CnpjFormatDirective, formatCnpj } from '../../directives/cnpj-format.directive';

@Component({
  selector: 'app-estacionamento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CnpjFormatDirective],
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private estacionamentoService: EstacionamentoService
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
        if (dto) {
          this.form.patchValue(dto);
          this.form.patchValue({ pessoa: { tipoPessoa: 2 } });
          const doc = this.form.get('pessoa.documento')?.value;
          if (doc != null && String(doc).replace(/\D/g, '').length === 14) {
            this.form.patchValue({ pessoa: { documento: formatCnpj(String(doc)) } });
          }
          this.atualizarValidadoresDocumento();
        } else {
          this.erro = 'Registro não encontrado.';
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar os dados.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.value;
    const dto = {
      id: value.id,
      descricao: value.descricao,
      pessoaId: value.pessoaId,
      pessoa: {
        ...value.pessoa,
        documento: String(value.pessoa.documento).replace(/\D/g, '')
      }
    };
    this.salvando = true;
    this.erro = null;
    this.estacionamentoService.gravar(dto).subscribe({
      next: () => {
        this.salvando = false;
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

  get documentoErrorMessage(): string | null {
    const errors = this.form.get('pessoa.documento')?.errors;
    if (!errors) return null;
    if (errors['required']) return 'Documento é obrigatório.';
    const doc = errors['documento'];
    return doc && typeof doc === 'object' && 'message' in doc ? String(doc.message) : null;
  }
}
