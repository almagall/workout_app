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
      let user = await signIn(username, password)
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
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 bg-radial-hero pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full space-y-8 p-8 card-glass card-accent-top mx-4 animate-fade-in-up">
        <div>
          <h1 className="font-display text-center text-4xl font-extrabold text-gradient mb-2 tracking-tight">
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
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-muted/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
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
                minLength={6}
                className="appearance-none relative block w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-foreground placeholder-muted/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200 sm:text-sm"
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
              className="btn-primary w-full flex justify-center py-3 px-4 text-sm min-h-[44px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
