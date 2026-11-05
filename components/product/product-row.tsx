import { cacheLife } from 'next/cache'
import { getCollection } from '@/lib/api'
import { NavLink } from '../nav-link'
import { ProductCard, ProductCardSkeleton } from './product-card'
import type { CSSProperties } from 'react'

// Stacked on mobile; one column per slot (a single row) from sm up.
const rowProps = (slots: number) => ({
    className: 'grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-[repeat(var(--slots),minmax(0,1fr))]',
    style: { '--slots': slots } as CSSProperties,
})

/** First `slots` products for a /products query string (e.g. 'category=mugs'), plus "See all" (to `href`) when there are more. */
export async function ProductRow({ query, href, slots }: { query: string; href: string; slots: number }) {
    // Cached here rather than in getCollection: rows prerender into the static shell (no Suspense needed),
    // while the paginated collection grid still fetches fresh on every request.
    'use cache'
    cacheLife('catalog')
    const result = await getCollection(query, slots)
    if ('error' in result) return <p className="text-foreground/60">{result.error}</p>
    const { products, pagination } = result
    return (
        <>
            <ul {...rowProps(slots)}>
                {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </ul>
            {pagination.total > slots && (
                <div className="mt-8 flex justify-center">
                    <NavLink href={href} className="button-dark relative">
                        See all
                    </NavLink>
                </div>
            )}
        </>
    )
}

export function RowSkeleton({ slots }: { slots: number }) {
    return (
        <ul {...rowProps(slots)}>
            {Array.from({ length: slots }, (_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </ul>
    )
}
