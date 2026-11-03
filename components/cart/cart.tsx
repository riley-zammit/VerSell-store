'use client'

import Image from 'next/image'
import { use, useEffect, useOptimistic, useState, useTransition } from 'react'

import { CartSkeleton, EmptyCart } from '@/components/cart/cart-parts'
import { useCart } from '@/components/cart/cart-provider'
import { applyQuantity, preferCart } from '@/components/cart/state-helpers'
import { NavLink } from '@/components/nav-link'
import { removeCartItem, updateCartItem } from '@/lib/cart-actions'
import { formatPrice } from '@/lib/format'
import type { Cart, CartItem } from '@/lib/types'

type Variant = 'page' | 'drawer'

// Takes the unawaited getCart() promise so the cookie read resolves inside the caller's Suspense and the shell still prerenders.
export function CartResolver({ cartPromise, variant }: { cartPromise: Promise<Cart | null>; variant: Variant }) {
    const cart = use(cartPromise)
    const { rememberCart, pending, cart: providerCart, partial, error } = useCart()

    useEffect(() => {
        if (cart) rememberCart(cart)
    }, [cart, rememberCart])

    const shown = pending ? providerCart : preferCart(providerCart, cart)

    return (
        <CartContent
            cart={shown}
            confirmed={!pending}
            partial={pending && partial}
            addError={error}
            variant={variant}
        />
    )
}

// Render Skeleton or optimistic cart
export function CartFallback({ variant }: { variant: Variant }) {
    const cartState = useCart()
    if (!cartState.cart) return <CartSkeleton />
    return (
        <CartContent
            cart={cartState.cart}
            confirmed={!cartState.pending}
            partial={cartState.pending && cartState.partial}
            addError={cartState.error}
            variant={variant}
        />
    )
}

function CartContent({
    cart,
    confirmed,
    partial,
    addError,
    variant,
}: {
    cart: Cart | null
    confirmed: boolean
    partial: boolean
    addError: string | null
    variant: Variant
}) {
    const [lineError, setLineError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [shown, applyOptimistic] = useOptimistic(
        cart,
        (current, { productId, quantity }: Pick<CartItem, 'productId' | 'quantity'>) =>
            current ? applyQuantity(current, productId, quantity) ?? current : current,
    )
    const pad = variant === 'drawer' ? 'px-5' : ''
    const error = lineError ?? addError
    const waiting = !confirmed || isPending

    if (!shown || shown.items.length === 0) {
        return (
            <div className={pad}>
                <EmptyCart error={error} showContinueShopping={variant === 'page'} />
            </div>
        )
    }

    const setQuantity = (item: CartItem, quantity: number) => {
        setLineError(null)
        startTransition(async () => {
            applyOptimistic({ productId: item.productId, quantity })
            const result = quantity === 0
                ? await removeCartItem(item.productId)
                : await updateCartItem(item.productId, quantity)
            if ('error' in result) setLineError(result.error)
        })
    }

    return (
        <div className={`${pad} flex min-h-0 flex-1 flex-col`} aria-busy={waiting}>
            {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
            <ul className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2">
                {shown.items.map((item) => (
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
                                        onClick={() => setQuantity(item, Math.max(0, item.quantity - 1))}
                                        disabled={waiting}
                                        aria-label={`Decrease quantity of ${item.product.name}`}
                                        className="grid size-8 place-items-center rounded-full font-sans disabled:opacity-40"
                                    >
                                        −
                                    </button>
                                    <span className="min-w-6 text-center font-sans text-sm tabular-nums">{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(item, item.quantity + 1)}
                                        disabled={waiting}
                                        aria-label={`Increase quantity of ${item.product.name}`}
                                        className="grid size-8 place-items-center rounded-full font-sans disabled:opacity-40"
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setQuantity(item, 0)}
                                    disabled={waiting}
                                    className="px-2 font-sans text-sm text-foreground/60 underline-offset-2 hover:underline disabled:opacity-40"
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
                    {partial ? (
                        <span className="text-sm text-foreground/60">Updating…</span>
                    ) : (
                        <span className="text-lg font-bold tracking-tight">{formatPrice(shown.subtotal)}</span>
                    )}
                </div>
                {!partial && waiting ? <p className="mt-1 text-sm text-foreground/60">Updating…</p> : null}
                {/* Inert until checkout exists. Disabled while the lines on screen are not the API cart. */}
                <button type="button" className="button-dark mt-4 w-full" disabled={waiting}>
                    Checkout
                </button>
            </div>
        </div>
    )
}
