import { CartScreen } from '@/components/cart/cart'
import { getCart, getCartCount } from '@/lib/cart'

export async function LoadCart({ variant }: { variant: 'page' | 'drawer' }) {
    const [cart, count] = await Promise.all([getCart(), getCartCount()])
    return <CartScreen cart={cart} count={count} variant={variant} />
}
