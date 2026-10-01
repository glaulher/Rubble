migrate(
  (app) => {
    const fuelRequests = app.findCollectionByNameOrId('fuel_requests')
    if (!fuelRequests.fields.getByName('cost_center')) {
      fuelRequests.fields.add(new TextField({ name: 'cost_center', required: false }))
    }
    fuelRequests.addIndex('idx_fuel_requests_cost_center', false, 'cost_center', '')
    app.save(fuelRequests)

    const recharges = app.findCollectionByNameOrId('recharges')
    if (!recharges.fields.getByName('cost_center')) {
      recharges.fields.add(new TextField({ name: 'cost_center', required: false }))
    }
    recharges.addIndex('idx_recharges_cost_center', false, 'cost_center', '')
    app.save(recharges)
  },
  (app) => {
    const fuelRequests = app.findCollectionByNameOrId('fuel_requests')
    if (fuelRequests.fields.getByName('cost_center')) {
      fuelRequests.fields.removeByName('cost_center')
    }
    fuelRequests.removeIndex('idx_fuel_requests_cost_center')
    app.save(fuelRequests)

    const recharges = app.findCollectionByNameOrId('recharges')
    if (recharges.fields.getByName('cost_center')) {
      recharges.fields.removeByName('cost_center')
    }
    recharges.removeIndex('idx_recharges_cost_center')
    app.save(recharges)
  },
)
