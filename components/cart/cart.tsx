import { unstable_rethrow } from 'next/navigation'
import { getCart } from '@/lib/cart'
import { CartContents, CartDrawer } from './cart-drawer'

/** `page` renders the bare contents for /cart instead of the header drawer. */
export async function Cart({ page }: { page?: boolean }) {
  const cart = await getCart().catch((e) => {
    unstable_rethrow(e) // never swallow Next's internal prerender/postpone signals
    return undefined
  })
  const props = { cart: cart ?? null, unavailable: cart === undefined }
  return page ? <CartContents {...props} /> : <CartDrawer {...props} />
}
