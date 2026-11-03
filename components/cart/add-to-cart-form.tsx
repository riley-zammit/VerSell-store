'use client'

import { useRouter } from 'next/navigation'

import { useCart } from '@/components/cart/cart-provider'
import type { Product } from '@/lib/types'

export function AddToCartForm({ product }: { product: Product }) {
    const router = useRouter()
    const { add, pending, error } = useCart()

    return (
        <form
            className="mt-8 flex flex-wrap items-center gap-3"
            action={async (formData) => {
                const quantity = wholeNumber(formData.get('quantity'))
                if (quantity == null || quantity < 1) return
                // Push first so the router queues the add behind it and the add's refresh renders /cart, not the page being left.
                if (window.location.pathname !== '/cart') router.push('/cart')
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
            <button type="submit" className="button-dark gap-2" disabled={pending}>
                {pending ? <span aria-hidden className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
                {pending ? 'Adding…' : 'Add to cart'}
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
