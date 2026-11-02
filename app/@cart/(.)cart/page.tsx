import { Suspense } from 'react'

import { CartFallback, CartResolver } from '@/components/cart/cart'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { getCart } from '@/lib/cart'

export default function Page() {
    return (
        <CartDrawer>
            {/* Cookie read and GET /cart stay inside the drawer so the page underneath still prerenders. */}
            <Suspense fallback={<CartFallback variant="drawer" />}>
                <LoadCart />
            </Suspense>
        </CartDrawer>
    )
}

async function LoadCart() {
    return <CartResolver cart={await getCart()} variant="drawer" />
}
