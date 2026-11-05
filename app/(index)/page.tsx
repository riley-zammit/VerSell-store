import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/app/(index)/hero";
import { FeaturedProduct } from "@/components/product/featured-product";
import { ProductRow, RowSkeleton } from "@/components/product/product-row";

const title = "Versell | Official Vercel Swag";
export const metadata: Metadata = { title: { absolute: title }, openGraph: { title } };

export default function HomePage() {
    return (
        <>
            <Hero />
            <section className="mt-16">
                <h2 className="mb-8 text-4xl md:text-5xl">Featured</h2>
                {/*TODO: Confirm prerender */}
                <ProductRow query="featured=true" href="/collection/featured" slots={3} />
            </section>
            <section className="mt-16">
                <h2 className="mb-8 text-4xl md:text-5xl">Mugs for the Holidays</h2>
                <ProductRow query="category=mugs" href="/collection/mugs" slots={3} />
            </section>
            <section className="mt-16">
                <h2 className="mb-8 text-4xl md:text-5xl">Staff Pick</h2> 
                <FeaturedProduct slug="black-pullover-hoodie" />
            </section>
        </>
    );
}
