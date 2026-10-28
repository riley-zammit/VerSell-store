import { getPromotion } from '@/lib/api'

// Fixed single-line height on every breakpoint → zero CLS.
const barClass = 'flex h-10 items-center justify-center gap-x-3 overflow-hidden whitespace-nowrap bg-foreground px-4 text-sm text-background'

// getPromotion is cached, so this renders into the static shell: no Suspense or skeleton needed.
export async function PromoBanner() {
    const promo = await getPromotion()
    return (
        <aside className={barClass}>
            <strong className="truncate">{promo.title}</strong>
            <span className="min-w-0 truncate opacity-80">{promo.description}</span>
            <code className="shrink-0 rounded bg-background/15 px-2 py-0.5 font-semibold">{promo.code}</code>
        </aside>
    )
}
