// node --test --experimental-transform-types lib/apply-ops.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { applyOps } from './apply-ops.ts'
import { CartOpType } from './constants.ts'
import type { Cart, ProductSummary } from './types.ts'

const tee: ProductSummary = { id: 'tee', name: 'Tee', slug: 'tee', price: 3000, images: [] }
const mug: ProductSummary = { id: 'mug', name: 'Mug', slug: 'mug', price: 1250, images: [] }
const cart: Cart = {
  token: 't',
  currency: 'USD',
  items: [{ productId: 'tee', product: tee, quantity: 2, lineTotal: 6000 }],
  totalItems: 2,
  subtotal: 6000,
}

test('no ops returns the server cart untouched', () => {
  assert.equal(applyOps(cart, []), cart)
  assert.equal(applyOps(null, []), null)
})

test('add a new item over a null cart', () => {
  const c = applyOps(null, [{ type: CartOpType.Add, product: mug, quantity: 3 }])!
  assert.deepEqual(c.items.map((i) => [i.productId, i.quantity, i.lineTotal]), [['mug', 3, 3750]])
  assert.equal(c.totalItems, 3)
  assert.equal(c.subtotal, 3750)
})

test('add to an existing item, then a new one', () => {
  const c = applyOps(cart, [
    { type: CartOpType.Add, product: tee, quantity: 1 },
    { type: CartOpType.Add, product: mug, quantity: 2 },
  ])!
  assert.deepEqual(c.items.map((i) => [i.productId, i.quantity, i.lineTotal]), [['tee', 3, 9000], ['mug', 2, 2500]])
  assert.equal(c.totalItems, 5)
  assert.equal(c.subtotal, 11500)
  assert.equal(cart.items[0].quantity, 2, 'server cart is not mutated')
})

test('set quantity, and set 0 removes', () => {
  const set = applyOps(cart, [{ type: CartOpType.Set, product: tee, quantity: 5 }])!
  assert.equal(set.items[0].lineTotal, 15000)
  assert.equal(set.subtotal, 15000)
  const removed = applyOps(cart, [{ type: CartOpType.Set, product: tee, quantity: 0 }])!
  assert.deepEqual(removed.items, [])
  assert.equal(removed.totalItems, 0)
  assert.equal(removed.subtotal, 0)
})
