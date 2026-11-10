import 'server-only'
import { cookies } from 'next/headers'

import { ApiError, apiFetch, getProductStock, STOP_SELLING_AT_INVENTORY_LEVEL } from './api'
import { CartErrorCode, type Cart, type CartResult, type CartView, type Stock } from './types'

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
        headers: {
            [CartHeader.Token]: token,
            ...init?.headers,
        },
    }
}

function definitive(error: unknown): error is ApiError {
    return error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 422)
}

async function getCart(): Promise<Cart | null> {
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

// The root layout streams this to CartProvider without awaiting it, so only the cart's consumers wait.
export async function getCartView() {
    const cart = await getCart()
    return toCartView(cart)
}

// Slims the API's cart for the client and checks each line's stock. Stock is real-time, so it's checked on every
// load and after every cart action. Same as the product page, a failed check doesn't block checkout: checkout makes
// the final call.
export async function toCartView(cart: Cart | null): Promise<CartView> {
    const items = cart?.items ?? []
    const stockChecks = items.map((item) => getProductStock(item.productId).catch(() => null))
    const inventories = await Promise.all(stockChecks)

    const lines = items.map((item, index) => ({
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.images[0],
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        stockMessage: stockMessage(item.quantity, inventories[index]),
    }))

    return {
        lines,
        totalItems: cart?.totalItems ?? 0,
        subtotal: cart?.subtotal ?? 0,
    }
}

// Says how many the shopper can buy, but leaves their quantity alone. Null when the line is fine or stock is unknown.
function stockMessage(quantity: number, inventory: Stock | null) {
    if (!inventory) {
        return null
    }
    const available = inventory.stock - STOP_SELLING_AT_INVENTORY_LEVEL
    if (quantity <= available) {
        return null
    }
    if (available <= 0) {
        return 'Out of stock. Remove it to check out.'
    }
    return `Only ${available} available. Lower the quantity to check out.`
}

async function createCart() {
    const { data } = await apiFetch<ApiCart>(CartPath.Create, {
        method: 'POST',
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

// What a definitive add failure means for the shopper. The cart's own 404 is retried before this.
function toAddError(error: ApiError) {
    if (error.status === 404) {
        return CartErrorCode.ProductUnavailable
    }
    if (error.status === 422) {
        return CartErrorCode.InvalidQuantity
    }
    return CartErrorCode.AddFailed
}

// What a definitive quantity change or removal failure means for the shopper. 404 is the cart or the line.
function toUpdateError(error: ApiError) {
    if (error.status === 404) {
        return CartErrorCode.ItemMissing
    }
    if (error.status === 422) {
        return CartErrorCode.InvalidQuantity
    }
    return CartErrorCode.UpdateFailed
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
                    return { error: toAddError(retry) }
                }
                throw retry
            }
        }
        if (definitive(error)) {
            return { error: toAddError(error) }
        }
        throw error
    }
}

async function sendItem(productId: string, init: RequestInit): Promise<CartResult> {
    const token = await readCartToken()
    if (!token) {
        return { error: CartErrorCode.ItemMissing }
    }
    try {
        const path = `${CartPath.Root}/${encodeURIComponent(productId)}`
        const { data } = await apiFetch<ApiCart>(path, cartInit(token, init))
        await writeCartCookie(data.token, token)
        return { cart: withoutToken(data) }
    } catch (error) {
        if (definitive(error)) {
            return { error: toUpdateError(error) }
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
