'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'

import { applyAdd, emptyCart } from '@/components/cart/optimistic-cart'
import { addToCart } from '@/lib/cart-actions'
import type { Cart, CartResult, Product } from '@/lib/types'

type Session = {
    pending: boolean
    cart: Cart | null
    partial: boolean
    error: string | null
}

const emptySession: Session = {
    pending: false,
    cart: null,
    partial: false,
    error: null,
}

type CartApi = Session & {
    remember: (cart: Cart) => void
    startAdd: (product: Product, quantity: number) => void
    armAdd: (productId: string, quantity: number) => boolean
    releaseAdd: () => void
    cancelArmedAdd: () => void
}

const CartContext = createContext<CartApi | null>(null)

export function useCart() {
    const value = useContext(CartContext)
    if (!value) throw new Error('Cart controls must render inside CartProvider')
    return value
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState(emptySession)
    const [, startAddTransition] = useTransition()
    const known = useRef<Cart | null>(null)
    const armedAdd = useRef<{ productId: string; quantity: number } | null>(null)

    const remember = useCallback((cart: Cart) => {
        known.current = cart
    }, [])
    const startAdd = useCallback((product: Product, quantity: number) => {
        const had = known.current
        // Session, not the optimistic hook: that hook reverts when its transition ends, and this
        // update has to outlive the click so the drawer can open on it.
        setSession({
            pending: true,
            cart: applyAdd(had ?? emptyCart(product.currency), product, quantity),
            partial: !had,
            error: null,
        })
    }, [])
    const finishAdd = useCallback((result: CartResult) => {
        const previous = known.current
        const next: Session = 'error' in result
            ? { ...emptySession, error: result.error, cart: previous }
            : { ...emptySession, cart: result.cart }
        if (!('error' in result)) known.current = result.cart
        setSession(next)
    }, [])
    const dropAdd = useCallback(() => {
        const previous = known.current
        setSession({ ...emptySession, cart: previous })
    }, [])
    const armAdd = useCallback((productId: string, quantity: number) => {
        if (session.pending || armedAdd.current) return false
        armedAdd.current = { productId, quantity }
        return true
    }, [session.pending])
    const releaseAdd = useCallback(() => {
        const request = armedAdd.current
        if (!request) return
        armedAdd.current = null
        // The add and the /cart navigation share one router queue. Dispatching
        // the POST in the click holds that navigation until the response, so
        // the sheet never paints the pending cart. Send it once the sheet is open.
        startAddTransition(async () => {
            try {
                finishAdd(await addToCart(request.productId, request.quantity))
            } catch (caught) {
                dropAdd()
                throw caught
            }
        })
    }, [finishAdd, dropAdd, startAddTransition])
    const cancelArmedAdd = useCallback(() => {
        if (!armedAdd.current) return
        armedAdd.current = null
        dropAdd()
    }, [dropAdd])

    const api = useMemo<CartApi>(() => ({
        ...session,
        remember,
        startAdd,
        armAdd,
        releaseAdd,
        cancelArmedAdd,
    }), [session, remember, startAdd, armAdd, releaseAdd, cancelArmedAdd])

    return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}
