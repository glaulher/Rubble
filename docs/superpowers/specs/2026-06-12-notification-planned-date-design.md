# Use Planned Date for Notification & Required Validation

Date: 2026-06-12

## Problem

The notification cron sends an email one day before a planned activity, but uses `r.data` (ticket creation date) instead of `r.data_planejada` (planned service date). This causes notifications to fire on the wrong date. Additionally, `data_planejada` is not validated as required when status is "Planejado", allowing tickets with planned status but no planned date.

## Changes

### 1. Cron query — use `data_planejada`

**File:** `app/api/Repositories/TicketRepository.php:221`

Replace:
```sql
AND DATE(r.data) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
```

With:
```sql
AND r.data_planejada IS NOT NULL
AND DATE(r.data_planejada) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
```

### 2. Email body — show planned date

**File:** `app/api/Services/NotificationService.php:111`

Replace:
```php
<td>{$e($ticket->date)}</td>
```

With:
```php
<td>{$e($ticket->plannedDate)}</td>
```

### 3. Backend validation — require `data_planejada` when status is "Planejado"

**File:** `app/api/Services/TicketService.php`

In both `save()` and `update()` methods, after `normalizeStatus()`:

```php
$lowerStatus = mb_strtolower($data['status'] ?? '', 'UTF-8');
if ($lowerStatus === 'planejado' && empty($data['data_planejada'])) {
    throw new \RuntimeException('Data planejada é obrigatória para o status Planejado');
}
```

### 4. Frontend validation — require `data_planejada` before submit

**File:** `public/js/home/form.js`

After existing validations (~line 206), add:

```js
if (data.status === 'Planejado' && !data.data_planejada) {
  showToast('Informe a data planejada', 'error');
  return;
}
```

## What stays unchanged

- `data_planejada` remains optional for non-planned statuses
- CSV export DATA_PLANEJADA column (added in previous commit)
- Ticket import (`importBatch`) continues to set `data_planejada = null` — planned OS are skipped on import anyway
- `togglePlannedDate()` frontend logic (show/hide field on status change) stays as-is

## Files affected

| File | Change |
|------|--------|
| `app/api/Repositories/TicketRepository.php` | Cron query: `r.data` → `r.data_planejada` |
| `app/api/Services/NotificationService.php` | Email body: `date` → `plannedDate` |
| `app/api/Services/TicketService.php` | Validation: require `data_planejada` if status=planejado |
| `public/js/home/form.js` | Validation: require `data_planejada` before submit |

## Tests

- Update `tests/unit/TicketServiceTest.php` if it tests save/update with status "planejado"
- The notification service is untested; no test changes required
