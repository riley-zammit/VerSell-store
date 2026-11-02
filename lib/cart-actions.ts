'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { addItem, clearCartCookies, removeItem, updateItem } from './cart'
import { CartField, type CartResult } from './types'

const addSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(1),
})

const updateSchema = z.object({
    productId: z.string().trim().min(1),
    quantity: z.coerce.number().int().min(0),
})

const idSchema = z.string().trim().min(1)

function fields(formData: FormData) {
    return {
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    }
}

async function runAdd(formData: FormData): Promise<CartResult> {
    const parsed = addSchema.safeParse(fields(formData))
    if (!parsed.success) return { error: 'Enter a quantity of at least 1.' }
    return addItem(parsed.data.productId, parsed.data.quantity)
}

// No-JS posts here. Success leaves the product page for the full cart route.
export async function addToCart(_prev: CartResult | null, formData: FormData): Promise<CartResult> {
    const result = await runAdd(formData)
    if ('error' in result) return result
    redirect('/cart')
}

// JS calls this and paints the drawer itself, so the action returns the cart instead of redirecting.
export async function addToCartNow(formData: FormData) {
    return runAdd(formData)
}

export async function updateCartItem(_prev: CartResult | null, formData: FormData): Promise<CartResult> {
    const parsed = updateSchema.safeParse(fields(formData))
    if (!parsed.success) return { error: 'Enter a whole number for the quantity.' }
    return updateItem(parsed.data.productId, parsed.data.quantity)
}

export async function removeCartItem(_prev: CartResult | null, formData: FormData): Promise<CartResult> {
    const parsed = idSchema.safeParse(formData.get(CartField.ProductId))
    if (!parsed.success) return { error: 'That item is no longer in the cart.' }
    return removeItem(parsed.data)
}

export async function forgetCart() {
    await clearCartCookies()
}
