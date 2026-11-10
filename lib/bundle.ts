import { Redis } from '@upstash/redis'
import { put } from '@vercel/blob'

import { Bundle, BundleItem, BundleStatus, Mockup, type BundleSlot } from './bundle-schema'
import { visitorCookieOptions } from './visitor'

// Bundles: the record lives in Redis, images live in Blob.
// Shared by the eve agent's tools and the /bundle page, so no `server-only` or Next imports.
//
// Each bundle has its own random id, in its URL. Bundles are public: anyone with the link can see one, and ask Eve
// to change it. A visitor's list on /bundles is every bundle they've opened.
//
// A bundle is a list of slots from the approved concept. Each slot's product is saved separately, by the finder
// working on that slot, so products show up one by one and parallel finders never overwrite each other.

// Drafts clean themselves up. approveBundle() removes the expiry, so approved bundles stay.
const DRAFT_TTL_SECONDS = 7 * 24 * 60 * 60

const bundleKey = (id: string) => `bundle:${id}`
const itemsKey = (id: string) => `bundle:${id}:items`
const mockupsKey = (id: string) => `bundle:${id}:mockups`
const visitorBundlesKey = (visitorId: string) => `visitor:${visitorId}:bundles`

const MAX_REMEMBERED_BUNDLES = 50

// Created on first use so importing this file never needs the Redis env vars.
// The Upstash connection uses the REDIS_STORAGE_ prefix, so Redis.fromEnv() wouldn't find it.
let client: Redis | undefined
function redis() {
    if (!client) {
        client = new Redis({
            url: process.env.REDIS_STORAGE_KV_REST_API_URL!,
            token: process.env.REDIS_STORAGE_KV_REST_API_TOKEN!,
        })
    }
    return client
}

export async function getBundle(id: string) {
    const value = await redis().get(bundleKey(id))
    // Bundles saved before slots existed don't parse. Like an expired draft, they're gone: the page says there's no
    // bundle, and the concierge starts a new one.
    const parsed = Bundle.safeParse(value)
    return parsed.success ? parsed.data : null
}

/** Saved product per slot key. A slot with no entry is still being found. */
export async function getItems(id: string) {
    const stored = await redis().hgetall<Record<string, unknown>>(itemsKey(id))
    const items: Record<string, BundleItem> = {}
    for (const [slotKey, value] of Object.entries(stored ?? {})) {
        items[slotKey] = BundleItem.parse(value)
    }
    return items
}

/** Latest mockup per item key. */
export async function getMockups(id: string) {
    const stored = await redis().hgetall<Record<string, unknown>>(mockupsKey(id))
    const mockups: Record<string, Mockup> = {}
    for (const [itemKey, value] of Object.entries(stored ?? {})) {
        mockups[itemKey] = Mockup.parse(value)
    }
    return mockups
}

/** Starts a new bundle from an approved concept, with every slot still empty. Earlier bundles stay as they are. */
export async function startBundle(input: Pick<Bundle, 'concept' | 'brief' | 'slots'>) {
    const now = new Date().toISOString()
    const bundle: Bundle = {
        id: crypto.randomUUID(),
        status: BundleStatus.Draft,
        ...input,
        createdAt: now,
        updatedAt: now,
    }
    await redis().set(bundleKey(bundle.id), bundle, { ex: DRAFT_TTL_SECONDS })
    return bundle
}

/** Puts a bundle at the top of the visitor's list, keeping the newest 50. The list lasts as long as their cookie. */
export async function rememberBundle(visitorId: string, bundleId: string) {
    const key = visitorBundlesKey(visitorId)
    await redis()
        .multi()
        .zadd(key, {
            score: Date.now(),
            member: bundleId,
        })
        .zremrangebyrank(key, 0, -(MAX_REMEMBERED_BUNDLES + 1))
        .expire(key, visitorCookieOptions.maxAge)
        .exec()
}

/** The visitor's bundles, newest first. Expired drafts stay listed until trimmed; getBundle returns null for them. */
export async function getRememberedBundleIds(visitorId: string) {
    return redis().zrange<string[]>(visitorBundlesKey(visitorId), 0, -1, { rev: true })
}

/**
 * Saves one slot's product. Only the hash field changes, so finders saving at the same time don't collide.
 * A new product drops the slot's mockup, which showed the old one. Returns an error for the model to read.
 */
export async function saveItem(id: string, item: BundleItem) {
    const bundle = await getBundle(id)
    if (!bundle) {
        return { error: 'There is no bundle yet. The concept has to be approved first.' }
    }
    const slotKeys = bundle.slots.map((slot) => slot.key)
    if (!slotKeys.includes(item.key)) {
        return { error: `No slot "${item.key}". The slots are: ${slotKeys.join(', ')}.` }
    }

    const previous = await redis().hget<unknown>(itemsKey(id), item.key)
    const previousProductId = previous ? BundleItem.parse(previous).product.productId : null
    const tx = redis().multi().hset(itemsKey(id), { [item.key]: item })
    if (previousProductId !== item.product.productId) {
        tx.hdel(mockupsKey(id), item.key)
    }
    if (bundle.status === BundleStatus.Approved) {
        reopen(tx, bundle)
    } else {
        expireAll(tx, id)
    }
    await tx.exec()
    return { saved: true as const }
}

/** Slot changes from the concierge: add or drop slots, or swap a product for its alternate. */
export async function updateBundle(id: string, change: { add: BundleSlot[]; remove: string[]; useAlternate: string[] }) {
    const bundle = await getBundle(id)
    if (!bundle) {
        return { error: 'There is no bundle yet. The concept has to be approved first.' }
    }
    const items = await getItems(id)

    const keptSlots = bundle.slots.filter((slot) => !change.remove.includes(slot.key))
    for (const slot of change.add) {
        if (keptSlots.some(({ key }) => key === slot.key)) {
            return { error: `There is already a slot "${slot.key}". Pick another key.` }
        }
    }
    for (const key of change.useAlternate) {
        if (!items[key]?.alternate) {
            return { error: `Slot "${key}" has no alternate to swap in.` }
        }
    }

    const slots = [...keptSlots, ...change.add]
    const tx = redis().multi()
    if (change.remove.length > 0) {
        tx.hdel(itemsKey(id), ...change.remove)
        tx.hdel(mockupsKey(id), ...change.remove)
    }
    for (const key of change.useAlternate) {
        const { product, alternate } = items[key]
        const swapped: BundleItem = {
            ...items[key],
            product: alternate!,
            alternate: product,
        }
        tx.hset(itemsKey(id), { [key]: swapped })
        tx.hdel(mockupsKey(id), key)
    }
    reopen(tx, { ...bundle, slots })
    await tx.exec()
    return { slots }
}

/** The customer approved the products: approved bundles don't expire. Every slot needs its product first. */
export async function approveBundle(id: string) {
    const bundle = await getBundle(id)
    if (!bundle) {
        return { error: 'There is no bundle yet.' }
    }
    const items = await getItems(id)
    const emptySlots = bundle.slots.filter((slot) => !items[slot.key])
    if (emptySlots.length > 0) {
        return { error: `These slots have no product yet: ${emptySlots.map((slot) => slot.key).join(', ')}.` }
    }

    const approved: Bundle = {
        ...bundle,
        status: BundleStatus.Approved,
        approvedAt: new Date().toISOString(),
    }
    await redis()
        .multi()
        .set(bundleKey(id), approved) // no `ex`: approved bundles don't expire
        .persist(itemsKey(id))
        .persist(mockupsKey(id))
        .exec()
    return {
        bundle: approved,
        items: bundle.slots.map((slot) => items[slot.key]),
    }
}

type Transaction = ReturnType<Redis['multi']>

// Any change makes the bundle a draft again: it needs a new approval, and it expires like any draft.
function reopen(tx: Transaction, bundle: Bundle) {
    const draft: Bundle = {
        ...bundle,
        status: BundleStatus.Draft,
        approvedAt: undefined,
        updatedAt: new Date().toISOString(),
    }
    tx.set(bundleKey(bundle.id), draft, { ex: DRAFT_TTL_SECONDS })
    expireAll(tx, bundle.id)
}

// A draft's keys expire together, counted from its latest change.
function expireAll(tx: Transaction, id: string) {
    tx.expire(bundleKey(id), DRAFT_TTL_SECONDS)
    tx.expire(itemsKey(id), DRAFT_TTL_SECONDS)
    tx.expire(mockupsKey(id), DRAFT_TTL_SECONDS)
}

/**
 * Points an item at its newest mockup. One hash field per item, so parallel customizers
 * never overwrite each other. The hash expires with the bundle (or not, once confirmed).
 */
export async function setMockup(id: string, itemKey: string, mockup: Omit<Mockup, 'updatedAt'>) {
    const value: Mockup = {
        ...mockup,
        updatedAt: new Date().toISOString(),
    }
    const ttl = await redis().ttl(bundleKey(id)) // -1: approved (no expiry), -2: no bundle yet
    const tx = redis().multi().hset(mockupsKey(id), { [itemKey]: value })
    if (ttl > 0) {
        tx.expire(mockupsKey(id), ttl)
    } else if (ttl === -2) {
        tx.expire(mockupsKey(id), DRAFT_TTL_SECONDS)
    }
    await tx.exec()
    return value
}

const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
}

/** Stores a mockup image (generated or edited). Returns its public URL. */
export const putMockupImage = (id: string, itemKey: string, bytes: Uint8Array, mediaType: string) =>
    putImage(`bundles/${id}/mockups/${itemKey}/mockup`, bytes, mediaType)

/** Stores the customer's uploaded logo or artwork. Returns its public URL. */
export const putCreativeImage = (id: string, bytes: Uint8Array, mediaType: string) =>
    putImage(`bundles/${id}/creative/creative`, bytes, mediaType)

/**
 * Every version gets a new path (random suffix): overwriting a public blob can serve a stale
 * copy from the CDN, and parallel customizers never touch the same file.
 */
async function putImage(pathWithoutExtension: string, bytes: Uint8Array, mediaType: string) {
    const extension = extensions[mediaType]
    if (!extension) {
        throw new Error(`Unsupported image type ${mediaType}. Use PNG, JPEG, or WebP.`)
    }
    const blob = await put(`${pathWithoutExtension}.${extension}`, Buffer.from(bytes), {
        // OIDC-backed store: the SDK pairs this id with the Vercel OIDC token, so there's no
        // read-write token. The connection uses the PUBLIC_ prefix, so pass the id explicitly.
        storeId: process.env.PUBLIC_BLOB_STORE_ID,
        access: 'public',
        addRandomSuffix: true,
        contentType: mediaType,
    })
    return blob.url
}
