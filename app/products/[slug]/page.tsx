import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartForm } from "@/components/cart/add-to-cart-form";
import { Category, getProduct, getProductsByCategory } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/* 
    Mocking a large product catalog here; We don't want to generate a large number of static params at build time, 
    so pick the three most visited categories. Everything else gets dynamically rendered
*/
export async function generateStaticParams() {
  const lists = await Promise.all([Category.Bottles, Category.Cups, Category.Mugs].map(getProductsByCategory));
  return lists.flat().map(({ slug }) => ({ slug }));
}

export default function Page({ params }: PageProps<"/products/[slug]">) {
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
        <AddToCartForm product={product} />
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12" aria-busy>
      <div className="surface-card aspect-square animate-pulse" />
      <div className="md:pt-6">
        <div className="h-12 w-3/4 animate-pulse rounded-lg bg-foreground/5" />
        <div className="mt-4 h-8 w-24 animate-pulse rounded-lg bg-foreground/5" />
        <div className="mt-6 h-28 animate-pulse rounded-lg bg-foreground/5" />
        <div className="mt-8 flex gap-3">
          <div className="h-12 w-24 animate-pulse rounded-full bg-foreground/5" />
          <div className="h-12 w-40 animate-pulse rounded-full bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}
