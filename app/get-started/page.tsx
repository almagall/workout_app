'use client'

import { useState, useEffect } from 'react'
import { createUser, signIn, getCurrentUser } from '@/lib/auth-simple'
import { getTemplates } from '@/lib/storage'

export default function GetStartedPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check if already logged in and redirect based on whether they have templates
  useEffect(() => {
    if (typeof window === 'undefined') return
    const user = getCurrentUser()
    if (!user) {
      setCheckingAuth(false)
      return
    }
    getTemplates().then((templates) => {
      setCheckingAuth(false)
      if (templates.length === 0) {
        window.location.href = '/workout/template/create'
      } else {
        window.location.href = '/dashboard'
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // First try to sign in
      let user = await signIn(username, password)

      // If sign in failed, create new account
      if (!user) {
        user = await createUser(username, password)
      }

      if (user) {
        const templates = await getTemplates()
        await new Promise(resolve => setTimeout(resolve, 200))
        if (templates.length === 0) {
          window.location.href = '/workout/template/create'
        } else {
          window.location.href = '/dashboard'
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-2xl border border-border shadow-card">
        <div>
          <h1 className="font-display text-center text-4xl font-extrabold text-foreground mb-2 tracking-tight">
            Workout Planner
          </h1>
          <h2 className="font-display mt-6 text-center text-2xl font-bold text-foreground tracking-tight">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Enter your username and password. We will create an account if you do not have one.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="rounded-lg shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border bg-elevated text-foreground placeholder-muted rounded-t-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
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
                minLength={6}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border bg-elevated text-foreground placeholder-muted rounded-b-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:z-10 sm:text-sm"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-background bg-accent hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
