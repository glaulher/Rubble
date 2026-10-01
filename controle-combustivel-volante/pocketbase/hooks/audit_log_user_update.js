onRecordAfterUpdateSuccess((e) => {
  var nameChanged = false
  var emailChanged = false
  var adminChanged = false

  try {
    nameChanged = e.record.getString('name') !== e.record.original().getString('name')
  } catch (_) {}
  try {
    emailChanged = e.record.getString('email') !== e.record.original().getString('email')
  } catch (_) {}
  try {
    adminChanged = e.record.getBool('admin') !== e.record.original().getBool('admin')
  } catch (_) {}

  if (!nameChanged && !emailChanged && !adminChanged) return e.next()

  var userId = ''
  try {
    if (e.auth && e.auth.id) userId = e.auth.id
  } catch (_) {}
  if (!userId) {
    try {
      userId = e.record.id
    } catch (_) {}
  }
  if (!userId) return e.next()

  var details = {}
  if (nameChanged) {
    try {
      details.name = {
        old: e.record.original().getString('name'),
        new: e.record.getString('name'),
      }
    } catch (_) {}
  }
  if (emailChanged) {
    try {
      details.email = {
        old: e.record.original().getString('email'),
        new: e.record.getString('email'),
      }
    } catch (_) {}
  }
  if (adminChanged) {
    try {
      details.admin = {
        old: e.record.original().getBool('admin'),
        new: e.record.getBool('admin'),
      }
    } catch (_) {}
  }

  try {
    var col = $app.findCollectionByNameOrId('audit_logs')
    var rec = new Record(col)
    rec.set('user', userId)
    rec.set('action', 'edit_user')
    rec.set('collection_name', 'users')
    rec.set('record_id', e.record.id)
    rec.set('details', JSON.stringify(details))
    $app.save(rec)
  } catch (err) {
    console.error('audit log user update error:', err)
  }
  return e.next()
}, 'users')
