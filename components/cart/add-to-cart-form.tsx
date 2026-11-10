'use client'

import { useCart } from '@/components/cart/cart-provider'
import { addToCartAndRedirect } from '@/actions/cart'
import { CartField, type Product } from '@/lib/types'

export function AddToCartForm({ product, inventory, disabled = false, }: { product: Product; inventory:number | null; disabled?: boolean }) {
    const { adding, add } = useCart()

    return (
        // Before hydration the form posts natively and lands on the /cart page, with any error in the URL.
        <form
            className="mt-8 flex flex-wrap items-center gap-3"
            //no-js fallback
            action={addToCartAndRedirect} 
            onSubmit={(event) => {
                // Opens the drawer the sets the add. JS-enabled fallback
                event.preventDefault()
                add(product, new FormData(event.currentTarget))
            }}
        >
            <input type="hidden" name={CartField.ProductId} value={product.id} />
            <input
                type="number"
                name={CartField.Quantity}
                min={1}
                defaultValue={1}
                required
                disabled={disabled}
                aria-label="Quantity"
                className="h-12 w-24 rounded-full bg-white px-4 text-center font-sans shadow-card outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
            <button type="submit" className="button-dark" disabled={disabled || adding !== null}>
                {disabled ? 'Out of stock' : 'Add to cart'}
            </button>
            {/* Its own fixed-height row, matched in loading.tsx, so the count never moves the page. Empty when sold out or the check failed. */}
            <p className="h-5 w-full text-sm text-foreground/70">
                {inventory !== null && inventory > 0 ? `${inventory} in stock` : null}
            </p>
        </form>
    )
}
