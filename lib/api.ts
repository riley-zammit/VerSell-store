import 'server-only'

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
    try {
        const { data, meta } = await apiFetch<Product[]>(`${ApiPath.Products}?${params}`)
        return {
            products: data,
            pagination: meta!.pagination, // list endpoints always send meta
        }
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            return { error: error.message }
        }
        throw error
    }
}

export async function getProductsByCategory(category: Category) {
    const { data } = await apiFetch<Product[]>(`${ApiPath.Products}?category=${category}&limit=6`)
    return data
}

export async function getCategories() {
    const { data } = await apiFetch<CategoryInfo[]>(ApiPath.Categories)
    return data
}

export async function getProduct(slug: string) {
    try {
        const { data } = await apiFetch<Product>(`${ApiPath.Products}/${encodeURIComponent(slug)}`)
        return data
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null // definitive → cached → notFound()
        }
        throw error // transient → never cached
    }
}

export async function getProductStock(id: string) {
    const { data } = await apiFetch<Stock>(`${ApiPath.Products}/${encodeURIComponent(id)}/stock`)
    return data
}

// Searches all products; '' returns everything.
export async function searchProducts(query: string, page = 1) {
    const params = new URLSearchParams({
        limit: String(SEARCH_LIMIT),
        page: String(page),
    })
    if (query) {
        params.set('search', query)
    }
    const { data, meta } = await apiFetch<Product[]>(`${ApiPath.Products}?${params}`)
    return {
        products: data,
        pagination: meta!.pagination, // list endpoints always send meta
    }
}

export async function getPromotion() {
    const { data } = await apiFetch<Promotion>(ApiPath.Promotions)
    return data
}

// TODO: not wired in yet. Intended for store name, SEO defaults, social links, and feature flags.
// Store-wide and rarely changes; 'hours' (like promotions) so it doesn't shorten any route's lifetime.
export async function getStoreConfig() {
    const { data } = await apiFetch<StoreConfig>(ApiPath.StoreConfig)
    return data
}

// Used by the hourly cron at app/api/health. Not cached: a stale health status is meaningless.
export async function getHealth() {
    const { data } = await apiFetch<Health>(ApiPath.Health)
    return data
}
