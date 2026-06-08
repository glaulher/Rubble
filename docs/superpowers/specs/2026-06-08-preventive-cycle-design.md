# Preventive Cycle Screen

**Data:** 2026-06-08
**Projeto:** Rubble — SPA de gestão de manutenção

## Purpose
Tela para gerenciar quais equipamentos estão previstos para preventiva em cada ciclo mensal, com campo de observação por equipamento/ciclo para registrar impedimentos.

## Data Model

Tabela `preventive_cycle_items`:
```
id              INT PK AUTO_INCREMENT
ciclo           VARCHAR(7) NOT NULL          — "2026-06"
equipamento_id  INT NOT NULL FK→equipamentos ON DELETE CASCADE
observacao      TEXT DEFAULT NULL
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
UNIQUE KEY uk_ciclo_equip (ciclo, equipamento_id)
```

## Backend

**Entity:** `PreventiveCycleItem` — typed properties: id, ciclo, equipamentoId, observacao, createdAt, updatedAt

**Repository:** `PreventiveCycleRepository`
- `listByCiclo(ciclo)` — LEFT JOIN equipamentos → retorna equipamentos com `checked` (bool) e `observacao`
- `saveBatch(ciclo, items)` — transaction: INSERT ... ON DUPLICATE KEY UPDATE para checked, DELETE WHERE NOT IN para unchecked
- `summary(ciclo)` — COUNT de checked + SUM(valor_tr) via JOIN equipamento_precos

**Service:** `PreventiveCycleService`
- `listAll(ciclo, limit, offset, search)` — chama repository, enriquece com valor_tr e mercado
- `save(ciclo, items)` — valida formato ciclo, delega batch ao repository
- `summary(ciclo)` — chama repository

**Controller:** `PreventiveCycleController`
- `listAll()` — GET ?route=preventive-cycle&action=list&ciclo=2026-06&limit=20&offset=0&search=
- `save()` — POST ?route=preventive-cycle&action=save, body: {ciclo, items: [{equipamento_id, checked, observacao}]}
- `summary()` — GET ?route=preventive-cycle&action=summary&ciclo=2026-06

## Frontend

**View:** `app/Views/preventive-cycle/list.html`
- Sub-header: título + subtítulo
- Action bar: ciclo dropdown + select-all checkbox + "Salvar Ciclo" button
- Search input
- Counter: "X equip. · Y selecionados" + badge valor (hidden p/ supervisor)
- Site-grouped cards com infinite scroll
- Sentinel para IntersectionObserver

**JS:** `public/js/preventive-cycle/list.js`
- `initPreventiveCycle()` — carrega ciclo inicial, setup event listeners
- `loadList(ciclo, silent)` — fetch list, render cards
- `renderCards(data)` — constrói cards agrupados por local
- `saveCycle()` — POST save, toast feedback
- `setupSelectAll()` — checkbox select-all (igual PV)
- `setupSearch()` — 1s debounce, filtra por busca
- Polling: só contador/sumário (30s), sem mexer nos cards

**Card design:**
```
┌──────────────────────────────────────────────────────────┐
│ [☑] WM 01  ·  10 TR  ·  Resende               ✓ Salvo  │
│      RDJ / HUB RECREIO                                   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Observação: ______________________________________ │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Navigation & Permissions

| Item | Detalhe |
|------|---------|
| **Sidebar** | Submenu "Equip." → "Ciclo Preventiva" após "Cadastro Valor" |
| **Roles** | `data-role="admin coordenador supervisor"` |
| **Valor badge** | `data-role="admin coordenador"` (supervisor não vê) |
| **Hash** | `#/preventive-cycle` |

## Polling

- **Tipo:** Híbrido — só contador/sumário a cada 30s
- **Refresh completo:** apenas após "Salvar Ciclo" (não por polling)

## Cycle Format

Mesmo formato PV: `YYYY-MM` (2026-01 a 2036-12). Reusa `generateCicloOptions()`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `config/migrations/025_add_preventive_cycle.sql` | Criar |
| `config/schema.sql` | Adicionar tabela |
| `app/api/Entities/PreventiveCycleItem.php` | Criar |
| `app/api/Repositories/PreventiveCycleRepository.php` | Criar |
| `app/api/Services/PreventiveCycleService.php` | Criar |
| `app/api/Controllers/PreventiveCycleController.php` | Criar |
| `app/api/index.php` | Adicionar rota |
| `app/Views/preventive-cycle/list.html` | Criar |
| `public/js/preventive-cycle/list.js` | Criar |
| `public/js/components/sidebar.js` | Adicionar link |
| `public/js/router.js` | Adicionar rota |
| `index.html` | Adicionar script tag |
