import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Apenas dígitos (para CPF 11 ou CNPJ 14). */
export function documentoValidator(tipoPessoa: 1 | 2): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || v === '') return null;
    const digits = String(v).replace(/\D/g, '');
    const len = tipoPessoa === 1 ? 11 : 14;
    if (digits.length !== len) {
      return {
        documento: {
          requiredLength: len,
          actualLength: digits.length,
          message: tipoPessoa === 1 ? 'CPF deve ter 11 dígitos' : 'CNPJ deve ter 14 dígitos'
        }
      };
    }
    return null;
  };
}
