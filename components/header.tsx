import Link from 'next/link'
import { Suspense } from 'react'
import { SITE_NAME } from '@/lib/constants'
import { NavLink } from './nav-link'
import { Cart } from './cart/cart'
import { CartTrigger } from './cart/cart-drawer'
import { PromoBanner } from './promo-banner'
import { ScrollHeader } from './scroll-header'

const linkClass = 'relative rounded px-2 py-1 text-sm hover:bg-foreground/5'

export function Header() {
    return (
        <ScrollHeader className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
            <PromoBanner />
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold" aria-label={`${SITE_NAME} home`}>
                    <svg width="20" height="18" viewBox="0 0 76 65" aria-hidden fill="currentColor">
                        <path d="M37.5 0L75 65H0L37.5 0Z" />
                    </svg>
                    <span>{SITE_NAME}</span>
                </Link>
                <nav className="ml-auto flex items-center gap-1">
                    <NavLink href="/" className={linkClass}>
                        Home
                    </NavLink>
                    <NavLink href="/search" prefetch className={linkClass}>
                        Search
                    </NavLink>
                    <Suspense fallback={<CartTrigger />}>
                        <Cart />
                    </Suspense>
                </nav>
            </div>
        </ScrollHeader>
    )
}
