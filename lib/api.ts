import 'server-only'
import { cacheLife } from 'next/cache'

import type { ApiResponse, Product, Promotion } from './types'

export enum ApiHeader { Bypass = 'x-vercel-protection-bypass' }
export enum Category { Bottles = 'bottles', Cups = 'cups', Mugs = 'mugs' } 
enum ApiPath { Products = '/products', Promotions = '/promotions' }
export const SEARCH_LIMIT = 9
export const GRID_LIMIT = 9

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

/** Returns { data, meta }. Throws ApiError on failure. */
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
    return body
}

/** `query` is a /products query string, e.g. 'category=mugs' or 'featured=true'; '' is all products. */
export async function getCollection(query: string, limit: number, page = 1) {
    'use cache'
    cacheLife('catalog')
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

export async function getProduct(slug: string) {
    'use cache'
    cacheLife('catalog')
    return apiFetch<Product>(`${ApiPath.Products}/${encodeURIComponent(slug)}`).then((r) => r.data, (e) => {
        if (e instanceof ApiError && e.status === 404) return null // definitive → cached → notFound()
        throw e // transient → never cached
    })
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
