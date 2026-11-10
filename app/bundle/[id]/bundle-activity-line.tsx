'use client'

import { calls } from 'eve/events'

import { useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { CUSTOMIZER_AGENT, FINDER_AGENT } from '@/components/chat/bundle-flow'

// What the agent is doing to the bundle right now. Always one line tall, so it never shifts the page.
export function BundleActivityLine() {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    const agentCalls = isHydrated ? calls(agent.view, { kind: 'agent' }) : []
    const runningCalls = agentCalls.filter((call) => call.outcome === undefined)
    const productsInProgress = runningCalls.filter((call) => call.name === FINDER_AGENT).length
    const mockupsInProgress = runningCalls.filter((call) => call.name === CUSTOMIZER_AGENT).length

    let activity = ''
    if (productsInProgress === 1) {
        activity = 'Eve is finding a product…'
    } else if (productsInProgress > 1) {
        activity = `Eve is finding ${productsInProgress} products at once…`
    } else if (mockupsInProgress === 1) {
        activity = 'Eve is making a mockup…'
    } else if (mockupsInProgress > 1) {
        activity = `Eve is making ${mockupsInProgress} mockups…`
    }

    return (
        <p className="mt-2 h-6 font-sans text-sm text-foreground/60" role="status">
            {activity}
        </p>
    )
}
