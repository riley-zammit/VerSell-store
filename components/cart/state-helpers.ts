import type { Cart, CartItem, Product } from '@/lib/types'

export enum CartChangeType {
    Add = 'add',
    Set = 'set',
}

// A cart write still in flight. Views apply these on top of the server cart until the write's refresh lands.
export type CartChange =
    | { type: CartChangeType.Add; product: Product; quantity: number }
    | { type: CartChangeType.Set; productId: string; quantity: number }

// Returns the server cart with in-flight writes applied in order.
export function applyChanges(cart: Cart | null, changes: CartChange[]) {
    let current = cart
    for (const change of changes) {
        if (change.type === CartChangeType.Add) {
            current = applyAdd(current ?? emptyCart(change.product.currency), change.product, change.quantity)
        } else if (current) {
            current = applyQuantity(current, change.productId, change.quantity)
        }
    }
    return current
}

// Creates the blank base used when the shopper has no cart yet.
function emptyCart(currency: string): Cart {
    return {
        items: [],
        totalItems: 0,
        subtotal: 0,
        currency,
        createdAt: '',
        updatedAt: '',
    }
}

// Returns a cart preview with the product added, or its existing quantity increased.
function applyAdd(cart: Cart, product: Product, quantity: number) {
    const existing = cart.items.find((item) => item.productId === product.id)
    if (existing) {
        return applyQuantity(cart, product.id, existing.quantity + quantity)
    }

    const added = {
        productId: product.id,
        quantity,
        addedAt: '',
        product,
        lineTotal: product.price * quantity,
    }
    return summarize(cart, [...cart.items, added])
}

// Returns a cart preview with one quantity changed, removing the item at zero. Invalid quantities change nothing.
function applyQuantity(cart: Cart, productId: string, quantity: number) {
    const isValid = Number.isInteger(quantity) && quantity >= 0
    if (!isValid) {
        return cart
    }

    if (quantity === 0) {
        const remaining = cart.items.filter((item) => item.productId !== productId)
        return summarize(cart, remaining)
    }

    const updated = cart.items.map((item) => {
        if (item.productId !== productId) {
            return item
        }
        return {
            ...item,
            quantity,
            lineTotal: item.product.price * quantity,
        }
    })
    return summarize(cart, updated)
}

// Returns the cart with new items and recalculated totals, keeping its currency and server timestamps.
function summarize(cart: Cart, items: CartItem[]): Cart {
    return {
        ...cart,
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    }
}
