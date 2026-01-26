'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentUser, signOut } from '@/lib/auth-simple'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      window.location.href = '/get-started'
      return
    }
    setUser(currentUser)
    setLoading(false)
  }, [])

  const handleSignOut = () => {
    signOut()
    window.location.href = '/get-started'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-indigo-400">Workout Planner</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-indigo-500 text-slate-100 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/workout/log"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Log Workout
                </Link>
                <Link
                  href="/workout/template/create"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Create Template
                </Link>
                <Link
                  href="/workout/history"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  History
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">Hello, <span className="text-slate-100 font-medium">{user.username}</span></span>
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-slate-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
