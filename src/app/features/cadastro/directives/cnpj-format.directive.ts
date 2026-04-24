import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Formato CNPJ: 00.000.000/0001-00 (14 dígitos). Exportada para uso ao preencher o form (ex.: edição). */
export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

@Directive({
  selector: '[appCnpjFormat]',
  standalone: true
})
export class CnpjFormatDirective {
  constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatCnpj(input.value);
    if (formatted === input.value) return;
    const digitsBefore = (input.value.slice(0, input.selectionStart ?? 0).match(/\d/g) || []).length;
    this.ngControl.control?.setValue(formatted, { emitEvent: false });
    // Reposicionar cursor após o próximo dígito correspondente
    setTimeout(() => {
      let pos = 0;
      let count = 0;
      for (; pos < formatted.length && count < digitsBefore; pos++) {
        if (/\d/.test(formatted[pos])) count++;
      }
      input.setSelectionRange(pos, pos);
    }, 0);
  }
}
