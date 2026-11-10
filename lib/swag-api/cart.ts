import 'server-only'

import { ApiError, apiFetch } from './client'
import type { ApiCart } from '../types'

// Never call these inside `use cache`: every shopper hits the same /cart URL, and only the token header differs.

enum CartPath {
    Root = '/cart',
    Create = '/cart/create',
}

enum CartHeader {
    Token = 'x-cart-token',
}

// Null when the cart is gone: expired, or the token was never valid.
export async function fetchCart(token: string) {
    try {
        const { data } = await apiFetch<ApiCart>(CartPath.Root, {
            headers: { [CartHeader.Token]: token },
        })
        return data
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null
        }
        throw error
    }
}

// Returns the new cart's token. The API never changes it after this, so this is the only token to store.
export async function createCart() {
    const { data } = await apiFetch<ApiCart & { token: string }>(CartPath.Create, { method: 'POST' })
    return data.token
}

export async function addCartItem(token: string, productId: string, quantity: number) {
    const { data } = await apiFetch<ApiCart>(CartPath.Root, {
        method: 'POST',
        headers: {
            [CartHeader.Token]: token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId,
            quantity,
        }),
    })
    return data
}

// 0 removes the line.
export async function setCartItemQuantity(token: string, productId: string, quantity: number) {
    const { data } = await apiFetch<ApiCart>(`${CartPath.Root}/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: {
            [CartHeader.Token]: token,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
    })
    return data
}
