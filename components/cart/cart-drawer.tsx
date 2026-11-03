'use client'

import { usePathname, useRouter, useSelectedLayoutSegment } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

import { CartFallback } from '@/components/cart/cart'
import { useCart } from '@/components/cart/cart-provider'

// Lives in the root layout, not the @cart slot, so an add can open it before the /cart route commits.
export function CartDrawer({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const page = useSelectedLayoutSegment()
    const router = useRouter()
    const { pending } = useCart()
    const ref = useRef<HTMLDialogElement>(null)
    // Intercepted /cart keeps the previous page underneath. A hard load of /cart is the full page, so no sheet.
    const routed = pathname === '/cart' && page !== 'cart'
    // React holds the add's push to /cart until the add settles. The optimistic pending flag opens the sheet now.
    const open = routed || pending

    useEffect(() => {
        const dialog = ref.current
        if (!open || !dialog) return
        if (!dialog.open) dialog.showModal()
        return () => {
            if (dialog.open) dialog.close()
        }
    }, [open])

    if (!open) return null

    // Before the push commits there is no /cart history entry to go back from.
    const close = () => {
        if (routed) router.back()
    }

    return (
        <dialog
            ref={ref}
            className="cart-drawer"
            aria-labelledby="cart-title"
            onCancel={(event) => {
                event.preventDefault()
                close()
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) close()
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
                {routed ? children : <CartFallback variant="drawer" />}
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
