import { Injectable, signal, computed } from '@angular/core';

export type EstacionamentoFormStep = 1 | 2 | 3;

export const Estacionamento_STEP_LABELS: Record<EstacionamentoFormStep, string> = {
  1: 'Cadastro',
  2: 'Dados Bancários',
  3: 'Fotos'
};

/**
 * Controla o step atual do formulário de novo Estacionamento (Cadastro → Dados Bancários → Foto).
 * Usado pelo layout (topbar stepper) e pelo form.
 */
@Injectable({ providedIn: 'root' })
export class EstacionamentoFormStepService {
  private readonly step = signal<EstacionamentoFormStep>(1);

  readonly currentStep = this.step.asReadonly();
  readonly isStepCadastro = computed(() => this.step() === 1);
  readonly isStepDadosBancarios = computed(() => this.step() === 2);
  readonly isStepFoto = computed(() => this.step() === 3);

  setStep(step: EstacionamentoFormStep): void {
    this.step.set(step);
  }

  nextStep(): void {
    const current = this.step();
    if (current < 3) this.step.set((current + 1) as EstacionamentoFormStep);
  }

  previousStep(): void {
    const current = this.step();
    if (current > 1) this.step.set((current - 1) as EstacionamentoFormStep);
  }

  reset(): void {
    this.step.set(1);
  }
}
