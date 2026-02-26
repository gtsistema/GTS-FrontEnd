## Estrutura de Rotas - Layout com Sidebar

### Rotas Públicas (Sem Layout)
```
/          → Login (redireciona para login routes)
/home      → Home existente (com guard de autenticação)
/configuracoes → Configurações existentes
```

### Rotas Protegidas (Com Layout + Sidebar)
Todas as rotas abaixo estão protegidas pelo `authGuard` e usam o `MainLayoutComponent`:

```
/dashboard    → Dashboard Page
/movimentos   → Movimentos Page
/relatorios   → Relatórios Page
/financeiro   → Financeiro Page
/             → Redireciona para /dashboard (dentro do layout)
```

### Estrutura de Componentes

```
src/app/
├── core/
│   └── layout/
│       ├── main-layout.component.ts       (Layout principal com sidebar)
│       ├── main-layout.component.html
│       └── main-layout.component.scss
│
├── shared/
│   └── components/
│       └── sidebar/
│           ├── sidebar.component.ts       (Menu lateral)
│           ├── sidebar.component.html
│           └── sidebar.component.scss
│
└── features/
    ├── dashboard/
    │   ├── dashboard.routes.ts
    │   └── pages/
    │       └── dashboard-page/
    │           ├── dashboard-page.component.ts
    │           ├── dashboard-page.component.html
    │           └── dashboard-page.component.scss
    │
    ├── movimentos/
    │   ├── movimentos.routes.ts
    │   └── pages/
    │       └── movimentos-page/ (mesma estrutura)
    │
    ├── relatorios/
    │   ├── relatorios.routes.ts
    │   └── pages/
    │       └── relatorios-page/ (mesma estrutura)
    │
    └── financeiro/
        ├── financeiro.routes.ts
        └── pages/
            └── financeiro-page/ (mesma estrutura)
```

### Features

✅ **Sidebar Fixa e Responsiva**
- Largura padrão: 260px
- Colapsável em modo mobile (80px)
- Ícones + Texto (escondem ao colapsar)
- Item ativo com destaque e barra lateral

✅ **Menu Lateral Persistente**
- Dashboard → /dashboard
- Movimentos → /movimentos
- Relatórios → /relatorios
- Financeiro → /financeiro

✅ **Badge "Em Desenvolvimento"**
- Visível no topo de cada página
- Estilo discreto com cor amarela/laranja
- Ícone de ferramenta

✅ **Design Responsivo**
- Desktop: Sidebar completo + Conteúdo
- Tablet: Sidebar colapsável
- Mobile: Sidebar colapsável por padrão

✅ **Tema Dark Moderno**
- Cores consistentes (azul escuro + acentos)
- Degradados sutis
- Glassmorphism nas cards

### Como Usar

1. **Navegar entre páginas**: Clique nos itens do menu lateral
2. **Colapsar sidebar**: Clique no ícone ☰ no topo da sidebar
3. **Item ativo**: Automaticamente destacado conforme a rota ativa

### Guardar Autenticação

Todas as rotas do novo layout (dashboard, movimentos, etc.) estão protegidas pelos `authGuard`. 
User não consegue acessar sem estar autenticado (será redirecionado para login).

### Próximos Passos

Você pode customizar:
- Cores em `:host { --xxx: #... }`
- Ícones no array `menuItems`
- Conteúdo das páginas
- Adicionar mais rotas conforme necessário
