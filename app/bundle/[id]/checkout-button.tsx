'use client'

import { ignoreAbort, useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { useChatWindow } from '@/components/chat/chat-window-provider'

// Hands checkout to Eve, who plans it and walks the customer through it in the chat (bundle-building skill). The
// message carries this page, so Eve knows which bundle.
export function CheckoutButton() {
    const agent = useAgent()
    const { setIsOpen } = useChatWindow()
    const isHydrated = useIsHydrated()
    const canSend = isHydrated && agent.status !== 'resuming'

    return (
        <button
            className="button-dark"
            disabled={!canSend}
            onClick={() => {
                // Below lg the chat is a bubble, so open it to show the reply.
                setIsOpen(true)
                agent.send('I’m ready to check out.').catch(ignoreAbort)
            }}
            type="button"
        >
            Checkout
        </button>
    )
}
