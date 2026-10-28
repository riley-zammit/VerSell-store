import { Suspense } from "react";
import { GridSkeleton, ProductGrid } from "@/components/product/product-grid";

// /collection?category=mugs, ?featured=true, or bare for all products. Unknown categories show the API's error.
export default function CollectionPage({ searchParams }: PageProps<"/collection">) {
  return (
    <section>
      <Suspense fallback={<GridSkeleton />}>
        {searchParams.then(({ category, featured }) => (
          <h1 className="mb-8 text-4xl capitalize md:text-5xl">
            {typeof category === "string" ? category.replaceAll("-", " ") : featured ? "Featured" : "All products"}
          </h1>
        ))}
        <ProductGrid searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
