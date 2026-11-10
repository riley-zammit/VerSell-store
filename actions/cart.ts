'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { cartLinesValidated, readCartToken, writeCartToken } from '@/lib/cart'
import { addCartItem, createCart, fetchCart, setCartItemQuantity } from '@/lib/swag-api/cart'
import { getAvailableStock } from '@/lib/swag-api/catalog'
import { ApiError } from '@/lib/swag-api/client'
import { CartErrorCode, CartField, type Cart } from '@/lib/types'

//Some basic validation on a public endpoint
const addSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(1),
})

// 0 removes the line.
const quantitySchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(0),
})

// The cart lives on the client, so actions return the next cart instead of re-rendering the server tree.

// JS path: CartProvider sends this once the drawer is open.
export async function addToCart(formData: FormData): Promise<{ cart: Cart } | { error: CartErrorCode }> {
    const parsed = addSchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: CartErrorCode.InvalidQuantity }
    }
    const { productId, quantity } = parsed.data

    const { available, inCart } = await getStockLimit(productId)
    const stockError = toStockError(inCart + quantity, inCart, available)
    if (stockError) {
        return { error: stockError }
    }
    try {
        const apiCart = await addToShoppersCart(productId, quantity)
        const cart = await cartLinesValidated(apiCart)
        return { cart }
    } catch (error) {
        if (isDefinitive(error)) {
            return { error: toAddError(error) }
        }
        throw error
    }
}

// No-JS path: the add form's action before hydration. A plain post always lands on the cart page.
export async function addToCartAndRedirect(formData: FormData) {
    let error: CartErrorCode | null
    try {
        const result = await addToCart(formData)
        error = 'error' in result ? result.error : null
    } catch {
        // Timeouts and 5xx. Without JS there's no client to catch them so hard redirect with URL error
        error = CartErrorCode.AddFailed
    }
    // A code rather than the API's text, so a crafted link can't put arbitrary words on the cart page.
    redirect(error ? `/cart?error=${error}` : '/cart')
}

// JS path: each cart line calls this through CartProvider and shows the error under the line.
export async function setCartQuantity(formData: FormData): Promise<{ cart: Cart } | { error: CartErrorCode }> {
    const parsed = quantitySchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: CartErrorCode.InvalidQuantity }
    }
    const { productId, quantity } = parsed.data

    const token = await readCartToken()
    if (!token) {
        return { error: CartErrorCode.ItemMissing }
    }
    // Removing skips the check: lowering always applies.
    if (quantity > 0) {
        const { available, inCart } = await getStockLimit(productId)
        const stockError = toStockError(quantity, inCart, available)
        if (stockError) {
            return { error: stockError }
        }
    }
    try {
        const apiCart = await setCartItemQuantity(token, productId, quantity)
        const cart = await cartLinesValidated(apiCart)
        return { cart }
    } catch (error) {
        if (isDefinitive(error)) {
            return { error: toUpdateError(error) }
        }
        throw error
    }
}

// No-JS path: the line form's action before hydration, which only happens on the /cart page.
export async function setCartQuantityAndRedirect(formData: FormData) {
    let error: CartErrorCode | null
    try {
        const result = await setCartQuantity(formData)
        error = 'error' in result ? result.error : null
    } catch {
        // Timeouts and 5xx. Without JS there's no client to catch them so hard redirect with URL error
        error = CartErrorCode.UpdateFailed
    }
    // A code for the same reason as the add.
    redirect(error ? `/cart?error=${error}` : '/cart')
}

// What the shopper already has of a product and what can still be sold, fetched together so the check costs one
// round trip. Like the product page, a failed stock check (null) doesn't block the change: checkout makes the final call.
async function getStockLimit(productId: string) {
    const token = await readCartToken()
    const [available, cart] = await Promise.all([
        getAvailableStock(productId).catch(() => null),
        token ? fetchCart(token) : null,
    ])
    const line = cart?.items.find((item) => item.productId === productId)
    return {
        available,
        inCart: line?.quantity ?? 0,
    }
}

// A change fails when it raises a line past what can be sold, and the quantity is never clamped. Lowering always
// applies, even while still over stock, since that's how the shopper clears a line's stock message.
function toStockError(nextQuantity: number, inCart: number, available: number | null) {
    if (available === null || nextQuantity <= inCart || nextQuantity <= available) {
        return null
    }
    if (available <= 0) {
        return CartErrorCode.OutOfStock
    }
    return CartErrorCode.NotEnoughStock
}

// Adds to the shopper's cart, starting a new one when they have none or theirs expired.
async function addToShoppersCart(productId: string, quantity: number) {
    const token = await readCartToken()
    if (token) {
        try {
            return await addCartItem(token, productId, quantity)
        } catch (error) {
            // A 404 is either an expired cart or a missing product. Only replace the cart when it's really gone, so a
            // missing product never costs the shopper their cart.
            const isNotFound = error instanceof ApiError && error.status === 404
            if (!isNotFound) {
                throw error
            }
            const existingCart = await fetchCart(token)
            if (existingCart) {
                throw error
            }
        }
    }
    const newToken = await createCart()
    await writeCartToken(newToken)
    return addCartItem(newToken, productId, quantity)
}

// 400, 404 and 422 won't change on a retry, so they become a code for the shopper. Timeouts and 5xx throw.
function isDefinitive(error: unknown): error is ApiError {
    return error instanceof ApiError && (error.status === 400 || error.status === 404 || error.status === 422)
}

// What a definitive add failure means for the shopper. An expired cart is replaced before this.
function toAddError(error: ApiError) {
    if (error.status === 404) {
        return CartErrorCode.ProductUnavailable
    }
    if (error.status === 422) {
        return CartErrorCode.InvalidQuantity
    }
    return CartErrorCode.AddFailed
}

// What a definitive quantity change failure means for the shopper. 404 is the cart or the line.
function toUpdateError(error: ApiError) {
    if (error.status === 404) {
        return CartErrorCode.ItemMissing
    }
    if (error.status === 422) {
        return CartErrorCode.InvalidQuantity
    }
    return CartErrorCode.UpdateFailed
}
