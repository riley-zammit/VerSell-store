import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/app/(index)/hero";
import { ProductRow, RowSkeleton } from "@/components/product/product-row";

const title = "Versell | Official Vercel Swag";
export const metadata: Metadata = { title: { absolute: title }, openGraph: { title } };

export default function HomePage() {
    return (
        <>
            <Hero />
            <section className="mt-16">
                <h2 className="mb-8 text-4xl md:text-5xl">Featured</h2>
                {/* TODO: PRobably don't need suspsense here - compare this with productrow below */}
                <Suspense fallback={<RowSkeleton slots={3} />}>
                    <ProductRow query="featured=true" slots={3} />
                </Suspense>
            </section>
            <section className="mt-16">
                <h2 className="mb-8 text-4xl md:text-5xl">Mugs for the Holidays</h2>
                <ProductRow query="category=mugs" slots={3} />
            </section>
        </>
    );
}
