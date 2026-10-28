'use client'

import Image from 'next/image'
import Link from 'next/link'
import { startTransition, useEffect, useRef, useState, type ComponentProps, type MouseEvent } from 'react'
import { applyOps } from '@/lib/apply-ops'
import { addToCart, setQuantity } from '@/lib/cart-actions'
import { CartOpType, MAX_QUANTITY } from '@/lib/constants'
import { formatPrice } from '@/lib/format'
import type { ActionResult, Cart, CartItem, CartOp } from '@/lib/types'
import { useCartOps } from './cart-ops'

type CartProps = { cart: Cart | null; unavailable?: boolean }

export function CartDrawer(props: CartProps) {
  const { ops, open, setOpen } = useCartOps()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])

  const close = () => setOpen(false)
  const openDrawer = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return // let new-tab/window clicks follow the link
    e.preventDefault()
    setOpen(true)
  }

  return (
    <>
      <CartButton count={applyOps(props.cart, ops)?.totalItems ?? 0} onClick={openDrawer} />
      <dialog
        ref={dialog}
        aria-label="Cart"
        onClose={close}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="drawer fixed inset-y-0 right-0 mr-0 ml-auto h-dvh max-h-none w-full bg-background text-foreground sm:max-w-md"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-foreground/10 px-4">
            <h2 className="font-semibold">Your cart</h2>
            <div className="flex items-center gap-2">
              <Link href="/cart" onClick={close} className="text-sm underline">
                View cart
              </Link>
              <button onClick={close} aria-label="Close cart" className="rounded p-2 hover:bg-foreground/5">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
          </div>
          <CartContents {...props} />
        </div>
      </dialog>
    </>
  )
}

/** Line items, subtotal and checkout. Shared by the drawer and the /cart page. */
export function CartContents({ cart: serverCart, unavailable }: CartProps) {
  const { ops, setOpen } = useCartOps()
  const cart = applyOps(serverCart, ops)
  const [error, setError] = useState('')
  const items = cart?.items ?? []

  return (
    <>
      {items.length ? (
        <ul className="flex-1 divide-y divide-foreground/10 overflow-y-auto px-4">
          {items.map((item) => (
            <CartRow key={item.productId} item={item} onError={setError} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p>{unavailable ? "We couldn't load your cart." : 'Your cart is empty.'}</p>
          <Link href="/search" onClick={() => setOpen(false)} className="text-sm underline">
            Browse products
          </Link>
        </div>
      )}

      <div className="border-t border-foreground/10 p-4">
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(cart?.subtotal ?? 0)}</span>
        </div>
        {/* Reserved height: status never shifts the layout */}
        <p aria-live="polite" className="mt-1 h-5 text-sm text-foreground/60">
          {ops.length ? 'Saving…' : error}
        </p>
        {/* ponytail: no checkout API/route exists yet; wire onClick when it does */}
        <button
          type="button"
          disabled={ops.length > 0 || !items.length}
          className="mt-3 h-12 w-full rounded-full bg-foreground font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          Checkout
        </button>
      </div>
    </>
  )
}

type OnError = (message: string) => void

/**
 * A real <form> posting a bound Server Action, so it works before hydration and without JS.
 * Hydrated clicks skip the post and run the same action optimistically: the row updates this
 * frame and the op reverts automatically if the action fails.
 */
function CartAction({ action, op, onError, ...props }: Omit<ComponentProps<'button'>, 'onError'> & {
  action: () => Promise<ActionResult>
  op: CartOp
  onError: OnError
}) {
  const { addOp } = useCartOps()
  const run = (e: MouseEvent) => {
    e.preventDefault()
    startTransition(async () => {
      onError('')
      addOp(op)
      const res = await action()
      if (!res.ok) onError(res.message ?? '')
    })
  }
  return (
    // Must be the Server Action reference itself (a client wrapper breaks the no-JS post); that post ignores the result.
    <form action={action as unknown as () => Promise<void>} className="contents">
      <button {...props} onClick={run} />
    </form>
  )
}

function CartRow({ item, onError }: { item: CartItem; onError: OnError }) {
  const { product, quantity } = item
  const set = (next: number) => ({
    action: setQuantity.bind(null, product.id, next),
    op: { type: CartOpType.Set, product, quantity: next },
    onError,
  })
  // + is an add-to-cart of 1: same stock check + rollback as the PDP. Decreases skip the stock check.
  const increment = {
    action: addToCart.bind(null, product.id, 1),
    op: { type: CartOpType.Add, product, quantity: 1 },
    onError,
  }

  return (
    <li className="flex gap-3 py-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded bg-foreground/5">
        <Image src={product.images[0]} alt="" fill sizes="80px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-2 text-sm">
          <span className="line-clamp-2 font-medium">{product.name}</span>
          <span className="shrink-0 font-medium">{formatPrice(item.lineTotal)}</span>
        </div>
        <span className="text-sm text-foreground/60">{formatPrice(product.price)}</span>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center rounded border border-foreground/15">
            <CartAction {...set(quantity - 1)} aria-label={`Decrease ${product.name}`} className="size-8">
              −
            </CartAction>
            <span className="w-8 text-center tabular-nums" aria-label="Quantity">
              {quantity}
            </span>
            <CartAction
              {...increment}
              disabled={quantity >= MAX_QUANTITY}
              aria-label={`Increase ${product.name}`}
              className="size-8 disabled:opacity-30"
            >
              +
            </CartAction>
          </div>
          <CartAction {...set(0)} className="text-foreground/60 underline hover:text-foreground">
            Remove
          </CartAction>
        </div>
      </div>
    </li>
  )
}

/**
 * Fixed-size icon link. A real link to /cart, so it works before hydration; once hydrated it opens the drawer.
 * The badge is absolute, so a count appearing never moves anything.
 */
function CartButton({ count = 0, onClick }: { count?: number; onClick?: (e: MouseEvent) => void }) {
  return (
    <Link
      href="/cart"
      prefetch={false} // hydrated clicks open the drawer, so a prefetch would be wasted
      onClick={onClick}
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="relative ml-1 grid size-10 place-items-center rounded hover:bg-foreground/5"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 016 0" strokeLinejoin="round" />
      </svg>
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums">
          {count > MAX_QUANTITY ? `${MAX_QUANTITY}+` : count}
        </span>
      )}
    </Link>
  )
}

/** Suspense fallback: the same link, no badge. Goes to /cart until the hole resolves. */
export const CartTrigger = () => <CartButton />
