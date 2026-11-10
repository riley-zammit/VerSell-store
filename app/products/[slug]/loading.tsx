// //needed as a fallback in case we don't reliably call prefetch PDP URLs (i.e. only the actual static shell is rendered in that case, 
// not the whole static page)
export default function Loading() {
    return (
        <article aria-hidden className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="surface-card p-2.5">
                <div className="aspect-square animate-pulse rounded-[17px] bg-background" />
            </div>
            <div className="md:pt-6">
                {/* Matches the h1's line height (text-4xl / md:text-5xl at the global 0.95 leading). */}
                <div className="h-[1lh] w-3/4 animate-pulse rounded bg-foreground/10 text-4xl leading-[0.95] md:text-5xl" />
                <div className="mt-4 h-[1lh] w-24 animate-pulse rounded bg-foreground/10 text-2xl md:text-3xl" />
                <div className="mt-6 h-[3lh] space-y-2 text-lg">
                    <div className="h-4 animate-pulse rounded bg-foreground/10" />
                    <div className="h-4 animate-pulse rounded bg-foreground/10" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-foreground/10" />
                </div>
                {/* The add-to-cart form: quantity input and button, both h-12. */}
                <div className="mt-8 flex gap-3">
                    <div className="h-12 w-24 animate-pulse rounded-full bg-foreground/10" />
                    <div className="h-12 w-36 animate-pulse rounded-full bg-foreground/10" />
                </div>
                {/* The stock line: the form's gap-3, then its h-5 row. */}
                <div className="mt-3 h-5 w-20 animate-pulse rounded bg-foreground/10" />
            </div>
        </article>
    )
}
