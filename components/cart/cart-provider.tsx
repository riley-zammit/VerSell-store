'use client'

import { createContext, useCallback, useContext, useMemo, useOptimistic, useRef, useState, type ReactNode } from 'react'

import { applyAdd, emptyCart } from '@/components/cart/state-helpers'
import { addToCart } from '@/lib/cart-actions'
import type { Cart, Product } from '@/lib/types'

type CartState = {
    pending: boolean
    cart: Cart | null
    partial: boolean
    error: string | null
}

const emptyCartState: CartState = {
    pending: false,
    cart: null,
    partial: false,
    error: null,
}

type CartContextValue = CartState & {
    rememberCart: (cart: Cart) => void
    add: (product: Product, quantity: number) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
    const value = useContext(CartContext)
    if (!value) throw new Error('Cart controls must render inside CartProvider')
    return value
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [confirmedState, setConfirmedState] = useState(emptyCartState)
    const [optimisticState, optimisticAdd] = useOptimistic(
        confirmedState,
        (_, { product, quantity, baseCart }: { product: Product; quantity: number; baseCart: Cart | null }) => ({
            pending: true,
            cart: applyAdd(baseCart ?? emptyCart(product.currency), product, quantity),
            partial: !baseCart,
            error: null,
        }),
    )
    const latestKnownCart = useRef<Cart | null>(null)

    const rememberCart = useCallback((cart: Cart) => {
        latestKnownCart.current = cart
    }, [])

    const add = useCallback(async (product: Product, quantity: number) => {
        if (optimisticState.pending) return
        optimisticAdd({ product, quantity, baseCart: latestKnownCart.current })
        try {
            const result = await addToCart(product.id, quantity)
            if ('error' in result) {
                setConfirmedState({ ...emptyCartState, error: result.error, cart: latestKnownCart.current })
                return
            }
            latestKnownCart.current = result.cart
            setConfirmedState({ ...emptyCartState, cart: result.cart })
        } catch (caught) {
            setConfirmedState({ ...emptyCartState, cart: latestKnownCart.current })
            throw caught
        }
    }, [optimisticState.pending, optimisticAdd])

    const contextValue = useMemo<CartContextValue>(() => ({
        ...optimisticState,
        rememberCart,
        add,
    }), [optimisticState, rememberCart, add])

    
    return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>
}
