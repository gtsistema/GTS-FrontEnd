/**
 * Catálogo mínimo de permissões apenas para renderizar a UI (agrupamento por módulo).
 * NÃO persiste em backend. Quando o backend existir, este catálogo virá da API
 * e o contrato (módulo + chave) será aplicado.
 */
export const PERMISSION_MODULES = [
  'Estacionamento',
  'Movimentos',
  'Financeiro',
  'Relatórios',
  'Fotos',
  'Transportadora',
  'Usuários',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/** Chaves por módulo (exemplo visual; backend trará o catálogo real). */
export const PERMISSION_CATALOG: Record<PermissionModule, string[]> = {
  Estacionamento: ['estacionamento.visualizar', 'estacionamento.gravar', 'estacionamento.excluir'],
  Movimentos: ['movimentos.entrada', 'movimentos.saida', 'movimentos.consultar'],
  Financeiro: ['financeiro.ver', 'financeiro.exportar'],
  Relatórios: ['relatorios.visualizar', 'relatorios.exportar'],
  Fotos: ['fotos.upload', 'fotos.excluir', 'fotos.visualizar'],
  Transportadora: ['transportadora.visualizar', 'transportadora.gravar'],
  Usuários: ['usuarios.gerenciar', 'usuarios.visualizar'],
};

/** Lista plana de todas as chaves de permissão (para filtro/contagem). */
export function getAllPermissionKeys(): string[] {
  return PERMISSION_MODULES.flatMap((mod) => PERMISSION_CATALOG[mod]);
}
