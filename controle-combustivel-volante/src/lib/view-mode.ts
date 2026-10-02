let currentViewMode: 'admin' | 'user' = 'admin'
let currentUserId: string | null = null

export function setViewModeContext(mode: 'admin' | 'user', userId: string | null) {
  currentViewMode = mode
  currentUserId = userId
}

export function getViewModeFilter(): string | undefined {
  // Compartilhamento de dados da frota entre todos os usuários autenticados.
  // Não filtra registros por usuário para garantir visualização e atualização em tempo real.
  return undefined
}

export function getCurrentViewMode(): 'admin' | 'user' {
  return currentViewMode
}
