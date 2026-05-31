# Rubble

HVAC equipment maintenance management SPA. PHP + Vanilla JS + MariaDB.

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
- **CSV Export** — PV items export with Windows-1252 encoding
- **PDF Report** — PV items PDF via html2canvas + jsPDF with wrapped text and Memorial de Calculo
- **CSV Import** — OS import from CSV with UTF-8/Latin-1 detection
- **Email Notifications** — Cron-based SMTP dispatch for scheduled OS
- **Dashboard PDF** — Full dashboard capture with smart page breaks

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.5 (pure, mysqli) |
| Frontend | Vanilla JS + Tailwind CSS v4 + Chart.js |
| Database | MariaDB 11.4, utf8mb4 |
| PDF | html2canvas + jsPDF (client-side) |
| Email | PHPMailer (SMTP) |
| Auth | JWT HMAC-SHA256 (custom, no libs) |
| Server | Apache 2.4 + PHP (portable via USBWebserver) |
| PHP Tests | PHPUnit 11 + Composer |
| JS Tests | Bun + Happy-DOM |

## Quick Start

### Prerequisites

- PHP 8.0+ or bundled `php/` binary
- MySQL / MariaDB
- [Bun](https://bun.sh) (for JS tests)

### 1. Database

Import the schema dump and run migrations:

```bash
mysql -u root -p manutencao < "manutencao (2).sql"
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
| `NOTIFY_EMAILS` | Notification recipients (comma-separated) |

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
│   ├── Controllers/               # 9 controllers
│   ├── Services/                  # 9 services
│   ├── Repositories/              # 9 repositories
│   ├── Entities/                  # 4 entities
│   ├── Helpers/                   # Response, Request, Validator, MailerFactory
│   └── Cron/check_notification.php
├── app/Views/                     # 11 HTML partials (fetched via SPA)
├── app/libs/PHPMailer/            # PHPMailer (vendored, not Composer)
├── public/js/
│   ├── auth.js                    # Login, logout, token, auth guard
│   ├── router.js                  # Hash-based SPA router
│   ├── utils/                     # utils, csv, upload, report
│   ├── components/                # modal, messagebox, pagination
│   ├── home/                      # home-ui, equipment, form
│   ├── pv/                        # constants, form-utils, form, list, modals
│   ├── dashboard/                 # equipamentDashboard, pvDashboard
│   ├── user/                      # list, form (admin)
│   ├── equipment-manager/         # list, form (admin/coordenador)
│   └── lib/                       # chart.umd.min, html2canvas.min, jspdf.umd.min
├── public/css/                    # default.css, fonts.css
├── public/fonts/Montserrat.woff2
├── public/style.js                # Tailwind v4 CDN build
├── tests/                         # PHPUnit + Bun tests
├── composer.json / composer.lock  # PHP dev deps
├── package.json / bun.lock        # JS dev deps
├── vendor/                        # Composer packages (PHPUnit)
├── node_modules/                  # NPM packages (Happy-DOM)
├── phpunit.xml
├── AGENTS.md                      # Dev guide
└── OS/ / LAUDO/                   # Upload dirs (local, not versioned)
```

Script load order (index.html): `auth.js` → libs → utils → components → home → dashboard → pv → user → equipment-manager → `router.js`

## API Routes

| Route | Methods | Actions |
|-------|---------|---------|
| `auth` | POST, GET | `login()`, `me()`, `logout()` |
| `equipment` | GET | `listAll()`, `checkChiller()` |
| `tickets` | GET, POST, PUT, DELETE | `listByItem()`, `getById()`, `save()`, `import()`, `update()`, `delete()` |
| `dashboard` | GET | `stats()` (equipment) |
| `pv-dashboard` | GET | `stats()` (PV financial) |
| `pv` | GET, POST, PUT, PATCH, DELETE | CRUD + `searchOs()`, `lookupItem()`, `searchLpuItems()`, `exportCsv()`, `sendEmail()`, `uploadFile()` |
| `locals` | GET | `getLocals()` (autocomplete) |
| `notify` | GET | Cron trigger |
| `users` | GET, POST, PUT, DELETE | User CRUD (admin) |
| `equipment-management` | GET, POST, PUT, DELETE | Equipment CRUD (admin/coordenador) |

All routes (except `auth`) require JWT Bearer token. Access controlled by role.

## Permissions

| Resource | Admin | Supervisor | Coordenador | Cliente |
|----------|-------|-----------|-------------|---------|
| Home (equip + tickets) | CRUD | CRUD | CRUD | R/O |
| Dashboard | yes | yes | yes | R/O |
| PV + PV Dashboard | CRUD | no | CRUD (no delete) | no |
| Manage Users | yes | no | no | no |
| Manage Equipment | CRUD | no | CRUD (no delete) | no |

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
| `cron_controle` | Notification execution control |

## License

MIT
