import { cacheLife } from 'next/cache'
import { NavLink } from '@/components/nav-link'

// Hard-coded rather than read from getStoreConfig so the footer never depends on the API at build time.
const socialLinks = [
  { label: 'Twitter', href: 'https://twitter.com/vercel' },
  { label: 'GitHub', href: 'https://github.com/vercel' },
  { label: 'Discord', href: 'https://discord.gg/vercel' },
]

export function Footer() {
  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-foreground/60">
        <p>
          © <Year /> Versell. All rights reserved.
        </p>
        <ul className="flex gap-6">
          <li>
            <NavLink href="/about" className="relative hover:text-foreground hover:underline">
              About
            </NavLink>
          </li>
          {socialLinks.map(({ label, href }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}

// Cache Components requires `new Date()` to be cached or deferred.
async function Year() {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}
