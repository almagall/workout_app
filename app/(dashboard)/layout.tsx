'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth-simple'
import NotificationBell from '@/components/dashboard/NotificationBell'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', match: (p: string) => p === '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/workout/log', label: 'Log Workout', match: (p: string) => p.startsWith('/workout/log') || p.startsWith('/workout/edit'), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/workout/template', label: 'Template', match: (p: string) => p === '/workout/template' || p === '/workout/template/create' || p.startsWith('/workout/template/edit'), icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { href: '/workout/history', label: 'History', match: (p: string) => p === '/workout/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/exercises', label: 'Exercise Database', match: (p: string) => p === '/exercises', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
]

const SOCIAL_ITEMS = [
  { href: '/achievements', label: 'Achievements', match: (p: string) => p === '/achievements', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { href: '/friends', label: 'Friends', match: (p: string) => p === '/friends', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { href: '/leaderboards', label: 'Leaderboards', match: (p: string) => p === '/leaderboards', icon: 'M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
]

const PROFILE_ITEMS = [
  { href: '/weight', label: 'Weight', match: (p: string) => p === '/weight', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { href: '/settings', label: 'Settings', match: (p: string) => p === '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
]

function NavIcon({ d, className }: { d: string; className?: string }) {
  const paths = d === PROFILE_ITEMS[1].icon
    ? [d, 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']
    : [d]
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths.map((p, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={p} />
      ))}
    </svg>
  )
}

function NavLink({ item, active, onClick }: { item: typeof NAV_ITEMS[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? 'bg-white/[0.06] text-foreground'
          : 'text-muted hover:bg-white/[0.03] hover:text-foreground'
      }`}
    >
      <NavIcon d={item.icon} className={`w-5 h-5 shrink-0 ${active ? 'text-accent' : 'text-muted group-hover:text-secondary'} transition-colors`} />
      {item.label}
    </Link>
  )
}

const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Dashboard', match: (p: string) => p === '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/workout/log', label: 'Log', match: (p: string) => p.startsWith('/workout/log') || p.startsWith('/workout/edit'), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { href: '/workout/history', label: 'History', match: (p: string) => p === '/workout/history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

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
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const allItems = [...NAV_ITEMS, ...SOCIAL_ITEMS, ...PROFILE_ITEMS]

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:overflow-y-auto lg:bg-sidebar lg:border-r lg:border-white/[0.04]">
        <div className="flex flex-col h-full">
          <div className="flex h-16 items-center px-6">
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">Workout Planner</h1>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.href} item={item} active={item.match(pathname)} />
              ))}

              <div className="pt-5 pb-1">
                <div className="border-t border-white/[0.04] pt-4 px-3 mb-2">
                  <p className="text-[11px] font-semibold text-muted/50 uppercase tracking-widest">Social</p>
                </div>
              </div>

              {SOCIAL_ITEMS.map(item => (
                <NavLink key={item.href} item={item} active={item.match(pathname)} />
              ))}

              <div className="pt-5 pb-1">
                <div className="border-t border-white/[0.04] pt-4 px-3 mb-2">
                  <p className="text-[11px] font-semibold text-muted/50 uppercase tracking-widest">Profile</p>
                </div>
              </div>

              {PROFILE_ITEMS.map(item => (
                <NavLink key={item.href} item={item} active={item.match(pathname)} />
              ))}
            </div>
          </nav>

          <div className="border-t border-white/[0.04] p-4">
            <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-white/[0.03]">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-semibold text-sm text-accent">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="group w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted hover:bg-white/[0.03] hover:text-foreground rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden">
        <div className="bg-sidebar/90 backdrop-blur-xl border-b border-white/[0.04] pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center justify-between h-16 px-4">
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">Workout Planner</h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-md text-muted hover:text-foreground hover:bg-white/[0.04] focus:outline-none transition-colors"
                aria-expanded={mobileMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {!mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-white/[0.04]">
              <div className="px-2 pt-2 pb-3 space-y-0.5 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {allItems.map((item, i) => (
                  <div key={item.href}>
                    {i === NAV_ITEMS.length && (
                      <div className="pt-4 pb-1"><div className="border-t border-white/[0.04] pt-3 px-3 mb-2"><p className="text-[11px] font-semibold text-muted/50 uppercase tracking-widest">Social</p></div></div>
                    )}
                    {i === NAV_ITEMS.length + SOCIAL_ITEMS.length && (
                      <div className="pt-4 pb-1"><div className="border-t border-white/[0.04] pt-3 px-3 mb-2"><p className="text-[11px] font-semibold text-muted/50 uppercase tracking-widest">Profile</p></div></div>
                    )}
                    <NavLink item={item} active={item.match(pathname)} onClick={() => setMobileMenuOpen(false)} />
                  </div>
                ))}

                <div className="border-t border-white/[0.04] pt-3 mt-3">
                  <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-white/[0.03]">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-semibold text-sm text-accent shrink-0">
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
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-white/[0.03] hover:text-foreground transition-colors"
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
        <div className="bg-sidebar/60 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center justify-end h-14 px-6">
            <div className="flex items-center gap-4">
              <NotificationBell />
              <span className="text-sm text-muted">
                {user.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-end justify-around bg-sidebar/90 backdrop-blur-xl border-t border-white/[0.04] pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        aria-label="Mobile navigation"
      >
        {BOTTOM_NAV.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] justify-center rounded-lg transition-all duration-200 ${
                active ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              <NavIcon d={item.icon} className={`w-6 h-6 shrink-0 ${active ? 'text-accent' : ''} transition-colors`} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] justify-center rounded-lg text-muted hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="lg:pl-64 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">{children}</main>
    </div>
  )
}
