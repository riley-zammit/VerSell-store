import { Suspense } from 'react'
import Link from 'next/link'
import { CartIcon, CartIconWithCount } from '@/components/cart/cart-icon'
import { NavLink } from '@/components/nav-link'
import { PromoBanner } from '@/components/promo-banner'
import { NavMenu } from '@/components/layout/root/nav-menu'
import { ScrollHeader } from '@/components/layout/root/scroll-header'

// Big tap targets in the mobile sheet, the compact row from sm up.
const linkClass = 'relative rounded px-2 py-2 text-lg hover:bg-foreground/5 sm:py-1 sm:text-sm'

export function Header() {
    return (
        <ScrollHeader className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
            <PromoBanner />
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="Versell home">
                    <svg width="20" height="18" viewBox="0 0 76 65" aria-hidden fill="currentColor">
                        <path d="M37.5 0L75 65H0L37.5 0Z" />
                    </svg>
                    <span className="max-[300px]:sr-only">VerSell</span>
                </Link>
                <nav className="ml-auto flex items-center gap-1">
                    <NavMenu id="nav-menu">
                        <button
                            type="button"
                            popoverTarget="nav-menu"
                            popoverTargetAction="hide"
                            aria-label="Close menu"
                            className="grid size-10 place-items-center self-end rounded-full hover:bg-foreground/5 sm:hidden"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path d="M3 3l10 10M13 3L3 13" />
                            </svg>
                        </button>
                        <NavLink href="/" className={linkClass}>
                            Home
                        </NavLink>
                        <NavLink href="/search" className={linkClass}>
                            Search
                        </NavLink>
                        <NavLink href="/bundles" className={linkClass}>
                            Bundles
                        </NavLink>
                        <NavLink href="/about" className={linkClass}>
                            About
                        </NavLink>
                    </NavMenu>
                    <Suspense fallback={<CartIcon />}>
                        <CartIconWithCount />
                    </Suspense>
                    <button
                        type="button"
                        popoverTarget="nav-menu"
                        aria-label="Menu"
                        className="grid size-9 place-items-center rounded hover:bg-foreground/5 sm:hidden"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>
                </nav>
            </div>
        </ScrollHeader>
    )
}
