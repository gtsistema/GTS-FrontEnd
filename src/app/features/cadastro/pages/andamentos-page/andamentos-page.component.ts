import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface MenuLink {
  label: string;
  route: string;
}

interface TelaItem {
  rota: string;
  tela: string;
  descricao: string;
}

interface Ligamento {
  origem: string;
  acao: string;
  destino: string;
}

@Component({
  selector: 'app-andamentos-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './andamentos-page.component.html',
  styleUrls: ['./andamentos-page.component.scss'],
})
export class AndamentosPageComponent {
  readonly arvoreRotas: string[] = [
    '/                          → Login (público) ou redirect /app/dashboard',
    '/app                       → redirect /app/dashboard',
    '/app (MainLayout)',
    '├── /dashboard             → Dashboard',
    '├── /movimentos            → Movimentos',
    '├── /relatorios            → Relatórios',
    '├── /financeiro            → Financeiro',
    '├── /configuracoes         → Configurações',
    '└── /cadastro (CadastroLayoutComponent)',
    "    ├── ''                 → redirect /cadastro/estacionamento",
    '    ├── /estacionamento (EstacionamentoLayoutComponent)',
    "    │   ├── ''             → Lista de estacionamentos",
    '    │   ├── /novo          → Formulário novo estacionamento',
    '    │   └── /editar/:id    → Formulário editar estacionamento',
    '    ├── /transportadora    → Página Cadastro Transportadora',
    '    └── /acessos (CadastroAcessosPageComponent – com abas)',
    "        (Acessos movido para Configurações: /app/configuracoes/usuarios)",
    '        ├── /usuarios (AcessosUsuariosLayoutComponent)',
    "        │   └── ''         → Lista Usuários + modal Novo/Editar",
    '        └── /perfis        → Página Perfis (modal criar/editar/excluir)',
  ];

  readonly menuSidebar: MenuLink[] = [
    { label: 'Dashboard', route: '/app/dashboard' },
    { label: 'Movimentos', route: '/app/movimentos' },
    { label: 'Relatórios', route: '/app/relatorios' },
    { label: 'Financeiro', route: '/app/financeiro' },
    { label: 'Configurações', route: '/app/configuracoes' },
    { label: 'Cadastro > Estacionamento', route: '/app/cadastro/estacionamento' },
    { label: 'Cadastro > Transportadora', route: '/app/cadastro/transportadora' },
    { label: 'Configurações > Usuários', route: '/app/configuracoes/usuarios' },
  ];

  readonly telas: TelaItem[] = [
    { rota: '/', tela: 'Login', descricao: 'Login (usuário/senha). Após sucesso → navega para /app/dashboard.' },
    { rota: '/app/dashboard', tela: 'Dashboard', descricao: 'Página inicial da área logada.' },
    { rota: '/app/movimentos', tela: 'Movimentos', descricao: 'Página de movimentos.' },
    { rota: '/app/relatorios', tela: 'Relatórios', descricao: 'Página de relatórios.' },
    { rota: '/app/financeiro', tela: 'Financeiro', descricao: 'Página financeiro.' },
    { rota: '/app/configuracoes', tela: 'Configurações', descricao: 'Página de configurações.' },
    { rota: '/app/cadastro/estacionamento', tela: 'Lista Estacionamento', descricao: 'Listagem, busca, botão Novo, link Editar por item.' },
    { rota: '/app/cadastro/estacionamento/novo', tela: 'Form Estacionamento (novo)', descricao: 'Formulário em etapas (stepper) para novo estacionamento.' },
    { rota: '/app/cadastro/estacionamento/editar/:id', tela: 'Form Estacionamento (editar)', descricao: 'Mesmo formulário, modo edição.' },
    { rota: '/app/cadastro/transportadora', tela: 'Cadastro Transportadora', descricao: 'Página de cadastro de transportadora.' },
    { rota: '/app/configuracoes', tela: 'Configurações (container)', descricao: 'Abas: Usuários | Permissões | Perfil.' },
    { rota: '/app/configuracoes/usuarios', tela: 'Usuários', descricao: 'Lista de usuários, busca, modal Novo usuário / Editar.' },
    { rota: '/app/configuracoes/perfis', tela: 'Perfil', descricao: 'Lista de perfis, modal Criar/Editar/Excluir com permissões.' },
  ];

  readonly ligamentosEstacionamento: Ligamento[] = [
    { origem: 'Lista Estacionamento', acao: 'Botão Novo', destino: '/app/cadastro/estacionamento/novo' },
    { origem: 'Lista Estacionamento', acao: 'Link Editar na linha', destino: '/app/cadastro/estacionamento/editar/:id' },
    { origem: 'Form (novo/editar)', acao: 'Botão Voltar', destino: '/app/cadastro/estacionamento' },
  ];

  readonly ligamentosAcessos: Ligamento[] = [
    { origem: 'Container Configurações', acao: 'Aba Usuários', destino: '/app/configuracoes/usuarios' },
    { origem: 'Container Configurações', acao: 'Aba Perfil', destino: '/app/configuracoes/perfis' },
    { origem: 'Modal Novo/Editar usuário', acao: 'Cancelar / após Salvar', destino: 'Fecha modal (permanece em Usuários)' },
  ];

  readonly arquivosRotas: { arquivo: string; responsabilidade: string }[] = [
    { arquivo: 'src/app/app.routes.ts', responsabilidade: 'Rotas raiz, layout /app, guard, redirects.' },
    { arquivo: 'src/app/features/login/login.routes.ts', responsabilidade: 'Rota pública / (login).' },
    { arquivo: 'src/app/features/dashboard/dashboard.routes.ts', responsabilidade: '/app/dashboard.' },
    { arquivo: 'src/app/features/movimentos/movimentos.routes.ts', responsabilidade: '/app/movimentos.' },
    { arquivo: 'src/app/features/relatorios/relatorios.routes.ts', responsabilidade: '/app/relatorios.' },
    { arquivo: 'src/app/features/financeiro/financeiro.routes.ts', responsabilidade: '/app/financeiro.' },
    { arquivo: 'src/app/features/configuracoes/configuracoes.routes.ts', responsabilidade: '/app/configuracoes.' },
    { arquivo: 'src/app/features/cadastro/cadastro.routes.ts', responsabilidade: 'Estacionamento (lista/novo/editar), Transportadora, Acessos (Usuários/Perfis).' },
  ];
}
