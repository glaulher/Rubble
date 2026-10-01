onRecordAfterDeleteSuccess((e) => {
  var userId = ''
  try {
    if (e.auth && e.auth.id) userId = e.auth.id
  } catch (_) {}
  if (!userId) return e.next()

  var details = {}
  try {
    details.name = e.record.getString('name')
  } catch (_) {}
  try {
    details.email = e.record.getString('email')
  } catch (_) {}
  try {
    details.admin = e.record.getBool('admin')
  } catch (_) {}

  try {
    // Evitar registrar duplicado se já foi registrado pelo endpoint customizado ou com usuário inválido
    var authUserExists = false
    try {
      $app.findRecordById('users', userId)
      authUserExists = true
    } catch (_) {}

    var col = $app.findCollectionByNameOrId('audit_logs')
    var rec = new Record(col)
    if (authUserExists) {
      rec.set('user', userId)
    }
    rec.set('action', 'delete_user')
    rec.set('collection_name', 'users')
    rec.set('record_id', e.record.id)
    rec.set('details', JSON.stringify(details))
    $app.save(rec)
  } catch (err) {
    console.error('audit log user delete error:', err)
  }
  return e.next()
}, 'users')
