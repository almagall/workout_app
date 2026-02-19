'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

      await new Promise(resolve => setTimeout(resolve, 100))

      if (data.user) {
        const { data: settings, error: settingsError } = await supabase
          .from('progressive_overload_settings')
          .select('plan_type')
          .eq('user_id', data.user.id)
          .single()

        if (settingsError || !settings) {
          window.location.href = '/onboarding'
        } else {
          window.location.href = '/dashboard'
        }
      } else {
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-hero pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full space-y-8 p-8 card-glass mx-4 animate-fade-in-up">
        <div>
          <h1 className="font-display text-center text-3xl font-extrabold text-gradient mb-1 tracking-tight">
            Workout Planner
          </h1>
          <h2 className="font-display mt-6 text-center text-2xl font-bold text-foreground tracking-tight">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-muted/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-muted/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200 sm:text-sm"
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
              className="btn-primary w-full flex justify-center py-3 px-4 text-sm min-h-[44px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="text-accent-light hover:text-accent text-sm transition-colors"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
