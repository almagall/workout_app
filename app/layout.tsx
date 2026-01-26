import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workout Planner',
  description: 'Intelligent gym workout planner and dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="dark:bg-slate-900 dark:text-slate-100">{children}</body>
    </html>
  )
}
