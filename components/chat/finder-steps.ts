'use client'

import { calls, type CallObservation } from 'eve/events'

import { useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { FINDER_AGENT, readTaskLine } from '@/components/chat/bundle-flow'

// What each running product-finder is doing right now, in words for the customer. Read from the finder's own
// session, which AgentContextProvider follows. eve rereads a busy subagent about once a second, so steps arrive in bursts.
export function useFinderSteps() {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    if (!isHydrated) {
        return []
    }
    const finderCalls = calls(agent.view, { kind: 'agent', name: FINDER_AGENT })
    const runningCalls = finderCalls.filter((call) => call.outcome === undefined)
    const childSessions = Object.values(agent.agents)

    const steps = []
    for (const call of runningCalls) {
        // A revision continues the finder's task, so its bundle and slot are named in the task's first message.
        const firstCall = finderCalls.find(({ taskId }) => taskId === call.taskId) ?? call
        const child = childSessions.find(({ taskId }) => taskId === call.taskId)
        const childCalls = child && child.observation.status !== 'not-followed' ? calls(child.observation.conversation.view) : []
        const latestCall = childCalls.at(-1)
        steps.push({
            callId: call.callId,
            bundleId: readTaskLine(firstCall, 'Bundle'),
            slotKey: readTaskLine(firstCall, 'Slot'),
            step: latestCall ? describeStep(latestCall) : 'Getting started',
        })
    }
    return steps
}

// Shop's tools are connection tools, which the finder calls through eve__tool ({ name, input }).
type StepInput = {
    name?: string
    input?: { catalog?: { query?: string } }
    candidates?: unknown[]
}

function describeStep(call: CallObservation) {
    const input = (call.input ?? {}) as StepInput
    const toolName = call.name === 'eve__tool' ? (input.name ?? '') : call.name

    if (toolName.endsWith('search_catalog')) {
        const query = input.input?.catalog?.query
        return query ? `Searching Shop for “${query}”` : 'Searching Shop'
    }
    if (toolName.endsWith('get_product')) {
        return 'Checking the price and stock'
    }
    if (toolName === 'rank_products') {
        const count = input.candidates?.length
        return count ? `Comparing ${count} options` : 'Comparing options'
    }
    // Our own tools already have labels written for people, like "Searching the store for mugs".
    return call.label
}
