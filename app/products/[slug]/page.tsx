import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/cart/add-to-cart-form";
import { getAvailableStock, getProduct, getProductsByCategory } from "@/lib/swag-api/catalog";
import { Category } from "@/lib/swag-api/client";
import { formatPrice } from "@/lib/format";
import { siteOpenGraph } from "@/lib/metadata";
import type { Product } from "@/lib/types";
import { cacheLife } from "next/cache";

/* 
    Mocking a large product catalog here; We don't want to generate a large number of static params at build time, 
    so pick the three most visited categories. Everything else gets dynamically rendered
*/
export async function generateStaticParams() {
    const lists = await Promise.all([Category.Bottles, Category.Cups, Category.Mugs].map(getProductsByCategory));
    return lists.flat().map(({ slug }) => ({ slug }));
}

// Cached like the page, so the metadata prerenders into the shell instead of streaming in.
export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
    "use cache: remote"
    cacheLife('catalog');

    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) {
        notFound();
    }
    const { name, description, images } = product;

    return {
        title: name,
        description,
        openGraph: {
            ...siteOpenGraph,
            images: [{ url: images[0], alt: name }],
        },
    };
}

export default async function Page({ params }: PageProps<"/products/[slug]">) {
    "use cache: remote"
    cacheLife('catalog');

    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) notFound();
    const { name, price, images, description } = product;

    return (
        <article className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="surface-card p-2.5">
                <div className="relative aspect-square overflow-hidden rounded-[17px] bg-background">
                    <Image src={images[0]} alt={name} fill preload sizes="(min-width: 768px) 50vw, 100vw" className="object-cover mix-blend-multiply" />
                </div>
            </div>
            <div className="md:pt-6">
                <h1 className="text-4xl md:text-5xl">{name}</h1>
                <p className="mt-4 font-sans text-2xl font-bold tracking-tighter md:text-3xl">{formatPrice(price)}</p>
                <p className="mt-6 text-lg text-foreground/70">{description}</p>

                {/* Optimistically render the ATC form every time to enable progressive ehnancement; If no inventory + no JS, rely on the final checkout negotiation to block the purchase. */}
                <ProductCardAndInventory product={product} />

            </div>
        </article>
    );
}

async function ProductCardAndInventory({ product }: { product: Product }) {
    // A failed stock check shouldn't take down the page; keep the optimistic form and let checkout decide.
    // What's left to sell, not the raw stock. Null when the check failed.
    const available = await getAvailableStock(product.id).catch(() => null)
    const soldOut = available !== null && available <= 0
    return <AddToCartForm product={product} inventory={available} disabled={soldOut} />
}
