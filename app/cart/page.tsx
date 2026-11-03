import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CartLines } from '@/components/cart/cart'
import { CartSkeleton } from '@/components/cart/cart-parts'

export const metadata: Metadata = { title: 'Your cart' }

// Reached by direct links, modified clicks, and no-JS. Plain clicks open the drawer instead.
export default function Page() {
    return (
        <>
            <h1 className="text-4xl md:text-5xl">Your cart</h1>
            <div className="mt-8">
                <Suspense fallback={<CartSkeleton />}>
                    <CartLines variant="page" />
                </Suspense>
            </div>
        </>
    )
}
