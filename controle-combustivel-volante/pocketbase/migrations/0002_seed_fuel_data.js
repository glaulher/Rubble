migrate(
  (app) => {
    if (app.countRecords('vehicles') > 0) return

    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const fuelRequestsCol = app.findCollectionByNameOrId('fuel_requests')
    const rechargesCol = app.findCollectionByNameOrId('recharges')

    var vehicleData = [
      { name: 'Fiat Uno', plate: 'ABC-1234' },
      { name: 'Volkswagen Gol', plate: 'XYZ-5678' },
      { name: 'Chevrolet Onix', plate: 'DEF-9012' },
    ]

    var vehicleIds = {}
    for (var i = 0; i < vehicleData.length; i++) {
      var vd = vehicleData[i]
      var record = new Record(vehiclesCol)
      record.set('name', vd.name)
      record.set('plate', vd.plate)
      app.save(record)
      vehicleIds[vd.plate] = record.id
    }

    var requestData = [
      {
        request_date: '2025-03-10',
        vehicle: 'ABC-1234',
        destination: 'Centro',
        driver: 'João',
        status: 'Concluído',
      },
      {
        request_date: '2025-03-12',
        vehicle: 'XYZ-5678',
        destination: 'Zona Sul',
        driver: 'Maria',
        status: 'Em Andamento',
      },
      {
        request_date: '2025-03-15',
        vehicle: 'DEF-9012',
        destination: 'Aeroporto',
        driver: 'Carlos',
        status: 'Aberto',
      },
    ]

    for (var j = 0; j < requestData.length; j++) {
      var rd = requestData[j]
      var reqRecord = new Record(fuelRequestsCol)
      reqRecord.set('request_date', rd.request_date)
      reqRecord.set('vehicle', vehicleIds[rd.vehicle])
      reqRecord.set('destination', rd.destination)
      reqRecord.set('driver', rd.driver)
      reqRecord.set('status', rd.status)
      app.save(reqRecord)
    }

    var rechargeData = [
      {
        recharge_date: '2025-03-10',
        vehicle: 'ABC-1234',
        liters: 45,
        cost: 270.0,
        odometer: 12350,
      },
      {
        recharge_date: '2025-03-12',
        vehicle: 'XYZ-5678',
        liters: 50,
        cost: 300.0,
        odometer: 45670,
      },
      {
        recharge_date: '2025-03-15',
        vehicle: 'DEF-9012',
        liters: 40,
        cost: 240.0,
        odometer: 78901,
      },
    ]

    for (var k = 0; k < rechargeData.length; k++) {
      var rc = rechargeData[k]
      var recRecord = new Record(rechargesCol)
      recRecord.set('recharge_date', rc.recharge_date)
      recRecord.set('vehicle', vehicleIds[rc.vehicle])
      recRecord.set('liters', rc.liters)
      recRecord.set('cost', rc.cost)
      recRecord.set('odometer', rc.odometer)
      recRecord.set('km_per_liter', 0)
      app.save(recRecord)
    }
  },
  (app) => {
    try {
      app.truncateCollection(app.findCollectionByNameOrId('recharges'))
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('fuel_requests'))
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('vehicles'))
    } catch (_) {}
  },
)
