'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if user has selected a plan
      if (data.user) {
        const { data: settings, error: settingsError } = await supabase
          .from('progressive_overload_settings')
          .select('plan_type')
          .eq('user_id', data.user.id)
          .single()

        // If table doesn't exist or no settings, go to onboarding
        if (settingsError || !settings) {
          // Use hard redirect for onboarding
          window.location.href = '/onboarding'
        } else {
          // Use hard redirect to ensure session is properly loaded
          window.location.href = '/dashboard'
        }
      } else {
        // Fallback to dashboard
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-2xl border border-border shadow-card">
        <div>
          <h2 className="font-display mt-6 text-center text-3xl font-extrabold text-foreground tracking-tight">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="rounded-lg shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border bg-elevated text-foreground placeholder-muted rounded-t-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border bg-elevated text-foreground placeholder-muted rounded-b-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-background bg-accent hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent disabled:opacity-50 transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="text-accent hover:text-accent/80 text-sm transition-colors"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
