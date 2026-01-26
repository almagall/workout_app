'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth-simple'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-[#888888]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-[#111111] border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-white">Workout Planner</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'border-white text-white'
                      : 'border-transparent text-[#888888] hover:border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/workout/log"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit')
                      ? 'border-white text-white'
                      : 'border-transparent text-[#888888] hover:border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  Log Workout
                </Link>
                <Link
                  href="/workout/template/create"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === '/workout/template/create'
                      ? 'border-white text-white'
                      : 'border-transparent text-[#888888] hover:border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  Create Template
                </Link>
                <Link
                  href="/workout/history"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === '/workout/history'
                      ? 'border-white text-white'
                      : 'border-transparent text-[#888888] hover:border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  History
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#888888]">Hello, <span className="text-white font-medium">{user.username}</span></span>
              <button
                onClick={handleSignOut}
                className="text-[#888888] hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
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
