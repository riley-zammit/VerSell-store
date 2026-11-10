'use client'

import { useCart, useShownCart } from '@/components/cart/cart-provider'
import { NavLink } from '@/components/nav-link'

// Suspends until the first cart load, so the header renders it inside Suspense with a plain CartIcon fallback.
export function CartIconWithCount() {
    const { cart } = useShownCart()
    return <CartIcon count={cart.totalItems} />
}

export function CartIcon({ count }: { count?: number }) {
    const { openCart } = useCart()
    const itemWord = count === 1 ? 'item' : 'items'
    const label = count ? `Cart, ${count} ${itemWord}` : 'Cart'

    return (
        // A plain click opens the drawer. Before hydration, without JS, or with a modifier (new tab), it's a link to the
        // /cart page. No prefetch: once hydrated, a plain click never navigates.
        <NavLink
            href="/cart"
            prefetch={false}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                    return
                }
                event.preventDefault()
                openCart()
            }}
            aria-label={label}
            className="relative inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-foreground/5"
        >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M6 8h12l-1 12H7L6 8Z" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" />
            </svg>
            {count ? <span className="min-w-4 text-center tabular-nums">{count}</span> : null}
        </NavLink>
    )
}
