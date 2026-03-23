import type { MenuAdmin, MenuPermissionRow, SubMenuAdmin } from '../models/menu-admin.model';
import type { MenuCreateInput, MenuUpdateInput, PermissionInput, SubMenuCreateInput } from './menu-api.types';

function getProp(row: Record<string, unknown>, k: string): unknown {
  return row[k] ?? row[k.charAt(0).toUpperCase() + k.slice(1)];
}

/** Extrai lista de menus do corpo da Buscar (vários formatos comuns da API). */
export function extractMenuArrayFromBuscar(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    for (const key of ['result', 'results', 'items', 'itens', 'data', 'menus', 'Menus']) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function mapPermissionRow(row: Record<string, unknown>, subId: number, index: number): MenuPermissionRow {
  const id = Number(getProp(row, 'id')) || 0;
  return {
    id,
    ordem: Number(getProp(row, 'ordem')) ?? index,
    subModuleId: Number(getProp(row, 'subModuleId')) || subId,
    acao: String(getProp(row, 'acao') ?? ''),
  };
}

function mapSubMenuRow(row: Record<string, unknown>, fallbackOrdem: number): SubMenuAdmin {
  const id = Number(getProp(row, 'id')) || 0;
  const permRaw = getProp(row, 'permissions') ?? getProp(row, 'Permissions');
  const arr = Array.isArray(permRaw) ? permRaw : [];
  const permissions = arr.map((p, i) =>
    mapPermissionRow(p as Record<string, unknown>, id, i)
  );
  const ativo = getProp(row, 'ativo');
  const Ativo = getProp(row, 'Ativo');
  return {
    id,
    nome: String(getProp(row, 'nome') ?? ''),
    ordem: Number(getProp(row, 'ordem')) ?? fallbackOrdem,
    rota: String(getProp(row, 'rota') ?? getProp(row, 'Rota') ?? '/app'),
    ativo: ativo !== false && Ativo !== false,
    permissions,
  };
}

function mapMenuRow(row: Record<string, unknown>): MenuAdmin {
  const id = Number(getProp(row, 'id')) || 0;
  const subRaw = getProp(row, 'subMenus') ?? getProp(row, 'SubMenus');
  const subs = (Array.isArray(subRaw) ? subRaw : []).map((s, i) =>
    mapSubMenuRow(s as Record<string, unknown>, i)
  );
  const ativo = getProp(row, 'ativo');
  const Ativo = getProp(row, 'Ativo');
  return {
    id,
    nome: String(getProp(row, 'nome') ?? ''),
    ordem: Number(getProp(row, 'ordem')) ?? 0,
    icone: String(getProp(row, 'icone') ?? getProp(row, 'Icone') ?? 'menu'),
    ativo: ativo !== false && Ativo !== false,
    subMenus: subs,
    existeNoServidor: true,
  };
}

/** Converte resposta da Buscar em lista de MenuAdmin. */
export function mapBuscarResponseToMenuAdmins(body: unknown): MenuAdmin[] {
  return extractMenuArrayFromBuscar(body).map((row) => mapMenuRow(row as Record<string, unknown>));
}

/** Próximo id local após hidratar (max id + 1). */
export function computeNextIdFromMenus(menus: MenuAdmin[]): number {
  let max = 0;
  for (const m of menus) {
    max = Math.max(max, m.id);
    for (const s of m.subMenus) {
      max = Math.max(max, s.id);
      for (const p of s.permissions) max = Math.max(max, p.id);
    }
  }
  return max + 1;
}

function toPermissionInput(p: MenuPermissionRow): PermissionInput {
  return {
    id: p.id,
    ordem: p.ordem,
    subModuleId: p.subModuleId,
    acao: p.acao,
  };
}

/** Payload para **Alterar** — mantém ids do servidor/front sincronizados. */
function toSubMenuInputForUpdate(s: SubMenuAdmin): SubMenuCreateInput {
  return {
    id: s.id,
    nome: s.nome,
    ordem: s.ordem,
    permissions: s.permissions.map(toPermissionInput),
    rota: s.rota,
    ativo: s.ativo,
  };
}

/**
 * Payload para **Gravar** (criação) — ids zerados para o AutoMapper tratar como novo registro.
 */
function toSubMenuInputForInsert(s: SubMenuAdmin): SubMenuCreateInput {
  return {
    id: 0,
    nome: s.nome,
    ordem: s.ordem,
    permissions: s.permissions.map((p, i) => ({
      id: 0,
      ordem: p.ordem ?? i,
      subModuleId: 0,
      acao: p.acao,
    })),
    rota: s.rota,
    ativo: s.ativo,
  };
}

/** Criação no servidor: sem ids locais (evita confundir com Update no backend). */
export function menuAdminToCreateInput(m: MenuAdmin): MenuCreateInput {
  return {
    id: 0,
    nome: m.nome,
    ordem: m.ordem,
    ativo: m.ativo,
    icone: m.icone,
    subMenus: m.subMenus.map(toSubMenuInputForInsert),
  };
}

export function menuAdminToUpdateInput(m: MenuAdmin): MenuUpdateInput {
  return {
    id: m.id,
    nome: m.nome,
    ordem: m.ordem,
    ativo: m.ativo,
    icone: m.icone,
    subMenus: m.subMenus.map(toSubMenuInputForUpdate),
  };
}
