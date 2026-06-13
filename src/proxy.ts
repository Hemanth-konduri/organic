import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Define which role can access which path
const roleRoutes: Record<string, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager',
  REGIONAL_HEAD: '/regional',
  EXECUTIVE_MANAGER: '/executive',
  FIELD_WORKER: '/field',
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/setup' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  // Get token from header
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verify token
  const decoded = verifyToken(token)

  if (!decoded) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Check role matches the route
  const allowedPath = roleRoutes[decoded.role]

  if (allowedPath && !pathname.startsWith(allowedPath)) {
    return NextResponse.redirect(new URL(allowedPath, req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
