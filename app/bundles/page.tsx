import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { Suspense } from 'react'

import { NavLink } from '@/components/nav-link'
import { BundleStatus, getBundle, getItems, getMockups, getRememberedBundleIds } from '@/lib/bundle'
import { isVisitorId, VISITOR_COOKIE } from '@/lib/visitor'

export const metadata: Metadata = {
    title: 'Your bundles',
    robots: { index: false },
}

const MAX_THUMBNAILS = 4
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export default function BundlesPage() {
    return (
        <>
            <h1 className="text-4xl md:text-5xl">Your bundles</h1>
            <Suspense fallback={<BundleListSkeleton />}>
                <BundleList />
            </Suspense>
        </>
    )
}

// The bundles this visitor has opened. An expired draft is gone from Redis, so it drops off the list.
async function BundleList() {
    const jar = await cookies()
    const visitorId = jar.get(VISITOR_COOKIE)?.value
    const ids = isVisitorId(visitorId) ? await getRememberedBundleIds(visitorId) : []
    const lookups = ids.map(async (id) => {
        const [bundle, items, mockups] = await Promise.all([getBundle(id), getItems(id), getMockups(id)])
        return bundle ? { bundle, items, mockups } : null
    })
    const results = await Promise.all(lookups)
    const savedBundles = results.filter((result) => result !== null)

    if (savedBundles.length === 0) {
        return <p className="surface-card mt-8 p-6 text-foreground/70">No bundles yet. Ask Eve to build one.</p>
    }

    return (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedBundles.map(({ bundle, items, mockups }) => {
                const thumbnailSlots = bundle.slots.slice(0, MAX_THUMBNAILS)
                const isApproved = bundle.status === BundleStatus.Approved
                const changedAt = date.format(new Date(bundle.approvedAt ?? bundle.updatedAt))
                return (
                    <li key={bundle.id}>
                        <NavLink href={`/bundle/${encodeURIComponent(bundle.id)}`} className="surface-card relative block p-2.5 hover:shadow-lg">
                            <div className="grid grid-cols-4 gap-1.5">
                                {thumbnailSlots.map((slot) => {
                                    const mockup = mockups[slot.key]
                                    // A slot still being found has no image yet.
                                    const imageUrl = mockup?.mockupUrl ?? items[slot.key]?.product.imageUrl
                                    return (
                                        <div key={slot.key} className="relative aspect-square overflow-hidden rounded-[10px] bg-foreground/5">
                                            {imageUrl ? (
                                                <Image
                                                    src={imageUrl}
                                                    alt=""
                                                    fill
                                                    sizes="80px"
                                                    // Only mockups are surely on an allowlisted host (see BundleItemCard).
                                                    unoptimized={!mockup}
                                                    className="object-cover"
                                                />
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="px-2 pt-4 pb-2">
                                <h2 className="line-clamp-2 h-[2lh] text-lg leading-tight">{bundle.concept}</h2>
                                <p className="mt-2 font-sans text-sm text-foreground/60">
                                    {isApproved ? 'Approved' : 'Draft'} · {bundle.slots.length} products · {changedAt}
                                </p>
                            </div>
                        </NavLink>
                    </li>
                )
            })}
        </ul>
    )
}

// Same boxes as a bundle card, so the list replacing it shifts nothing.
function BundleListSkeleton() {
    const placeholderCards = [0, 1, 2]
    const placeholderThumbnails = [0, 1, 2, 3]
    return (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {placeholderCards.map((card) => (
                <li key={card} className="surface-card p-2.5">
                    <div className="grid grid-cols-4 gap-1.5">
                        {placeholderThumbnails.map((thumbnail) => (
                            <div key={thumbnail} className="aspect-square animate-pulse rounded-[10px] bg-foreground/5" />
                        ))}
                    </div>
                    <div className="px-2 pt-4 pb-2">
                        <div className="h-[2lh] text-lg leading-tight">
                            <div className="h-[1lh] w-2/3 animate-pulse rounded bg-foreground/5" />
                        </div>
                        <div className="mt-2 h-[1lh] w-40 animate-pulse rounded bg-foreground/5 text-sm" />
                    </div>
                </li>
            ))}
        </ul>
    )
}
