import 'server-only'
import { cookies } from 'next/headers'

import { ApiError, apiFetch } from './api'
import type { Cart, CartResult } from './types'

const cartCookie = 'cart-token'

enum CartHeader {
    Token = 'x-cart-token',
}

enum CartPath {
    Root = '/cart',
    Create = '/cart/create',
}

type ApiCart = Cart & { token: string }

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
}

async function readCartToken() {
    const jar = await cookies()
    return jar.get(cartCookie)?.value
}

// Setting a cookie in a Server Action wipes the client's whole prefetch cache, so skip unchanged tokens.
async function writeCartCookie(token: string, current?: string) {
    if (token === current) {
        return
    }
    const jar = await cookies()
    jar.set(cartCookie, token, cookieOptions)
}

function withoutToken(data: ApiCart): Cart {
    return {
        items: data.items,
        totalItems: data.totalItems,
        subtotal: data.subtotal,
        currency: data.currency,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    }
}

// Every shopper hits the same /cart URL. The token header is the only difference,
// so this must not enter the shared fetch cache.
function cartInit(token: string, init?: RequestInit): RequestInit {
    return {
        ...init,
        cache: 'no-store',
        headers: {
            [CartHeader.Token]: token,
            ...init?.headers,
        },
    }
}

function definitive(error: unknown): error is ApiError {
    return error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 422)
}

// Called once per request, by the root layout. Every cart view reads that one promise.
export async function getCart(): Promise<Cart | null> {
    const token = await readCartToken()
    if (!token) {
        return null
    }
    try {
        const { data } = await apiFetch<ApiCart>(CartPath.Root, cartInit(token))
        return withoutToken(data)
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null
        }
        throw error
    }
}

async function createCart() {
    const { data } = await apiFetch<ApiCart>(CartPath.Create, {
        method: 'POST',
        cache: 'no-store',
    })
    await writeCartCookie(data.token)
    return data.token
}

async function postItem(token: string, productId: string, quantity: number) {
    const init = cartInit(token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            productId,
            quantity,
        }),
    })
    const { data } = await apiFetch<ApiCart>(CartPath.Root, init)
    await writeCartCookie(data.token, token)
    return withoutToken(data)
}

async function cartExists(token: string) {
    try {
        await apiFetch<ApiCart>(CartPath.Root, cartInit(token))
        return true
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return false
        }
        throw error
    }
}

export async function addItem(productId: string, quantity: number): Promise<CartResult> {
    let token = await readCartToken()
    if (!token) {
        token = await createCart()
    }

    try {
        const cart = await postItem(token, productId, quantity)
        return { cart }
    } catch (error) {
        // 404 is either an expired cart or a missing product. Only replace the cart when GET agrees it's gone.
        const cartExpired = error instanceof ApiError && error.status === 404 && !(await cartExists(token))
        if (cartExpired) {
            try {
                const newToken = await createCart()
                const cart = await postItem(newToken, productId, quantity)
                return { cart }
            } catch (retry) {
                if (definitive(retry)) {
                    return { error: retry.message }
                }
                throw retry
            }
        }
        if (definitive(error)) {
            return { error: error.message }
        }
        throw error
    }
}

async function sendItem(productId: string, init: RequestInit): Promise<CartResult> {
    const token = await readCartToken()
    if (!token) {
        return { error: 'Your cart expired. Add the item again.' }
    }
    try {
        const path = `${CartPath.Root}/${encodeURIComponent(productId)}`
        const { data } = await apiFetch<ApiCart>(path, cartInit(token, init))
        await writeCartCookie(data.token, token)
        return { cart: withoutToken(data) }
    } catch (error) {
        if (definitive(error)) {
            return { error: error.message }
        }
        throw error
    }
}

export function updateItem(productId: string, quantity: number) {
    return sendItem(productId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
    })
}

export function removeItem(productId: string) {
    return sendItem(productId, { method: 'DELETE' })
}
