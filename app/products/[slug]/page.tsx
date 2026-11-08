import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartForm } from "@/components/cart/add-to-cart-form";
import { Category, getProduct, getProductStock, getProductsByCategory, STOP_SELLING_AT_INVENTORY_LEVEL } from "@/lib/api";
import { formatPrice } from "@/lib/format";
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

//default loading so we can resolve the params at top-level 
export default async function Page({ params }: PageProps<"/products/[slug]">) {
    // params is awaited inside Suspense so unknown slugs still get the generic App Shell. Cache is for the unknown slugs
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
                <Suspense fallback={<AddToCartForm product={product}/>}>
                    <ProductCardAndInventory product={product} />
                </Suspense>
            </div>
        </article>
    );
}

async function ProductCardAndInventory({ product }: { product: Product }) {
    // A failed stock check shouldn't take down the page; keep the optimistic form and let checkout decide.
    const inventory = await getProductStock(product.id).catch(() => null)
    
    //Don't expose inventory count
    const soldOut = inventory !== null && inventory.stock <= STOP_SELLING_AT_INVENTORY_LEVEL
    return <AddToCartForm product={product} disabled={soldOut} />
}
