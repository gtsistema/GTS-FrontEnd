/** Remove hífen/espaços e limita a 7 caracteres alfanuméricos (BR antigo / Mercosul). */
export function normalizePlaca(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 7);
}

/** Exibe placa com hífen após o 3º caractere (ex.: ABC-1234, ABC-1D23). */
export function formatPlacaDisplay(normalized: string): string {
  const n = normalizePlaca(normalized);
  if (n.length <= 3) return n;
  return `${n.slice(0, 3)}-${n.slice(3)}`;
}

/** true se tiver 7 caracteres (placa completa). */
export function placaCompleta(normalized: string): boolean {
  return normalizePlaca(normalized).length === 7;
}
