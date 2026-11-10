'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getProductStock, STOP_SELLING_AT_INVENTORY_LEVEL } from '@/lib/api'
import { addItem, removeItem, toCartView, updateItem } from '@/lib/cart'
import { CartErrorCode, CartField, type CartView } from '@/lib/types'

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
export async function addToCart(formData: FormData): Promise<{ cart: CartView } | { error: CartErrorCode }> {
    const parsed = addSchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: CartErrorCode.InvalidQuantity }
    }
    const { productId, quantity } = parsed.data
    
    const inventory = await getProductStock(productId).catch(() => null)
    if (inventory && inventory.stock <= STOP_SELLING_AT_INVENTORY_LEVEL) {
        return { error: CartErrorCode.OutOfStock }
    }
    const result = await addItem(productId, quantity)
    if ('error' in result) {
        return result
    }
    const cart = await toCartView(result.cart)
    return { cart }
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
export async function setCartQuantity(formData: FormData): Promise<{ cart: CartView } | { error: CartErrorCode }> {
    const parsed = quantitySchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: CartErrorCode.InvalidQuantity }
    }
    const { productId, quantity } = parsed.data

    // Removing skips the check. Like the add, a failed stock check doesn't block the change: checkout makes the final call.
    const inventory = quantity > 0 ? await getProductStock(productId).catch(() => null) : null
    if (inventory) {
        const available = inventory.stock - STOP_SELLING_AT_INVENTORY_LEVEL
        if (available <= 0) {
            return { error: CartErrorCode.OutOfStock }
        }
        if (quantity > available) {
            return { error: CartErrorCode.NotEnoughStock }
        }
    }
    const result = quantity === 0 ? await removeItem(productId) : await updateItem(productId, quantity)
    if ('error' in result) {
        return result
    }
    const cart = await toCartView(result.cart)
    return { cart }
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
