'use server'

import { cookies } from 'next/headers'

import { getProduct } from '@/lib/api'
import { getBundle, getItems, rememberBundle } from '@/lib/bundle'
import { BundleId, ItemSource } from '@/lib/bundle-schema'
import type { Product } from '@/lib/types'
import { isVisitorId, VISITOR_COOKIE } from '@/lib/visitor'

// Adds a bundle to the visitor's list on /bundles when its page opens: one they started, or a link someone shared.
export async function rememberOpenedBundle(bundleId: string) {
    const jar = await cookies()
    const visitorId = jar.get(VISITOR_COOKIE)?.value
    if (!isVisitorId(visitorId) || !BundleId.safeParse(bundleId).success) {
        return
    }
    await rememberBundle(visitorId, bundleId)
}

// When the customer approves a bundle, the browser adds its VerSell products to its own cart: the cart is a cookie,
// so the agent can't. The cart takes store products, so this looks each one up from the bundle's saved item.
export async function getStoreProducts(bundleId: string) {
    const [bundle, items] = await Promise.all([getBundle(bundleId), getItems(bundleId)])
    if (!bundle) {
        return []
    }

    const lookups: Promise<Product | null>[] = []
    for (const slot of bundle.slots) {
        const item = items[slot.key]
        if (item?.source !== ItemSource.Store) {
            continue
        }
        // Store items link to /products/<slug> (search_store_products).
        const slug = item.product.productUrl.split('/').pop() ?? ''
        lookups.push(getProduct(slug))
    }
    const products = await Promise.all(lookups)
    return products.filter((product) => product !== null)
}
