// Simple local storage-based authentication (no Supabase auth required)
// User credentials stored in Supabase for cross-device sync

import { createClient } from './supabase/client'

export interface SimpleUser {
  id: string
  username: string
  createdAt: string
}

const USER_STORAGE_KEY = 'workout_app_user'
const USER_ID_PREFIX = 'user_'

// Simple password hashing function
function hashPassword(password: string): string {
  // Simple hash - in production, use bcrypt or similar
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

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

export async function createUser(username: string, password: string): Promise<SimpleUser> {
  const userId = `${USER_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const passwordHash = hashPassword(password)
  const createdAt = new Date().toISOString()
  
  const user: SimpleUser = {
    id: userId,
    username,
    createdAt,
  }
  
  // Store user credentials in Supabase for cross-device sync
  const supabase = createClient()
  const { error } = await supabase
    .from('simple_users')
    .insert({
      username,
      password_hash: passwordHash,
      user_id: userId,
      created_at: createdAt,
    })
  
  if (error) {
    // If Supabase insert fails (e.g., username already exists), throw error
    throw new Error(error.message || 'Failed to create user')
  }
  
  // Also store in localStorage for backward compatibility and session management
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  
  // Keep localStorage mapping for migration period
  const users = getStoredUsers()
  users[username] = { password, userId, createdAt }
  localStorage.setItem('workout_app_users', JSON.stringify(users))
  
  return user
}

export async function signIn(username: string, password: string): Promise<SimpleUser | null> {
  const passwordHash = hashPassword(password)
  
  // First, try to find user in Supabase
  const supabase = createClient()
  const { data: supabaseUser, error } = await supabase
    .from('simple_users')
    .select('*')
    .eq('username', username)
    .single()
  
  if (!error && supabaseUser) {
    // User found in Supabase - verify password
    if (supabaseUser.password_hash === passwordHash) {
      const user: SimpleUser = {
        id: supabaseUser.user_id,
        username,
        createdAt: supabaseUser.created_at || new Date().toISOString(),
      }
      
      // Store current user in localStorage for session
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      return user
    }
    // Password doesn't match
    return null
  }
  
  // Fallback: Check localStorage for existing users (migration support)
  const users = getStoredUsers()
  const userData = users[username]
  
  if (userData && userData.password === password) {
    const user: SimpleUser = {
      id: userData.userId,
      username,
      createdAt: userData.createdAt || new Date().toISOString(),
    }
    
    // Store current user in localStorage for session
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    
    // Optionally migrate to Supabase (async, don't wait)
    migrateUserToSupabase(username, password, userData.userId, user.createdAt).catch(console.error)
    
    return user
  }
  
  return null
}

// Helper function to migrate existing localStorage users to Supabase
async function migrateUserToSupabase(username: string, password: string, userId: string, createdAt: string): Promise<void> {
  const supabase = createClient()
  const passwordHash = hashPassword(password)
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('simple_users')
    .select('id')
    .eq('username', username)
    .single()
  
  if (!existing) {
    // Insert into Supabase
    await supabase
      .from('simple_users')
      .insert({
        username,
        password_hash: passwordHash,
        user_id: userId,
        created_at: createdAt,
      })
  }
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
