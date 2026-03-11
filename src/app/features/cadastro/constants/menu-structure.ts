/**
 * Estrutura do menu da aplicação (menu > módulos > submenus).
 * Usada na tela de Permissões para exibir e vincular permissões por item.
 */
export interface MenuSubItem {
  id: string;
  label: string;
  route: string;
}

export interface MenuNode {
  id: string;
  label: string;
  route: string;
  icon: string;
  children?: MenuSubItem[];
}

/** Estrutura completa do menu (espelha a sidebar). */
export const MENU_STRUCTURE: MenuNode[] = [
  { id: 'menu-dashboard', label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
  { id: 'menu-movimentos', label: 'Movimentos', route: '/app/movimentos', icon: 'swap_horiz' },
  { id: 'menu-relatorios', label: 'Relatórios', route: '/app/relatorios', icon: 'assessment' },
  { id: 'menu-financeiro', label: 'Financeiro', route: '/app/financeiro', icon: 'payments' },
  {
    id: 'menu-configuracoes',
    label: 'Configurações',
    route: '/app/configuracoes',
    icon: 'settings',
    children: [
      { id: 'sub-usuarios', label: 'Usuários', route: '/app/configuracoes/usuarios' },
      { id: 'sub-permissoes', label: 'Permissões', route: '/app/configuracoes/permissoes' },
      { id: 'sub-perfil', label: 'Perfil', route: '/app/configuracoes/perfis' },
    ],
  },
  {
    id: 'menu-cadastro',
    label: 'Cadastro',
    route: '/app/cadastro',
    icon: 'playlist_add',
    children: [
      { id: 'sub-estacionamento', label: 'Estacionamento', route: '/app/cadastro/estacionamento' },
      { id: 'sub-transportadora', label: 'Transportadora', route: '/app/cadastro/transportadora' },
    ],
  },
];

/** Todos os nós (menu ou submenu) que podem ter permissões vinculadas. */
export function getAllMenuNodeIds(): string[] {
  const ids: string[] = [];
  for (const node of MENU_STRUCTURE) {
    if (node.children?.length) {
      for (const sub of node.children) {
        ids.push(sub.id);
      }
    } else {
      ids.push(node.id);
    }
  }
  return ids;
}
