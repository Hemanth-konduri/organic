import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()

    // ── Validate input ──────────────────────
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      )
    }

    // ── Find user ───────────────────────────
    const user = await prisma.user.findUnique({
      where: { phone }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid phone or password' },
        { status: 401 }
      )
    }

    // ── Check if active ─────────────────────
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account is not active. Contact your manager.' },
        { status: 403 }
      )
    }

    // ── Check password ──────────────────────
    const isValid = await comparePassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid phone or password' },
        { status: 401 }
      )
    }

    // ── Generate tokens ─────────────────────
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      name: user.name,
    })

    const refreshToken = generateRefreshToken(user.id)

    // ── Return response ─────────────────────
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}