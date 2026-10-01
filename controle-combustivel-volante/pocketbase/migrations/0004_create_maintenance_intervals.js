migrate(
  (app) => {
    const vehiclesId = app.findCollectionByNameOrId('vehicles').id

    const collection = new Collection({
      name: 'maintenance_intervals',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'vehicle',
          type: 'relation',
          required: true,
          collectionId: vehiclesId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'task_name', type: 'text', required: true },
        { name: 'interval_km', type: 'number', required: true },
        { name: 'last_maintenance_km', type: 'number' },
        { name: 'last_maintenance_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_maintenance_intervals_vehicle ON maintenance_intervals (vehicle)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('maintenance_intervals'))
    } catch (_) {}
  },
)
