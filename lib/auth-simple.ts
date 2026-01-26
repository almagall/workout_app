// Simple local storage-based authentication (no Supabase auth required)

export interface SimpleUser {
  id: string
  username: string
  createdAt: string
}

const USER_STORAGE_KEY = 'workout_app_user'
const USER_ID_PREFIX = 'user_'

export function getCurrentUser(): SimpleUser | null {
  if (typeof window === 'undefined') return null
  
  const userStr = localStorage.getItem(USER_STORAGE_KEY)
  if (!userStr) return null
  
  try {
    return JSON.parse(userStr) as SimpleUser
  } catch {
    return null
  }
}

export function createUser(username: string, password: string): SimpleUser {
  const userId = `${USER_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const user: SimpleUser = {
    id: userId,
    username,
    createdAt: new Date().toISOString(),
  }
  
  // Store user in localStorage
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  
  // Also store username/password mapping (in a real app, this would be hashed)
  const users = getStoredUsers()
  users[username] = { password, userId }
  localStorage.setItem('workout_app_users', JSON.stringify(users))
  
  return user
}

export function signIn(username: string, password: string): SimpleUser | null {
  const users = getStoredUsers()
  const userData = users[username]
  
  if (!userData || userData.password !== password) {
    return null
  }
  
  const user: SimpleUser = {
    id: userData.userId,
    username,
    createdAt: userData.createdAt || new Date().toISOString(),
  }
  
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function signOut(): void {
  localStorage.removeItem(USER_STORAGE_KEY)
}

function getStoredUsers(): Record<string, { password: string; userId: string; createdAt?: string }> {
  if (typeof window === 'undefined') return {}
  
  const usersStr = localStorage.getItem('workout_app_users')
  if (!usersStr) return {}
  
  try {
    return JSON.parse(usersStr)
  } catch {
    return {}
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}
