'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'

/** <Link> plus a pending hint that only shows when a click beats the prefetch (slow networks). */
export function NavLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <PendingHint />
    </Link>
  )
}

function PendingHint() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <span aria-hidden className="link-pending pointer-events-none absolute inset-0 animate-pulse bg-background/40" />
}
