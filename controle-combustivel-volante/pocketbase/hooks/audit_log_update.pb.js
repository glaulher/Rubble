onRecordAfterUpdateSuccess(
  (e) => {
    var userId = ''
    try {
      if (e.auth && e.auth.id) userId = e.auth.id
    } catch (_) {}
    if (!userId) {
      try {
        userId = e.record.getString('user')
      } catch (_) {}
    }
    if (!userId) {
      try {
        if (e.record.collectionName === 'users') userId = e.record.id
      } catch (_) {}
    }
    if (!userId) return e.next()

    var colName = ''
    try {
      colName = e.record.collectionName
    } catch (_) {}

    var fieldNames = [
      'id',
      'created',
      'updated',
      'user',
      'name',
      'plate',
      'cost_center',
      'request_date',
      'vehicle',
      'destination',
      'status',
      'rejection_reason',
      'current_odometer',
      'last_refuel_odometer',
      'last_refuel_date',
      'photo',
      'driver',
      'recharge_date',
      'liters',
      'cost',
      'odometer',
      'km_per_liter',
      'task_name',
      'interval_km',
      'last_maintenance_km',
      'last_maintenance_date',
    ]
    var oldVals = {}
    var newVals = {}
    var hasChanges = false
    for (var i = 0; i < fieldNames.length; i++) {
      try {
        var oldVal = e.record.original().get(fieldNames[i])
        var newVal = e.record.get(fieldNames[i])
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          oldVals[fieldNames[i]] = oldVal
          newVals[fieldNames[i]] = newVal
          hasChanges = true
        }
      } catch (_) {}
    }

    if (!hasChanges) return e.next()

    var details = { old: oldVals, new: newVals }

    try {
      var col = $app.findCollectionByNameOrId('audit_logs')
      var rec = new Record(col)
      rec.set('user', userId)
      rec.set('action', 'update')
      rec.set('collection_name', colName)
      rec.set('record_id', e.record.id)
      rec.set('details', JSON.stringify(details))
      $app.save(rec)
    } catch (err) {
      console.error('audit log update error:', err)
    }
    return e.next()
  },
  'vehicles',
  'fuel_requests',
  'recharges',
  'maintenance_intervals',
  'drivers',
)
