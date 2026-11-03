'use client'

import Image from 'next/image'
import { useTransition } from 'react'

import { EmptyCart } from '@/components/cart/cart-parts'
import { useCart, useCartView } from '@/components/cart/cart-provider'
import { NavLink } from '@/components/nav-link'
import { formatPrice } from '@/lib/format'

type Variant = 'page' | 'drawer'

// Suspends until the server cart loads, so render it inside Suspense.
export function CartLines({ variant }: { variant: Variant }) {
    const cart = useCartView()
    const { changes, error, setQuantity } = useCart()
    // useTransition rather than the bare startTransition, so a thrown write reaches this view's error boundary.
    const [, startTransition] = useTransition()
    const pad = variant === 'drawer' ? 'px-5' : ''
    const pending = changes.length > 0

    if (!cart || cart.items.length === 0) {
        return (
            <div className={pad}>
                <EmptyCart error={error} showContinueShopping={variant === 'page'} />
            </div>
        )
    }

    // Quantities are absolute and Next runs Server Actions one at a time, so rapid clicks stack safely.
    const set = (productId: string, quantity: number) => startTransition(() => setQuantity(productId, quantity))

    return (
        <div className={`${pad} flex min-h-0 flex-1 flex-col`} aria-busy={pending}>
            {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
            <ul className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2">
                {cart.items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-[17px] bg-background">
                            <Image src={item.product.images[0]} alt="" fill sizes="80px" className="object-cover mix-blend-multiply" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <NavLink href={`/products/${item.product.slug}`} className="font-sans text-base leading-tight">
                                    {item.product.name}
                                </NavLink>
                                <p className="shrink-0 font-sans text-sm font-bold tracking-tight">{formatPrice(item.lineTotal)}</p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="inline-flex h-10 items-center rounded-full bg-background px-1">
                                    <button
                                        type="button"
                                        onClick={() => set(item.productId, Math.max(0, item.quantity - 1))}
                                        aria-label={`Decrease quantity of ${item.product.name}`}
                                        className="grid size-8 place-items-center rounded-full font-sans"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-6 text-center font-sans text-sm tabular-nums">{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => set(item.productId, item.quantity + 1)}
                                        aria-label={`Increase quantity of ${item.product.name}`}
                                        className="grid size-8 place-items-center rounded-full font-sans"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => set(item.productId, 0)}
                                    className="px-2 font-sans text-sm text-foreground/60 underline-offset-2 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="shrink-0 border-t border-foreground/10 py-5">
                <div className="flex items-baseline justify-between font-sans">
                    <span>Subtotal</span>
                    <span className="text-lg font-bold tracking-tight">{formatPrice(cart.subtotal)}</span>
                </div>
                {pending ? <p className="mt-1 text-sm text-foreground/60">Updating…</p> : null}
                {/* Inert until checkout exists. Disabled while the lines on screen are not the API cart. */}
                <button type="button" className="button-dark mt-4 w-full" disabled={pending}>
                    Checkout
                </button>
            </div>
        </div>
    )
}
