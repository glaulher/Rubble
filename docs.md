# Rubble — Documentação Técnica

SPA de gestão de manutenção de equipamentos de climatização. PHP puro, JS puro, MariaDB. Servido via USBWebserver (Apache + MySQL portáteis) em desenvolvimento; Docker Compose com Traefik em produção.

---

## 1. Visão Geral

### O que é

Rubble é um sistema de gestão de manutenção de equipamentos de climatização (HVAC). Permite controlar equipamentos, ordens de serviço, propostas de venda (PV), SCM (controle de medição), e ciclos de manutenção preventiva.

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | PHP 8.4 puro (mysqli), PHPMailer |
| Frontend | JS puro (sem framework), Tailwind v4 via CDN + fallback local |
| Database | MariaDB 11.4, charset utf8mb4 |
| Cache | APCu (Docker) / file-based (local) |
| PDF | html2canvas + jsPDF (client-side) |
| Email | PHPMailer (SMTP) |
| Auth | JWT HMAC-SHA256 (custom) |
| Server | Apache 2.4 + PHP (portable via USBWebserver) |
| Deploy | Docker Compose + Traefik (SSL) + DuckDNS |
| Testes | PHPUnit 11 (PHP) + Bun/Happy-DOM (JS) |

### Arquitetura

```
Controller → Service → Repository → Entity
```

- **Controllers:** Handle HTTP requests, validate input, delegate to services
- **Services:** Business logic, validation rules, data transformation
- **Repositories:** Data access (SQL queries, CRUD)
- **Entities:** Typed properties, data mapping

Sem framework. Sem IOC container. Autoloader manual (`config/autoloader.php`).

### Router + Middlewares

**`app/api/Router.php`** — Classe de 44 linhas:
- `addRoute(route, method, handler)` — fluent chaining
- `dispatch(route, method)` — lookup + invoke, retorna 404/405 JSON

**`app/api/index.php`** — ~248 linhas. Pipeline:

1. `CorsMiddleware::handle()` — CORS headers, security headers, OPTIONS preflight (204)
2. `AuthMiddleware::handle()` — JWT validation, role check, stores user
3. `RateLimitMiddleware::handle()` — Per-route IP rate limiting (60s window)
4. `Router::dispatch(route, method)` — Route lookup + handler invocation

---

## 2. Setup & Desenvolvimento

### Pré-requisitos

- PHP 8.4+ (ou binário `php/` do USBWebserver)
- MySQL / MariaDB
- Bun (para testes JS)

### Instalação (USBWebserver)

1. Executar `usbwebserver.exe` do diretório pai
2. Acessar: `http://localhost/root/`
3. Configurar `.env` copiando de `.env.example`

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DB_HOST` | Host do banco |
| `DB_NAME` | Nome do banco (`manutencao`) |
| `DB_USER` / `DB_PASS` | Credenciais MySQL |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Configurações SMTP |
| `JWT_SECRET` | String hex de 64 caracteres para assinatura JWT |
| `PV_EMAILS_ES` / `PV_EMAILS_RJ` | Destinatários PV por UF |
| `PV_EMAILS_ES_CC` / `PV_EMAILS_RJ_CC` | Cc por UF |
| `NOTIFY_EMAILS` | Destinatários notificação (separados por vírgula) |
| `APP_DEBUG` | Modo debug (`true`/`false`) |
| `ALLOWED_ORIGINS` | CORS origins (`*` para dev) |
| `DB_ROOT_PASSWORD` | Senha root MySQL |

### Comandos

> Todos os comandos dentro da pasta `root/`.

```bash
# Testes PHP
..\php\php.exe vendor\bin\phpunit
..\php\php.exe vendor\bin\phpunit tests/unit/ValidatorTest.php

# Testes JS
bun test
bun test tests/utils.test.js

# Instalar dependências (só dev/testes)
..\php\php.exe composer.phar install
bun install
```

### Estrutura de Diretórios

```
.                              ← Document root + repo root
├── index.html                 ← SPA entry (scripts carregados em ordem)
├── .env                       ← Credenciais (NÃO commitar)
├── config/
│   ├── autoloader.php         ← Autoload manual (NÃO usa vendor/autoload.php)
│   ├── Database.php           ← mysqli singleton
│   ├── Env.php                ← Leitor de .env
│   ├── schema.sql             ← Schema completo (Docker init)
│   ├── apache/site.conf       ← VirtualHost + PHP limits
│   ├── crontab                ← Cron job notificação (supercronic)
│   └── migrations/            ← Migrações SQL (executar manualmente)
├── app/api/
│   ├── index.php              ← Bootstrap + middleware + routes
│   ├── Router.php             ← Classe de roteamento
│   ├── Auth/                  ← JwtHelper, AuthService
│   ├── Middleware/             ← Cors, Auth, RateLimit
│   ├── Controllers/           ← 10 controllers
│   ├── Services/              ← 11 services
│   ├── Repositories/          ← 11 repositories
│   ├── Entities/              ← 5 entities
│   ├── Helpers/               ← Response, Request, Validator, Cache, etc.
│   └── Cron/check_notification.php
├── app/libs/PHPMailer/        ← PHPMailer (manual, não Composer)
├── app/Views/                 ← HTML parciais (carregados via fetch)
├── public/
│   ├── css/                   ← default.css, fonts.css
│   ├── tailwindcss.js         ← Tailwind v4 fallback local
│   └── js/
│       ├── auth.js            ← Login, token, auth guard
│       ├── router.js          ← Hash-based SPA router
│       ├── utils/             ← utils, csv, upload, report, polling
│       ├── components/        ← button, modal, messagebox, pagination
│       ├── home/              ← home-ui, equipment, form
│       ├── pv/                ← constants, form-utils, form, list, modals, dashboard
│       ├── user/              ← list, form (admin)
│       ├── equipment/         ← list, form, dashboard (admin/coordenador)
│       ├── equipment-prices/  ← list, form (admin)
│       ├── scm/               ← scm-list, scm-import
│       ├── preventive-cycle/  ← list (admin/coordenador)
│       └── lib/               ← chart, html2canvas, jspdf
├── tests/                     ← PHPUnit + Bun tests
├── OS/ / LAUDO/               ← Upload dirs (local, não versionado)
└── vendor/ / node_modules/    ← Dependências dev
```

---

## 3. API Reference

### Autenticação

- JWT HMAC-SHA256 manual (`app/api/Auth/JwtHelper.php`)
- Token no `sessionStorage`, enviado como `Authorization: Bearer <token>`
- Token TTL: 12 horas (43200s)
- Rotas públicas: apenas `auth` (login)

### Rotas

| Rota | Métodos | Ações |
|------|---------|-------|
| `auth` | POST, GET | `login()`, `me()`, `logout()` |
| `equipment` | GET | `listAll()`, `checkChiller()`, `ticketsByEquipment()`, `sumValue()`, `ticketsByIds()` |
| `tickets` | GET, POST, PUT, DELETE | `listByItem()`, `getById()`, `save()`, `import()`, `update()`, `delete()` |
| `dashboard` | GET | `stats()` |
| `pv-dashboard` | GET | `stats()` |
| `pv` | GET, POST, PUT, PATCH, DELETE | CRUD + `searchOs()`, `lookupItem()`, `searchLpuItems()`, `exportCsv()`, `sendEmail()`, `sendBatchEmail()`, `uploadFile()` |
| `equipment-management` | GET, POST, PUT, DELETE | Equipment CRUD (admin/coordenador) |
| `equipment-prices` | GET, POST, PUT, DELETE | Pricing CRUD (admin) |
| `users` | GET, POST, PUT, DELETE | User CRUD (admin) |
| `scm` | GET, POST, DELETE | SCM list, import, delete |
| `preventive-cycle` | GET, POST | listAll, summary, save, check-all, uncheck-all |
| `notify` | GET | Cron trigger |

### Middleware Pipeline

```
Request → CorsMiddleware → AuthMiddleware → RateLimitMiddleware → Router → Handler
```

**Rate Limits (por minuto):**

| Rota | Método | Limite |
|------|--------|--------|
| `pv` | POST/PUT/PATCH | 30 |
| `pv` | DELETE | 10 |
| `tickets` | POST/PUT/DELETE | 10 |
| `users` | POST/PUT/DELETE | 10 |
| `equipment-management` | POST/PUT/DELETE | 10 |
| `scm` | POST | 5 |
| `scm` | DELETE | 10 |
| `preventive-cycle` | POST | 10 |

### Permissões por Role

| Recurso | Admin | Supervisor | Coordenador | Cliente |
|---------|:-----:|:----------:|:-----------:|:-------:|
| Home (equip + tickets) | CRUD | CRUD | CRUD | R/O |
| Dashboard | ✅ | ✅ | ✅ | R/O |
| PV + PV Dashboard | CRUD | ❌ | CRUD (sem delete) | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ | ❌ |
| Gerenciar equipamentos | CRUD | ❌ | CRUD (sem delete) | ❌ |
| SCM Status | CRUD | ❌ | CRUD (sem delete) | ❌ |
| Ciclo Preventiva | CRUD | R/O | CRUD (sem delete) | ❌ |
| Cadastro Valor | CRUD | ❌ | ❌ | ❌ |

### Response Format

```json
{
  "success": true,
  "message": "Operação realizada",
  "data": { ... }
}
```

Erros: `{ "success": false, "message": "Erro msg" }` com HTTP status apropriado.

---

## 4. Database

### Tabelas Principais

| Tabela | Propósito |
|--------|-----------|
| `equipamentos` | Equipamentos HVAC |
| `enderecos` | Endereços |
| `registros` | Ordens de serviço / tickets |
| `pv` | Propostas de Venda |
| `pv_item` | Itens de PV |
| `pv_os` | PV ↔ registros (N:N) |
| `usuarios` | Usuários (auth) |
| `civil_lpu`, `material_*_lpu`, `servico_*_lpu` | Catálogos LPU |
| `scm` | SCM status tracking |
| `scm_items` | SCM itens (FK → scm) |
| `equipamento_precos` | Regras de preço |
| `preventive_cycle_items` | Ciclo preventiva |
| `cron_controle` | Controle de notificações |
| `login_attempts` | Rate limiting login |
| `rate_limits` | Rate limiting genérico |

### Schema Principal

```sql
CREATE TABLE usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    nome        VARCHAR(100) NOT NULL,
    role        ENUM('admin','supervisor','coordenador','cliente') NOT NULL DEFAULT 'cliente',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scm (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    scm             VARCHAR(100) NOT NULL UNIQUE,
    data            DATE,
    atividade       TEXT,
    site            VARCHAR(100),
    cidade          VARCHAR(100),
    abertura        VARCHAR(100),
    status          VARCHAR(50),
    data_execucao   DATE,
    data_validacao  DATE,
    medicao         VARCHAR(100),
    origem          VARCHAR(100),
    segmento        VARCHAR(100),
    obs             TEXT,
    equipamento_id  INT,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

CREATE TABLE scm_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    scm_id              INT NOT NULL,
    servico             TEXT,
    unidade             VARCHAR(50),
    valor               DECIMAL(12,2),
    qtde_execucao       DECIMAL(12,3),
    subtotal_execucao   DECIMAL(12,2),
    FOREIGN KEY (scm_id) REFERENCES scm(id) ON DELETE CASCADE
);

CREATE TABLE equipamento_precos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(50) NOT NULL,
    equipamento_pattern VARCHAR(100) DEFAULT NULL,
    locais_especiais    TEXT DEFAULT NULL,
    mercado             VARCHAR(50) DEFAULT NULL,
    valor               DECIMAL(12,2) NOT NULL,
    ativo               TINYINT(1) DEFAULT 1,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE preventive_cycle_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    ciclo           VARCHAR(7) NOT NULL,
    equipamento_id  INT NOT NULL,
    observacao      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (ciclo, equipamento_id),
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos(id)
);

CREATE TABLE login_attempts (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    ip_address    VARCHAR(45) NOT NULL,
    attempted_at  DATETIME NOT NULL,
    success       TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE rate_limits (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ip_address  VARCHAR(45) NOT NULL,
    endpoint    VARCHAR(100) NOT NULL,
    window_start DATETIME NOT NULL,
    request_count INT NOT NULL DEFAULT 1,
    UNIQUE KEY uk_rate (ip_address, endpoint, window_start)
);
```

### Migrations

Migrations ficam em `config/migrations/` e devem ser executadas manualmente:

```bash
docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/0XX_xxx.sql
```

Principais migrations:
- 008: `filtro_data` em pv_item
- 010: Status movido de pv para pv_item
- 011: Campo `orcamento` em pv_item
- 012: Tabela scm + local_scm
- 014: Normalização scm_items
- 015: Campo `mercado` em equipamentos
- 023: Tabela equipamento_precos
- 024: Índices + FULLTEXT search
- 025: Status SCM lowercase + preventive_cycle_items
- 027: local_scm para hubs
- 028: mercado para hubs

---

## 5. Módulos

### Equipment (Equipamentos)

- **CRUD:** `equipment-management` route (admin/coordenador)
- **Schema:** `equipamentos` + `enderecos` (FK)
- **Campos:** equipamento, capacidade, local, localidade, local_endereco, UF, endereco, local_scm, mercado
- **Dashboard:** Chart.js (Pareto de locais/máquinas/técnicos, tempo de resolução)
- **Permissões:** Admin CRUD completo, coordenador sem DELETE

### Equipment Pricing (Cadastro de Valores)

- **CRUD:** `equipment-prices` route (admin only)
- **Schema:** `equipamento_precos`
- **Regras de preço:**
  - `chiller_especial`: R$ 3.850,00 fixo (locais: MCEBC, RJDQC91, TNGBR, CPSCL)
  - `chiller`: R$ 3.642,14 fixo (Empresarial/Pessoal)
  - `tr`: capacidade × R$ 94,00 (Residencial)
- **Prioridade:** chiller_especial(1) > chiller(2) > tr(3)
- **`resolvePrice()`:** Matching por padrão LIKE + mercado + locais especiais

### Tickets / OS (Ordens de Serviço)

- **CRUD:** `tickets` route
- **Status workflow:** Pendente → Planejado → Em Andamento → Concluido / Projeto Clean Up
- **Import CSV:** `POST ?route=tickets&action=import`
  - Extrai site code do campo empresa
  - Busca equipamento por local (exato → LIKE fallback)
  - Matching por tag ou texto de problema/causa/solução

### PV (Propostas de Venda)

- **CRUD:** `pv` route
- **Items:** `pv_item` com status por item
- **LPU Autocomplete:** Busca em catálogos (civil, material, serviço)
- **Filtro Calculation:** Modal com cálculo de área (largura × altura × qtd × 2)
- **Email:** Envio HTML com tabela Memorial de Cálculo + Proposta
- **PDF:** html2canvas + jsPDF com wrapped text
- **CSV Export:** Encoding Windows-1252
- **Batch Email:** `POST ?route=pv&action=send-batch-email` com `ids[]`

**Convenções de Campo:**
- Equipamento: exibe `WM 01 — 10 TR - Container 1`
- Localidade: apenas em `equipamentos.localidade` (JOIN no PV)
- Laudo: default "N/A", salva `null` no banco
- LPU Origem: auto-seta Fatura para "LPU"
- Quantidade: integer para unidades UN., TR, KIT, etc.; fração para M², M, KG

### SCM (Controle de Medição)

- **CRUD:** `scm` route (admin/coordenador)
- **Schema:** `scm` (parent) + `scm_items` (FK com CASCADE)
- **Import CSV:** Auto-delimiter (`;` ou `,`), BOM strip, pula ABERTO/EM ABERTO
- **Status mapping:**
  | CSV | Exibido | Badge |
  |-----|---------|-------|
  | GERADO | SCM aprovado | emerald |
  | NEGADO | SCM negado | red |
  | CONFERIDO/VALIDADO | SCM verificado | blue |
  | EXECUTADO | SCM enviado | purple |
- **PV Sync:** Status em `PV_SYNC_STATUSES` propagado para `pv_item.status`
- **Filtros:** Data início/fim, Segmento (multi-select), Site (multi-select), Status, Busca livre
- **Badge Mercado:** Cross-validation entre `scm.origem` e `equipamentos.mercado`

### Users (Usuários)

- **CRUD:** `users` route (admin only)
- **Username = email** (campo email salvo como username)
- **Password:** hash único (`password_hash`), sempre obrigatório
- **Self-delete:** Bloqueado

### Preventive Cycle (Ciclo Preventiva)

- **Rota:** `preventive-cycle`
- **Endpoints:** listAll, summary, save, check-all, uncheck-all
- **Filtros:** Radio buttons (sem filtro / com observação / selecionados)
- **Badge:** Server-side `SUM CASE WHEN` com lógica de preços, polling 30s
- **Agrupamento:** `local - hubRecase(local_scm) - localidade`

### Home (Dashboard Principal)

- **Cards de equipamento:** Agrupados por local
- **Polling:** 30s via `PollingManager`, Visibility API pause/resume
- **Incremental DOM:** `syncHomeCards()` atualiza in-place por `data-equip-id`
- **Badge total:** `#counterValue` via polling separado

---

## 6. Frontend

### SPA Router

- Hash-based (`#/route`)
- Views carregadas via `fetch()`, HTML injetado com `innerHTML`
- Init chamado em `requestAnimationFrame`
- `PollingManager.stopAll()` em toda navegação

### Componentes Compartilhados

**`iconButtonHtml(type, tooltip, attrs, tooltipPos)`** (`components/button.js`):
- Tipos: `edit` (blue), `delete` (red), `status` (amber)
- SVG inline com `currentColor`
- Tooltip com `group-hover:scale-100`

**`confirmDelete(title, message, itemName)`** (`components/messagebox.js`):
- Modal dedicado para delete (`#modalDeleteConfirm`)
- Retorna Promise<boolean>

**`confirmAction()`**: Modal genérico de confirmação
**`showToast(msg, type)`**: Toast notification (success/error/loading)

### Dark Mode

- Toggle moon/sun na top bar, persistido em `localStorage('theme')`
- Init no `<head>` antes do paint (previne flash)
- `prefers-color-scheme: dark` como default
- Login page sempre light (imune ao dark mode)
- CSS Variables em `default.css` com overrides `!important`
- Tailwind CDN sobrescreve CSS customizado — usar `!important` em `.dark`

### Skeleton Screen

- Placeholder visual durante carregamento inicial
- Logo Monster (80x80px) com animação `skeleton-breathe`
- Removido implicitamente por `router.js` via `innerHTML`

### Real-time Polling + Cache

- **Polling 30s** (não SSE/WebSocket)
- **Cache:** APCu primário, file fallback. TTL 10s
- **Visibility API:** Pausa quando aba em background
- **Incremental DOM:** Atualiza in-place, preserva estado expandido
- **Hash comparison:** Só atualiza DOM se dados mudaram

### Upload Progress Bar

- `XMLHttpRequest` com `xhr.upload.onprogress`
- `uploadWithProgress(url, formData, { onProgress })` em `utils/upload.js`
- Toast com barra de progresso `#toastProgressBar`
- Cache-busting: `?v=N` em scripts do `index.html`

---

## 7. Deploy

### Docker Compose + Traefik

```bash
# Clone e configure
git clone https://github.com/glaulher/Rubble.git /opt/rubble
cp .env.example .env  # editar com credenciais reais

# Subir (Traefik auto-provisiona SSL via Let's Encrypt)
docker compose up -d --build

# phpMyAdmin via SSH tunnel
ssh -L 8080:localhost:8080 user@vps
```

### Variáveis de Produção

| Variável | Valor |
|----------|-------|
| `DB_HOST` | `db` (nome do container) |
| `ALLOWED_ORIGINS` | `https://seudominio.duckdns.org` |
| `APP_DEBUG` | `false` |

### Comandos de Deploy

```bash
# Atualização normal (código):
git pull && docker compose up -d --build

# Migration nova:
docker exec -i rubble-db mariadb -u root -pSENHA manutencao < config/migrations/0XX_xxx.sql

# Ativar mod_headers (só na primeira vez):
docker exec rubble-app a2enmod headers && docker exec rubble-app service apache2 restart
```

### DuckDNS

```bash
# /home/rubble/duckdns.sh
curl -s "https://www.duckdns.org/update?domains=seudominio&token=SEU_TOKEN&ip=" -o ~/duckdns.log
# crontab -e: */5 * * * * /home/rubble/duckdns.sh >/dev/null 2>&1
```

---

## 8. Segurança

### CORS Validation

- `ALLOWED_ORIGINS=*` rejeitado quando `APP_DEBUG=false`
- Newlines no origin rejeitados com erro 500

### Login Rate Limiting

- Max 5 tentativas fracassadas por IP em 5 minutos
- Tabela `login_attempts`

### Error Sanitization

- `Response::serverError($e)` loga erro real em `error_log()`
- Retorna mensagem genérica ao client
- Se `APP_DEBUG=true`, retorna `$e->getMessage()`

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Apache Hardening

- `ServerTokens Prod`
- `ServerSignature Off`
- `TraceEnable Off`
- `php_flag expose_php off`

---

## 9. Convenções & Padrões

### Button Palette (Pastel)

| Função | Classes |
|--------|---------|
| Primary (emerald) | `bg-emerald-200 hover:bg-emerald-300 text-emerald-800` |
| Secondary (sky) | `bg-sky-200 hover:bg-sky-300 text-sky-800` |
| Submit forms (blue) | `bg-blue-200 hover:bg-blue-300 text-blue-800` |
| Danger (red) | `bg-red-200 hover:bg-red-300 text-red-800` |
| Neutral (slate) | `bg-slate-200 hover:bg-slate-300 text-slate-900` |
| Ícones tabela | `bg-*-100 hover:bg-*-200 text-*-600 p-2 rounded-xl` |

Sem sombras — `shadow-lg` removido de todos os botões.

### Quantity Validation

- `UNIT_MIN_ONE`: CONJUNTO, CV, DIARIA, HH, HORA, KIT, LOCAÇÃO MENSAL, MENSAL, PAR, PÇ, PEÇA, PONTO, PROJETO, SACO, SERV., TR, UN., UNIDADE, UNIT
- Regra: valores inteiros (1.5, 2.3 bloqueados)
- Outras unidades (M², M, KG) permitem fração

### SCM Status lowercase

Todos os status SCM são lowercase (`SCM aprovado`, não `SCM Aprovado`). Migration 025 aplica retroativamente.

### hubRecase + local_scm

`home-ui.js` usa `hubRecase(local_scm)` para converter HUBs de UPPER para Title Case nos headers de site.

### PV Status por Item

Status está em `pv_item`, não em `pv` (migration 010). Queries devem JOINar com `pv_item`.

---

## 10. Armadilhas Conhecidas

- **Número PV:** Formato `YYNNNN`. Regra hardcoded `if ($prefix === '26' && $next < 145)` — ajuste de implantação.
- **FORNECIMENTO_ID:** Resolvido dinamicamente por `PvService::getFornecimentoId()`.
- **Bun é só para testes JS.** Composer é só para PHPUnit.
- **O projeto funciona sem vendor/autoload.php.**
- **PHPMailer** está em `app/libs/PHPMailer/` — incluído manualmente.
- **USBWebserver é o ambiente-alvo.**
- **Import CSV:** UTF-8 com fallback ISO-8859-1. BOM detectado e removido.
- **PDF drawWrappedRow:** Sempre usar `String(...)` no valueGetter.
- **Button cursor:** `default.css` tem `button { cursor: pointer; }` global.
- **BOM em config files:** UTF-8 BOM quebra Apache e supercronic.
- **Case-sensitivity Linux:** `config/Database.php` com D maiúsculo.
- **Volume permissions:** Volumes Docker sobrescrevem permissões do Dockerfile.
- **Traefik timeout upload:** Configurado para 120s.
- **APCu não disponível no USBWebserver local:** Fallback file-based.
- **sessionStorage vs localStorage:** Token usa sessionStorage, tema usa localStorage.
- **Nunca usar `onclick="..."` inline** no HTML gerado via innerHTML.
- **SQL error leak:** Todos os repositories logam erro real e retornam mensagem genérica.
- **Upload validation:** PDF validado por magic bytes (`%PDF-`), limite 2MB.
- **XSS via onclick + escapeHtml():** Migração para `data-*` + `addEventListener` obrigatória.
- **Env::get() retorna string, não boolean:** Comparar com `=== 'true'`.
- **Tailwind CDN vs CSS cascade:** CDN injeta `<style>` DEPOIS de CSS estático.
- **`public/tailwindcss.js` NÃO PODE SER MODIFICADO.**
- **Dark mode login immune:** Remover classe `dark` via JS, não CSS.
- **Equipment Pricing `sumValueByFilter()` hardcoded:** Não usa tabela de regras.
- **Router class é deliberadamente fina:** Só registro + dispatch.
- **Skeleton screen removido implicitamente:** `router.js` substitui via `innerHTML`.
- **SCM status lowercase:** Migration 025 unifica para lowercase.
- **Cache invalidation:** Controllers devem chamar `Cache::deleteByPrefix()` após mutations.
- **Incremental DOM + stale hash:** `initHome()` reseta `lastHomeHash` para `''`.
- **`<IfModule mod_php8.c>` no Docker:** Remover wrapper, declarar `php_value` diretamente.
- **Cache-busting `?v=N`:** Incrementar a cada mudança no `index.html`.

---

## 11. Escalabilidade

### Limites Atuais

| Métrica | Limite seguro | Limite máximo |
|---------|---------------|---------------|
| Equipamentos | ~10.000 | ~20.000+ |
| Usuários simultâneos (Docker) | 500 | 1.000+ |
| Usuários simultâneos (USBWeb) | 1-3 | 5 |

### Fases Concluídas

**Fase 1:**
- Tickets removidos da listagem (payload -80%)
- `sumValueByFilter()` movido para SQL (CASE WHEN)
- APCu cache (TTL 10s)
- Endpoint leve para badge total

**Fase 2:**
- Virtual scrolling (`content-visibility: auto`)
- Badge polling separado (30s) + list polling (60s)
- MySQL indexes + FULLTEXT search
- Batch ticket endpoint + CSV export filtrado

### Fase 3 (futuro, >500 users)

- SSE para substituir polling
- PHP-FPM tuning + Nginx reverse proxy
- Summary table/materialized view para badge

---

*Documentação gerada a partir do AGENTS.md. Última atualização: 2026-06-10.*
