migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('maintenance_intervals')

    if (app.countRecords('maintenance_intervals') > 0) return

    var vehicles = app.findRecordsByFilter('vehicles', '', '', 0, 0)

    var tasks = [
      { task_name: 'Troca de Óleo', interval_km: 10000 },
      { task_name: 'Revisão Geral', interval_km: 20000 },
    ]

    for (var vi = 0; vi < vehicles.length; vi++) {
      var vehicle = vehicles[vi]
      for (var ti = 0; ti < tasks.length; ti++) {
        var task = tasks[ti]

        var existing = app.findRecordsByFilter(
          'maintenance_intervals',
          'vehicle = "' + vehicle.id + '" && task_name = "' + task.task_name + '"',
          '',
          1,
          0,
        )
        if (existing.length > 0) continue

        var record = new Record(col)
        record.set('vehicle', vehicle.id)
        record.set('task_name', task.task_name)
        record.set('interval_km', task.interval_km)
        record.set('last_maintenance_km', 0)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      app.truncateCollection(app.findCollectionByNameOrId('maintenance_intervals'))
    } catch (_) {}
  },
)
