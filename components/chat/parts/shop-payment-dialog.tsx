'use client'

import { calls, type SessionView } from 'eve/events'
import type { Interaction } from 'eve/react'
import { useEffect, useRef, useState } from 'react'

import { ignoreAbort, useAgent } from '@/components/chat/agent-provider'
import { formatMoney } from '@/lib/format'

export const COMPLETE_CHECKOUT_TOOL = 'shop-mcp__complete_checkout'

// Each of these returns Shop's checkout document. The newest one for a checkout is what the customer is paying for.
const CHECKOUT_TOOLS = ['shop-mcp__create_checkout', 'shop-mcp__get_checkout', 'shop-mcp__update_checkout']

// The parts of Shop's checkout document the window shows (shop.dev/docs/checkout). Amounts are minor units.
type ShopCheckout = {
    id: string
    currency: string
    line_items: {
        id: string
        item: { title: string; price: number }
        quantity: number
        totals?: { type: string; amount: number }[]
    }[]
    totals: { type: string; amount: number; display_text: string }[]
    messages?: { type: string; content: string }[]
    links?: { type: string; url: string; title?: string }[]
    continue_url: string
}

// The approval for Shop's complete_checkout, shown as a payment window. It opens by itself when the agent is ready to
// charge, and closing it leaves a button in the chat to reopen it. Approve runs the payment; Cancel denies the call.
export function ShopPaymentDialog({ disabled, input, interaction }: { disabled: boolean; input: unknown; interaction: Interaction }) {
    const agent = useAgent()
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [isDismissed, setIsDismissed] = useState(false)

    const { shop, id } = input as { shop: string; id: string }
    const checkout = findLatestCheckout(agent.view, id)
    const isAnswered = interaction.status !== 'open' || interaction.answer !== undefined
    const isDialogOpen = !disabled && !isAnswered && !isDismissed

    // showModal traps focus and makes the page inert; it puts the window above the chat's own stacking.
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) {
            return
        }
        if (isDialogOpen && !dialog.open) {
            dialog.showModal()
        }
        if (!isDialogOpen && dialog.open) {
            dialog.close()
        }
    }, [isDialogOpen])

    const answer = (optionId: 'approve' | 'deny') => {
        dialogRef.current?.close()
        agent.respond([{ interactionId: interaction.interactionId, optionId }]).catch(ignoreAbort)
    }

    if (isAnswered) {
        const isApproved = interaction.answer?.optionId === 'approve'
        return (
            <p className="rounded-xl border border-black/10 bg-white p-3 text-black">
                Payment to {shop}: {isApproved ? 'approved' : 'cancelled'}
            </p>
        )
    }

    const total = checkout?.totals.find((entry) => entry.type === 'total')
    const payLabel = total && checkout ? `Pay ${formatMoney(total.amount, checkout.currency)}` : 'Pay with Shop'
    const titleId = `pay-${interaction.interactionId}`

    return (
        <div className="rounded-xl border border-black/10 bg-white p-3 text-black">
            <p>Ready to pay {shop} with your Shop wallet.</p>
            <button className="button-dark mt-3" disabled={disabled} onClick={() => setIsDismissed(false)} type="button">
                Review and pay
            </button>
            <dialog
                aria-labelledby={titleId}
                className="m-auto w-[min(calc(100vw-2rem),28rem)] rounded-[25px] bg-white p-0 text-black shadow-card backdrop:bg-black/40"
                // Esc (and other native closes) shut the window first; this keeps the state in step.
                onClose={() => setIsDismissed(true)}
                ref={dialogRef}
            >
                <div className="space-y-4 p-6">
                    <h2 className="text-2xl" id={titleId}>
                        Pay {shop}
                    </h2>
                    <p>You’ll check out using your Shop wallet instead of {shop}’s checkout.</p>
                    {checkout ? (
                        <CheckoutSummary checkout={checkout} />
                    ) : (
                        // Shop's document is too big to keep in the browser's copy of the session; the agent listed it.
                        <p className="text-sm text-black/60">The order details are in the chat.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button className="button-dark" onClick={() => answer('approve')} type="button">
                            {payLabel}
                        </button>
                        <button className="button-light" onClick={() => answer('deny')} type="button">
                            Cancel
                        </button>
                    </div>
                    {/* Shop asks agents to always offer the store's own checkout too. */}
                    {checkout ? (
                        <a className="block font-sans text-sm underline" href={checkout.continue_url} rel="noreferrer" target="_blank">
                            Check out on {shop}’s site instead
                        </a>
                    ) : null}
                </div>
            </dialog>
        </div>
    )
}

// Shop asks for every total with its label, every message, and every legal link to be shown.
function CheckoutSummary({ checkout }: { checkout: ShopCheckout }) {
    const messages = checkout.messages ?? []
    const links = checkout.links ?? []

    return (
        <>
            <ul className="space-y-1">
                {checkout.line_items.map((line) => {
                    const lineTotal = line.totals?.find((entry) => entry.type === 'total')?.amount ?? line.item.price * line.quantity
                    return (
                        <li className="flex justify-between gap-4" key={line.id}>
                            <span>
                                {line.item.title} × {line.quantity}
                            </span>
                            <span>{formatMoney(lineTotal, checkout.currency)}</span>
                        </li>
                    )
                })}
            </ul>
            <dl className="space-y-1 border-t border-black/10 pt-3 text-sm">
                {checkout.totals.map((entry) => (
                    <div className={`flex justify-between gap-4 ${entry.type === 'total' ? 'font-semibold' : ''}`} key={entry.type}>
                        <dt>{entry.display_text}</dt>
                        <dd>{formatMoney(entry.amount, checkout.currency)}</dd>
                    </div>
                ))}
            </dl>
            {messages.length > 0 ? (
                <ul className="space-y-1 text-sm text-black/70">
                    {messages.map((message, index) => (
                        <li key={index}>{message.content}</li>
                    ))}
                </ul>
            ) : null}
            {links.length > 0 ? (
                <p className="flex flex-wrap gap-x-3 text-sm">
                    {links.map((link) => (
                        <a className="underline" href={link.url} key={link.url} rel="noreferrer" target="_blank">
                            {link.title ?? link.type.replaceAll('_', ' ')}
                        </a>
                    ))}
                </p>
            ) : null}
        </>
    )
}

// eve keeps call outputs up to 16 KB in the browser's view, so a very large document can be missing.
function findLatestCheckout(view: SessionView, checkoutId: string) {
    const checkoutCalls = calls(view).filter((call) => CHECKOUT_TOOLS.includes(call.name) && call.output !== undefined)
    const documents = checkoutCalls.map((call) => call.output as ShopCheckout)
    const thisCheckout = documents.filter((document) => document.id === checkoutId)
    return thisCheckout.at(-1)
}
