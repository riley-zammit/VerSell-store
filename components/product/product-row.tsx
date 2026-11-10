import { cacheLife } from 'next/cache'
import { getCollection } from '@/lib/swag-api/catalog'
import { NavLink } from '../nav-link'
import { ProductCard, ProductCardSkeleton } from './product-card'
import type { CSSProperties } from 'react'

// Stacked on mobile; one column per slot (a single row) from sm up.
const rowProps = (slots: number) => ({
    className: 'grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-[repeat(var(--slots),minmax(0,1fr))]',
    style: { '--slots': slots } as CSSProperties,
})

// Mirrors rowProps inside the max-w-6xl column (1120px of content); keep in sync if the layout changes.
const rowSizes = (slots: number) => `(min-width: 1152px) ${Math.round(1120 / slots)}px, (min-width: 640px) ${Math.round(100 / slots)}vw, 100vw`

/** First `slots` products for a /products query string (e.g. 'category=mugs'), plus "See all" (to `href`) when there are more. */
export async function ProductRow({ query, href, slots, prefetch=true }: { query: string; href: string; slots: number; prefetch?: boolean }) {
    // Cache: Reusable component. 
    'use cache: remote'
    cacheLife('catalog')
    
    const result = await getCollection(query, slots)
    if ('error' in result) return <p className="text-foreground/60">{result.error}</p>
    const { products, pagination } = result
    return (
        <>
            <ul {...rowProps(slots)}>
                {products.map((p) => (
                    <ProductCard key={p.id} product={p} sizes={rowSizes(slots)} prefetch={prefetch}/>
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
