import { NextResponse, type NextRequest } from 'next/server'

import { isVisitorId, VISITOR_COOKIE, visitorCookieOptions } from '@/lib/visitor'

// Gives a new visitor their id before anything renders. Only when it's missing, so a returning visitor's responses
// carry no Set-Cookie.
export function proxy(request: NextRequest) {
    if (isVisitorId(request.cookies.get(VISITOR_COOKIE)?.value)) {
        return NextResponse.next()
    }
    const visitorId = crypto.randomUUID()
    // On the request too, so this first page already renders for the visitor.
    request.cookies.set(VISITOR_COOKIE, visitorId)
    const response = NextResponse.next({ request: { headers: request.headers } })
    response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions)
    return response
}

export const config = {
    // Pages and Server Functions. Not static files, optimized images, or the agent's API, which the browser only
    // calls from a page that already set the cookie.
    matcher: ['/((?!_next/static|_next/image|eve/|favicon.ico).*)'],
}
