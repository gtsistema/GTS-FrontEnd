import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../core/api/services/toast.service';
import { PermissionCacheService } from '../../../core/services/permission-cache.service';
import { ApiError } from '../../../core/api/models';
import { PaginatedSearchItem } from '../../../shared/models/paginated-search.models';
import { EntradaSaidaService } from './entrada-saida.service';
import { EntradaSaidaOutput } from '../models/entrada-saida.models';
import { buildEntradaSaidaPostPayload, mapEntradaSaidaOutputToDisplay } from './entrada-saida-form.mapper';
import { ModalBuscaMotoristaComponent } from './components/modal-busca-motorista/modal-busca-motorista.component';
import { ModalBuscaTransportadoraComponent } from './components/modal-busca-transportadora/modal-busca-transportadora.component';
import { ModalBuscaVeiculoComponent } from './components/modal-busca-veiculo/modal-busca-veiculo.component';

@Component({
  selector: 'app-entrada-saida-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalBuscaMotoristaComponent,
    ModalBuscaTransportadoraComponent,
    ModalBuscaVeiculoComponent
  ],
  templateUrl: './entrada-saida-form.component.html',
  styleUrl: './entrada-saida-form.component.scss'
})
export class EntradaSaidaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EntradaSaidaService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly permissionCache = inject(PermissionCacheService);

  private readonly motoristaInputRef = viewChild<ElementRef<HTMLInputElement>>('motoristaInput');

  readonly canGravar = this.permissionCache.has('entradasaida.gravar') || this.permissionCache.hasAny(['*']);
  readonly canAlterar = this.permissionCache.has('entradasaida.alterar') || this.permissionCache.hasAny(['*']);

  carregandoRegistro = false;
  salvando = false;

  motoristaModalAberto = false;
  transportadoraModalAberto = false;
  veiculoModalAberto = false;

  motoristaTexto = '';
  transportadoraTexto = '';
  veiculoTexto = '';

  readonly form = this.fb.group(
    {
      id: [0],
      motoristaId: [null as number | null, [Validators.required, Validators.min(1)]],
      transportadoraId: [null as number | null, [Validators.required, Validators.min(1)]],
      veiculoId: [null as number | null, [Validators.required, Validators.min(1)]],
      dataHoraEntrada: ['', Validators.required],
      dataHoraSaida: [''],
      observacao: ['']
    },
    { validators: [this.dataSaidaMaiorOuIgualValidator] }
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;

    if (editId != null) {
      if (!this.canAlterar) {
        this.toast.error('Sem permissão para alterar entrada/saída.');
        void this.router.navigate([''], { relativeTo: this.route.parent });
        return;
      }
      this.carregarRegistro(editId);
      return;
    }

    if (!this.canGravar) {
      this.toast.error('Sem permissão para incluir entrada/saída.');
      void this.router.navigate([''], { relativeTo: this.route.parent });
      return;
    }
    this.focusMotoristaField();
  }

  tituloPagina(): string {
    return this.form.controls.id.value ? 'Editar entrada / saída' : 'Nova entrada / saída';
  }

  abrirMotorista(): void {
    this.motoristaModalAberto = true;
  }

  abrirTransportadora(): void {
    this.transportadoraModalAberto = true;
  }

  abrirVeiculo(): void {
    this.veiculoModalAberto = true;
  }

  onMotoristaCampoInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.motoristaTexto = v;
    this.form.patchValue({ motoristaId: null }, { emitEvent: false });
  }

  onTransportadoraCampoInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.transportadoraTexto = v;
    this.form.patchValue({ transportadoraId: null }, { emitEvent: false });
  }

  onVeiculoCampoInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.veiculoTexto = v;
    this.form.patchValue({ veiculoId: null }, { emitEvent: false });
  }

  onMotoristaSelecionado(item: PaginatedSearchItem): void {
    this.form.patchValue({ motoristaId: item.id });
    this.motoristaTexto = item.titulo;
    this.motoristaModalAberto = false;
  }

  onTransportadoraSelecionada(item: PaginatedSearchItem): void {
    this.form.patchValue({ transportadoraId: item.id });
    this.transportadoraTexto = item.titulo;
    this.transportadoraModalAberto = false;
  }

  onVeiculoSelecionado(item: PaginatedSearchItem): void {
    this.form.patchValue({ veiculoId: item.id });
    this.veiculoTexto = item.titulo;
    this.veiculoModalAberto = false;
  }

  limparMotorista(): void {
    this.form.patchValue({ motoristaId: null });
    this.motoristaTexto = '';
  }

  limparTransportadora(): void {
    this.form.patchValue({ transportadoraId: null });
    this.transportadoraTexto = '';
  }

  limparVeiculo(): void {
    this.form.patchValue({ veiculoId: null });
    this.veiculoTexto = '';
  }

  cancelar(): void {
    void this.router.navigate([''], { relativeTo: this.route.parent });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = Number(this.form.controls.id.value) || 0;
    if (id > 0 && !this.canAlterar) {
      this.toast.error('Sem permissão para alterar.');
      return;
    }
    if (id === 0 && !this.canGravar) {
      this.toast.error('Sem permissão para incluir.');
      return;
    }

    this.salvando = true;
    const motoristaId = Number(this.form.controls.motoristaId.value);
    const transportadoraId = Number(this.form.controls.transportadoraId.value);
    const veiculoId = Number(this.form.controls.veiculoId.value);
    const payload = buildEntradaSaidaPostPayload({
      motoristaId,
      transportadoraId,
      veiculoId,
      dataHoraEntradaIso: this.toIsoOrEmpty(this.form.controls.dataHoraEntrada.value),
      dataHoraSaidaIso: this.toIsoOrUndefined(this.form.controls.dataHoraSaida.value),
      observacao: this.form.controls.observacao.value ?? ''
    });

    const req$ =
      id > 0 ? this.service.update(id, payload) : this.service.create(payload);

    req$.subscribe({
      next: () => {
        this.salvando = false;
        this.toast.success(id > 0 ? 'Movimento atualizado com sucesso.' : 'Movimento criado com sucesso.');
        void this.router.navigate([''], { relativeTo: this.route.parent });
      },
      error: (err: ApiError) => {
        this.salvando = false;
        this.toast.error(err?.message ?? 'Erro ao salvar movimento.');
      }
    });
  }

  motoristaInvalido(): boolean {
    const c = this.form.controls.motoristaId;
    return c.touched && c.invalid;
  }

  transportadoraInvalida(): boolean {
    const c = this.form.controls.transportadoraId;
    return c.touched && c.invalid;
  }

  veiculoInvalido(): boolean {
    const c = this.form.controls.veiculoId;
    return c.touched && c.invalid;
  }

  private carregarRegistro(id: number): void {
    this.carregandoRegistro = true;
    this.service.getById(id).subscribe({
      next: (item) => {
        this.carregandoRegistro = false;
        if (!item) {
          this.toast.error('Registro não encontrado.');
          void this.router.navigate([''], { relativeTo: this.route.parent });
          return;
        }
        this.applyRegistro(item);
      },
      error: (err: ApiError) => {
        this.carregandoRegistro = false;
        this.toast.error(err?.message ?? 'Erro ao carregar registro.');
        void this.router.navigate([''], { relativeTo: this.route.parent });
      }
    });
  }

  private applyRegistro(item: EntradaSaidaOutput): void {
    const labels = mapEntradaSaidaOutputToDisplay(item);
    this.motoristaTexto = labels.motoristaTexto;
    this.transportadoraTexto = labels.transportadoraTexto;
    this.veiculoTexto = labels.veiculoTexto;
    this.form.patchValue({
      id: item.id,
      motoristaId: item.motoristaId,
      transportadoraId: item.transportadoraId,
      veiculoId: item.veiculoId,
      dataHoraEntrada: this.toDateTimeLocal(item.dataHoraEntrada),
      dataHoraSaida: this.toDateTimeLocal(item.dataHoraSaida ?? ''),
      observacao: labels.observacaoTexto
    });
    this.focusMotoristaField();
  }

  private focusMotoristaField(): void {
    queueMicrotask(() => this.motoristaInputRef()?.nativeElement?.focus());
  }

  private toDateTimeLocal(value: string): string {
    if (!value?.trim()) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toIsoOrUndefined(value: string | null | undefined): string | undefined {
    if (!value?.trim()) return undefined;
    return new Date(value).toISOString();
  }

  private toIsoOrEmpty(value: string | null | undefined): string {
    return value?.trim() ? new Date(value).toISOString() : '';
  }

  private dataSaidaMaiorOuIgualValidator(control: AbstractControl): ValidationErrors | null {
    const entrada = control.get('dataHoraEntrada')?.value;
    const saida = control.get('dataHoraSaida')?.value;
    if (!entrada || !saida) return null;
    return new Date(saida).getTime() >= new Date(entrada).getTime() ? null : { dataSaidaMenor: true };
  }
}
