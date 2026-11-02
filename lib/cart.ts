import 'server-only'
import { cache } from 'react'
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

async function writeCartCookie(token: string) {
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
        headers: { [CartHeader.Token]: token, ...init?.headers },
    }
}

function definitive(error: unknown): error is ApiError {
    return error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 422)
}

export const getCart = cache(async (): Promise<Cart | null> => {
    const token = (await cookies()).get(cartCookie)?.value
    if (!token) return null
    try {
        const { data } = await apiFetch<ApiCart>(CartPath.Root, cartInit(token))
        return withoutToken(data)
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
    }
})

async function createCart() {
    const { data } = await apiFetch<ApiCart>(CartPath.Create, { method: 'POST', cache: 'no-store' })
    await writeCartCookie(data.token)
    return data.token
}

async function postItem(token: string, productId: string, quantity: number) {
    const { data } = await apiFetch<ApiCart>(CartPath.Root, cartInit(token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
    }))
    await writeCartCookie(data.token)
    return withoutToken(data)
}

async function cartExists(token: string) {
    try {
        await apiFetch<ApiCart>(CartPath.Root, cartInit(token))
        return true
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return false
        throw error
    }
}

export async function addItem(productId: string, quantity: number): Promise<CartResult> {
    let token = (await cookies()).get(cartCookie)?.value
    if (!token) token = await createCart()

    try {
        return { cart: await postItem(token, productId, quantity) }
    } catch (error) {
        // 404 is either an expired cart or a missing product. Only replace the cart when GET agrees it's gone.
        if (error instanceof ApiError && error.status === 404 && !(await cartExists(token))) {
            try {
                return { cart: await postItem(await createCart(), productId, quantity) }
            } catch (retry) {
                if (definitive(retry)) return { error: retry.message }
                throw retry
            }
        }
        if (definitive(error)) return { error: error.message }
        throw error
    }
}

async function sendItem(method: 'PATCH' | 'DELETE', productId: string, quantity?: number): Promise<CartResult> {
    const token = (await cookies()).get(cartCookie)?.value
    if (!token) return { error: 'Your cart expired. Add the item again.' }
    try {
        const { data } = await apiFetch<ApiCart>(`${CartPath.Root}/${encodeURIComponent(productId)}`, cartInit(token, {
            method,
            headers: quantity === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: quantity === undefined ? undefined : JSON.stringify({ quantity }),
        }))
        await writeCartCookie(data.token)
        return { cart: withoutToken(data) }
    } catch (error) {
        if (definitive(error)) return { error: error.message }
        throw error
    }
}

export function updateItem(productId: string, quantity: number) {
    return sendItem('PATCH', productId, quantity)
}

export function removeItem(productId: string) {
    return sendItem('DELETE', productId)
}
