'use client'

import { createContext, startTransition, use, useEffect, useState, type ReactNode } from 'react'
import { addToCart } from '@/lib/cart-actions'
import { CartOpType, MAX_QUANTITY } from '@/lib/constants'
import type { ProductSummary, StockInfo } from '@/lib/types'
import { useCartOps } from '../cart/cart-ops'
import { NotifyForm } from '../notify-form'

// Lets the streamed stock hole push its reading into this already-hydrated form.
const StockContext = createContext<(stock: StockInfo | null) => void>(() => {})

/**
 * Lives in the static shell, so it's interactive from hydration, optimistically assuming in-stock.
 * Stock and delivery arrive as slots (their own Suspense holes) and never block it.
 */
export function PurchaseForm({ product, stock: stockSlot, delivery }: { product: ProductSummary; stock: ReactNode; delivery: ReactNode }) {
  const [stock, setStock] = useState<StockInfo | null>() // undefined = pending → optimistic
  const [rawQty, setRawQty] = useState('1')
  const [error, setError] = useState('')
  const { addOp, setOpen } = useCartOps()

  const soldOut = stock?.inStock === false
  const max = stock?.stock || MAX_QUANTITY
  const qty = Math.min(Math.max(1, parseInt(rawQty) || 1), max) // derived clamp, no effect

  const add = () => {
    setError('')
    setOpen(true) // urgent, outside the transition → the drawer opens this frame
    startTransition(async () => {
      addOp({ type: CartOpType.Add, product, quantity: qty }) // badge + rows update this frame
      const res = await addToCart(product.id, qty)
      if (!res.ok) {
        setOpen(false) // the op reverts on its own when the transition ends
        setError(res.message ?? '')
      }
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <StockContext value={setStock}>{stockSlot}</StockContext>
      {soldOut ? (
        <NotifyForm productId={product.id} />
      ) : (
        <div>
          <div className="flex h-12 gap-3">
            <div className="flex items-center rounded-full border border-foreground/20">
              <button
                type="button"
                onClick={() => setRawQty(String(qty - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="size-12 disabled:opacity-30"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={max}
                value={rawQty === '' ? '' : qty}
                onChange={(e) => setRawQty(e.target.value)}
                onBlur={() => setRawQty(String(qty))}
                aria-label="Quantity"
                className="w-10 [appearance:textfield] bg-transparent text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setRawQty(String(qty + 1))}
                disabled={qty >= max}
                aria-label="Increase quantity"
                className="size-12 disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              className="flex flex-1 items-center justify-center rounded-full bg-foreground font-medium text-background hover:opacity-90"
            >
              Add to Cart
            </button>
          </div>
          <p aria-live="polite" className="mt-1 h-5 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}
      <div className={soldOut ? 'invisible' : undefined}>{delivery}</div>
    </div>
  )
}

/** Client half of the stock hole: reports the reading up to PurchaseForm, renders the line. */
export function StockReport({ stock }: { stock: StockInfo | null }) {
  const report = use(StockContext)
  useEffect(() => report(stock), [report, stock]) // the one deliberate sync point
  return <StockLine stock={stock} />
}

/** undefined = checking (fallback), null = no reading. Fixed height. */
export function StockLine({ stock }: { stock?: StockInfo | null }) {
  const text =
    stock === undefined ? 'Checking stock…'
    : stock === null ? 'Stock unavailable'
    : !stock.inStock ? 'Out of stock'
    : stock.lowStock ? `Only ${stock.stock} left`
    : 'In stock'
  const tone = stock?.inStock ? (stock.lowStock ? 'text-amber-600' : 'text-green-600') : 'text-foreground/60'
  return (
    <p className={`h-5 text-sm ${tone}`} aria-live="polite">
      {text}
    </p>
  )
}
