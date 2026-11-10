import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'

import { BundleActivityLine } from '@/app/bundle/[id]/bundle-activity-line'
import { ChatDockSpace } from '@/app/bundle/[id]/chat-dock-space'
import { ItemCardSkeleton, ItemCardSkeletonWithStep } from '@/app/bundle/[id]/item-card-skeleton'
import { MockupLoader } from '@/app/bundle/[id]/mockup-loader'
import { RememberBundle } from '@/app/bundle/[id]/remember-bundle'
import { CheckoutButton } from '@/app/bundle/[id]/checkout-button'
import { NavLink } from '@/components/nav-link'
import { getBundle, getItems, getMockups } from '@/lib/bundle'
import { BundleStatus, type BundleItem, type BundleProduct, type Mockup } from '@/lib/bundle-schema'
import { formatMoney } from '@/lib/format'
import { cacheLife } from 'next/cache'

export const metadata: Metadata = {
    title: 'Your bundle',
    description: 'A custom swag bundle built with Eve on Versell.',
    robots: { index: false },
}

// Mirrors the grid (1 col, 2 at sm, 3 at xl) beside the docked chat.
const itemSizes = '(min-width: 1280px) 25vw, (min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw'

// Everything outside the Suspense boundary is the static shell, which useBundleFlow prefetches while the concept
// waits for approval, so approving opens this page at once.
// ChatDockSpace makes room for the docked chat from the first paint, so the chat docking shifts nothing. The page fades
// in as the chat grows into its dock.
export default function BundlePage({ params }: PageProps<'/bundle/[id]'>) {

    return (
        <section className="transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none">
            <ChatDockSpace />
            <NavLink href="/" className="relative font-sans text-sm font-semibold hover:underline">
                ← Back to store
            </NavLink>
            {/* What isn't production-ready yet. In the shell, so it's prerendered and shifts nothing. */}
            <p className="mt-4 rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-950" role="note">
                <strong className="font-sans">This feature is in beta.</strong> Your bundles are tied to this browser,
                so clearing your storage removes them from Your bundles. Anyone with the link can see and change this
                bundle.
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl">Your bundle</h1>
            <BundleActivityLine />
            <Suspense fallback={<BundleSkeleton />}>
                <BundleDetails params={params} />
            </Suspense>
        </section>
    )
}

// Not cached: finders save products while the customer watches. useBundleFlow refreshes as each one saves.
async function BundleDetails({ params }: Pick<PageProps<'/bundle/[id]'>, 'params'>) {
    const { id } = await params
    const [bundle, items, mockups] = await Promise.all([getBundle(id), getItems(id), getMockups(id)])

    // The page opens once the concept is approved, which saves the bundle, so this is an unknown or expired link.
    if (!bundle) {
        return <p className="surface-card mt-6 p-6 text-foreground/70">There’s no bundle here. Ask Eve to build one.</p>
    }

    const foundItems = []
    for (const slot of bundle.slots) {
        const item = items[slot.key]
        if (item) {
            foundItems.push(item)
        }
    }
    const isComplete = foundItems.length === bundle.slots.length
    const total = isComplete ? formatTotal(foundItems) : null
    const isApproved = bundle.status === BundleStatus.Approved

    return (
        <>
            <RememberBundle bundleId={id} />
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                    <p className="text-lg text-foreground/70">{bundle.concept}</p>
                    {/* Holds its line while products are still coming, so the total appearing shifts nothing. */}
                    <p className="mt-2 h-6 font-sans font-bold tracking-tight">{total ? `${total} per person` : null}</p>
                </div>
                {isApproved ? (
                    <div className="flex items-center gap-4">
                        <p className="font-sans font-bold">Approved</p>
                        <CheckoutButton />
                    </div>
                ) : null}
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {bundle.slots.map((slot) => {
                    const item = items[slot.key]
                    if (!item) {
                        return <ItemCardSkeletonWithStep key={slot.key} bundleId={id} slotKey={slot.key} label={slot.label} />
                    }
                    return <BundleItemCard key={slot.key} bundleId={id} item={item} mockup={mockups[slot.key]} />
                })}
            </ul>
        </>
    )
}

// Text boxes have fixed line counts, matching ItemCardSkeleton, so a product replacing its skeleton shifts nothing.
// It fades in when it replaces the skeleton.
function BundleItemCard({ bundleId, item, mockup }: { bundleId: string; item: BundleItem; mockup: Mockup | undefined }) {
    const { product, alternate, reason } = item

    return (
        <li className="surface-card p-2.5 transition-opacity duration-500 starting:opacity-0 motion-reduce:transition-none">
            <div className="relative aspect-square overflow-hidden rounded-[17px] bg-background">
                <Image
                    src={product.imageUrl}
                    // Hidden under the mockup once there is one, so only the mockup is announced.
                    alt={mockup ? '' : product.title}
                    fill
                    sizes={itemSizes}
                    // A product photo is whatever URL the finder saved, often a Shop merchant's CDN, and an unlisted host
                    // would crash the page. Mockups are on our allowlisted Blob host (putMockupImage).
                    unoptimized
                    className="object-cover"
                />
                {mockup ? (
                    <>
                        {/* Covers the product photo. Keyed by URL, so each new version fades in over the last. */}
                        <Image
                            key={mockup.mockupUrl}
                            src={mockup.mockupUrl}
                            alt={`Mockup of ${product.title}`}
                            fill
                            sizes={itemSizes}
                            className="object-cover transition-opacity duration-500 starting:opacity-0 motion-reduce:transition-none"
                        />
                        <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-1 font-sans text-xs font-bold">
                            Mockup
                        </span>
                    </>
                ) : null}
                <MockupLoader bundleId={bundleId} itemKey={item.key} hasMockup={Boolean(mockup)} />
            </div>
            <div className="px-2 pt-4 pb-2">
                <h2 className="line-clamp-2 h-[2lh] text-lg leading-tight" title={product.title}>
                    {product.title}
                </h2>
                <p className="mt-1 h-[1lh] truncate font-sans text-sm tracking-tight text-foreground/60">
                    {formatMoney(product.priceCents, product.currency)}
                    {product.seller ? ` · ${product.seller}` : ''}
                </p>
                <p className="mt-3 line-clamp-3 h-[3lh] text-sm text-foreground/70">{reason}</p>
                <p className="mt-2 h-[1lh] truncate text-sm text-foreground/60">
                    {alternate ? `Alternate: ${alternate.title}, ${formatMoney(alternate.priceCents, alternate.currency)}` : null}
                </p>
                <p className="mt-3 h-[1lh] text-sm">
                    <ProductLink product={product} />
                </p>
            </div>
        </li>
    )
}

// Store products stay in the store; Shop products open the merchant's page.
function ProductLink({ product }: { product: BundleProduct }) {
    const className = 'relative font-sans font-semibold underline'
    if (product.productUrl.startsWith('/')) {
        return (
            <NavLink href={product.productUrl} className={className}>
                View product
            </NavLink>
        )
    }
    return (
        <a href={product.productUrl} target="_blank" rel="noreferrer" className={className}>
            View on {product.seller ?? 'Shop'}
        </a>
    )
}

// Only when every item shares a currency; Shop merchants can price in others.
function formatTotal(items: BundleItem[]) {
    const currency = items[0]?.product.currency
    if (!currency) {
        return null
    }
    let totalCents = 0
    for (const { product } of items) {
        if (product.currency !== currency) {
            return null
        }
        totalCents += product.priceCents
    }
    return formatMoney(totalCents, currency)
}

// The header and grid of BundleDetails, before the bundle's slots are known.
function BundleSkeleton() {
    return (
        <div aria-hidden>
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="w-full max-w-2xl">
                    <div className="h-[1lh] w-2/3 animate-pulse rounded bg-foreground/5 text-lg" />
                    <div className="mt-2 h-6" />
                </div>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                <ItemCardSkeleton />
                <ItemCardSkeleton />
                <ItemCardSkeleton />
            </ul>
        </div>
    )
}
