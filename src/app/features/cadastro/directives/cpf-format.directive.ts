import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Formato CPF: 000.000.000-00 (11 dígitos). Exportada para uso ao preencher o form (ex.: edição). */
export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

@Directive({
  selector: '[appCpfFormat]',
  standalone: true
})
export class CpfFormatDirective {
  constructor(private ngControl: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatCpf(input.value);
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
