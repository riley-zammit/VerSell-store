import 'server-only'
import { getToken } from '@vercel/connect'

// Same Vercel Connect connector the agent's Slack channel uses (agent/channels/slack.ts).
const SLACK_CONNECTOR = 'slack/riley-s-vercel'

/** Posts a plain message to a Slack channel as the bot. Throws if Slack rejects it. */
export async function postSlackMessage(channel: string, text: string) {
    // Slack bot tokens are app-scoped (one per workspace install), not per user.
    const token = await getToken(SLACK_CONNECTOR, { subject: { type: 'app' } })
    const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
            channel,
            text,
        }),
        signal: AbortSignal.timeout(5000), // a hung Slack call shouldn't hold the cron open
    })
    // Slack returns 200 even for failures; the real result is in `ok`.
    const body: { ok: boolean; error?: string } = await res.json()
    if (!body.ok) {
        throw new Error(`Slack rejected the message: ${body.error}`)
    }
}
