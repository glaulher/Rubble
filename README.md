# Rubble

SPA de gestão de manutenção de equipamentos de climatização (HVAC). Desenvolvido em PHP 8.4 puro + Vanilla JS + MariaDB 11.4 com Tailwind CSS v4 e microserviço de IA para auditoria de PDFs.

## Documentação Completa & Manual de Uso

Para o manual operacional detalhado (como usar cada tela, fluxos de trabalho, regras de negócio) e documentação técnica completa (API reference, schema SQL, deploy, segurança e troubleshooting), consulte o **[docs.md](docs.md)**.

## Principais Funcionalidades

- **Autenticação & RBAC** — Autenticação segura via JWT (HMAC-SHA256) com controle de acesso por papéis (`admin`, `coordenador`, `supervisor`, `administrativo`, `cliente`) e blacklist de tokens revogados no logout.
- **Home & Gestão de Máquinas** — Consulta rápida de equipamentos por Site/HUB com paginação por keyset, scroll infinito, badges de capacidade (TR), mercado e valor estimado de manutenção, além de busca em tempo real (suporte a FULLTEXT).
- **Ordens de Serviço (OS Corretivas)** — Gestão de chamados corretivos com fluxo de status (Pendente → Planejado → Em Andamento → Concluído / Projeto Clean Up), controle de prioridades (P0 a P5), responsável técnico, causa, solução e histórico completo.
- **Gestão de OS (Painel Operacional)** — Painel dedicado para acompanhamento de todas as OSs corretivas com tabela detalhada, linhas expansíveis de detalhes, filtros por coluna de data (Abertura, PV, Programada, Conclusão), filtro multi-select de status e exportação CSV.
- **Atividades Planejadas (Planejamento)** — Feed unificado de planejamento diário agrupado por data com dia da semana, cobrindo Preventivas em nível de Site (`atividades_preventivas`) e Corretivas em nível de Equipamento (`registros`), com duplicação de dia inteiro, reagendamento de datas e edição rápida inline de equipes e observações.
- **Ciclo de Manutenção Preventiva** — Acompanhamento periódico de preventivas por ciclos de medição (dia 16 a 15), filtros rápidos (Com Observação, Selecionados, Sem SCM, Lançados), seleção em lote, validação de número SCM em tempo real e badge financeiro/operacional consolidado.
- **Propostas de Venda (PV)** — Criação e controle de orçamentos LPU e FLPU, autocomplete em catálogos oficiais (Civil, Materiais e Serviços de Climatização/Chiller), calculadora de área de filtros de ar (Memorial de Cálculo), exportação em PDF e CSV.
- **Envio de E-mail & Aprovação Automática de PV** — Disparo individual ou em lote (Batch Email) de propostas formatadas em HTML com PDFs de OS/laudos anexados, e robô leitor IMAP (*Mail Watcher*) que processa respostas de e-mail e aprova automaticamente os itens da PV no sistema.
- **Controle de Medição (SCM)** — Importação de relatórios CSV do SCM com detecção inteligente de delimitador/encoding, mapeamento automático de status, sincronização com as PVs correspondentes, validação cruzada de mercado (SCM vs Equipamento) e filtros multi-select por Segmento e Site.
- **Troca de Filtros** — Registro e histórico de trocas de filtros de ar por máquina e site, com filtros de status, seletor customizado de colunas e exportação em CSV.
- **Auditoria de Laudos com IA (PDF Audit)** — Microserviço em Python (FastAPI + CLIP ViT-B/32) para validação automatizada de conformidade de laudos em PDF contra documentos de referência (análise de fotos e campos obrigatórios) com modo alternativo OCR.
- **Dashboards Gerenciais (4 Módulos)**:
  - **Equipment Dashboard** — Gráficos de Pareto de locais críticos, máquinas com maior incidência de chamados e produtividade de técnicos, além de tempo médio de resolução (MTTR).
  - **OS Dashboard** — Indicadores de ordens de serviço corretivas, distribuição por prioridade (P0 a P5), análise de responsabilidade (Prestador vs Claro) e exportação em PDF gerencial.
  - **Preventiva Dashboard** — Acompanhamento de metas preventivas com KPIs consolidados, barras por status, Treemap proporcional por Site e navegação rápida por ciclos de medição (16 a 15) com exportação em PDF.
  - **PV Dashboard** — Indicadores financeiros e funil de aprovação de propostas de venda, valores totais por status e ranking de localidades com maior faturamento.
- **Cadastros Administrativos** — Gestão completa de Usuários (com redefinição de senhas e papéis), Cadastro de Equipamentos/Endereços e Cadastro de Regras de Precificação por TR/Chiller/Mercado.
- **Plataforma & UX** — Dark Mode persistente em `localStorage` (com tela de login imune), contagem em tempo real de usuários ativos, integração dinâmica com o sistema parceiro Tempo Fechado, polling eficiente com verificação de hash MD5 e cache APCu/arquivo.

## Stack Tecnológica

| Camada | Tecnologia | Detalhes |
|--------|-----------|----------|
| **Backend** | PHP 8.4 puro | Sem frameworks pesados, arquitetura Controller → Service → Repository |
| **Frontend** | Vanilla JS + Tailwind CSS v4 | SPA hash-based, ES modules, Chart.js, html2canvas, jsPDF |
| **Database** | MariaDB 11.4 | Charset `utf8mb4`, queries otimizadas, FULLTEXT search |
| **Microserviço IA** | Python 3.12 + FastAPI + CLIP | Comparação visual de laudos técnicos (`rubble-pdf-checker/`) |
| **Email & IMAP** | PHPMailer + IMAP PHP | Disparo SMTP e watcher de aprovação via IMAP Gmail |
| **Cache & Polling** | APCu / Arquivo local | Invalidação por prefixo e polling incremental (30s com jitter) |
| **Servidor & Deploy** | Nginx / Apache + Traefik | Docker Compose com SSL automático via Let's Encrypt |
| **Testes** | PHPUnit 11 + Bun | Testes unitários PHP e testes de interface/módulos JS |

## Estrutura do Projeto

```
.                                  # Document root + repo root
├── index.html                     # SPA entrypoint com sidebar e top bar centralizada
├── .env.example                   # Modelo de variáveis de ambiente
├── Dockerfile / Dockerfile.cron   # Containers PHP-FPM / CLI supercronic
├── Dockerfile.pdf-checker         # Container do microserviço FastAPI + CLIP
├── docker-compose.yml             # Orquestração (Traefik, App, DB, phpMyAdmin, Cron, PDF Checker)
├── config/
│   ├── autoloader.php             # Autoload manual PSR-4-like
│   ├── Database.php               # Singleton de conexão mysqli
│   ├── Env.php                    # Leitor de arquivo .env
│   ├── schema.sql                 # Schema DDL completo do banco
│   └── crontab                    # Agendamento de crons no supercronic
├── app/api/
│   ├── index.php                  # Bootstrap, middlewares e registro de rotas
│   ├── Router.php                 # Roteador minimalista (addRoute / dispatch)
│   ├── Auth/                      # JwtHelper e AuthService (login, RBAC, blacklist)
│   ├── Middleware/                 # CorsMiddleware, AuthMiddleware, RateLimitMiddleware
│   ├── Controllers/               # 21 controllers especializados
│   ├── Services/                  # 20 services (regras de negócio)
│   ├── Repositories/              # 17 repositories (acesso a dados SQL)
│   ├── Entities/                  # Classes de entidade com propriedades tipadas
│   ├── Helpers/                   # Response, Request, Validator, Cache, RateLimiter, MailerFactory
│   └── Cron/                      # check_notification.php, check_pv_approval.php
├── app/Views/                     # HTML parciais carregados via fetch pelo SPA
│   ├── auth/                      # login.html
│   ├── home/                      # index.html, form.html
│   ├── pending-tickets/           # list.html (Gestão de OS)
│   ├── planned-activity/          # list.html (Atividades Planejadas)
│   ├── preventive-cycle/          # list.html (Ciclo de Preventiva)
│   ├── pv/                        # list.html, form.html, dashboard.html
│   ├── scm/                       # scm.html
│   ├── filter-exchanges/          # list.html (Troca de Filtros)
│   ├── pdf-audit/                 # audit.html
│   ├── os/                        # dashboard.html (OS Dashboard)
│   ├── preventiva/                # dashboard.html (Preventiva Dashboard)
│   ├── equipment/                 # list.html, form.html, dashboard.html
│   ├── equipment-prices/          # list.html, form.html
│   └── user/                      # list.html, form.html
├── public/
│   ├── css/                       # default.css, fonts.css
│   ├── fonts/                     # Montserrat.woff2
│   ├── tailwindcss.js             # Fallback local do Tailwind v4
│   └── js/                        # Módulos JS organizados por funcionalidade
│       ├── core/                  # auth.js, dom.js, polling.js, utils.js
│       ├── components/            # button.js, infinite-scroll.js, plan-modal.js, sidebar.js, theme.js
│       ├── home/, pv/, scm/       # Controladores de tela e formulários
│       ├── pending-tickets/       # Gestão de OS
│       ├── planned-activity/      # Atividades planejadas
│       ├── preventive-cycle/      # Ciclo de preventiva
│       ├── filter-exchanges/      # Troca de filtros
│       ├── pdf-audit/             # Auditoria de PDFs
│       ├── os/, preventiva/       # Dashboards de OS e Preventiva
│       ├── equipment/, user/      # Cadastros administrativos
│       ├── tempo-fechado/         # Integração externa
│       └── router.js              # Roteador SPA hash-based
├── rubble-pdf-checker/            # Microserviço Python (FastAPI + CLIP)
├── tests/                         # Testes automatizados (PHPUnit + Bun)
└── OS/ / LAUDO/                   # Diretórios locais de upload de anexos
```

## Rotas da API

| Rota | Métodos | Principais Ações |
|------|---------|------------------|
| `auth` | GET, POST | `login`, `logout`, `me`, `active-count` |
| `equipment` | GET | `listAll`, `ticketsByEquipment`, `sumValue`, `checkChiller`, `ticketsByIds` |
| `tickets` | GET, POST, PUT, DELETE | `listByItem`, `getById`, `save`, `import`, `import-infratel`, `update`, `delete` |
| `pending-tickets` | GET, POST, PATCH, DELETE | `listAll`, `options`, `add-option`, `delete-option`, `updateField` |
| `planned-activities` | GET, POST, PUT, DELETE | `listAll`, `export-csv`, `plan`, `duplicate`, `reorder`, `move-date`, `extend-sla`, `set-sla`, `update-obs`, `update-status`, `delete` |
| `preventiva` | POST, DELETE | `plan`, `update-status`, `update-qtd`, `delete` |
| `preventive-cycle` | GET, POST | `listAll`, `summary`, `save`, `validate-scm`, `scm-status-count`, `list-ids` |
| `pv` | GET, POST, PUT, PATCH, DELETE | `listAll`, `getById`, `save`, `update`, `updateStatus`, `delete`, `delete-item`, `lookup`, `search-lpu`, `search-os`, `export-csv`, `send-email`, `send-batch-email`, `upload`, `duplicate` |
| `scm` | GET, POST, DELETE | `listAll`, `getById`, `import`, `delete`, `segments`, `sites`, `cycles` |
| `filter-exchanges` | GET, POST, PATCH, DELETE | `listAll`, `create`, `updateField`, `delete` |
| `pdf-audit` | GET, POST | `set-reference`, `audit`, `clear-reference`, `health`, `get-reference` |
| `dashboard` | GET | Estatísticas gerais de equipamentos e falhas (MTTR / Pareto) |
| `os-dashboard` | GET | Indicadores e métricas de Gestão de OS |
| `preventiva-dashboard` | GET | Indicadores, Treemap por site e métricas de Preventiva |
| `pv-dashboard` | GET | Indicadores financeiros e funil de PVs |
| `equipment-management`| GET, POST, PUT, DELETE | Cadastro e gestão de equipamentos e endereços |
| `equipment-prices` | GET, POST, PUT, DELETE | Tabela de preços e regras de precificação |
| `users` | GET, POST, PUT, DELETE | Gestão de usuários e permissões |
| `locals` | GET | Autocomplete de locais/endereços |
| `config` | GET | Configurações públicas da aplicação (ex: Cloudflare Turnstile) |
| `notify` | GET | Gatilho cron para disparo de e-mails diários de OS agendadas |

## Matriz de Permissões por Papel

| Módulo / Recurso | Admin | Coordenador | Supervisor | Administrativo | Cliente |
|-------------------|:-----:|:-----------:|:----------:|:--------------:|:-------:|
| **Home (Equipamentos & Tickets)** | CRUD | CRUD | CRUD | R/O | R/O |
| **Gestão de OS (Pending Tickets)** | CRUD | CRUD | CRUD | R/O | R/O |
| **Atividades Planejadas** | CRUD | CRUD (sem delete) | R/O | R/O | R/O |
| **Ciclo de Preventiva** | CRUD (save) | R/O | R/O | ❌ | ❌ |
| **Propostas de Venda (PV)** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Controle de Medição (SCM)** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Troca de Filtros** | CRUD | CRUD | CRUD | R/O | R/O |
| **Auditoria de Laudos (PDF Audit)**| CRUD | R/O | ❌ | R/O | ❌ |
| **Equipment Dashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OS Dashboard** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Preventiva Dashboard** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **PV Dashboard** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gestão de Equipamentos** | CRUD | CRUD (sem delete) | ❌ | ❌ | ❌ |
| **Tabela de Preços** | CRUD | ❌ | ❌ | ❌ | ❌ |
| **Gestão de Usuários** | CRUD | ❌ | ❌ | ❌ | ❌ |

> **Nota:** *CRUD* = Criar, Consultar, Editar e Excluir; *R/O* = Somente Leitura (Read-Only); *✅ / ❌* = Acesso liberado / bloqueado aos dashboards de visualização.

## Inicialização Rápida em Desenvolvimento

### Pré-requisitos
- PHP 8.4+ (ou ambiente portátil Apache+PHP)
- MariaDB / MySQL 11.4+
- [Bun](https://bun.sh) (para execução dos testes em JS)
- Composer (para testes PHPUnit)

### 1. Configurar Banco de Dados
```bash
mysql -u root -p manutencao < config/schema.sql
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
# Edite as credenciais de banco, JWT_SECRET e configurações SMTP no arquivo .env
```

### 3. Execução dos Testes
```bash
# Testes unitários PHP (via Composer/PHPUnit):
vendor/bin/phpunit

# Testes de frontend e módulos JS (via Bun):
bun test
```

## Deploy em Produção (Docker + Traefik)

```bash
# 1. Clonar repositório no servidor
git clone https://github.com/glaulher/Rubble.git /opt/rubble
cd /opt/rubble

# 2. Configurar variáveis de produção
cp .env.example .env
nano .env

# 3. Subir os serviços com Traefik (SSL automático Let's Encrypt)
docker compose up -d --build
```

---
*Para detalhes operacionais, guia de telas passo a passo, regras de negócio e documentação técnica avançada, consulte o [docs.md](docs.md).*
