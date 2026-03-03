import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Formato telefone BR: (00) 0000-0000 ou (00) 00000-0000 (10 ou 11 dígitos).
 * Exportada para uso ao preencher o form (ex.: edição).
 */
export function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

@Directive({
  selector: '[appTelefoneFormat]',
  standalone: true
})
export class TelefoneFormatDirective {
  constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatTelefone(input.value);
    if (formatted === input.value) return;
    const digitsBefore = (input.value.slice(0, input.selectionStart ?? 0).match(/\d/g) || []).length;
    this.ngControl.control?.setValue(formatted, { emitEvent: false });
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
