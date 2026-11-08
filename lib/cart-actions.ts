'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getProductStock, STOP_SELLING_AT_INVENTORY_LEVEL } from './api'
import { addItem, removeItem, toCartView, updateItem } from './cart'
import { AddError, CartField, type CartView } from './types'

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
export async function addToCart(formData: FormData): Promise<{ cart: CartView } | { error: AddError }> {
    const parsed = addSchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: AddError.InvalidQuantity }
    }
    const { productId, quantity } = parsed.data
    // Like the product page, a failed stock check doesn't block the add: checkout makes the final call.
    const inventory = await getProductStock(productId).catch(() => null)
    if (inventory && inventory.stock <= STOP_SELLING_AT_INVENTORY_LEVEL) {
        return { error: AddError.OutOfStock }
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
    let error: AddError | null
    try {
        const result = await addToCart(formData)
        error = 'error' in result ? result.error : null
    } catch {
        // Timeouts and 5xx. Without JS there's no client to catch them, so they become a code too.
        error = AddError.Failed
    }
    // A code rather than the API's text, so a crafted link can't put arbitrary words on the cart page.
    redirect(error ? `/cart?error=${error}` : '/cart')
}

// JS path: each cart line calls this through CartProvider and shows the error under the line.
export async function setCartQuantity(formData: FormData): Promise<{ cart: CartView } | { error: string }> {
    const parsed = quantitySchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return { error: 'Enter a whole number for the quantity.' }
    }
    const { productId, quantity } = parsed.data
    // Applied even past stock. The returned cart's stock messages explain the limit and disable checkout.
    const result = quantity === 0 ? await removeItem(productId) : await updateItem(productId, quantity)
    if ('error' in result) {
        return result
    }
    const cart = await toCartView(result.cart)
    return { cart }
}

// No-JS path: the line form's action before hydration, which only happens on the /cart page.
// Like no-JS quantity errors before, a failure just shows the unchanged cart.
export async function setCartQuantityAndRedirect(formData: FormData) {
    await setCartQuantity(formData)
    redirect('/cart')
}
