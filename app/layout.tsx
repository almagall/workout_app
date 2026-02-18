import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Workout Planner',
  description: 'Intelligent gym workout planner and dashboard',
}

export const viewport: Viewport = {
  themeColor: '#0c0c0c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark min-h-screen w-full">
      <body className="min-h-screen w-full bg-black text-white">{children}</body>
    </html>
  )
}
