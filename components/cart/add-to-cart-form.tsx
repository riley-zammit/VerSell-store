'use client'

import { useActionState } from 'react'

import { useCart } from '@/components/cart/cart-provider'
import { addToCart } from '@/lib/cart-actions'
import { CartField, type Product } from '@/lib/types'

export function AddToCartForm({ product }: { product: Product }) {
    const { showAdd, openDrawer } = useCart()
    // Before hydration the form posts back to this page, which re-renders with the new cart count (or the error).
    // No permalink to /cart: Next only resolves an action on pages that render it, so /cart would 409.
    // With JS there's no navigation; onSubmit opens the drawer instead.
    const [error, formAction] = useActionState(addToCart, null)

    return (
        <form
            className="mt-8 flex flex-wrap items-center gap-3"
            action={formAction}
            onSubmit={(event) => {
                // Native validation (required, min, integer step) already passed, or submit wouldn't fire.
                const quantity = Number(new FormData(event.currentTarget).get(CartField.Quantity))
                openDrawer()
                showAdd(product, quantity)
            }}
        >
            <input type="hidden" name={CartField.ProductId} value={product.id} />
            <input
                type="number"
                name={CartField.Quantity}
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
