# Rubble

HVAC equipment maintenance management SPA. PHP + Vanilla JS + MariaDB.

## Documentation

For full technical documentation (API reference, database schema, architecture, deployment, security, and known pitfalls), see **[docs.md](docs.md)**.

## Features

- **Authentication & RBAC** — JWT HMAC-SHA256 with roles: admin, supervisor, coordenador, cliente
- **Equipment Management** — CRUD with pagination, debounced search, infinite scroll
- **Service Orders (OS)** — Full CRUD with status workflow: Pendente → Planejado → Em Andamento → Concluido / Projeto Clean Up; ordered by status priority in cards
- **PV (Propostas de Venda)** — Full CRUD with items, LPU catalog autocomplete, FLPU fields, status funnel
- **Filter Calculation** — Per-item air filter area calculator (checkbox + modal), stored as JSON in `pv_item.filtro_data`
- **LPU Invoice Auto-Select** — Choosing LPU Origin auto-sets Invoice to LPU
- **Laudo Default "N/A"** — Laudo field defaults to "N/A", saves as `null` when unchanged
- **PV Email Dispatch** — HTML table with Memorial de Calculo + Proposta, conditional FLPU columns, CC support, OS/laudo PDF attachments
- **PV Dashboard** — Chart.js financial charts (total by status, top locations)
- **Equipment Dashboard** — Pareto charts (locations, machines, technicians), resolution time analysis
- **User Management** — Admin CRUD with password hashing, role assignment, self-delete prevention
- **Equipment Management (Admin)** — Admin/coordenador CRUD with address find-or-create, integrity check on delete
- **Equipment Pricing** — Admin-only CRUD with rule-based pricing (TR/Chiller), mercado filter, home page value badges
- **SCM (Service Control)** — CSV import with auto-detected delimiter, status mapping, multi-select dropdown filters (site/segmento), market cross-validation badge, PV status sync on import
- **Preventive Cycle** — Cycle-based equipment tracking with checkbox/radio filters (observacao/selecionados/sem_scm/lancados), bulk check-all/uncheck-all, SCM validation per card, real-time valor badge
- **PDF Audit** — CLIP-based AI report validation against reference PDFs; reference upload with progress simulation; OCR mode for non-AI validation; collapsible cards with photo comparison table
- **Planned Activities** — Site-level preventive planning (atividades_preventivas) + corrective ticket planning (registros), status workflow, CSV export, tooltips on action buttons
- **CSV Export** — Equipment + ticket rows filtered by search term, per-ticket status in each row; PV items export with Windows-1252 encoding
- **PDF Report** — PV items PDF via html2canvas + jsPDF with wrapped text and Memorial de Calculo; Dashboard PDF with smart page breaks
- **CSV Import** — OS import from CSV with UTF-8/Latin-1 detection, site code extraction, tag-based equipment matching
- **Real-Time Polling** — 30s with APCu cache (file fallback), hash comparison for incremental DOM, random jitter to prevent thundering herd, Visibility API pause/resume
- **Keyset Pagination** — Efficient infinite scroll via `WHERE e.id > ? LIMIT ?` instead of `LIMIT/OFFSET`
- **FULLTEXT Search** — `MATCH ... AGAINST` in BOOLEAN MODE for equipment search ≥ 3 chars (fallback LIKE for shorter queries)
- **Gzip Compression** — Nginx-level gzip for JSON API responses (~80% bandwidth reduction)
- **Email Notifications** — Cron-based SMTP dispatch for scheduled OS
- **Security Hardening** — CORS validation, login rate limiting (5/5min), error sanitization with `Response::serverError()`, CSP headers, HSTS, Apache hardening, token blacklist
- **Dark Mode** — Toggle with localStorage persistence, prefers-color-scheme fallback, login page immune (always light), CSS variable system
- **Dashboard PDF** — Full dashboard capture with smart page breaks

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.4 (pure, mysqli) |
| Frontend | Vanilla JS + Tailwind CSS v4 + Chart.js |
| Database | MariaDB 11.4, utf8mb4 |
| Cache | APCu (Docker) / file-based fallback (local) |
| PDF | html2canvas + jsPDF (client-side) |
| Email | PHPMailer (SMTP) |
| Auth | JWT HMAC-SHA256 (custom, no libs) |
| Server | Apache 2.4 + PHP (portable via USBWebserver) |
| Deploy | Docker Compose + Traefik (SSL) + DuckDNS |
| PHP Tests | PHPUnit 11 + Composer |
| JS Tests | Bun + Happy-DOM |

## Quick Start

### Prerequisites

- PHP 8.4+ or bundled `php/` binary
- MySQL / MariaDB
- [Bun](https://bun.sh) (for JS tests)

### 1. Database

Import the schema and run migrations:

```bash
mysql -u root -p manutencao < config/schema.sql
# Then run each migration in config/migrations/ manually
```

### 2. Configuration

```bash
cp .env.example .env
```

Key env vars:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Database host |
| `DB_NAME` | Database name (`manutencao`) |
| `DB_USER` / `DB_PASS` | MySQL credentials |
| `SMTP_*` | Gmail SMTP settings |
| `JWT_SECRET` | 64-char hex for token signing |
| `PV_EMAILS_ES` / `PV_EMAILS_RJ` | PV email recipients per state |
| `PV_EMAILS_ES_CC` / `PV_EMAILS_RJ_CC` | CC recipients per state |
| `NOTIFY_EMAILS` | Notification recipients (comma-separated) |
| `APP_DEBUG` | Debug mode (`true`/`false`) |
| `ALLOWED_ORIGINS` | CORS allowed origins (`*` for dev) |

### 3. Start (USBWebserver)

Run `usbwebserver.exe` from the parent directory. Apache + MySQL + PHP start automatically.

Access: http://localhost/root/

### 4. Dev Dependencies

```bash
# PHP (tests only)
.\php\php.exe composer.phar install

# JS (tests only)
bun install
```

## Tests

```bash
# PHP
.\php\php.exe vendor\bin\phpunit

# JS
bun test
```

## Project Structure

```
.                                  # Document root + repo root
├── index.html                     # SPA entry (scripts loaded in order)
├── .env                           # Environment config (not committed)
├── config/
│   ├── autoloader.php             # PSR-4-like autoloader
│   ├── database.php               # mysqli singleton
│   ├── Env.php                    # .env parser
│   └── migrations/                # SQL migrations (local only)
├── app/api/
│   ├── index.php                  # Router: ?route=
│   ├── Auth/                      # JwtHelper, AuthService
│   ├── Controllers/               # 10 controllers
│   ├── Services/                  # 11 services
│   ├── Repositories/              # 11 repositories
│   ├── Entities/                  # 5 entities
│   ├── Helpers/                   # Response, Request, Validator, MailerFactory, Cache, RateLimiter
│   └── Cron/check_notification.php
├── app/Views/                     # HTML parciais organizados por módulo (fetched via SPA)
├── app/libs/PHPMailer/            # PHPMailer (vendored, not Composer)
├── public/js/
│   ├── auth.js                    # Login, logout, token, auth guard
│   ├── router.js                  # Hash-based SPA router
│   ├── utils/                     # utils, csv, upload, report, polling
│   ├── components/                # modal, messagebox, pagination
│   ├── home/                      # home-ui, equipment, form
│   ├── equipment/                 # dashboard, list, form (admin/coordenador)
│   ├── equipment-prices/          # list, form (admin)
│   ├── pv/                        # constants, form-utils, form, list, modals, dashboard
│   ├── user/                      # list, form (admin)
│   ├── scm/                       # scm-list, scm-import (admin/coordenador)
│   ├── preventive-cycle/          # list (admin/coordenador)
│   ├── planned-activity/          # list (preventive + corrective planning)
│   └── lib/                       # chart.umd.min, html2canvas.min, jspdf.umd.min
├── public/css/                    # default.css, fonts.css
├── public/fonts/Montserrat.woff2
├── public/tailwindcss.js          # Tailwind v4 local fallback
├── tests/                         # PHPUnit + Bun tests
├── composer.json / composer.lock  # PHP dev deps
├── package.json / bun.lock        # JS dev deps
├── vendor/                        # Composer packages (PHPUnit)
├── node_modules/                  # NPM packages (Happy-DOM)
├── phpunit.xml
├── AGENTS.md                      # Dev guide
└── OS/ / LAUDO/                   # Upload dirs (local, not versioned)
```

Script load order (index.html): `sidebar.js` → `auth.js` → libs (chart, html2canvas, jspdf) → utils (utils, polling) → components (modal, messagebox, pagination, button) → utils (csv, upload, report) → home (home-ui, equipment, form) → equipment/dashboard → pv/dashboard → pv (constants, form-utils, form-item-row, form-autocomplete, form-filter, list, modals, modal-email, pdf-export, csv-export, form) → user → equipment (list, form) → equipment-prices → scm → preventive-cycle → planned-activity → `router.js`

## API Routes

| Route | Methods | Actions |
|-------|---------|---------|
| `auth` | POST, GET | `login()`, `me()`, `logout()` |
| `equipment` | GET | `listAll()`, `checkChiller()`, `ticketsByEquipment()`, `sumValue()`, `ticketsByIds()` |
| `tickets` | GET, POST, PUT, DELETE | `listByItem()`, `getById()`, `save()`, `import()`, `update()`, `delete()` |
| `dashboard` | GET | `stats()` (equipment) |
| `pv-dashboard` | GET | `stats()` (PV financial) |
| `pv` | GET, POST, PUT, PATCH, DELETE | CRUD + `searchOs()`, `lookupItem()`, `searchLpuItems()`, `exportCsv()`, `sendEmail()`, `sendBatchEmail()`, `uploadFile()` |
| `locals` | GET | `getLocals()` (autocomplete) |
| `equipment-management` | GET, POST, PUT, DELETE | Equipment CRUD (admin/coordenador) |
| `equipment-prices` | GET, POST, PUT, DELETE | Pricing CRUD (admin), `listAll()`, `getById()`, `save()`, `resolvePrice()` |
| `users` | GET, POST, PUT, DELETE | User CRUD (admin) |
| `scm` | GET, POST, DELETE | `listAll()`, `getById()`, `import()`, `delete()`, `segments()`, `sites()` |
| `preventive-cycle` | GET, POST | `listAll()`, `summary()`, `save()`, `check-all()`, `uncheck-all()`, `scmStatusCount()`, `validateScm()` |
| `planned-activities` | GET, POST, DELETE | `listAll()`, `exportCsv()`, `plan()`, `delete()` |
| `preventiva` | POST, DELETE | `plan()`, `updateStatus()`, `delete()` |
| `pdf-audit` | GET, POST | `setReference()`, `audit()`, `getReference()`, `clearReference()`, `health()` |
| `notify` | GET | Cron trigger |

All routes (except `auth`) require JWT Bearer token. Access controlled by role.

## Permissions

| Resource | Admin | Supervisor | Coordenador | Cliente |
|----------|-------|-----------|-------------|---------|
| Home (equip + tickets) | CRUD | CRUD | CRUD | R/O |
| Dashboard | yes | yes | yes | R/O |
| PV + PV Dashboard | CRUD | no | CRUD (no delete) | no |
| Manage Users | yes | no | no | no |
| Manage Equipment | CRUD | no | CRUD (no delete) | no |
| SCM Status | CRUD | no | CRUD (no delete) | no |
| Preventive Cycle | CRUD (save) | R/O | R/O | no |
| Planned Activities | CRUD | no | CRUD (no delete) | R/O |
| Equipment Pricing | CRUD | no | no | no |

## Database

Main tables:

| Table | Purpose |
|-------|---------|
| `equipamentos` | HVAC equipment |
| `enderecos` | Addresses |
| `registros` | Service orders / tickets |
| `pv` | Propostas de Venda |
| `pv_item` | PV line items |
| `pv_os` | PV <-> registros N:N join |
| `usuarios` | Users (auth) |
| `civil_lpu`, `material_*_lpu`, `servico_*_lpu` | LPU price catalogs |
| `scm` | SCM status tracking |
| `scm_items` | SCM line items (FK → scm, ON DELETE CASCADE) |
| `equipamento_precos` | Equipment pricing rules |
| `preventive_cycle_items` | Preventive maintenance cycles |
| `atividades_preventivas` | Planned activities (preventive, site-level) |
| `cron_controle` | Notification execution control |
| `login_attempts` | Rate limiting for login |
| `rate_limits` | Generic rate limiting |
| `token_blacklist` | Logged-out / revoked JWT tokens |

## License

MIT

## Deployment (Docker + Traefik)

```bash
# Clone and configure
git clone https://github.com/glaulher/Rubble.git /opt/rubble
cp .env.example .env  # edit with real credentials

# Start (Traefik auto-provisions SSL via Let's Encrypt)
docker compose up -d --build

# phpMyAdmin via SSH tunnel
ssh -L 8080:localhost:8080 user@vps
# Then open http://localhost:8080
```
