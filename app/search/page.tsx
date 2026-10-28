import type { Metadata } from "next";
import { Suspense } from "react";
import { gridClassName } from "@/components/product/product-grid";
import { ProductCard, ProductCardSkeleton } from "@/components/product/product-card";
import { SearchFields, SearchForm } from "@/components/search-form";
import { getCategories, SEARCH_LIMIT, searchProducts } from "@/lib/api";

export const metadata: Metadata = { title: "Search", openGraph: { title: "Search" } };

// Only cached data is awaited here; searchParams are read inside the results hole.
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const categories = await getCategories();
  return (
    <div className="group">
      <h1 className="mb-8 text-4xl md:text-5xl">Search</h1>
      {/* useSearchParams suspends on a hard load; the fallback is honestly disabled, since it isn't hydrated yet */}
      <Suspense fallback={<SearchFields categories={categories} disabled />}>
        <SearchForm categories={categories} />
      </Suspense>
      <div className="mt-8 transition-opacity group-has-[[data-pending]]:opacity-50">
        {/* <ul> stays outside Suspense so the grid never reflows */}
        <ul className={gridClassName}>
          <Suspense fallback={<ResultsSkeleton />}>
            <SearchResults searchParams={searchParams} />
          </Suspense>
        </ul>
      </div>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const Heading = ({ children }: { children: React.ReactNode }) => (
  <li className="col-span-full h-6 truncate text-sm text-foreground/60">{children}</li>
);

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const params = await searchParams;
  const q = first(params.q).trim();
  const category = first(params.category);
  const results = await searchProducts(q, category).catch(() => null); // request-time: safe to catch here

  if (!results) return <Heading>Search is unavailable right now. Please try again.</Heading>;
  if (!results.length) return <Heading>No products match{q ? ` “${q}”` : " this filter"}.</Heading>;
  return (
    <>
      <Heading>{q ? `Results for “${q}”` : category ? "Products" : "Popular products"}</Heading>
      {results.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < 3 /* first row on desktop */} />
      ))}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <Heading>{null}</Heading>
      {Array.from({ length: SEARCH_LIMIT }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}
