import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product/product-card";
import { ProductGrid } from "@/components/product/product-grid";
import { getFeaturedProducts } from "@/lib/api";
import { SITE_NAME } from "@/lib/constants";

const title = `${SITE_NAME} | Official Vercel Swag`;
export const metadata: Metadata = { title: { absolute: title }, openGraph: { title } };

// No Suspense: nothing on this page is request-time.
export default async function HomePage() {
  const products = await getFeaturedProducts();
  return (
    <>
      <Hero />
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">Featured</h2>
        <ProductGrid>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductGrid>
      </section>
    </>
  );
}
