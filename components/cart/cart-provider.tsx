'use client'

import { createContext, startTransition, use, useContext, useOptimistic, useRef, useState, type ReactNode, type RefObject } from 'react'

import { applyChanges, CartChangeType, type CartChange } from '@/components/cart/state-helpers'
import { addToCart, removeCartItem, updateCartItem } from '@/lib/cart-actions'
import type { Cart, CartResult, Product } from '@/lib/types'

type CartContextValue = {
    cart: Promise<Cart | null>
    changes: CartChange[]
    error: string | null
    drawer: RefObject<HTMLDialogElement | null>
    openDrawer: () => void
    add: (product: Product, quantity: number) => Promise<void>
    setQuantity: (productId: string, quantity: number) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
    const value = useContext(CartContext)
    if (!value) throw new Error('Cart controls must render inside CartProvider')
    return value
}

// The server cart with in-flight writes applied. Suspends until the cart loads, so call it inside Suspense.
export function useCartView() {
    const { cart, changes } = useCart()
    return applyChanges(use(cart), changes)
}

// `cart` is the root layout's unawaited getCart(). A write's refresh() re-renders the layout with a new one,
// and React commits it together with dropping that write from `changes`, so there's only ever one cart.
export function CartProvider({ cart, children }: { cart: Promise<Cart | null>; children: ReactNode }) {
    const [changes, addChange] = useOptimistic<CartChange[], CartChange>([], (current, change) => [...current, change])
    const [error, setError] = useState<string | null>(null)
    const drawer = useRef<HTMLDialogElement>(null)

    // Callers run this inside a transition (form action or useTransition): the change shows until it ends,
    // and a thrown request reaches the caller's error boundary.
    async function write(change: CartChange, request: Promise<CartResult>) {
        addChange(change)
        const result = await request
        // State set after an await leaves the transition. Wrapping it lands the error with the refreshed cart.
        startTransition(() => setError('error' in result ? result.error : null))
    }

    const value: CartContextValue = {
        cart,
        changes,
        error,
        drawer,
        // showModal is a DOM call, so the sheet opens on this frame even inside a transition.
        openDrawer: () => {
            if (!drawer.current?.open) drawer.current?.showModal()
        },
        add: (product, quantity) =>
            write({ type: CartChangeType.Add, product, quantity }, addToCart(product.id, quantity)),
        setQuantity: (productId, quantity) =>
            write(
                { type: CartChangeType.Set, productId, quantity },
                quantity === 0 ? removeCartItem(productId) : updateCartItem(productId, quantity),
            ),
    }

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
