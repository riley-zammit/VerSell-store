'use client'

import { catchError } from 'next/error'

import { useCart, useCartView } from '@/components/cart/cart-provider'
import { NavLink } from '@/components/nav-link'

// Suspends until the server cart loads. The header renders it inside Suspense with a plain CartBadge fallback.
export function CartCount() {
    return <CartBadge count={useCartView()?.totalItems} />
}

export function CartBadge({ count }: { count?: number }) {
    const { openDrawer } = useCart()
    return (
        // A real link, so modified clicks and no-JS still reach the /cart page. Plain clicks open the sheet instead.
        <NavLink
            href="/cart"
            prefetch={false}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                openDrawer()
            }}
            aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
            className="relative inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-foreground/5"
        >
            <BagIcon />
            {count ? <span className="min-w-4 text-center tabular-nums">{count}</span> : null}
        </NavLink>
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

export function EmptyCart({ error, showContinueShopping }: { error: string | null; showContinueShopping: boolean }) {
    return (
        <div className="py-6">
            {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
            <p className="text-lg text-foreground/70">Your cart is empty.</p>
            {showContinueShopping ? (
                <NavLink href="/" className="button-light mt-6">
                    Continue shopping
                </NavLink>
            ) : null}
        </div>
    )
}

export const CartBoundary = catchError((_: object, { retry }) => <CartError reset={retry} />)

export function CartError({ reset }: { reset: () => void }) {
    return (
        <div className="px-5 py-16 text-center">
            <p className="text-lg">The cart didn&apos;t load.</p>
            <button type="button" onClick={reset} className="button-dark mt-6">
                Try again
            </button>
        </div>
    )
}

function BagIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 8h12l-1 12H7L6 8Z" />
            <path d="M9 8V7a3 3 0 0 1 6 0v1" />
        </svg>
    )
}
