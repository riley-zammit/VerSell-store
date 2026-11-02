'use server'

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
    return addItem(parsed.data.productId, parsed.data.quantity)
}

export async function updateCartItem(productId: string, quantity: number): Promise<CartResult> {
    const parsed = updateSchema.safeParse({ productId, quantity })
    if (!parsed.success) return { error: 'Enter a whole number for the quantity.' }
    return updateItem(parsed.data.productId, parsed.data.quantity)
}

export async function removeCartItem(productId: string): Promise<CartResult> {
    const parsed = idSchema.safeParse(productId)
    if (!parsed.success) return { error: 'That item is no longer in the cart.' }
    return removeItem(parsed.data)
}
