import type { Cart, CartItem, Product } from '@/lib/types'

// Creates the blank base used when adding before the real cart has loaded.
export function emptyCart(currency: string): Cart {
    return { items: [], totalItems: 0, subtotal: 0, currency, createdAt: '', updatedAt: '' }
}

// Returns a cart preview with the product added or its existing quantity increased.
export function applyAdd(cart: Cart, product: Product, quantity: number): Cart {
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
export function applyQuantity(cart: Cart, productId: string, quantity: number): Cart | null {
    if (!Number.isInteger(quantity) || quantity < 0) return null
    if (!cart.items.some((item) => item.productId === productId)) return null
    const items = quantity === 0
        ? cart.items.filter((item) => item.productId !== productId)
        : cart.items.map((item) =>
            item.productId === productId ? { ...item, quantity, lineTotal: item.product.price * quantity } : item,
        )
    return summarize(items, cart.currency, cart)
}

// Chooses the newest cart when local action state and streamed server state overlap.
export function preferCart(settled: Cart | null, server: Cart | null) {
    if (!settled) return server
    if (!server) return settled
    if (server.updatedAt > settled.updatedAt) return server
    return settled
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
