'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'

import { addItem, removeItem, updateItem } from './cart'
import type { CartResult } from './types'

const addSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(1),
})

const updateSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(0),
})

const idSchema = z.string().trim().min(1)

export async function addToCart(productId: string, quantity: number): Promise<CartResult> {
    const parsed = addSchema.safeParse({ productId, quantity })
    if (!parsed.success) return { error: 'Enter a quantity of at least 1.' }
    return refreshed(await addItem(parsed.data.productId, parsed.data.quantity))
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartResult> {
    const parsed = updateSchema.safeParse({ productId, quantity })
    if (!parsed.success) return { error: 'Enter a whole number for the quantity.' }
    return refreshed(await updateItem(parsed.data.productId, parsed.data.quantity))
}

export async function removeCartItem(productId: string): Promise<CartResult> {
    const parsed = idSchema.safeParse(productId)
    if (!parsed.success) return { error: 'That item is no longer in the cart.' }
    return refreshed(await removeItem(parsed.data))
}

// Writes usually skip the cookie now, so re-render the header count and cart explicitly.
// Unlike a cookie write, refresh() leaves the client prefetch cache alone.
function refreshed(result: CartResult) {
    if ('cart' in result) refresh()
    return result
}
