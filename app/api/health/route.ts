import { getHealth } from '@/lib/api'
import { postSlackMessage } from '@/lib/slack'

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

        // A Slack failure is only logged, so it never hides the 503 from Vercel.
        const reason = error instanceof Error ? error.message : String(error)
        await postSlackMessage('#alerts', `:rotating_light: Swag API health check failed\n\`${reason}\``).catch(
            (slackError) => console.error('[health] Could not post to Slack #alerts', slackError),
        )

        return new Response(null, { status: 503 })
    }
}
