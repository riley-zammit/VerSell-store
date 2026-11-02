'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

import { useCart } from '@/components/cart/cart-provider'

export function CartDrawer({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const releaseAdd = useCart().releaseAdd
    const ref = useRef<HTMLDialogElement>(null)
    // The slot can stay mounted after back(). Follow the URL so the sheet actually leaves.
    const open = pathname === '/cart'

    useEffect(() => {
        const dialog = ref.current
        if (!open || !dialog) return
        if (!dialog.open) dialog.showModal()
        releaseAdd()
        const close = () => router.back()
        const onCancel = (event: Event) => {
            event.preventDefault()
            close()
        }
        const onClick = (event: MouseEvent) => {
            if (event.target === dialog) close()
        }
        dialog.addEventListener('cancel', onCancel)
        dialog.addEventListener('click', onClick)
        return () => {
            dialog.removeEventListener('cancel', onCancel)
            dialog.removeEventListener('click', onClick)
            if (dialog.open) dialog.close()
        }
    }, [open, router, releaseAdd])

    if (!open) return null

    return (
        <dialog
            ref={ref}
            className="cart-drawer"
            aria-labelledby="cart-title"
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
                        onClick={() => router.back()}
                        aria-label="Close cart"
                        className="grid size-10 place-items-center rounded-full hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                        <CloseIcon />
                    </button>
                </div>
                {children}
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
