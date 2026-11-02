import { Suspense } from 'react'

import { CartDrawer, CartFallback } from '@/components/cart/cart'
import { LoadCart } from '@/components/cart/load-cart'

export default function Page() {
    return (
        <CartDrawer>
            {/* Cookie read and GET /cart stay inside the drawer so the page underneath still prerenders. */}
            <Suspense fallback={<CartFallback variant="drawer" />}>
                <LoadCart variant="drawer" />
            </Suspense>
        </CartDrawer>
    )
}
