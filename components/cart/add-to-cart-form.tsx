'use client'

import { useCart } from '@/components/cart/cart-provider'
import type { Product } from '@/lib/types'

export function AddToCartForm({ product }: { product: Product }) {
    const { add, openDrawer, error } = useCart()

    return (
        <form
            className="mt-8 flex flex-wrap items-center gap-3"
            action={async (formData) => {
                const quantity = wholeNumber(formData.get('quantity'))
                if (quantity == null || quantity < 1) return
                openDrawer()
                await add(product, quantity)
            }}
        >
            <input
                type="number"
                name="quantity"
                min={1}
                defaultValue={1}
                required
                aria-label="Quantity"
                className="h-12 w-24 rounded-full bg-white px-4 text-center font-sans shadow-card outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
            <button type="submit" className="button-dark">
                Add to cart
            </button>
            {error ? (
                <p role="alert" className="basis-full text-sm text-foreground/70">
                    {error}
                </p>
            ) : null}
        </form>
    )
}

function wholeNumber(value: FormDataEntryValue | null) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
    return Number(value)
}
