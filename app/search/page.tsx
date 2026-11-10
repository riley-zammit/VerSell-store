import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { gridClassName, Pagination, pageSchema } from "@/components/product/product-grid";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { SearchForm } from "@/components/search-form";
import { SEARCH_LIMIT, searchProducts } from "@/lib/api";
import { cacheLife } from "next/cache";


export const metadata: Metadata = { title: "Search", openGraph: { title: "Search" } };

// searchParams are read inside the results hole, so the shell prerenders.
//alternatively we can suspend the whole page to clean up the component tree and pass plain query and page string props
export default async function Page({ searchParams }: PageProps<"/search">) {

    return (
        <div>
            <h1 className="mb-8 text-4xl md:text-5xl">Search</h1>
            {/* Prerenders up to search */}
            <Suspense fallback={<SearchFormSkeleton />}>
                <SearchForm />
            </Suspense>
            <div className="mt-8">
                <Suspense fallback={<ResultsSkeleton />}>
                    <SearchResults searchParams={searchParams} />
                </Suspense>
            </div>
        </div>
    );
}

// Fixed height so the skeleton's empty heading takes the same space as the real one.
const Heading = ({ children }: { children: React.ReactNode }) => (
    <p className="mb-3 h-6 truncate text-sm text-foreground/60">{children}</p>
);

// Bad or missing params fall back to defaults instead of erroring.
const searchParamsSchema = z.object({
    query: z.string().trim().catch(""),
    page: pageSchema,
});

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
    const { query, page } = searchParamsSchema.parse(await searchParams);
    const pageHref = (n: number) => `?${new URLSearchParams({ query, page: String(n) })}`;

    const result = await searchProducts(query, page).catch(() => null); // uncached, so catching can't pin the error

    if (!result) return <Heading>Search is unavailable right now. Please try again.</Heading>;
    if (!result.products.length) return <Heading>No products match{query && ` “${query}”`}.</Heading>;
    return (
        <>
            <Heading>{query ? `Results for “${query}”` : "All products"}</Heading>
            <ul className={gridClassName}>
                {result.products.map((p, i) => (
                    <ProductCard key={p.id} product={p} eager={i < 3 /* first row on desktop */} />
                ))}
            </ul>
            <Pagination page={page} pagination={result.pagination} pageHref={pageHref} />
        </>
    );
}

// h-10 matches the input: 9px padding + 20px text-sm line + 1px borders
function SearchFormSkeleton() {
    return <div aria-hidden className="h-10 w-full animate-pulse rounded-md bg-gray-200" />;
}

function ResultsSkeleton() {
    return (
        <>
            <Heading>{null}</Heading>
            <ul className={gridClassName}>
                {Array.from({ length: SEARCH_LIMIT }, (_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </ul>
        </>
    );
}
