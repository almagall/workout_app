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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
              {/* Desktop Navigation */}
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
                  href="/workout/template"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit')
                      ? 'border-white text-white'
                      : 'border-transparent text-[#888888] hover:border-[#2a2a2a] hover:text-white'
                  }`}
                >
                  Template
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
            {/* Desktop User Info */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-[#888888]">Hello, <span className="text-white font-medium">{user.username}</span></span>
              <button
                onClick={handleSignOut}
                className="text-[#888888] hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
            {/* Mobile Menu Button */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-[#888888] hover:text-white hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-white"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#2a2a2a]">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/workout/log"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit')
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                Log Workout
              </Link>
              <Link
                href="/workout/template"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit')
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                Template
              </Link>
              <Link
                href="/workout/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === '/workout/history'
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#888888] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                History
              </Link>
              <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                <div className="px-3 py-2 text-sm text-[#888888]">
                  Hello, <span className="text-white font-medium">{user.username}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleSignOut()
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-[#888888] hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main>{children}</main>
    </div>
  )
}
