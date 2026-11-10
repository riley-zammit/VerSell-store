'use client'

import { calls } from 'eve/events'

import { useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { CUSTOMIZER_AGENT, readTaskLine } from '@/components/chat/bundle-flow'

// Covers an item's image while its customizer works. Drafts stay private until the customizer publishes one, so this
// is the only sign of progress until the new mockup fades in underneath. Absolute, so it shifts nothing.
export function MockupLoader({ bundleId, itemKey, hasMockup }: { bundleId: string; itemKey: string; hasMockup: boolean }) {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    if (!isHydrated) {
        return null
    }

    const customizerCalls = calls(agent.view, { kind: 'agent', name: CUSTOMIZER_AGENT })
    const runningCalls = customizerCalls.filter((call) => call.outcome === undefined)
    const isWorkingOnItem = runningCalls.some((call) => {
        // Feedback continues the customizer's task, so its bundle and item are named in the task's first message.
        const firstCall = customizerCalls.find(({ taskId }) => taskId === call.taskId) ?? call
        return readTaskLine(firstCall, 'Bundle') === bundleId && readTaskLine(firstCall, 'Item') === itemKey
    })
    if (!isWorkingOnItem) {
        return null
    }

    return (
        <div className="absolute inset-0 flex items-end bg-white/40 p-3 transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none">
            <p className="flex items-center gap-2 rounded-full bg-white px-3 py-1 font-sans text-xs font-bold" role="status">
                <span aria-hidden className="block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {hasMockup ? 'Updating the mockup…' : 'Making a mockup…'}
            </p>
        </div>
    )
}
