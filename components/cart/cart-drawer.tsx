'use client'

import { Suspense } from 'react'

import { CartLines } from '@/components/cart/cart'
import { CartBoundary, CartSkeleton } from '@/components/cart/cart-parts'
import { useCart } from '@/components/cart/cart-provider'

// Always mounted and closed until openDrawer(). Opening is a DOM call, so it never waits on a route or a transition.
export function CartDrawer() {
    const { drawer } = useCart()
    const close = () => drawer.current?.close()

    return (
        <dialog
            ref={drawer}
            className="cart-drawer"
            aria-labelledby="cart-title"
            onClick={(event) => {
                // Backdrop clicks land on the dialog itself. Links navigate away, so the sheet goes with them.
                if (event.target === event.currentTarget || (event.target as Element).closest('a')) close()
            }}
            // :modal beats a class selector, so the sheet's box lives here.
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 'auto',
                margin: 0,
                padding: 0,
                border: 'none',
                height: '100dvh',
                maxHeight: 'none',
                width: 'min(100vw, 28rem)',
                maxWidth: 'none',
                background: 'transparent',
            }}
        >
            <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="flex shrink-0 items-center justify-between px-5 py-4">
                    <h2 id="cart-title" className="text-2xl">Your cart</h2>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close cart"
                        className="grid size-10 place-items-center rounded-full hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                        <CloseIcon />
                    </button>
                </div>
                {/* The sheet sits in the root layout, above every error.tsx, so it brings its own boundary. */}
                <CartBoundary>
                    <Suspense fallback={<CartSkeleton />}>
                        <CartLines variant="drawer" />
                    </Suspense>
                </CartBoundary>
            </div>
        </dialog>
    )
}

function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 3l10 10M13 3L3 13" />
        </svg>
    )
}
