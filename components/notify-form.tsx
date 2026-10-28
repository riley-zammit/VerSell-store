'use client'

import { useActionState } from 'react'
import { subscribeToRestock } from '@/lib/restock-actions'
import type { ActionResult } from '@/lib/types'

const initial: ActionResult = { ok: false }

// Sold-out replacement for quantity + Add to Cart. Same h-12 footprint. Not optimistic: input can be rejected.
export function NotifyForm({ productId }: { productId: string }) {
  const [state, action, isPending] = useActionState(subscribeToRestock.bind(null, productId), initial)

  if (state.ok)
    return <p className="flex h-12 items-center text-sm">We&apos;ll email you when it&apos;s back.</p>

  return (
    <>
      <form action={action} className="flex h-12 gap-2">
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          readOnly={isPending}
          placeholder="you@example.com"
          aria-label="Email for restock notification"
          className="min-w-0 flex-1 rounded-full border border-foreground/20 bg-transparent px-4"
        />
        <button
          disabled={isPending}
          className="flex items-center gap-2 rounded-full bg-foreground px-5 font-medium text-background disabled:opacity-60"
        >
          <span className="w-4">{isPending && <Spinner />}</span>
          Notify me
        </button>
      </form>
      <p aria-live="polite" className="mt-1 h-5 text-sm text-red-600">
        {state.ok ? '' : state.message}
      </p>
    </>
  )
}

export const Spinner = () => (
  <span aria-hidden className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
)
