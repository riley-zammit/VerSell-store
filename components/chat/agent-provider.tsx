'use client'

import type { ClientSessionState } from 'eve/client'
import { useEveAgent, type UseEveAgentReturn } from 'eve/react'
import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react'

import { CUSTOMIZER_AGENT, FINDER_AGENT, useBundleFlow } from '@/components/chat/bundle-flow'

const SESSION_KEY = 'eve-session'

// Each useEveAgent call opens its own stream and session store, and eve has no provider of its own, so the one agent
// is created in AgentContextProvider and shared through this.
const AgentContext = createContext<UseEveAgentReturn | null>(null)

export function useAgent() {
    const agent = useContext(AgentContext)
    if (!agent) {
        throw new Error('useAgent must render inside AgentContextProvider')
    }
    return agent
}

// send, respond and cancel reject with an AbortError when the chat restarts (New chat, or a remount) mid-request.
// That's expected, so callers that don't wait on the result drop it. Anything else is a real failure and still throws.
export function ignoreAbort(error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
        return
    }
    throw error
}

// One agent per visitor, whatever page they're on. It sits in the root layout, so moving between the bubble and the
// bundle page never resets the conversation or cuts off a reply. Bundles aren't tied to the chat: each message tells
// Eve which page the customer is on, and a bundle page names its bundle.
export function AgentContextProvider({ children }: { children: ReactNode }) {
    // The hook reads its session options once, when it creates its store.
    const [savedSession] = useState(readSavedSession)
    const agent = useEveAgent({
        initialSession: savedSession,
        resume: savedSession !== undefined,
        onSessionChange: saveSession,
        // Read at send time, so it's the page the customer is looking at. It applies to that turn only.
        prepareSend: (input) => ({
            ...input,
            clientContext: { page: window.location.pathname },
        }),
        // Follows the finders' and customizers' own sessions, so the page can show what each finder is doing and
        // refresh the moment a product or mockup is saved, not when the subagent finishes replying. Only those two:
        // eve rereads every followed session every few seconds for as long as the page is open.
        followAgents: ({ name }) => name === FINDER_AGENT || name === CUSTOMIZER_AGENT,
        // Tool calls stay out of the chat, so they're logged here for debugging. Only Eve's own calls: each subagent's
        // calls are on its own stream.
        onEvent: (event) => {
            if (event.type === 'call.requested' || event.type === 'call.settled') {
                console.log(`[eve] ${event.type}`, event.data)
            }
        },
    })
    useBundleFlow(agent)

    return <AgentContext.Provider value={agent}>{children}</AgentContext.Provider>
}

// Session-based - local storage. The visitor's last chat, on any page. 
function readSavedSession(): ClientSessionState | undefined {
    if (typeof window === 'undefined') {
        return undefined
    }
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : undefined
}

// Stored as eve gives it: the cursor carries an opaque inbox hint that makes later sends faster.
function saveSession(session: ClientSessionState | undefined) {
    if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
        localStorage.removeItem(SESSION_KEY)
    }
}


const subscribeNever = () => () => {}

// Workaround to avoid hydration mismatch:
// False on the server and during hydration, true after. The saved session is only read on the client, so anything
// that depends on the agent's state waits for this to avoid a hydration mismatch. 
export function useIsHydrated() {
    return useSyncExternalStore(
        subscribeNever,
        () => true,
        () => false,
    )
}