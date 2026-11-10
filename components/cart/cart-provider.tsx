'use client'

import { createContext, startTransition, use, useContext, useOptimistic, useState, type ReactNode } from 'react'

import { addToCart, setCartQuantity } from '@/actions/cart'
import { CartErrorCode, cartErrorMessages, CartField, type Cart, type Product } from '@/lib/types'

enum CartChangeType {
    Add = 'add',
    SetQuantity = 'set-quantity',
}

// A cart action in flight. Absolute quantities like the forms, so 0 removes the line.
type CartChange =
    | { type: CartChangeType.Add; product: Product; quantity: number }
    | { type: CartChangeType.SetQuantity; productId: string; quantity: number }

type CartContextValue = {
    initialCart: Promise<Cart>
    latestCart: Cart | null
    pendingChanges: CartChange[]
    setQuantity: (productId: string, formData: FormData) => Promise<string | null>
    adding: Product | null
    error: CartErrorCode | null
    add: (product: Product, formData: FormData) => void
    isOpen: boolean
    openCart: () => void
    closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
    const value = useContext(CartContext)
    if (!value) {
        throw new Error('Cart controls must render inside CartProvider')
    }
    return value
}

// The cart lives here, so opening the drawer or the header count never waits on the server.
// `initialCart` is the root layout's unawaited load. Every cart action returns the next cart, which replaces it.
export function CartProvider({ initialCart, children }: { initialCart: Promise<Cart>; children: ReactNode }) {
    const [latestCart, setLatestCart] = useState<Cart | null>(null)
    // Each change shows while its action's transition runs. React drops it in the same commit as the cart the action
    // returned, so nothing blinks. Trade-off: React holds every other transition until an action settles, so a
    // navigation (a link, back) waits for it. Opening and closing the drawer are plain state, so they never wait.
    const [pendingChanges, addPendingChange] = useOptimistic<CartChange[], CartChange>(
        [],
        (changes, change) => [...changes, change],
    )
    const [error, setError] = useState<CartErrorCode | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const pendingAdd = pendingChanges.find((change) => change.type === CartChangeType.Add)

    // Called by the form where each line needs its own state, which is why we don't have transition here
    const setQuantity = async (productId: string, formData: FormData) => {
        addPendingChange({
            type: CartChangeType.SetQuantity,
            productId,
            quantity: Number(formData.get(CartField.Quantity)),
        })
        // Timeouts, 5xx, or the shopper went offline.
        const result = await setCartQuantity(formData).catch(() => ({ error: CartErrorCode.UpdateFailed }))
        if ('error' in result) {
            return cartErrorMessages[result.error]
        }
        // Updates after an await need their own transition to join the action.
        startTransition(() => {
            setLatestCart(result.cart)
        })
        return null
    }

    // Opens the drawer and sends the add. Its progress and any error show in the drawer, never under the add form.
    const add = (product: Product, formData: FormData) => {
        setError(null)
        setIsOpen(true)
        startTransition(async () => {
            addPendingChange({
                type: CartChangeType.Add,
                product,
                quantity: Number(formData.get(CartField.Quantity)),
            })
            // Timeouts, 5xx, or the shopper went offline.
            const result = await addToCart(formData).catch(() => ({ error: CartErrorCode.AddFailed }))
            // Updates after an await need their own transition to join the action.
            startTransition(() => {
                if ('error' in result) {
                    setError(result.error)
                } else {
                    setLatestCart(result.cart)
                }
            })
        })
    }

    const closeCart = () => {
        setIsOpen(false)
        // An old failure shouldn't greet the next open. One that lands after closing still shows on the next open.
        setError(null)
    }

    const value = {
        initialCart,
        latestCart,
        pendingChanges,
        setQuantity,
        adding: pendingAdd ? pendingAdd.product : null,
        error,
        add,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart,
    }

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}


// Extract any `pending` state and show that cart if it exists.
export function useShownCart() {
    const { initialCart, latestCart, pendingChanges } = useCart()
    let cart = latestCart ?? use(initialCart)
    for (const change of pendingChanges) {
        cart = applyOptimisticChange(cart, change)
    }
    return {
        cart,
        pending: pendingChanges.length > 0,
    }
}

function applyOptimisticChange(cart: Cart, change: CartChange) {
    const lines = cart.lines.map((line) => ({ ...line }))

    // Apply cart amount and line count UI only. Don't try to replicate a commerce engine's calculation
    if (change.type === CartChangeType.Add) {
        const existing = lines.find((line) => line.productId === change.product.id)
        if (existing) {
            existing.quantity += change.quantity
        } else {
            lines.push({
                productId: change.product.id,
                name: change.product.name,
                slug: change.product.slug,
                image: change.product.images[0],
                quantity: change.quantity,
                lineTotal: null,
                stockMessage: null,
            })
        }
    } else {
        const line = lines.find((line) => line.productId === change.productId)
        if (line) {
            line.quantity = change.quantity
        }
    }

    const shownLines = lines.filter((line) => line.quantity > 0)
    let totalItems = 0
    for (const line of shownLines) {
        totalItems += line.quantity
    }

    return {
        ...cart,
        lines: shownLines,
        totalItems,
    }
}
