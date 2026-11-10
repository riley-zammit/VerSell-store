'use client'

import { useFinderSteps } from '@/components/chat/finder-steps'

// A slot still being found: what the slot is, and what its finder is doing. Shows until the finder saves a product.
export function ItemCardSkeletonWithStep({ bundleId, slotKey, label }: { bundleId: string; slotKey: string; label: string }) {
    const finderSteps = useFinderSteps()
    const step = finderSteps.find((finder) => finder.bundleId === bundleId && finder.slotKey === slotKey)?.step
    return <ItemCardSkeleton label={label} step={step ?? 'Waiting for its turn…'} />
}

// Same boxes and line heights as BundleItemCard, so a product taking its place shifts nothing. Without a label it's
// the plain loading card for the Suspense fallback.
export function ItemCardSkeleton({ label, step }: { label?: string; step?: string }) {
    return (
        <li className="surface-card p-2.5" aria-busy>
            <div className="relative aspect-square overflow-hidden rounded-[17px]">
                <div className="absolute inset-0 animate-pulse bg-foreground/5" />
                {step ? (
                    <p className="absolute inset-x-4 bottom-4 flex items-center gap-2 font-sans text-sm text-foreground/60" role="status">
                        <span aria-hidden className="block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span className="truncate">{step}</span>
                    </p>
                ) : null}
            </div>
            <div className="px-2 pt-4 pb-2">
                {label ? (
                    <p className="line-clamp-2 h-[2lh] font-sans text-lg leading-tight font-bold tracking-tight text-foreground/40">{label}</p>
                ) : (
                    <div className="h-[2lh] text-lg leading-tight">
                        <div className="h-[1lh] w-2/3 animate-pulse rounded bg-foreground/5" />
                    </div>
                )}
                <div className="mt-1 h-[1lh] w-24 animate-pulse rounded bg-foreground/5 text-sm" />
                <div className="mt-3 h-[3lh] space-y-1.5 text-sm">
                    <div className="h-3 animate-pulse rounded bg-foreground/5" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-foreground/5" />
                </div>
                <div className="mt-2 h-[1lh] text-sm" />
                <div className="mt-3 h-[1lh] w-28 animate-pulse rounded bg-foreground/5 text-sm" />
            </div>
        </li>
    )
}
