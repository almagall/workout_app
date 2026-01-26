// Simplified Supabase client that works with local user IDs
// This bypasses Supabase auth and uses simple user IDs

import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from './auth-simple'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a client with service role key for bypassing RLS (for development only)
// In production, you'd want proper RLS policies
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Get current user ID from local storage
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  const user = getCurrentUser()
  return user?.id || null
}

// Helper to execute queries with user context
export async function executeQuery<T>(
  queryFn: (client: ReturnType<typeof getSupabaseClient>, userId: string) => Promise<T>
): Promise<T> {
  const userId = getCurrentUserId()
  if (!userId) {
    throw new Error('User not authenticated')
  }
  
  const client = getSupabaseClient()
  return queryFn(client, userId)
}
