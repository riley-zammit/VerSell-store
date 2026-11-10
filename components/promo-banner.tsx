import { getPromotion } from '@/lib/swag-api/catalog'
import { cacheLife } from 'next/cache'

// Wraps on narrow screens. It isn't behind Suspense, so it's in the first HTML and its height can't shift the page.
const barClass = 'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-foreground px-4 py-2 text-center text-sm text-background'

export async function PromoBanner() {
    
    "use cache: remote"
    cacheLife("days");

    const promo = await getPromotion()
    return (
        <aside className={barClass}>
            <strong>{promo.title}</strong>
            <span className="opacity-80">{promo.description}</span>
            <code className="rounded bg-background/15 px-2 py-0.5 font-semibold">{promo.code}</code>
        </aside>
    )
}
