# 📋 Documentação da Reorganização do Projeto Frontend

## Data da Migração
15 de Fevereiro de 2026

## 🎯 Objetivo
Reorganizar o projeto Angular para padrão **feature-first** com camadas internas, tornando a estrutura escalável e fácil de manter.

---

## 📊 Estrutura ANTES

```
src/app/
├── app.ts
├── app.routes.ts
├── app.config.ts
├── app.html
├── app.css
├── app.spec.ts
└── pages/
    ├── login/
    │   ├── login.component.ts
    │   ├── login.component.html
    │   └── login.component.scss
    └── home/
        ├── home.component.ts
        ├── home.component.html
        └── home.component.scss
```

## 📊 Estrutura DEPOIS

```
src/app/
├── core/                          (🔒 Serviços globais, singleton)
│   └── (pronto para guards, interceptors, auth services)
├── shared/                        (🔄 Componentes compartilhados)
│   └── (pronto para shared components, pipes, utils)
├── features/                      (🖼️ Telas do sistema)
│   ├── login/
│   │   ├── pages/
│   │   │   └── login-page/
│   │   │       ├── login-page.component.ts	    [RENOMEADO: LoginPageComponent]
│   │   │       ├── login-page.component.html
│   │   │       └── login-page.component.scss
│   │   └── login.routes.ts        [NOVO: Rotas da feature]
│   │
│   └── home/
│       ├── pages/
│       │   └── home-page/
│       │       ├── home-page.component.ts        [RENOMEADO: HomePageComponent]
│       │       ├── home-page.component.html
│       │       └── home-page.component.scss
│       └── home.routes.ts         [NOVO: Rotas da feature]
│
├── app.ts                         [SEM ALTERAÇÕES]
├── app.routes.ts                  [ATUALIZADO: Lazy loading por feature]
├── app.config.ts                  [SEM ALTERAÇÕES]
├── app.html
├── app.css
└── app.spec.ts
```

---

## 📝 Arquivos Movidos e Alterações

### 1️⃣ Feature: LOGIN

| Arquivo Antigo | Arquivo Novo | Alterações |
|---|---|---|
| `src/app/pages/login/login.component.ts` | `src/app/features/login/pages/login-page/login-page.component.ts` | **Renomeado**: `LoginComponent` → `LoginPageComponent`; **Seletor**: `app-login` → `app-login-page` |
| `src/app/pages/login/login.component.html` | `src/app/features/login/pages/login-page/login-page.component.html` | ✅ Sem alterações (templateUrl atualizado automaticamente) |
| `src/app/pages/login/login.component.scss` | `src/app/features/login/pages/login-page/login-page.component.scss` | ✅ Sem alterações (styleUrls atualizados automaticamente) |

**Novo arquivo criado:**
- `src/app/features/login/login.routes.ts` - Define rotas da feature com lazy loading

### 2️⃣ Feature: HOME

| Arquivo Antigo | Arquivo Novo | Alterações |
|---|---|---|
| `src/app/pages/home/home.component.ts` | `src/app/features/home/pages/home-page/home-page.component.ts` | **Renomeado**: `HomeComponent` → `HomePageComponent`; **Seletor**: `app-home` → `app-home-page` |
| `src/app/pages/home/home.component.html` | `src/app/features/home/pages/home-page/home-page.component.html` | ✅ Sem alterações (templateUrl atualizado automaticamente) |
| `src/app/pages/home/home.component.scss` | `src/app/features/home/pages/home-page/home-page.component.scss` | ✅ Sem alterações (styleUrls atualizados automaticamente) |

**Novo arquivo criado:**
- `src/app/features/home/home.routes.ts` - Define rotas da feature com lazy loading

### 3️⃣ Arquivo de Rotas Raiz

**`src/app/app.routes.ts`** - ATUALIZADO

**Antes:**
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
	},
	{
		path: 'home',
		loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
	},
];
```

**Depois:**
```typescript
import { Routes } from '@angular/router';
import { LOGIN_ROUTES } from './features/login/login.routes';
import { HOME_ROUTES } from './features/home/home.routes';

export const routes: Routes = [
	{
		path: '',
		children: LOGIN_ROUTES,
	},
	{
		path: 'home',
		children: HOME_ROUTES,
	},
];
```

---

## ✅ Checklist de Verificação

- [x] **Diretório de Estrutura**: Criada
- [x] **Componentes Movidos**: Login e Home
- [x] **Componentes Renomeados**: `LoginPageComponent` e `HomePageComponent`
- [x] **Rotas por Feature**: Criadas (`login.routes.ts` e `home.routes.ts`)
- [x] **app.routes.ts Atualizado**: Com lazy loading por feature
- [x] **Build Compilação**: ✅ Sucesso (0 erros)
- [x] **Lazy Chunks**: Gerados corretamente
  - `login-page-component`: 19.20 kB
  - `home-page-component`: 4.29 kB
- [x] **Arquivos Antigos Removidos**: `src/app/pages/` deletado

---

## 📌 Padrões Estabelecidos

### Estrutura de Feature

Cada feature deve seguir:
```
features/<feature-name>/
├── pages/                     # Componentes de página/rota
│   └── <feature-name>-page/
│       ├── <feature>.component.ts
│       ├── <feature>.component.html
│       └── <feature>.component.scss
├── components/                # (Opcional) Componentes reutilizáveis internos
├── services/                  # (Opcional) Serviços específicos da feature
├── models/                    # (Opcional) Tipos/interfaces da feature
└── <feature-name>.routes.ts   # Rotas da feature
```

### Convenções de Nomenclatura

- **Pastas**: `kebab-case` (ex: `login-page`, `home-page`)
- **Classes**: `PascalCase` (ex: `LoginPageComponent`)
- **Seletores**: `app-kebab-case` (ex: `app-login-page`)
- **Arquivos**: `kebab-case.ts` (ex: `login-page.component.ts`)

### Lazy Loading por Feature

- Cada feature define suas próprias rotas em `<feature>.routes.ts`
- O `app.routes.ts` importa e registra as rotas via `children`
- Reduz o bundle inicial e melhora performance

---

## 🚀 Próximos Passos

### Quando adicionar novas features (telas):

1. Crie a pasta: `src/app/features/<nova-tela>`
2. Dentro dela, crie `pages/<nova-tela>-page/` com os componentes
3. Crie `<nova-tela>.routes.ts` com as rotas
4. Importe em `app.routes.ts` usando `children: NOVA_ROUTES`
5. Opcionalmente, adicione `components/`, `services/`, `models/` conforme necessário

### Exemplo prático para uma nova feature "Dashboard":

```typescript
// src/app/features/dashboard/dashboard.routes.ts
import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent
      ),
  },
];
```

```typescript
// src/app/app.routes.ts
import { DASHBOARD_ROUTES } from './features/dashboard/dashboard.routes';

export const routes: Routes = [
  // ... rotas existentes
  {
    path: 'dashboard',
    children: DASHBOARD_ROUTES,
  },
];
```

---

## 🧪 Testes Realizados

✅ **Compilação**: `ng serve` executado com sucesso  
✅ **Bundle**: Lazy chunks gerados corretamente  
✅ **Imports**: Todos os caminhos atualizados  
✅ **Rotas**: Estrutura modular implementada  
✅ **Seletores**: Renomeados para manter consistência  

---

## 📚 Referências

- **Padrão Feature-First**: Melhor organização para projetos escaláveis
- **Lazy Loading**: Reduz bundle inicial, melhora performance
- **Standalone Components**: Usado em todo o projeto (sem NgModules)
- **Kebab-case**: Convenção Angular para arquivos e pastas

---

**Status Final**: ✅ **MIGRAÇÃO CONCLUÍDA COM SUCESSO**
