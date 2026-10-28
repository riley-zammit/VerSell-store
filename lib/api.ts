import 'server-only'
import { cacheLife } from 'next/cache'
import { ApiHeader, ApiPath, SEARCH_LIMIT, type Category } from './constants'
import type { ApiResponse, CategoryInfo, Product, Promotion, StockInfo } from './types'

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

/** Throws ApiError on failure. */
export async function apiFetch<T>(path: string, init?: RequestInit) {
    const res = await fetch(process.env.SWAG_API_URL + path, {
        ...init,
        signal: AbortSignal.timeout(8000), // ~3× worst observed latency: a hung API fails fast instead of hanging the render
        headers: { [ApiHeader.Bypass]: process.env.SWAG_API_BYPASS_TOKEN!, ...init?.headers },
    })
    const body: ApiResponse<T> = await res
        .json()
        .catch(() => ({ success: false, error: { message: res.statusText } }))
    if (!res.ok || !body.success) throw new ApiError(res.status, body.success ? res.statusText : body.error.message)
    return body.data
}

export async function getFeaturedProducts() {
    'use cache'
    cacheLife('catalog')
    return apiFetch<Product[]>(`${ApiPath.Products}?featured=true&limit=6`)
}

// Build-time only (generateStaticParams).
// ponytail: one page of 100 per category; paginate when a prerendered category outgrows it
export async function getProductsByCategory(category: Category) {
    'use cache'
    cacheLife('catalog')
    return apiFetch<Product[]>(`${ApiPath.Products}?category=${category}&limit=100`)
}

export async function getProduct(slug: string) {
    'use cache'
    cacheLife('catalog')
    return apiFetch<Product>(`${ApiPath.Products}/${encodeURIComponent(slug)}`).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null // definitive → cached → notFound()
        throw e // transient → never cached
    })
}

export async function searchProducts(q = '', category = '') {
    'use cache'
    cacheLife('catalog')
    const params = new URLSearchParams({ limit: String(SEARCH_LIMIT) })
    if (q) params.set('search', q)
    if (category) params.set('category', category)
    return apiFetch<Product[]>(`${ApiPath.Products}?${params}`)
}

export async function getCategories() {
    'use cache'
    cacheLife('catalog')
    return apiFetch<CategoryInfo[]>(ApiPath.Categories)
}

// API returns a random promo per call; caching pins one for everyone, rotating hourly.
export async function getPromotion() {
    'use cache'
    cacheLife('catalog') // same profile as the rest of the layout, so it doesn't shorten every route's lifetime
    return apiFetch<Promotion>(ApiPath.Promotions)
}

/** Live stock (id or slug). Uncached → runs per request and Partial Prefetching keeps it out of prefetches. null = no reading at all → callers stay optimistic. */
export async function getStock(idOrSlug: string) {
    return apiFetch<StockInfo>(`${ApiPath.Products}/${encodeURIComponent(idOrSlug)}/stock`).catch(() => null)
}
