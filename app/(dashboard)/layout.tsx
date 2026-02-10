'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth-simple'
import NotificationBell from '@/components/dashboard/NotificationBell'

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-background lg:border-r lg:border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Workout Planner</h1>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-6">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/dashboard'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/dashboard' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>

              <Link
                href="/workout/log"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit')
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit') ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Log Workout
              </Link>

              <Link
                href="/workout/template"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit')
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit') ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Template
              </Link>

              <Link
                href="/workout/history"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/workout/history'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/workout/history' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </Link>

              <Link
                href="/exercises"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/exercises'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/exercises' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Exercise Database
              </Link>

              <div className="pt-4 pb-2">
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Social</p>
                </div>
              </div>

              <Link
                href="/achievements"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/achievements'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/achievements' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Achievements
              </Link>

              <Link
                href="/friends"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/friends'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/friends' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Friends
              </Link>

              <Link
                href="/leaderboards"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/leaderboards'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/leaderboards' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Leaderboards
              </Link>

              <div className="pt-4 pb-2">
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider">Profile</p>
                </div>
              </div>

              <Link
                href="/weight"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/weight'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/weight' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Weight
              </Link>

              <Link
                href="/settings"
                className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  pathname === '/settings'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-muted hover:bg-elevated hover:text-foreground'
                }`}
              >
                <svg className={`w-5 h-5 ${pathname === '/settings' ? 'text-black' : 'text-muted group-hover:text-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-card rounded-lg">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="group w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-foreground rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-muted group-hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden">
        <div className="bg-card border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <h1 className="text-xl font-bold text-foreground">Workout Planner</h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted hover:text-foreground hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-white"
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

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="border-t border-border">
              <div className="px-2 pt-2 pb-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/dashboard' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
                <Link
                  href="/workout/log"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit')
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname?.startsWith('/workout/log') || pathname?.startsWith('/workout/edit') ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Log Workout
                </Link>
                <Link
                  href="/workout/template"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit')
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/workout/template' || pathname === '/workout/template/create' || pathname?.startsWith('/workout/template/edit') ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Template
                </Link>
                <Link
                  href="/workout/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/workout/history'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/workout/history' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </Link>
                <Link
                  href="/exercises"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/exercises'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/exercises' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Exercise Database
                </Link>

                <div className="pt-4 pb-2">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Social</p>
                  </div>
                </div>

                <Link
                  href="/achievements"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/achievements'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/achievements' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Achievements
                </Link>
                <Link
                  href="/friends"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/friends'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/friends' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Friends
                </Link>
                <Link
                  href="/leaderboards"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/leaderboards'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/leaderboards' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Leaderboards
                </Link>

                <div className="pt-4 pb-2">
                  <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider">Profile</p>
                  </div>
                </div>

                <Link
                  href="/weight"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/weight'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/weight' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  Weight
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    pathname === '/settings'
                      ? 'bg-white text-black shadow-lg'
                      : 'text-muted hover:bg-elevated hover:text-foreground'
                  }`}
                >
                  <svg className={`w-5 h-5 shrink-0 ${pathname === '/settings' ? 'text-black' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-card rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm shrink-0">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-base font-medium text-muted hover:bg-elevated hover:text-foreground transition-colors"
                  >
                    <svg className="w-5 h-5 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div className="hidden lg:block lg:pl-64">
        <div className="bg-card border-b border-border">
          <div className="flex items-center justify-end h-16 px-6">
            <div className="flex items-center gap-4">
              <NotificationBell />
              <span className="text-sm text-muted">
                Hello, <span className="text-foreground font-medium">{user.username}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64">{children}</main>
    </div>
  )
}
