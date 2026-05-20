# CLAUDE.md — Oz.Barber SaaS

> Este arquivo serve como guia completo para qualquer sessão do Claude Code que trabalhe neste projeto.
> Ele documenta arquitetura, padrões, regras de negócio e decisões técnicas tomadas ao longo do desenvolvimento.

---

## 🏢 Contexto de Negócio

**Empresa:** OzTech SmartControl
**Produto:** Oz.Barber
**Tipo:** SaaS multi-tenant B2B para gestão de barbearias
**Mercado:** Brasil (BRL, pt-BR)
**Modelo de receita:** Assinatura mensal/semestral/anual paga pelo dono da barbearia

O dono da barbearia paga uma assinatura e ganha acesso ao sistema para gerenciar sua equipe, atendimentos, clientes, financeiro e relatórios. Cada barbearia é completamente isolada das outras (multi-tenancy via RLS no Supabase).

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilização | Inline styles (JS objects) — **sem CSS externo, sem Tailwind** |
| Roteamento | Manual via `activeView` state — **sem React Router** |
| Estado | `useState` + `useEffect` — **sem Redux nem Zustand** |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| API calls | Fetch direto (REST API) — **sem SDK hooks do Supabase** |
| Pagamentos | Mercado Pago (checkout + webhooks) |
| PWA | manifest.json + apple-touch-icon em `/public/icons/` |
| Deploy | Vercel |
| Fontes | Bebas Neue (títulos) + DM Sans (corpo) via Google Fonts |

---

## 📁 Estrutura de Arquivos

```
barber-project/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icons/
│       ├── icon-192.png       # Ícone PWA 192x192
│       └── icon-512.png       # Ícone PWA 512x512
├── src/
│   ├── App.jsx                # ★ Arquivo principal (~4300 linhas)
│   │                          #   Contém: auth, roteamento, views, componentes
│   ├── supabase.js            # Supabase client
│   ├── Onboarding.jsx         # Fluxo de cadastro de nova barbearia
│   ├── PlansView.jsx          # Tela de planos + checkout Mercado Pago
│   ├── ResetPassword.jsx      # Recuperação de senha
│   ├── SuperAdminView.jsx     # Painel administrativo da plataforma
│   ├── config/
│   │   └── theme.js           # Paleta de cores dark
│   ├── utils/
│   │   └── formatters.js      # money(), fDate(), fDatetime(), pct()
│   ├── components/            # Componentes reutilizáveis do super admin
│   └── pages/
│       └── superadmin/        # Views do painel super admin
│           ├── DashboardView.jsx
│           ├── ClientsView.jsx
│           ├── FinanceView.jsx
│           ├── SubscriptionsView.jsx
│           ├── CourtesyView.jsx
│           ├── AlertsView.jsx
│           └── AnalyticsView.jsx
├── files/
│   └── saas-migrations/       # Migrations SQL (01 a 05)
├── index.html                 # Entry point (contém bundle inline — arquivo grande)
└── vite.config.js
```

> ⚠️ **IMPORTANTE:** `App.jsx` é o arquivo mais crítico. Quase toda lógica e UI das barbearias está nele.
> O arquivo `index.html` é grande (315KB+ com bundle inline) — evite editá-lo com ferramentas de texto;
> use PowerShell com `[System.IO.File]::ReadAllText` + `.Replace()` + `WriteAllText`.

---

## 🎨 Sistema de Tema

O tema usa um objeto mutável global `T` que é atualizado em runtime:

```js
const T_DARK  = { bg, surface, card, border, accent: "#4db8ff", text, muted, success, danger, ... }
const T_LIGHT = { bg, surface, card, border, accent: "#4db8ff", text, muted, success, danger, ... }
const T = { ...T_DARK }  // mutável em runtime
```

- **Tema dark/light:** toggle via `localStorage("oz_theme")` + `applyThemeMode()`
- **Tema por barbearia:** cada barbearia pode definir `accent_color` própria — aplicado via `applyTenantTheme(shop)`
- **Fonte dos títulos:** `'Bebas Neue', sans-serif` — sempre usar em `h1`, `h3`, `PageHeader`
- **Fonte do corpo:** `'DM Sans', sans-serif`

---

## 🔐 Sistema de Autenticação e Roles

### Hierarquia de acessos:

```
Super Admin (OzTech)
    └── Admin Barbearia (dono/gestor da barbearia)
            └── Barbeiro (funcionário)
```

### 1. Super Admin
- **Identificado por:** `profile.is_super_admin === true` OU `profile.role === "super_admin"`
- **Sem `barbershop_id`** — não pertence a nenhuma barbearia
- **Bypass total** de verificação de assinatura
- **Acessa:** Dashboard da plataforma, Clientes Ativos, Financeiro SaaS, Assinaturas, Cortesias, Alertas, Analytics
- **NÃO vê:** dados operacionais das barbearias

### 2. Admin Barbearia
- **Identificado por:** `profile.role === "admin"` + `profile.barbershop_id` preenchido
- Deve ter **assinatura ativa** ou **cortesia ativa** para acessar
- **Acessa tudo:** Dashboard, Atendimentos (todos), Clientes (editar/excluir), Barbeiros, Serviços, Produtos, Financeiro, Relatórios, Configurações, Meu Plano
- Pode criar contas de acesso para barbeiros

### 3. Barbeiro
- **Identificado por:** `profile.role === "barber"` + `profile.barber_id` + `profile.barbershop_id`
- **Menu reduzido:** Dashboard (próprio), Atendimentos (próprios), Clientes (só leitura)
- **NÃO acessa:** Barbeiros, Serviços, Produtos, Financeiro, Relatórios, Configurações, Meu Plano
- **Restrições no formulário de atendimento:**
  - Campo Barbeiro: oculto (pré-preenchido com ele mesmo)
  - Campo Data/Hora: `readOnly` — não pode alterar
  - Filtro por barbeiro na lista: oculto
- **Dashboard:** mostra comissão do mês calculada sobre serviços (não sobre produtos)

### Verificação de acesso (código):
```js
const isSuperAdmin = profile?.is_super_admin === true || profile?.role === "super_admin"
const isAdmin      = profile.role === "admin"
const myBarberId   = profile.barber_id   // só para barbeiros
const barbershopId = profile.barbershop_id
```

---

## 🗄️ Schema do Banco de Dados

### Tabelas principais:
| Tabela | Descrição |
|---|---|
| `barbershops` | Barbearias cadastradas. Tem `accent_color`, `logo_url`, `plan`, `plan_expires_at` |
| `profiles` | Usuários do sistema. Tem `role`, `barbershop_id`, `barber_id`, `is_super_admin` |
| `barbers` | Barbeiros com `commission` (%), `status` (active/inactive), `user_id` |
| `clients` | Clientes da barbearia com `points`, `birthdate`, `whatsapp` |
| `services` | Serviços com `price`, `duration`, `active` |
| `attendances` | Atendimentos. Tem `extra_services` (JSONB), `products_sold` (JSONB), `services_price` |
| `expenses` | Despesas com `category` e `date` |
| `products` | Produtos com `stock_current`, `stock_minimum`, `cost`, `unit` |
| `product_sales` | Vendas avulsas de produtos |
| `stock_movements` | Movimentações de estoque (entrada/saída) |
| `subscriptions` | Assinaturas com `status` (active/cancelled), `expires_at`, `mp_external_reference` |
| `payment_checkouts` | Checkouts MP com `email`, `status` (paid/pending), `plan`, `redeemed_at`, `barbershop_id` |
| `courtesy_access` | Acessos cortesia com `granted_to_email`, `revoked_at`, `granted_by` |

### RLS (Row Level Security):
- Todas as tabelas operacionais filtram por `barbershop_id` via função `my_barbershop_id()`
- Super admin usa `service_role` para acesso irrestrito via Edge Functions/webhooks

### Funções SQL importantes:
```sql
current_user_access_status()   -- retorna {has_access, reason, plan, expires_at}
can_register_with_email(email) -- valida se email tem checkout pago antes do signUp
renew_subscription(mp_sub_id, mp_payment_id, new_expires_at)  -- webhook renovação
cancel_subscription(external_ref, mp_sub_id)                  -- webhook cancelamento
claim_paid_subscription(...)   -- vincula checkout pago ao usuário recém-cadastrado
has_active_access(barbershop_id) -- fallback legado
```

---

## 💰 Planos e Preços

| Plano | Preço | Período |
|---|---|---|
| Mensal | R$ 79,90/mês | 30 dias |
| Semestral | R$ 399,90 | 180 dias |
| Anual | R$ 699,90 | 365 dias |
| Cortesia | Grátis | Definido pelo Super Admin |

---

## 🧩 Componentes UI (dentro de App.jsx)

Todos os componentes são funções inline em `App.jsx`:

```jsx
// Primitivos
<Modal title onClose>              // Bottom sheet no mobile (borderRadius: "18px 18px 0 0")
<Btn variant="primary|ghost|danger" sm>
<Card style onClick>
<Badge children color>
<StatCard label value sub color icon>
<PageHeader title sub right onRefresh>  // onRefresh mostra botão "Atualizar"
<ErrorBar msg>

// Formulário
<FG label half>           // Field Group — half=true usa flex:"1 1 140px" para 2 colunas
<FInput label ...>
<FSelect label ...>
<FArea label ...>
<Row g style>             // flexWrap:"wrap" para responsividade mobile
<FLabel c>

// Navegação
<Sidebar>                 // Sidebar esquerda com nav diferente por role
<THead cols>              // Cabeçalho de tabela padronizado

// Específicos
<DateRangePicker from to onChange>
<ThemeToggleSwitch isDark onToggle>
```

### Estilo padrão de input:
```js
const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
  WebkitAppearance: "none", MozAppearance: "none", appearance: "none", colorScheme: "dark"
}
```

---

## 📐 Padrões de Código

### 1. Transforms (DB → estado local):
```js
toAtt(a)     // attendance row → objeto local
fromAtt(a)   // objeto local → attendance row para INSERT
toClient(c)
toBarber(b)
toService(s)
toExpense(e)
toProduct(p)
toProductSale(s)
```

### 2. API calls (REST direto):
```js
api.list(table, queryString, token)
api.insert(table, body, token)
api.update(table, id, body, token)
api.remove(table, id, token)
```

### 3. Isolamento multi-tenant:
```js
const shopFilter = `barbershop_id=eq.${shopId}`
const withShop = (qs) => `${qs}&${shopFilter}`
```

### 4. Helpers de formatação:
```js
R$(valor)     // → "R$ 1.234,56"
fDate(str)    // → "19/05/2026"
today()       // → "2026-05-19"
month()       // → "2026-05"
nowTime()     // → "14:30"
nextId(arr)   // → max(id) + 1
```

### 5. Constantes:
```js
PAYMENT_OPTS = ["Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"]
EXPENSE_CATS = ["Aluguel", "Insumos", "Energia", "Internet", "Manutenção", "Marketing", "Outros"]
```

---

## 📱 Responsividade Mobile

- **Detecção:** `const isMobile = useMediaQuery("(max-width: 768px)")` (ou similar)
- **Sidebar mobile:** drawer deslizante com backdrop, abre via botão hambúrguer na top bar
- **Modal:** bottom sheet (alinha ao fundo da tela, `borderRadius: "18px 18px 0 0"`)
- **Formulários:** `Row` com `flexWrap:"wrap"` + `FG half` para campos em 2 colunas que quebram no mobile
- **Grids:** `gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)"`
- **safe-area-inset:** `paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))"` nos modais
- **iOS inputs:** `WebkitAppearance:"none"`, `colorScheme:"dark"` para evitar estilo padrão iOS

---

## 🖨️ Relatórios / PDF

- Gerado via `window.print()` — CSS `@media print` no próprio componente
- Componente `RevenueReportContent` renderiza conteúdo dentro de `#report-print-area`
- Print area usa `position:absolute; left:0; top:0; width:100%`
- Todo o resto da página fica `visibility:hidden`
- KPI cards: `display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr))` — 6 cards responsivos
- Fonte reduzida (9px) nas tabelas para caber em A4

---

## 🔄 Fluxo de Onboarding / Pagamento

```
1. Usuário acessa a plataforma
2. Vê tela de Planos (PlansView.jsx)
3. Escolhe plano → Checkout Mercado Pago
4. MP retorna para /?payment=success&plan=xxx
5. Sistema detecta postPaymentPlan → abre Onboarding.jsx
6. Usuário cria conta (email + senha) e cadastra a barbearia
7. Função claim_paid_subscription() vincula o checkout ao usuário
8. Usuário é logado e vai direto para o sistema

Para renovação:
- Usuário logado com assinatura expirada → tela de Planos com mensagem
- can_register_with_email() valida email antes do signUp (acessível por anon)
```

---

## 🌐 Configurações da Barbearia (SettingsView)

O admin pode personalizar:
- Nome da barbearia
- Logo (URL)
- Cor de destaque (`accent_color` — hex #xxxxxx)
- Toggle dark/light mode

A cor de destaque é aplicada via `applyTenantTheme(shop)` e muda o `T.accent` globalmente.

---

## 📦 Views do Ambiente Admin Barbearia

| View (id) | Componente | Acesso |
|---|---|---|
| `dashboard` | `Dashboard` | Admin + Barbeiro |
| `attendances` | `AttendancesView` | Admin + Barbeiro |
| `clients` | `ClientsView` | Admin (editar) + Barbeiro (ler) |
| `barbers` | `BarbersView` | Admin only |
| `services` | `ServicesView` | Admin only |
| `produtos` | `ProductsView` | Admin only |
| `financial` | `FinancialView` | Admin only |
| `reports` | `ReportsView` | Admin only |
| `settings` | `SettingsView` | Admin only |
| `meuPlano` | `MeuPlanoView` | Admin only |

## 📦 Views do Ambiente Super Admin

| View (id) | Seção |
|---|---|
| `superadmin_dashboard` | Métricas gerais da plataforma |
| `superadmin_clients` | Lista de barbearias clientes |
| `superadmin_finance` | Receita do SaaS |
| `superadmin_subscriptions` | Assinaturas |
| `superadmin_courtesy` | Acessos cortesia |
| `superadmin_alerts` | Alertas e eventos |
| `superadmin_analytics` | Analytics |

---

## ⚡ Supabase Config

```js
const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co"
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a"
```

Headers padrão para chamadas autenticadas:
```js
const hdr = (tok, extra = {}) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
  ...extra
})
```

---

## 🚧 Funcionalidades Planejadas (não implementadas)

- **Agendamentos:** sistema de agenda com horários bloqueados automaticamente
  - Caminho A: agendamento básico (cliente agenda, admin gerencia)
  - Caminho B: + controle de disponibilidade por barbeiro
  - Caminho C (completo): + notificações email/WhatsApp, lembretes automáticos, app do barbeiro
- **Notificações email:** via Resend (domínio `ozbarber.com.br`) + Supabase Edge Functions
- **WhatsApp:** via Z-API (R$97/mês) para lembretes automáticos
- **Lembretes automáticos:** via `pg_cron` no Supabase (gratuito)

---

## 📝 Convenções de Desenvolvimento

1. **Todo código novo vai em `App.jsx`** — salvo exceções grandes (SuperAdminView, Onboarding, PlansView)
2. **Idioma da UI:** Português Brasileiro em tudo
3. **Sem bibliotecas de formulário** — estado local com `useState`
4. **Sem biblioteca de data** — manipulação manual de strings ISO (YYYY-MM-DD)
5. **Sem CSS externo** — tudo inline via objetos JS com `T.xxx` para cores
6. **Botão "Atualizar"** em todas as views via `onRefresh` no `PageHeader`
7. **Tabelas** sempre com `<THead cols={[...]}/>` + `<tbody>`
8. **Novos modais** sempre usando o componente `<Modal>` (bottom sheet)
9. **Campos de formulário** sempre via `<FInput>`, `<FSelect>`, `<FArea>`, `<FG>`
10. **Responsividade:** testar sempre com `isMobile` prop, usar `Row` com `flexWrap:"wrap"`

---

## 🔗 Referência de Produto Similar

Este projeto serve como **referência de arquitetura** para outros produtos da OzTech SmartControl.
Novos produtos (ex: Oz.CarWash para lava-rápidos) devem seguir os mesmos padrões:
- Multi-tenancy via `barbershop_id` equivalente
- Mesma hierarquia de roles (super_admin → admin_tenant → operador)
- Mesmo stack técnico (React + Vite + Supabase + Mercado Pago)
- Mesmos componentes UI (Modal bottom sheet, PageHeader, Btn, Card, etc.)
- Mesma paleta de cores e fontes (Bebas Neue + DM Sans)
