import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CartFallback, CartResolver } from '@/components/cart/cart'
import { getCart } from '@/lib/cart'

export const metadata: Metadata = { title: 'Your cart' }

export default function Page() {
    return (
        <>
            <h1 className="text-4xl md:text-5xl">Your cart</h1>
            <div className="mt-8">
                <Suspense fallback={<CartFallback variant="page" />}>
                    <CartResolver cartPromise={getCart()} variant="page" />
                </Suspense>
            </div>
        </>
    )
}
