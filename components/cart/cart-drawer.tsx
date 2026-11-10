'use client'

import { catchError } from 'next/error'
import { Suspense, useEffect, useRef } from 'react'

import { CartError, CartLines, CartSkeleton } from '@/components/cart/cart-shared'
import { useCart } from '@/components/cart/cart-provider'
import { cartErrorMessages } from '@/lib/types'

// The drawer sits in the root layout, above every error.tsx, so it brings its own boundary.
const CartBoundary = catchError((_: object, { retry }) => <CartError reset={retry} />)

// Always mounted, closed until opened. Before hydration, and without JS, the cart icon and the add form go to the
// /cart page instead.
export function CartDrawer() {
    const { isOpen, adding, error, closeCart } = useCart()
    const dialogRef = useRef<HTMLDialogElement>(null)

    // Kept mounted so closing can slide out: globals.css transitions both adding and removing [open]. showModal also
    // traps focus and makes the page inert.
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) {
            return
        }
        if (isOpen && !dialog.open) {
            dialog.showModal()
        }
        if (!isOpen && dialog.open) {
            dialog.close()
        }
    }, [isOpen])

    return (
        <dialog
            ref={dialogRef}
            className="cart-drawer"
            aria-labelledby="cart-title"
            // Esc (and other native closes) shut the dialog first; this keeps the state in step.
            onClose={closeCart}
            onClick={(event) => {
                // Backdrop clicks land on the dialog itself. Links inside navigate away, so they close it too.
                const target = event.target as Element
                if (target === event.currentTarget || target.closest('a')) {
                    closeCart()
                }
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
                        onClick={closeCart}
                        aria-label="Close cart"
                        className="grid size-10 place-items-center rounded-full hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                    </button>
                </div>
                {/* The add in flight, or why it failed. A fixed-height row, so a message never moves the lines. */}
                <div aria-live="polite" className="h-6 shrink-0 px-5 text-sm text-foreground/70">
                    {adding ? <p className="truncate">Adding {adding.name}…</p> : null}
                    {error ? <p role="alert" className="truncate">{cartErrorMessages[error]}</p> : null}
                </div>
                <CartBoundary>
                    <Suspense fallback={<CartSkeleton />}>
                        <CartLines variant="drawer" />
                    </Suspense>
                </CartBoundary>
            </div>
        </dialog>
    )
}
