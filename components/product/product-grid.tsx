import { z } from 'zod'
import { GRID_LIMIT, getCollection } from '@/lib/swag-api/catalog'
import { ProductCard, ProductCardSkeleton } from './product-card'
import { NavLink } from '../nav-link'
import type { Pagination as PaginationMeta } from '@/lib/types'
import { cacheLife } from 'next/cache'

// Shared with search's own <ul> so every grid has the same footprint.
export const gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3'

export const pageSchema = z.coerce.number().int().min(1).catch(1)

function constructCollectionQuery(category?: string) {
    if (!category) return ''
    if (category === 'featured') return 'featured=true' // not an API category; the API filters it separately
    return `category=${category}`
}

/** Page `page` of products in `category` (all products when omitted; 'featured' for featured products). */
export async function ProductGrid({ category, page }: { category?: string; page: number }) {
    "use cache: remote"
    cacheLife("catalog");

    const pageHref = (n: number) => `?page=${n}`

    const result = await getCollection(constructCollectionQuery(category), GRID_LIMIT, page)
    if ('error' in result) return <p className="text-foreground/60">{result.error}</p>
    const { products, pagination } = result
    return (
        <>
            <ul className={gridClassName}>
                {products.map((p) => (
                    // don't prefetch an unknown number of routes. Partial prefetching + cache will fetch enough of the shell
                    <ProductCard key={p.id} product={p} /> 
                ))}
            </ul>
            <Pagination page={page} pagination={pagination} pageHref={pageHref} />
        </>
    )
}

export function Pagination({ page, pagination, pageHref }: { page: number; pagination: PaginationMeta; pageHref: (n: number) => string }) {
    if (pagination.totalPages <= 1) return null
    return (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-6 text-sm">
            {pagination.hasPreviousPage && (
                <NavLink href={pageHref(Math.min(page - 1, pagination.totalPages))} className="relative hover:underline">
                    Previous
                </NavLink>
            )}
            <span className="text-foreground/60">
                Page {page} of {pagination.totalPages}
            </span>
            {pagination.hasNextPage && (
                <NavLink href={pageHref(page + 1)} className="relative hover:underline">
                    Next
                </NavLink>
            )}
        </nav>
    )
}

export function GridSkeleton() {
    return (
        <ul className={gridClassName}>
            {Array.from({ length: GRID_LIMIT }, (_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </ul>
    )
}
