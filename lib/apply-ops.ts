import { CartOpType, CURRENCY } from './constants.ts'
import type { Cart, CartItem, CartOp } from './types.ts'

/** Pure optimistic reducer: the server cart with pending ops applied. Safe on client and server. */
export function applyOps(cart: Cart | null, ops: CartOp[]): Cart | null {
  if (!ops.length) return cart
  const items: CartItem[] = [...(cart?.items ?? [])]
  for (const { type, product, quantity } of ops) {
    const i = items.findIndex((item) => item.productId === product.id)
    const next = type === CartOpType.Add ? (items[i]?.quantity ?? 0) + quantity : quantity
    if (next <= 0) {
      if (i >= 0) items.splice(i, 1)
      continue
    }
    const line = { productId: product.id, product: items[i]?.product ?? product, quantity: next }
    const item = { ...items[i], ...line, lineTotal: line.product.price * next }
    if (i >= 0) items[i] = item
    else items.push(item)
  }
  return {
    token: cart?.token ?? '',
    currency: cart?.currency ?? CURRENCY,
    items,
    totalItems: items.reduce((n, item) => n + item.quantity, 0),
    subtotal: items.reduce((n, item) => n + item.lineTotal, 0),
  }
}
