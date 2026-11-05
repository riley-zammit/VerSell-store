import { getHealth } from '@/lib/api'

// Pinged hourly by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token,
// so anyone else gets a bare 401 and nothing about the API is exposed.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return new Response(null, { status: 401 })
    }

    try {
        const health = await getHealth()
        if (health.status !== 'ok') throw new Error(`status: ${health.status}, redis: ${health.services.redis}`)
        return new Response(null, { status: 204 })
    } catch (error) {
        // Shows up in Vercel runtime logs; the 503 makes the failure easy to alert on.
        console.error('[health] Swag API health check failed', error)
        return new Response(null, { status: 503 })
    }
}
