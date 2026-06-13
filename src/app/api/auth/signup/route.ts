import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json()

    // ── Validate input ──────────────────────
    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone and password are required' },
        { status: 400 }
      )
    }

    // ── Check if first user ─────────────────
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    // ── If not first user, block signup ─────
    if (!isFirstUser) {
      return NextResponse.json(
        { error: 'Registration is by invitation only' },
        { status: 403 }
      )
    }

    // ── Check if phone already exists ───────
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      )
    }

    // ── Hash password ───────────────────────
    const hashedPassword = await hashPassword(password)

    // ── Create Admin user ───────────────────
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        phone,
        password: hashedPassword,
        role: 'ADMIN',       // first user is always Admin
        isActive: true,      // activated immediately
      }
    })

    // ── Generate tokens ─────────────────────
    const accessToken = generateAccessToken({
      id: user.id,
      role: user.role,
      name: user.name,
    })

    const refreshToken = generateRefreshToken(user.id)

    // ── Set refresh token in cookie ─────────
    const response = NextResponse.json({
      message: 'Admin account created successfully',
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
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}