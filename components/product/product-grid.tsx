import type { ReactNode } from 'react'

/** Shared by real cards and skeletons. Keep it OUTSIDE Suspense boundaries so the grid never reflows. */
export function ProductGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">{children}</ul>
}
