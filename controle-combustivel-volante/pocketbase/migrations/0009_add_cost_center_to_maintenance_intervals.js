migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('maintenance_intervals')
    if (!col.fields.getByName('cost_center')) {
      col.fields.add(new TextField({ name: 'cost_center', required: false }))
    }
    col.addIndex('idx_maintenance_intervals_cost_center', false, 'cost_center', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('maintenance_intervals')
    if (col.fields.getByName('cost_center')) {
      col.fields.removeByName('cost_center')
    }
    col.removeIndex('idx_maintenance_intervals_cost_center')
    app.save(col)
  },
)
