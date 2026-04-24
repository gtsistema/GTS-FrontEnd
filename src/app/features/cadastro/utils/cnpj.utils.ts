/**
 * Utilitários para CNPJ: remoção de máscara e validação por dígitos verificadores.
 * Reaproveitável em qualquer formulário que use CNPJ.
 */

/** Remove tudo que não for dígito. Retorna string com apenas números. */
export function unmaskCnpj(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Valida CNPJ: 14 dígitos e dígitos verificadores corretos.
 * Não valida sequências inválidas (ex.: 00.000.000/0000-00) — apenas o algoritmo.
 */
export function validarCnpj(cnpj: string | null | undefined): boolean {
  const digits = unmaskCnpj(cnpj);
  if (digits.length !== 14) return false;

  // Sequências conhecidas como inválidas
  if (/^(\d)\1+$/.test(digits)) return false;

  const peso1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const peso2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcDigito = (slice: string, peso: number[]): number => {
    let soma = 0;
    for (let i = 0; i < peso.length; i++) {
      soma += parseInt(slice[i], 10) * peso[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcDigito(digits.slice(0, 12), peso1);
  const d2 = calcDigito(digits.slice(0, 13), peso2);
  return d1 === parseInt(digits[12], 10) && d2 === parseInt(digits[13], 10);
}

/** Verifica se a string tem exatamente 14 dígitos (após remover máscara). */
export function cnpjTem14Digitos(value: string | null | undefined): boolean {
  return unmaskCnpj(value).length === 14;
}
