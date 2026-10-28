import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeliveryEstimate, DeliveryLine } from "@/components/product/delivery-estimate";
import { PurchaseForm, StockLine } from "@/components/product/purchase-form";
import { StockStatus } from "@/components/product/stock-status";
import { getProduct, getProductsByCategory } from "@/lib/api";
import { Category } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

// Pretend-large catalog: prerender only the hottest categories. Everything else serves the
// App Shell on its first visit, then ISR stores the concrete page.
export async function generateStaticParams() {
  const lists = await Promise.all([Category.Bottles, Category.Cups, Category.Mugs].map(getProductsByCategory));
  return lists.flat().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.images[0], width: 1024, height: 1024, alt: product.name }],
    },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  // params is awaited inside Suspense so unknown slugs still get the generic App Shell.
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const { id, name, price, images, description } = product;

  return (
    <article className="grid gap-8 md:grid-cols-2 md:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-foreground/5">
        <Image src={images[0]} alt={name} fill preload sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-xl">{formatPrice(price)}</p>
        <p className="mt-4 text-foreground/70">{description}</p>
        <PurchaseForm
          product={{ id, name, slug, price, images }}
          stock={
            <Suspense fallback={<StockLine />}>
              <StockStatus slug={slug} />
            </Suspense>
          }
          delivery={
            <Suspense fallback={<DeliveryLine />}>
              <DeliveryEstimate productId={id} />
            </Suspense>
          }
        />
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12" aria-busy>
      <div className="aspect-square animate-pulse rounded-2xl bg-foreground/5" />
      <div>
        <div className="h-9 w-3/4 animate-pulse rounded bg-foreground/5" />
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-foreground/5" />
        <div className="mt-4 h-24 animate-pulse rounded bg-foreground/5" />
      </div>
    </div>
  );
}
