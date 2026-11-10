'use client'

import Image from 'next/image'
import { useState, useTransition, type FormEvent } from 'react'

import { useCart, useShownCart } from '@/components/cart/cart-provider'
import { NavLink } from '@/components/nav-link'
import { setCartQuantityAndRedirect } from '@/lib/cart-actions'
import { formatPrice } from '@/lib/format'
import { CartField, type CartLine } from '@/lib/types'

// Reads the client cart, which suspends until the first load, so render it inside Suspense. Still renders to HTML
// on the server, so the /cart page works without JS. `error` is the /cart page's failed no-JS add.
export function CartLines({ variant, error = null }: { variant: 'page' | 'drawer'; error?: string | null }) {
    const { cart, pending } = useShownCart()
    const pad = variant === 'drawer' ? 'px-5' : ''
    const overStock = cart.lines.some((line) => line.stockMessage !== null)

    if (cart.lines.length === 0) {
        return (
            <div className={`${pad} py-6`}>
                {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
                <p className="text-lg text-foreground/70">Your cart is empty.</p>
                {variant === 'page' ? (
                    <NavLink href="/" className="button-light mt-6">
                        Continue shopping
                    </NavLink>
                ) : null}
            </div>
        )
    }

    // Totals are the server's. While a change is pending they're the old ones, so they dim until the action returns.
    const totalClass = pending ? 'opacity-40' : ''

    return (
        <div className={`${pad} flex min-h-0 flex-1 flex-col`}>
            {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
            <ul className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2">
                {cart.lines.map((line) => (
                    <li key={line.productId} className="flex gap-3">
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-[17px] bg-background">
                            <Image src={line.image} alt="" fill sizes="80px" className="object-cover mix-blend-multiply" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <NavLink href={`/products/${line.slug}`} className="font-sans text-base leading-tight">
                                    {line.name}
                                </NavLink>
                                {line.lineTotal === null ? (
                                    // A new line the server hasn't priced yet.
                                    <span aria-hidden className="h-5 w-14 shrink-0 animate-pulse rounded bg-foreground/5" />
                                ) : (
                                    <p aria-busy={pending} className={`shrink-0 font-sans text-sm font-bold tracking-tight ${totalClass}`}>
                                        {formatPrice(line.lineTotal)}
                                    </p>
                                )}
                            </div>
                            <QuantityForm line={line} />
                            {line.stockMessage ? (
                                <p role="alert" className="mt-2 text-sm text-foreground/70">{line.stockMessage}</p>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ul>
            <div className="shrink-0 border-t border-foreground/10 py-5">
                <div className="flex items-baseline justify-between font-sans">
                    <span>Subtotal</span>
                    <span aria-busy={pending} className={`text-lg font-bold tracking-tight ${totalClass}`}>
                        {formatPrice(cart.subtotal)}
                    </span>
                </div>
                {variant === 'drawer' ? (
                    // Checkout and its stock gate live on the /cart page. The drawer closes when a link inside it is clicked.
                    <NavLink href="/cart" prefetch className="button-dark relative mt-4 w-full">
                        View cart
                    </NavLink>
                ) : (
                    // Inert until checkout exists. Disabled by the server's stock check, so it lags a pending change.
                    <button type="button" disabled={overStock} className="button-dark mt-4 w-full disabled:opacity-40">
                        Checkout
                    </button>
                )}
            </div>
        </div>
    )
}

// One form per line. Quantities are absolute, so a repeat submit is harmless.
function QuantityForm({ line }: { line: CartLine }) {
    const { setQuantity } = useCart()
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const buttonClass = 'grid size-8 place-items-center rounded-full font-sans disabled:opacity-40'

    // Before hydration the form posts natively and lands back on /cart. After, the submit runs here, so the new
    // quantity shows while the action runs.
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        const formData = new FormData(event.currentTarget, submitter)
        startTransition(async () => {
            const message = await setQuantity(line.productId, formData)
            // Updates after an await need their own transition to join the action.
            startTransition(() => {
                setError(message)
            })
        })
    }

    return (
        <form action={setCartQuantityAndRedirect} onSubmit={submit} className="mt-3" aria-busy={pending}>
            <input type="hidden" name={CartField.ProductId} value={line.productId} />
            {/* A disabled fieldset disables every button inside. One change at a time per line. */}
            <fieldset disabled={pending} className="flex flex-wrap items-center gap-2">
                <div className="inline-flex h-10 items-center rounded-full bg-background px-1">
                    <button
                        type="submit"
                        name={CartField.Quantity}
                        value={line.quantity - 1}
                        aria-label={`Decrease quantity of ${line.name}`}
                        className={buttonClass}
                    >
                        −
                    </button>
                    <span className="min-w-6 text-center font-sans text-sm tabular-nums">{line.quantity}</span>
                    <button
                        type="submit"
                        name={CartField.Quantity}
                        value={line.quantity + 1}
                        aria-label={`Increase quantity of ${line.name}`}
                        className={buttonClass}
                    >
                        +
                    </button>
                </div>
                <button
                    type="submit"
                    name={CartField.Quantity}
                    value={0}
                    className="px-2 font-sans text-sm text-foreground/60 underline-offset-2 hover:underline disabled:opacity-40"
                >
                    Remove
                </button>
            </fieldset>
            {error ? <p role="alert" className="mt-2 text-sm text-foreground/70">{error}</p> : null}
        </form>
    )
}

export function CartSkeleton() {
    return (
        <div aria-hidden className="flex min-h-64 flex-1 flex-col">
            <div className="space-y-4 px-5 py-2">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="flex gap-3">
                        <div className="size-20 shrink-0 animate-pulse rounded-[17px] bg-foreground/5" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/5" />
                            <div className="h-4 w-16 animate-pulse rounded bg-foreground/5" />
                            <div className="h-10 w-32 animate-pulse rounded-full bg-foreground/5" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto space-y-3 px-5 py-5">
                <div className="h-6 animate-pulse rounded bg-foreground/5" />
                <div className="h-12 animate-pulse rounded-full bg-foreground/10" />
            </div>
        </div>
    )
}

// Shared by the /cart page's error.tsx and the drawer's boundary.
export function CartError({ reset }: { reset: () => void }) {
    return (
        <div className="px-5 py-16 text-center">
            <p className="text-lg">The cart didn’t load.</p>
            <button type="button" onClick={reset} className="button-dark mt-6">
                Try again
            </button>
        </div>
    )
}
