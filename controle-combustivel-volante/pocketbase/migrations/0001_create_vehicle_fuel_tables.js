migrate(
  (app) => {
    const vehicles = new Collection({
      name: 'vehicles',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'plate', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles (plate)'],
    })
    app.save(vehicles)

    const vehiclesId = app.findCollectionByNameOrId('vehicles').id

    const fuelRequests = new Collection({
      name: 'fuel_requests',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'request_date', type: 'date', required: true },
        {
          name: 'vehicle',
          type: 'relation',
          required: true,
          collectionId: vehiclesId,
          maxSelect: 1,
        },
        { name: 'destination', type: 'text' },
        { name: 'driver', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['Aberto', 'Em Andamento', 'Concluído'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fuel_requests_request_date ON fuel_requests (request_date)',
        'CREATE INDEX idx_fuel_requests_vehicle ON fuel_requests (vehicle)',
      ],
    })
    app.save(fuelRequests)

    const recharges = new Collection({
      name: 'recharges',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'recharge_date', type: 'date', required: true },
        {
          name: 'vehicle',
          type: 'relation',
          required: true,
          collectionId: vehiclesId,
          maxSelect: 1,
        },
        { name: 'liters', type: 'number', required: true },
        { name: 'cost', type: 'number', required: true },
        { name: 'odometer', type: 'number', required: true },
        { name: 'km_per_liter', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_recharges_recharge_date ON recharges (recharge_date)',
        'CREATE INDEX idx_recharges_vehicle ON recharges (vehicle)',
      ],
    })
    app.save(recharges)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('recharges'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fuel_requests'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('vehicles'))
    } catch (_) {}
  },
)
