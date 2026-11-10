'use client'

import { activeTurn } from 'eve/events'
import { useState } from 'react'

import { ignoreAbort, useAgent, useIsHydrated } from '@/components/chat/agent-provider'

// Same limits as the eve channel's uploadPolicy (agent/channels/eve.ts), checked here first
// so the customer gets a clear message instead of a rejected request.
const CREATIVE_TYPES = ['image/png', 'image/jpeg']
const MAX_CREATIVE_BYTES = 3 * 1024 * 1024

export function ChatInput() {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    const isResuming = isHydrated && agent.status === 'resuming'
    // Before hydration a send would go nowhere, so the input stays disabled until then.
    const canSend = isHydrated && !isResuming
    const turn = isHydrated ? activeTurn(agent.view) : undefined
    const [creative, setCreative] = useState<File | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)

    function pickCreative(file: File | undefined) {
        setCreative(null)
        setFileError(null)
        if (!file) {
            return
        }
        if (!CREATIVE_TYPES.includes(file.type)) {
            setFileError('Attach a PNG or JPG.')
            return
        }
        if (file.size > MAX_CREATIVE_BYTES) {
            setFileError('That image is over 3 MB. Try a smaller export.')
            return
        }
        setCreative(file)
    }

    // eve stages the attachment in the agent's sandbox; the agent's save_creative tool moves it to Blob.
    async function sendMessage(message: string, file: File | null) {
        if (!file) {
            return agent.send(message)
        }
        return agent.send([
            {
                type: 'text',
                text: message || 'Here’s my artwork.',
            },
            {
                type: 'file',
                data: await readAsDataUrl(file),
                mediaType: file.type,
                filename: file.name,
            },
        ])
    }

    return (
        <form
            className="border-t border-black/10 p-2"
            onSubmit={(event) => {
                event.preventDefault()
                const message = String(new FormData(event.currentTarget).get('message') ?? '').trim()
                if ((!message && !creative) || !canSend) {
                    return
                }
                event.currentTarget.reset()
                setCreative(null)
                sendMessage(message, creative).catch(ignoreAbort)
            }}
        >
            {creative || fileError ? (
                <p className={`px-3 pb-2 text-sm ${fileError ? 'text-red-700' : 'text-black/60'}`} role={fileError ? 'alert' : undefined}>
                    {fileError ?? (
                        <>
                            Attached: {creative?.name}{' '}
                            <button className="font-sans font-semibold underline" onClick={() => setCreative(null)} type="button">
                                Remove
                            </button>
                        </>
                    )}
                </p>
            ) : null}
            <div className="flex items-end gap-2">
                <label className="button-light flex shrink-0 cursor-pointer items-center px-3.5" title="Attach your logo or artwork">
                    <span className="sr-only">Attach your logo or artwork (PNG or JPG)</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6L15 6.6" />
                    </svg>
                    <input
                        accept={CREATIVE_TYPES.join(',')}
                        className="sr-only"
                        disabled={!canSend}
                        onChange={(event) => {
                            pickCreative(event.currentTarget.files?.[0])
                            // State holds the file, so clear the input; picking the same file again still fires onChange.
                            event.currentTarget.value = ''
                        }}
                        type="file"
                    />
                </label>
                <label className="sr-only" htmlFor="chat-message">
                    Message Eve
                </label>
                <textarea
                    className="min-h-12 min-w-0 flex-1 resize-none rounded-xl bg-transparent px-3 py-3 outline-none"
                    disabled={!canSend}
                    id="chat-message"
                    name="message"
                    placeholder={isResuming ? 'Reconnecting…' : 'Message Eve'}
                    rows={1}
                    onKeyDown={(event) => {
                        // Enter sends, Shift+Enter adds a line. Skip while an IME is composing.
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                        }
                    }}
                />
                {turn ? (
                    <button className="button-light shrink-0 px-4" onClick={() => agent.cancel().catch(ignoreAbort)} type="button">
                        Stop
                    </button>
                ) : null}
                <button className="button-dark shrink-0 px-4" disabled={!canSend} type="submit">
                    Send
                </button>
            </div>
        </form>
    )
}

function readAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}
