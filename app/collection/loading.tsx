import { GridSkeleton } from "@/components/product/product-grid";

export default function Loading() {
    return (
        <section>
            {/* Matches the h1's line height (text-4xl / md:text-5xl) so the grid doesn't shift */}
            <div aria-hidden className="mb-8 h-10 w-64 animate-pulse rounded bg-foreground/10 md:h-12" />
            <GridSkeleton />
        </section>
    );
}
