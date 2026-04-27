import jwt from 'jsonwebtoken'
import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { getSession } from '@/server/auth'

export async function GET(request: NextRequest) {
  const org = env.NEXT_PUBLIC_FEATUREBASE_ORG
  const secret = env.FEATUREBASE_JWT_SECRET

  if (!(org && secret)) {
    return NextResponse.json(
      { error: 'Featurebase is not configured' },
      { status: 503 }
    )
  }

  const session = await getSession()
  if (!session?.user) {
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('redirectTo', '/api/featurebase/sso')
    return NextResponse.redirect(signInUrl)
  }

  const { user } = session
  const portalUrl = `https://${org}.featurebase.app`
  const returnTo = request.nextUrl.searchParams.get('return_to') ?? portalUrl

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.image ?? undefined,
    },
    secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  )

  const redirectUrl = new URL(`${portalUrl}/api/v1/auth/access/jwt`)
  redirectUrl.searchParams.set('jwt', token)
  redirectUrl.searchParams.set('return_to', returnTo)

  return NextResponse.redirect(redirectUrl)
}
