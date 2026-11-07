'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'

import { addItem, removeItem, updateItem } from './cart'
import { CartField, type CartResult } from './types'

//Some basic validation on a public endpoint
const addSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(1),
})

const updateSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(0),
})

const idSchema = z.string().trim().min(1)

// The add form's useActionState action, so it also works before hydration. Returns the error to show, or null.
export async function addToCart(_prev: string | null, formData: FormData): Promise<string | null> {
    const parsed = addSchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return 'Enter a quantity of at least 1 or a valid productId.'
    }
    const { productId, quantity } = parsed.data
    const result = await addItem(productId, quantity)
    refreshOnSuccess(result)
    return 'error' in result ? result.error : null
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartResult> {
    const parsed = updateSchema.safeParse({
        productId,
        quantity,
    })
    if (!parsed.success) {
        return { error: 'Enter a whole number for the quantity.' }
    }
    const result = await updateItem(parsed.data.productId, parsed.data.quantity)
    refreshOnSuccess(result)
    return result
}

export async function removeCartItem(productId: string): Promise<CartResult> {
    const parsed = idSchema.safeParse(productId)
    if (!parsed.success) {
        return { error: 'That item is no longer in the cart.' }
    }
    const result = await removeItem(parsed.data)
    refreshOnSuccess(result)
    return result
}

// refresh() re-renders the root layout, which hands CartProvider a fresh getCart(). Writes usually skip the
// cookie, and unlike a cookie write, refresh() leaves the client prefetch cache alone.
function refreshOnSuccess(result: CartResult) {
    if ('cart' in result) {
        refresh()
    }
}
