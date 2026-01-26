import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simple middleware - just allow all requests for now
  // Authentication is handled client-side with localStorage
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
