let currentViewMode: 'admin' | 'user' = 'admin'
let currentUserId: string | null = null

export function setViewModeContext(mode: 'admin' | 'user', userId: string | null) {
  currentViewMode = mode
  currentUserId = userId
}

export function getViewModeFilter(): string | undefined {
  if (currentViewMode === 'user' && currentUserId) {
    return `user = "${currentUserId}"`
  }
  return undefined
}

export function getCurrentViewMode(): 'admin' | 'user' {
  return currentViewMode
}
