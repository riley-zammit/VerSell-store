'use client'

import type { Interaction, UseEveAgentReturn } from 'eve/react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { ignoreAbort, useAgent, useIsHydrated } from '@/components/chat/agent-provider'
import { useFinderSteps } from '@/components/chat/finder-steps'

// Within this distance of the bottom counts as "at the bottom", so new text keeps it pinned there.
const PIN_THRESHOLD_PX = 48

// Markdown links to https or this site, then bare https URLs (minus trailing punctuation). The only formatting the chat
// renders, so the Shop checkout links and the cart link Eve sends are clickable.
const LINK_PATTERN = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)|(https?:\/\/[^\s)]*[^\s).,;:!?])/g

export function ChatMessages() {
    const agent = useAgent()
    const isHydrated = useIsHydrated()
    const isResuming = isHydrated && agent.status === 'resuming'
    const isBusy = isHydrated && agent.status === 'busy'
    const messages = isHydrated ? agent.messages : []
    const error = isHydrated ? agent.error : undefined
    const finderSteps = useFinderSteps()
    const listRef = useRef<HTMLDivElement>(null)
    const isPinnedToBottom = useRef(true)

    // Follow the reply as it streams, unless the customer has scrolled up to read.
    useEffect(() => {
        const list = listRef.current
        if (list && isPinnedToBottom.current) {
            list.scrollTop = list.scrollHeight
        }
    }, [agent.messages, isBusy])

    return (
        <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto p-4"
            aria-live="polite"
            onScroll={(event) => {
                const list = event.currentTarget
                const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
                isPinnedToBottom.current = distanceFromBottom < PIN_THRESHOLD_PX
            }}
        >
            {messages.length === 0 ? (
                <p className="rounded-2xl bg-black/5 p-4 text-black/60">
                    {isResuming ? 'Loading your conversation…' : 'What’s the bundle for? Like “a welcome kit for new engineers.”'}
                </p>
            ) : (
                messages.map((message) => (
                    <article
                        className={`max-w-[90%] rounded-2xl p-4 ${message.role === 'user' ? 'ml-auto bg-black text-white' : 'bg-black/5'}`}
                        key={message.id}
                    >
                        <p className="mb-2 font-sans text-xs font-bold tracking-wide uppercase opacity-60">
                            {message.role === 'user' ? 'You' : 'Eve'}
                        </p>
                        <div className="space-y-3 wrap-break-word whitespace-pre-wrap">
                            {message.parts.map((part, index) => {
                                if (part.type === 'text') {
                                    return <TextWithLinks key={part.id ?? index} text={part.text} />
                                }
                                if (part.type === 'file') {
                                    return (
                                        <p className="text-sm" key={`file-${index}`}>
                                            Attachment: {part.filename ?? part.mediaType}
                                        </p>
                                    )
                                }
                                if (part.type === 'interaction') {
                                    return (
                                        <InteractionPrompt
                                            disabled={isResuming}
                                            interaction={part}
                                            key={part.interactionId}
                                            respond={agent.respond}
                                        />
                                    )
                                }
                                if (part.type === 'tool') {
                                    const finderStep = finderSteps.find((finder) => finder.callId === part.callId)?.step
                                    return (
                                        <div className="space-y-2 text-sm" key={part.callId}>
                                            <p className="font-sans font-semibold">{part.label}</p>
                                            {finderStep ? (
                                                <p className="flex items-center gap-2 font-sans text-black/60">
                                                    <span
                                                        aria-hidden
                                                        className="block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                                                    />
                                                    {finderStep}
                                                </p>
                                            ) : null}
                                            {part.interaction ? (
                                                <InteractionPrompt
                                                    disabled={isResuming}
                                                    interaction={part.interaction}
                                                    respond={agent.respond}
                                                />
                                            ) : null}
                                        </div>
                                    )
                                }
                                return null
                            })}
                        </div>
                    </article>
                ))
            )}
            {isBusy ? (
                <div className="flex w-fit items-center gap-3 rounded-2xl bg-black/5 p-4 text-black/60" role="status">
                    <span
                        aria-hidden
                        className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                    Eve is working…
                </div>
            ) : null}
            {error ? (
                <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800" role="alert">
                    {error.message}
                </p>
            ) : null}
        </div>
    )
}

function TextWithLinks({ text }: { text: string }) {
    const pieces = []
    let textStart = 0
    for (const match of text.matchAll(LINK_PATTERN)) {
        const [whole, label, markdownUrl, bareUrl] = match
        const url = markdownUrl ?? bareUrl
        pieces.push(text.slice(textStart, match.index))
        if (url.startsWith('/')) {
            // A page here, like the cart: client navigation keeps the chat open.
            pieces.push(
                <Link className="font-sans font-semibold underline" href={url} key={match.index}>
                    {label ?? url}
                </Link>,
            )
        } else {
            pieces.push(
                <a className="font-sans font-semibold underline" href={url} key={match.index} rel="noreferrer" target="_blank">
                    {label ?? url}
                </a>,
            )
        }
        textStart = match.index + whole.length
    }
    pieces.push(text.slice(textStart))
    return <p>{pieces}</p>
}

function InteractionPrompt({
    disabled,
    interaction,
    respond,
}: {
    disabled: boolean
    interaction: Interaction
    respond: UseEveAgentReturn['respond']
}) {
    const options = interaction.request.options ?? []
    const locked = disabled || interaction.status !== 'open' || interaction.answer !== undefined
    const signIn = interaction.request.signIn

    if (signIn) {
        return (
            <div className="rounded-xl border border-black/10 bg-white p-3 text-black">
                <p>{signIn.instructions ?? interaction.request.prompt}</p>
                {signIn.userCode ? <code className="mt-2 block">{signIn.userCode}</code> : null}
                {signIn.url ? (
                    <a className="mt-3 inline-block font-sans font-semibold underline" href={signIn.url} rel="noreferrer" target="_blank">
                        Sign in
                    </a>
                ) : null}
            </div>
        )
    }

    if (locked) {
        const selected = options.find(({ id }) => id === interaction.answer?.optionId)?.label
        return (
            <p className="rounded-xl border border-black/10 bg-white p-3 whitespace-pre-line text-black">
                {interaction.request.prompt}
                {interaction.answer ? ` — ${selected ?? interaction.answer.text ?? 'answered'}` : ''}
            </p>
        )
    }

    return (
        <div className="rounded-xl border border-black/10 bg-white p-3 text-black">
            <p className="whitespace-pre-line">{interaction.request.prompt}</p>
            {options.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {options.map((option) => (
                        <button
                            className={option.style === 'primary' ? 'button-dark' : 'button-light'}
                            key={option.id}
                            onClick={() => respond([{ interactionId: interaction.interactionId, optionId: option.id }]).catch(ignoreAbort)}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}
            {interaction.request.allowFreeform || options.length === 0 ? (
                <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                        event.preventDefault()
                        const text = String(new FormData(event.currentTarget).get('answer') ?? '').trim()
                        if (!text) {
                            return
                        }
                        respond([{ interactionId: interaction.interactionId, text }]).catch(ignoreAbort)
                    }}
                >
                    <label className="sr-only" htmlFor={`answer-${interaction.interactionId}`}>
                        Your answer
                    </label>
                    <input
                        className="min-w-0 flex-1 rounded-xl border border-black/20 px-3"
                        id={`answer-${interaction.interactionId}`}
                        name="answer"
                        required
                    />
                    <button className="button-dark" type="submit">
                        Answer
                    </button>
                </form>
            ) : null}
        </div>
    )
}
