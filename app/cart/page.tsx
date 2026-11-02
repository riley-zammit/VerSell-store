import type { Metadata } from 'next'

import { LoadCart } from '@/components/cart/load-cart'

export const metadata: Metadata = { title: 'Your cart' }

// The lines have to be in the first HTML. A Suspense hole is swapped in by a
// script, so a no-JS visit would stay on the skeleton. Blocking is what
// cacheComponents allows for a cookie read outside that hole.
export const instant = false

export default function Page() {
    return (
        <>
            <h1 className="text-4xl md:text-5xl">Your cart</h1>
            <div className="mt-8">
                <LoadCart variant="page" />
            </div>
        </>
    )
}
