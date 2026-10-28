import { cacheLife } from 'next/cache'
import { SITE_NAME } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-foreground/10">
      <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-foreground/60">
        © <Year /> {SITE_NAME}. All rights reserved.
      </p>
    </footer>
  )
}

// Cache Components requires `new Date()` to be cached or deferred.
async function Year() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
