// PocketBase hook to authenticate Rubble users via JWT (SSO)
routerAdd('POST', '/backend/v1/auth/sso', (e) => {
  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}

  const token = (body.token || '').trim()
  if (!token) {
    console.warn('[SSO Hook] Token JWT ausente na requisição')
    return e.badRequestError('Token JWT do Rubble é obrigatório')
  }

  const jwtSecret = $os.getenv('RUBBLE_JWT_SECRET') || $os.getenv('JWT_SECRET') || ''
  if (!jwtSecret) {
    console.error('[SSO Hook] Configuração RUBBLE_JWT_SECRET/JWT_SECRET ausente no servidor')
    return e.badRequestError('Configuração de segurança JWT ausente no servidor')
  }

  let payload
  try {
    payload = $security.parseJWT(token, jwtSecret)
  } catch (err) {
    console.error('[SSO Hook] Erro ao validar JWT:', err.message || String(err))
    return e.badRequestError('Token Rubble inválido ou expirado: ' + (err.message || String(err)))
  }

  const username = payload.username || ''
  const nome = payload.nome || username || 'Usuário Rubble'
  const role = payload.role || ''
  // Apenas o admin do Rubble tem privilégios de admin no controle de combustível
  const isAdmin = role === 'admin'

  if (!username) {
    console.warn('[SSO Hook] Usuário não identificado no payload JWT')
    return e.badRequestError('Usuário não identificado no token')
  }

  // Extrai o nome de usuário limpo removendo domínio interno incompleto (ex: "glaulher@admin" -> "glaulher")
  let cleanUser = (username || 'user').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'user'
  if (cleanUser.length < 3) cleanUser = cleanUser + '_user'

  // Garante um formato de email RFC válido e aceito pelo PocketBase
  let email = (payload.email || '').trim().toLowerCase()
  const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!validEmailRegex.test(email)) {
    email = cleanUser + '@rubbleapp.com'
  }

  console.log('[SSO Hook] Autenticando usuário:', username, 'email:', email, 'role:', role, 'admin:', isAdmin)

  const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
  let userRecord = null

  try {
    userRecord = $app.findFirstRecordByFilter('_pb_users_auth_', 'email = {:email}', { email: email })
  } catch (_) {}

  if (!userRecord) {
    try {
      userRecord = $app.findFirstRecordByFilter('_pb_users_auth_', 'username = {:username}', { username: cleanUser })
    } catch (_) {}
  }

  if (!userRecord) {
    try {
      userRecord = new Record(usersCol)
      userRecord.setEmail(email)
      userRecord.setPassword($security.randomString(32))
      userRecord.setVerified(true)
      userRecord.set('name', nome)
      userRecord.set('admin', isAdmin)
      $app.save(userRecord)
      console.log('[SSO Hook] Novo usuário local criado:', email)
    } catch (saveErr) {
      console.error('[SSO Hook] Falha ao criar usuário local:', saveErr.message)
      return e.badRequestError('Falha ao criar usuário local: ' + saveErr.message)
    }
  } else {
    // Sincroniza nome e flag de admin estritamente com base no Rubble
    let changed = false
    if (userRecord.getString('name') !== nome) {
      userRecord.set('name', nome)
      changed = true
    }
    if (userRecord.getBool('admin') !== isAdmin) {
      userRecord.set('admin', isAdmin)
      changed = true
    }
    if (changed) {
      try {
        $app.save(userRecord)
        console.log('[SSO Hook] Dados do usuário atualizados:', email)
      } catch (saveErr) {
        console.warn('[SSO Hook] Aviso ao salvar usuário:', saveErr.message)
      }
    }
  }

  // Gera token de autenticação oficial do PocketBase para o registro
  const pbToken = userRecord.newAuthToken()
  console.log('[SSO Hook] Sucesso na autenticação SSO para:', email)

  return e.json(200, {
    token: pbToken,
    record: userRecord,
  })
})
