import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton, ProductGrid } from "@/components/product/product-grid";
import { getCategories } from "@/lib/api";

// "all" and "featured" aren't API categories, so they need their own titles. ProductGrid maps them to their filters.
const specialTitles = new Map([
    ["all", "All products"],
    ["featured", "Featured"],
]);

// Every collection prerenders with its heading in the shell. Categories added after the build render on first request.
export async function generateStaticParams() {
    const categories = await getCategories();
    return [...specialTitles.keys(), ...categories.map((c) => c.slug)].map((slug) => ({ slug }));
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collection/[slug]">) {
    const { slug } = await params;
    const title = specialTitles.get(slug) ?? (await getCategories()).find((c) => c.slug === slug)?.name;
    if (!title) notFound();

    return (
        <section>
            <h1 className="mb-8 text-4xl capitalize md:text-5xl">{title}</h1>
            {/* ?page= is request data, so only the grid waits on it and the heading stays in the static shell */}
            <Suspense fallback={<GridSkeleton />}>
                <ProductGrid category={slug === "all" ? undefined : slug} searchParams={searchParams} />
            </Suspense>
        </section>
    );
}
