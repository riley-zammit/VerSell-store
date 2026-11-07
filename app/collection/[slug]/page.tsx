import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton, pageSchema, ProductGrid } from "@/components/product/product-grid";
import { getCategories } from "@/lib/api";

// "all" and "featured" aren't API categories, so they need their own titles. ProductGrid maps them to their filters.
const specialTitles = new Map([
    ["all", "All products"],
    ["featured", "Featured"],
]);

// Every collection prerenders with its heading in the shell. Categories added after the build render on first request.
export async function generateStaticParams() {
    const categories = await getCategories();
    const categorySlugs = categories.map((category) => category.slug);
    const slugs = [...specialTitles.keys(), ...categorySlugs];
    return slugs.map((slug) => ({ slug }));
}


export default async function CollectionPage({ params, searchParams }: PageProps<"/collection/[slug]">) {
    const { slug } = await params;

    return (
        <section>
            <CollectionTitle slug={slug} />
            <Suspense fallback={<GridSkeleton />}>
                <PagedGrid category={slug === "all" ? undefined : slug} searchParams={searchParams} />
            </Suspense>
        </section>
    );
}

async function CollectionTitle({ slug }: { slug: string }) {
    //map featured/all products to the category pattern
    const categories = await getCategories();
    const category = categories.find((category) => category.slug === slug);
    const title = specialTitles.get(slug) ?? category?.name;
    if (!title) {
        notFound();
    }
    return <h1 className="mb-8 text-4xl capitalize md:text-5xl">{title}</h1>;
}

// ?page= is request data so it needs to be at request time otherwise the whole page becomes dynamic. Keep ProductGrid pure and static so we can cache it easily
async function PagedGrid({ category, searchParams }: { category?: string; searchParams: PageProps<"/collection/[slug]">["searchParams"] }) {
    const { page: pageParam } = await searchParams;
    const page = pageSchema.parse(pageParam);
    return <ProductGrid category={category} page={page} />;
}
