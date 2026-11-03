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
    return changes.reduce<Cart | null>(
        (current, change) =>
            change.type === CartChangeType.Add
                ? applyAdd(current ?? emptyCart(change.product.currency), change.product, change.quantity)
                : current && (applyQuantity(current, change.productId, change.quantity) ?? current),
        cart,
    )
}

// Creates the blank base used when the shopper has no cart yet.
function emptyCart(currency: string): Cart {
    return { items: [], totalItems: 0, subtotal: 0, currency, createdAt: '', updatedAt: '' }
}

// Returns a cart preview with the product added or its existing quantity increased.
function applyAdd(cart: Cart, product: Product, quantity: number): Cart {
    const items = cart.items.some((item) => item.productId === product.id)
        ? cart.items.map((item) =>
            item.productId === product.id
                ? { ...item, quantity: item.quantity + quantity, lineTotal: item.product.price * (item.quantity + quantity) }
                : item,
        )
        : [...cart.items, { productId: product.id, quantity, addedAt: '', product, lineTotal: product.price * quantity }]
    return summarize(items, cart.currency || product.currency, cart)
}

// Returns a cart preview with one quantity changed, removing the item at zero.
function applyQuantity(cart: Cart, productId: string, quantity: number): Cart | null {
    if (!Number.isInteger(quantity) || quantity < 0) return null
    if (!cart.items.some((item) => item.productId === productId)) return null
    const items = quantity === 0
        ? cart.items.filter((item) => item.productId !== productId)
        : cart.items.map((item) =>
            item.productId === productId ? { ...item, quantity, lineTotal: item.product.price * quantity } : item,
        )
    return summarize(items, cart.currency, cart)
}

// Recalculates cart totals while preserving its server timestamps.
function summarize(items: CartItem[], currency: string, stamp: Cart): Cart {
    return {
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
        currency,
        createdAt: stamp.createdAt,
        updatedAt: stamp.updatedAt,
    }
}
