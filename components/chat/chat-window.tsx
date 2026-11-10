'use client'

import { catchError } from 'next/error'
import { usePathname } from 'next/navigation'

import { useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { useChatWindow } from '@/components/chat/chat-window-provider'
import { ChatInput } from '@/components/chat/parts/chat-input'
import { ChatMessages } from '@/components/chat/parts/chat-messages'

// The window's shape. On store pages it's a bubble (full screen on phones). On a bundle page it docks to the right at
// lg and up, into the room the page's ChatDockSpace reserves for it; smaller screens keep the bubble.
// Both shapes are anchored bottom-right with explicit sizes, so CSS can transition between them: the bubble grows up
// into the dock. The window itself animates, live, not a snapshot of it, so text never stretches or ghosts.
// `starting:` fades and lifts it in when it opens.
const bubbleClass =
    'fixed inset-0 z-40 flex flex-col bg-white transition-[height,right,bottom,border-radius,box-shadow,opacity,translate] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] starting:translate-y-4 starting:opacity-0 motion-reduce:transition-none sm:inset-auto sm:right-4 sm:bottom-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-100 sm:rounded-[25px] sm:shadow-card'
const dockedClass = 'lg:right-0 lg:bottom-0 lg:h-dvh lg:w-(--chat-width) lg:rounded-none lg:border-l lg:border-black/10 lg:shadow-none'

// The window sits in the root layout, above every error.tsx, so it brings its own boundary. It wraps only the body,
// so the header's close button still works when the chat breaks.
const ChatBoundary = catchError((_: object, { reset }) => <ChatError reset={reset} />)

// Reads the URL, which a page with an unknown param only has at request time, so the layout renders it inside
// Suspense with a plain ChatWindow fallback. Both are fixed-position, so the swap shifts nothing.
export function ChatWindowWithPathname() {
    const pathname = usePathname()
    return <ChatWindow isDocked={pathname.startsWith('/bundle/')} />
}

// One mounted window for both shapes, so scroll position and typed text survive the switch, and the window can morph.
export function ChatWindow({ isDocked = false }: { isDocked?: boolean }) {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    const { isOpen, setIsOpen } = useChatWindow()

    const isWindowShown = isOpen || isDocked
    // Docked but closed: the window shows at lg, the launcher below it.
    const hiddenBelowLg = isDocked && !isOpen ? 'max-lg:hidden' : ''

    return (
        <>
            {isOpen ? null : (
                <button
                    className={`button-dark fixed right-4 bottom-4 z-40 gap-2 max-sm:size-12 max-sm:p-0 ${isDocked ? 'lg:hidden' : ''}`}
                    onClick={() => setIsOpen(true)}
                    type="button"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
                    </svg>
                    <span className="max-sm:sr-only">Build a Bundle</span>
                </button>
            )}
            {isWindowShown ? (
                <aside aria-label="Chat with Eve" className={`${bubbleClass} ${isDocked ? dockedClass : ''} ${hiddenBelowLg}`}>
                    <header className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
                        <h2 className="text-xl">Bundle Builder</h2>
                        <div className="flex items-center gap-3">
                            {isHydrated && agent.session ? (
                                <button className="font-sans text-sm font-semibold underline" onClick={agent.newSession} type="button">
                                    New chat
                                </button>
                            ) : null}
                            <button
                                aria-label="Close chat"
                                className={`rounded-full p-1 hover:bg-black/5 ${isDocked ? 'lg:hidden' : ''}`}
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 6l12 12M18 6 6 18" />
                                </svg>
                            </button>
                        </div>
                    </header>
                    <ChatBoundary>
                        <ChatMessages />
                        <ChatInput />
                    </ChatBoundary>
                    <noscript>
                        <p className="px-4 pb-3 text-sm text-red-700">This chat needs JavaScript.</p>
                    </noscript>
                </aside>
            ) : null}
        </>
    )
}

// The chat's state is all in the browser, so reset (a plain re-render) is enough; retry would also refetch the page.
// If the saved conversation itself is what breaks, re-rendering hits it again, so starting fresh is the way out.
function ChatError({ reset }: { reset: () => void }) {
    const agent = useAgent()

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
            <p className="text-lg">The chat hit a snag.</p>
            <div className="flex gap-2">
                <button className="button-light" onClick={reset} type="button">
                    Try again
                </button>
                <button
                    className="button-dark"
                    onClick={() => {
                        agent.newSession()
                        reset()
                    }}
                    type="button"
                >
                    Start a new chat
                </button>
            </div>
        </div>
    )
}
