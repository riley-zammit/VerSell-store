import { Redis } from '@upstash/redis'
import { put } from '@vercel/blob'
import { z } from 'zod'

// Bundles: the record lives in Redis, images live in Blob.
// Shared by the eve agent's tools and the /bundle page, so no `server-only` or Next imports.

export enum ItemSource { Store = 'store', Shop = 'shop' }
export enum BundleStatus { Draft = 'draft', Confirmed = 'confirmed' }

export const BundleProduct = z.object({
    title: z.string().min(1),
    priceCents: z.number().int().nonnegative().describe('Price in minor units, e.g. 2999 for $29.99'),
    currency: z.string().length(3).describe('ISO 4217 code, e.g. USD'),
    imageUrl: z.url(),
    productUrl: z.string().min(1).describe('Full URL for Shop products; /products/<slug> for store products'),
    seller: z.string().optional(),
    productId: z.string().min(1),
    variantId: z.string().optional(),
})
export type BundleProduct = z.infer<typeof BundleProduct>

export const BundleItem = z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/).describe('Short stable slug for this slot, e.g. "water-bottle"'),
    source: z.enum(ItemSource),
    product: BundleProduct,
    alternate: BundleProduct.optional().describe("Jev's runner-up for this slot, if there was one"),
    reason: z.string().min(1).describe('One sentence on why it fits the brief'),
})
export type BundleItem = z.infer<typeof BundleItem>

export const Bundle = z.object({
    id: z.string(),
    status: z.enum(BundleStatus),
    concept: z.string(),
    brief: z.string(),
    items: z.array(BundleItem),
    createdAt: z.string(),
    updatedAt: z.string(),
    confirmedAt: z.string().optional(),
})
export type Bundle = z.infer<typeof Bundle>

export const Mockup = z.object({
    mockupUrl: z.url(),
    creativeUrl: z.url(),
    updatedAt: z.string(),
})
export type Mockup = z.infer<typeof Mockup>

// Drafts clean themselves up. confirmBundle() removes the expiry, so confirmed bundles stay.
const DRAFT_TTL_SECONDS = 7 * 24 * 60 * 60

const bundleKey = (id: string) => `bundle:${id}`
const mockupsKey = (id: string) => `bundle:${id}:mockups`

// Created on first use so importing this file never needs the Redis env vars.
// The Upstash connection uses the REDIS_STORAGE_ prefix, so Redis.fromEnv() wouldn't find it.
let client: Redis | undefined
const redis = () =>
    (client ??= new Redis({
        url: process.env.REDIS_STORAGE_KV_REST_API_URL!,
        token: process.env.REDIS_STORAGE_KV_REST_API_TOKEN!,
    }))

export async function getBundle(id: string) {
    const value = await redis().get(bundleKey(id))
    return value ? Bundle.parse(value) : null
}

/** Latest mockup per item key. */
export async function getMockups(id: string) {
    const values = (await redis().hgetall<Record<string, unknown>>(mockupsKey(id))) ?? {}
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Mockup.parse(value)]))
}

/** Saves the whole bundle as a draft. Any change after confirming needs a new confirmation. */
export async function saveDraft(id: string, input: Pick<Bundle, 'concept' | 'brief' | 'items'>) {
    const now = new Date().toISOString()
    const existing = await getBundle(id)
    const bundle: Bundle = {
        id,
        status: BundleStatus.Draft,
        ...input,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
    }
    await redis()
        .multi()
        .set(bundleKey(id), bundle, { ex: DRAFT_TTL_SECONDS })
        .expire(mockupsKey(id), DRAFT_TTL_SECONDS)
        .exec()
    return bundle
}

export async function confirmBundle(id: string) {
    const bundle = await getBundle(id)
    if (!bundle) return null
    const confirmed: Bundle = { ...bundle, status: BundleStatus.Confirmed, confirmedAt: new Date().toISOString() }
    await redis()
        .multi()
        .set(bundleKey(id), confirmed) // no `ex`: confirmed bundles don't expire
        .persist(mockupsKey(id))
        .exec()
    return confirmed
}

/**
 * Points an item at its newest mockup. One hash field per item, so parallel customizers
 * never overwrite each other. The hash expires with the bundle (or not, once confirmed).
 */
export async function setMockup(id: string, itemKey: string, mockup: Omit<Mockup, 'updatedAt'>) {
    const value: Mockup = { ...mockup, updatedAt: new Date().toISOString() }
    const ttl = await redis().ttl(bundleKey(id)) // -1: confirmed (no expiry), -2: no bundle yet
    const tx = redis().multi().hset(mockupsKey(id), { [itemKey]: value })
    if (ttl > 0) tx.expire(mockupsKey(id), ttl)
    else if (ttl === -2) tx.expire(mockupsKey(id), DRAFT_TTL_SECONDS)
    await tx.exec()
    return value
}

const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/**
 * Stores a mockup image. Every version gets a new path (random suffix): overwriting a public
 * blob can serve a stale copy from the CDN, and parallel customizers never touch the same file.
 */
export async function putMockupImage(id: string, itemKey: string, bytes: Uint8Array, mediaType: string) {
    const extension = extensions[mediaType]
    if (!extension) throw new Error(`Unsupported image type ${mediaType}. Use PNG, JPEG, or WebP.`)
    const blob = await put(`bundles/${id}/mockups/${itemKey}/mockup.${extension}`, Buffer.from(bytes), {
        // OIDC-backed store: the SDK pairs this id with the Vercel OIDC token, so there's no
        // read-write token. The connection uses the PUBLIC_ prefix, so pass the id explicitly.
        storeId: process.env.PUBLIC_BLOB_STORE_ID,
        access: 'public',
        addRandomSuffix: true,
        contentType: mediaType,
    })
    return blob.url
}
