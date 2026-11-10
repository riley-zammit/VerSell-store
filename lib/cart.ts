import 'server-only'
import { cookies } from 'next/headers'

import { fetchCart } from './swag-api/cart'
import { getAvailableStock } from './swag-api/catalog'
import type { ApiCart, Cart } from './types'

const cartCookie = 'cart-token'

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
}

export async function readCartToken() {
    const jar = await cookies()
    return jar.get(cartCookie)?.value
}

// Only called on an ew cart. Setting a cookie in a Server Action wipes the client's prefetch cache
export async function writeCartToken(token: string) {
    const jar = await cookies()
    jar.set(cartCookie, token, cookieOptions)
}

// The root layout streams this to CartProvider without awaiting it, so only the cart's consumers wait.
// Dont' force an action to depend on the requests ot hey
export async function getCart() {
    const token = await readCartToken()
    const cart = token ? await fetchCart(token) : null
    return cartLinesValidated(cart)
}

// Slims the API's cart for the client and validates each line's stock. Stock is real-time, so it's checked on every
// load and after every cart action. Same as the product page, a failed check doesn't block checkout: checkout makes
// the final call.
export async function cartLinesValidated(cart: ApiCart | null): Promise<Cart> {
    const items = cart?.items ?? []
    const stockChecks = items.map((item) => getAvailableStock(item.productId).catch(() => null))
    const availableStock = await Promise.all(stockChecks)

    const lines = items.map((item, index) => ({
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0],
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        stockMessage: stockMessage(item.quantity, availableStock[index]),
    }))

    return {
        lines,
        totalItems: cart?.totalItems ?? 0,
        subtotal: cart?.subtotal ?? 0,
    }
}

// Says how many the shopper can buy, but leaves their quantity alone. Null when the line is fine or stock is unknown.
function stockMessage(quantity: number, available: number | null) {
    if (available === null || quantity <= available) {
        return null
    }
    if (available <= 0) {
        return 'Out of stock. Remove it to check out.'
    }
    return `Only ${available} available. Lower the quantity to check out.`
}
