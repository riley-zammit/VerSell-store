import { z } from 'zod'
import { GRID_LIMIT, getCollection } from '@/lib/api'
import { ProductCard, ProductCardSkeleton } from './product-card'
import { NavLink } from '../nav-link'
import type { Pagination as PaginationMeta } from '@/lib/types'

// Shared with search's own <ul> so every grid has the same footprint.
export const gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3'

export const pageSchema = z.coerce.number().int().min(1).catch(1)

/** Products for ?category= / ?featured= (all products when neither), paged via ?page=N. Reads the URL, so it needs a boundary whose fallback includes <GridSkeleton /> (e.g. loading.tsx). */
export async function ProductGrid({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const sp = await searchParams
    const page = pageSchema.parse(sp.page)
    const query = new URLSearchParams()
    
    for (const key of ['category', 'featured']) if (typeof sp[key] === 'string') query.set(key, sp[key])
    const pageHref = (n: number) => `?${new URLSearchParams([...query, ['page', String(n)]])}`

    const result = await getCollection(String(query), GRID_LIMIT, page)
    if ('error' in result) return <p className="text-foreground/60">{result.error}</p>
    const { products, pagination } = result
    return (
        <>
            <ul className={gridClassName}>
                {products.map((p) => (
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
