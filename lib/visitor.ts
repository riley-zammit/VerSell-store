// The store has no login, so a random id in a long-lived cookie stands in for the customer. It's the chat's caller
// (agent/channels/eve.ts) and keys their list of bundles. proxy.ts sets it on the first visit.
// Shared with the agent, so no `server-only` or Next imports.
export const VISITOR_COOKIE = 'visitor'

export const visitorCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 365 * 24 * 60 * 60,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Only UUIDs, so an edited cookie can't put arbitrary text into a caller id or a Redis key.
export function isVisitorId(value: string | undefined): value is string {
    return value !== undefined && UUID.test(value)
}
