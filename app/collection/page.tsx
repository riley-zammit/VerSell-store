import { ProductGrid } from "@/components/product/product-grid";

// /collection?category=mugs, ?featured=true, or bare for all products. Unknown categories show the API's error.
// Everything here reads the URL, so loading.tsx is the boundary.
export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
    const { category, featured } = await searchParams;
    return (
        <section>
            <h1 className="mb-8 text-4xl capitalize md:text-5xl">
                {typeof category === "string" ? category.replaceAll("-", " ") : featured ? "Featured" : "All products"}
            </h1>
            <ProductGrid searchParams={searchParams} />
        </section>
    );
}
