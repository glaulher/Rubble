migrate(
  (app) => {
    // 1. audit_logs: Tornar user opcional e cascadeDelete: false para preservar o histórico de auditoria
    const auditLogsCol = app.findCollectionByNameOrId('audit_logs')
    const auditUserField = auditLogsCol.fields.getByName('user')
    if (auditUserField) {
      auditUserField.required = false
      auditUserField.cascadeDelete = false
    }
    app.save(auditLogsCol)

    // 2. drivers: Tornar user opcional (ou permitir cascade/reatribuição)
    const driversCol = app.findCollectionByNameOrId('drivers')
    const driverUserField = driversCol.fields.getByName('user')
    if (driverUserField) {
      driverUserField.required = false
    }
    app.save(driversCol)

    // 3. vehicles: Tornar user opcional
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const vehicleUserField = vehiclesCol.fields.getByName('user')
    if (vehicleUserField) {
      vehicleUserField.required = false
    }
    app.save(vehiclesCol)

    // 4. fuel_requests: Tornar user opcional
    const frCol = app.findCollectionByNameOrId('fuel_requests')
    const frUserField = frCol.fields.getByName('user')
    if (frUserField) {
      frUserField.required = false
    }
    app.save(frCol)

    // 5. recharges: Tornar user opcional
    const rechargesCol = app.findCollectionByNameOrId('recharges')
    const recUserField = rechargesCol.fields.getByName('user')
    if (recUserField) {
      recUserField.required = false
    }
    app.save(rechargesCol)

    // 6. maintenance_intervals: Tornar user opcional
    const miCol = app.findCollectionByNameOrId('maintenance_intervals')
    const miUserField = miCol.fields.getByName('user')
    if (miUserField) {
      miUserField.required = false
    }
    app.save(miCol)
  },
  (app) => {
    try {
      const auditLogsCol = app.findCollectionByNameOrId('audit_logs')
      const auditUserField = auditLogsCol.fields.getByName('user')
      if (auditUserField) {
        auditUserField.required = true
      }
      app.save(auditLogsCol)
    } catch (_) {}

    try {
      const driversCol = app.findCollectionByNameOrId('drivers')
      const driverUserField = driversCol.fields.getByName('user')
      if (driverUserField) {
        driverUserField.required = true
      }
      app.save(driversCol)
    } catch (_) {}
  },
)
