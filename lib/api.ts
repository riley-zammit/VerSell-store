import 'server-only'
import { cacheLife } from 'next/cache'

import { apiFetch, ApiError, Category } from './swag-api'
import type { CategoryInfo, Health, Product, Promotion, Stock, StoreConfig } from './types'

export { apiFetch, ApiError, ApiHeader, Category } from './swag-api'

enum ApiPath {
    Products = '/products',
    Categories = '/categories',
    Promotions = '/promotions',
    StoreConfig = '/store/config',
    Health = '/health',
}
export const SEARCH_LIMIT = 9
export const GRID_LIMIT = 9

/** `query` is a /products query string, e.g. 'category=mugs' or 'featured=true'; '' is all products. */
export async function getCollection(query: string, limit: number, page = 1) {
    const params = new URLSearchParams(query)
    params.set('limit', String(limit))
    params.set('page', String(page))
    return apiFetch<Product[]>(`${ApiPath.Products}?${params}`).then(
        ({ data, meta }) => ({ products: data, pagination: meta!.pagination }), // list endpoints always send meta
        (e) => {
            // Bad query (e.g. "Invalid category 'x'. Valid categories: …"): definitive → cached, shown to the user
            if (e instanceof ApiError && e.status === 422) return { error: e.message }
            throw e
        },
    )
}

// Build-time only (generateStaticParams).
// ponytail: one page of 100 per category; paginate when a prerendered category outgrows it
export async function getProductsByCategory(category: Category) {
    'use cache'
    cacheLife('catalog')
    return (await apiFetch<Product[]>(`${ApiPath.Products}?category=${category}&limit=6`)).data
}

export async function getCategories() {
    'use cache'
    cacheLife('catalog')
    return (await apiFetch<CategoryInfo[]>(ApiPath.Categories)).data
}

export async function getProduct(slug: string) {
    'use cache'
    cacheLife('catalog')
    return apiFetch<Product>(`${ApiPath.Products}/${encodeURIComponent(slug)}`).then((r) => r.data, (e) => {
        if (e instanceof ApiError && e.status === 404) return null // definitive → cached → notFound()
        throw e // transient → never cached
    })
}

// Not cached: stock changes on every request, so callers render it inside Suspense as a dynamic hole.
export async function getProductStock(id: string) {
    return (await apiFetch<Stock>(`${ApiPath.Products}/${encodeURIComponent(id)}/stock`)).data
}

// Searches all products; '' returns everything.
export async function searchProducts(query: string, page = 1) {
    const params = new URLSearchParams({ limit: String(SEARCH_LIMIT), page: String(page) })
    if (query) params.set('search', query)
    const { data, meta } = await apiFetch<Product[]>(`${ApiPath.Products}?${params}`)
    return { products: data, pagination: meta!.pagination } // list endpoints always send meta
}

// API returns a random promo per call; caching here pins one for every caller on the page, rotating hourly.
// Cache must be here and not the component, so if promotions are rendered anywhere else in the site, they stay stable
export async function getPromotion() {
    'use cache'
    cacheLife('hours') // longer than 'catalog', so it doesn't shorten any route's lifetime
    return (await apiFetch<Promotion>(ApiPath.Promotions)).data
}

// TODO: not wired in yet. Intended for store name, SEO defaults, social links, and feature flags.
// Store-wide and rarely changes; 'hours' (like promotions) so it doesn't shorten any route's lifetime.
export async function getStoreConfig() {
    'use cache'
    cacheLife('hours')
    return (await apiFetch<StoreConfig>(ApiPath.StoreConfig)).data
}

// Used by the hourly cron at app/api/health. Not cached: a stale health status is meaningless.
export async function getHealth() {
    return (await apiFetch<Health>(ApiPath.Health)).data
}
