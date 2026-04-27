import type { SessionMenuAccess } from '../services/session-access.service';

/**
 * Rotas enviadas no login devem seguir o padrão do SPA:
 * `/app/{menu}` ou `/app/{menu}/{submenu}` (sem query/hash; segmentos alfanuméricos, hífen, ponto, underscore).
 */
const SEGMENT = /^[a-zA-Z0-9_.-]+$/;

function stripQueryHash(raw: string): string {
  const noHash = raw.split('#')[0] ?? raw;
  return (noHash.split('?')[0] ?? '').trim();
}

function normalizePath(raw: string): string {
  let p = stripQueryHash(raw).replace(/\/{2,}/g, '/');
  if (!p) return '';
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

function isValidAppMenuOrSubmenuPath(path: string): boolean {
  const p = normalizePath(path);
  if (!p) return false;
  const lower = p.toLowerCase();
  if (!lower.startsWith('/app/')) return false;
  const rest = p.slice(5);
  const parts = rest.split('/').filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return false;
  return parts.every((s) => SEGMENT.test(s));
}

/**
 * @returns `null` se OK; senão texto único para exibir no toast (login falha).
 */
export function getLoginMenusAppRouteValidationMessage(menus: SessionMenuAccess[]): string | null {
  if (!menus.length) return null;

  const errors: string[] = [];

  for (const menu of menus) {
    const label = menu.descricao?.trim() || `menu id ${menu.id ?? '?'}`;
    const rota = menu.rota?.trim();
    if (rota && !isValidAppMenuOrSubmenuPath(rota)) {
      errors.push(
        `Menu "${label}": rota "${rota}" inválida. Esperado /app/{menu} ou /app/{menu}/{submenu}.`
      );
    }

    const subs = menu.subMenus ?? [];
    for (const sub of subs) {
      const subLabel = sub.descricao?.trim() || `submenu id ${sub.id ?? '?'}`;
      const subRota = sub.rota?.trim();
      if (!subRota) continue;
      if (!isValidAppMenuOrSubmenuPath(subRota)) {
        errors.push(
          `Submenu "${subLabel}" (menu "${label}"): rota "${subRota}" inválida. Esperado /app/{menu}/{submenu}.`
        );
      }
    }
  }

  if (errors.length === 0) return null;

  const max = 5;
  const head = errors.slice(0, max);
  const tail =
    errors.length > max
      ? ` (+${errors.length - max} outro(s); corrija todas no backend no padrão /app/{{menu}}/{{submenu}}.)`
      : '';
  return head.join(' ') + tail;
}
