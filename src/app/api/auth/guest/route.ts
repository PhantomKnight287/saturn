import { NextResponse } from 'next/server'
// import { auth, getSession } from '@/server/auth'

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const redirectUrl = searchParams.get('redirectUrl') || '/'

//   const session = await getSession(request)

//   if (session?.session?.token) {
//     return NextResponse.redirect(new URL('/', request.url))
//   }

//   const signInResponse = await auth.api.signInAnonymous({
//     query: {
//       callbackURL: redirectUrl,
//     },
//     asResponse: true,
//     headers: request.headers,
//   })

//   const response = NextResponse.redirect(new URL(redirectUrl, request.url))

//   const setCookie = signInResponse.headers.get('set-cookie')
//   if (setCookie) {
//     response.headers.set('set-cookie', setCookie)
//   }

//   return response
// }

export function GET() {
  return NextResponse.json({ message: 'This feature has been disabled.' })
}
