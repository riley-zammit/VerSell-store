import { Suspense } from 'react'

import { CartFallback, CartResolver } from '@/components/cart/cart'
import { getCart } from '@/lib/cart'

// The sheet itself is CartDrawer in the root layout; this slot only fills it.
export default function Page() {
    return (
        <Suspense fallback={<CartFallback variant="drawer" />}>
            <CartResolver cartPromise={getCart()} variant="drawer" />
        </Suspense>
    )
}
