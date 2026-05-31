# Real-Time Polling + Cache — Design Document

> **Status:** Approved
> **Date:** 2026-05-31
> **Context:** Rubble SPA — maintenance management system with PHP 8.4, MariaDB, Docker/VPS

## Overview

Add real-time updates to Home and PV views without requiring page refresh. Uses client-side polling (30s) + backend APCu cache (10s TTL) to reduce database load.

## Architecture

```
Browser (SPA)
  PollingManager (public/js/utils/polling.js)
    ├── start(view, callback, interval)
    ├── stop(view)
    └── visibilitychange → pause/resume

  Home View (home-ui.js)
    └── initHome() → PollingManager.start('home', loadEquipment, 30000)

  PV View (list.js)
    └── initPv() → PollingManager.start('pv', loadPvs, 30000)

  Router (router.js)
    └── hashchange → PollingManager.stop(currentView)

API Backend
  ?route=equipment (EquipmentController::listAll)
    └── APCu cache key: equipment_list_{search}_{page}_{offset}
  ?route=pv (PvController::listAll)
    └── APCu cache key: pv_list_{search}_{status}_{cycle}_{sortBy}_{sortDir}_{page}
```

## Cache Layer (APCu)

### Implementation
```php
$cacheKey = 'equipment_list_' . md5(serialize([$search, $page, $offset]));
$cached = apc_fetch($cacheKey);
if ($cached !== false) {
    return $cached;
}
// ... execute query ...
apc_store($cacheKey, $result, 10);  // TTL 10 seconds
```

### Cache keys
- Each unique set of filter parameters gets its own cache key
- Cache key includes hash of all relevant parameters to avoid collisions
- TTL of 10 seconds means at most 3 DB queries per endpoint per 30-second cycle

## PollingManager (frontend)

### File: `public/js/utils/polling.js`

```javascript
const PollingManager = {
    intervals: {},

    start(view, callback, intervalMs = 30000) {
        this.stop(view);
        callback();
        this.intervals[view] = setInterval(callback, intervalMs);
        this._setupVisibility(view, callback, intervalMs);
    },

    stop(view) {
        if (this.intervals[view]) {
            clearInterval(this.intervals[view]);
            delete this.intervals[view];
        }
    },

    isRunning(view) {
        return !!this.intervals[view];
    },

    _setupVisibility(view, callback, intervalMs) {
        const handler = () => {
            if (document.hidden) {
                this.stop(view);
            } else if (!this.isRunning(view)) {
                callback();
                this.intervals[view] = setInterval(callback, intervalMs);
            }
        };
        document.addEventListener('visibilitychange', handler);
    }
};
```

## View Integration

### Home View (`home-ui.js`)

```diff
 initHome() {
     resetState();
+    PollingManager.start('home', loadEquipment, 30000);
     loadEquipment();
 }
```

```diff
 function loadEquipment() {
     if (loading || allLoaded) return;
     loading = true;
     
     fetch(`...?route=equipment&limit=${limit}&offset=${page * limit}...`)
     .then(res => res.json())
     .then(result => {
+        const newHash = JSON.stringify(result.data);
+        if (page === 0 && newHash === lastHomeHash) return; // Skip if unchanged
+        lastHomeHash = page === 0 ? newHash : lastHomeHash;
         // ... existing render logic ...
     });
 }
```

### PV View (`list.js`)

```diff
 initPv() {
     resetPvState();
+    PollingManager.start('pv', loadPvs, 30000);
     loadPvs();
 }
```

```diff
 function loadPvs() {
     if (pvLoading || pvAllLoaded) return;
     pvLoading = true;
     
     fetch(`...?route=pv&limit=${pvLimit}&offset=${pvPage * pvLimit}...`)
     .then(res => res.json())
     .then(result => {
+        const newHash = JSON.stringify(result.data);
+        if (pvPage === 0 && newHash === lastPvHash) return; // Skip if unchanged
+        lastPvHash = pvPage === 0 ? newHash : lastPvHash;
         // ... existing render logic ...
     });
 }
```

### Router (`router.js`)

The router needs to stop polling when navigating away from a view. The simplest approach is to add a `PollingManager.stop('home')` and `PollingManager.stop('pv')` call at the start of the `router()` function, before loading the new view.

## Views That DO NOT Poll

| View | Reason |
|------|--------|
| Home Form | User is actively editing — no need |
| PV Form | User is actively editing — no need |
| Dashboards | Charts are snapshots, not poll-friendly |
| Users | Admin-only, infrequent changes |
| Equipment Manager | Admin-only, infrequent changes |

## Error Handling

- 1-2 consecutive failures → silently ignore, retry on next cycle
- 3+ consecutive failures → stop polling, retry after 60s
- 401 response → `auth.js` already redirects to login
- Network offline → `visibilitychange` pauses; resumes immediately on return

## Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `public/js/utils/polling.js` | Create | PollingManager class |
| `public/js/home/home-ui.js` | Modify | Add polling + JSON comparison |
| `public/js/pv/list.js` | Modify | Add polling + JSON comparison |
| `public/js/router.js` | Modify | Stop polling on navigate |
| `app/api/Controllers/EquipmentController.php` | Modify | Add APCu cache |
| `app/api/Controllers/PvController.php` | Modify | Add APCu cache |
| `index.html` | Modify | Add polling.js script tag |

## Dependencies

- **APCu** PHP extension (check if available with `extension_loaded('apcu')`)
- **No new npm/composer packages**
