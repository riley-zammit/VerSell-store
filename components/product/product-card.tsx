import { formatPrice } from '@/lib/format'
import type { Product } from '@/lib/types'
import { NavLink } from '../nav-link';
import Image from 'next/image'

//TODO: Can we make some of these images eager for above-the-fold loading?

// Mirrors gridClassName (1 col, 2 at sm, 3 at lg) inside max-w-6xl; keep in sync if the layout changes.
// Cards in other layouts (e.g. ProductRow) pass their own.
const gridSizes = '(min-width: 1152px) 340px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'

export function ProductCard({ product, sizes = gridSizes }: { product: Product; sizes?: string; eager?: boolean }) {
  return (
    <li>
      <NavLink href={`/products/${product.slug}`} prefetch className="surface-card group relative block overflow-hidden p-2.5">
        <div className="relative aspect-square overflow-hidden rounded-[17px] bg-background">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes={sizes}
            className="object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="px-2 pt-4 pb-2">
          <h3 className="line-clamp-2 min-h-10 text-base leading-tight">{product.name}</h3>
          <p className="mt-1 h-5 font-sans text-sm tracking-tight text-foreground/60">{formatPrice(product.price)}</p>
        </div>
      </NavLink>
    </li>
  )
}

export function ProductCardSkeleton() {
  return (
    <li aria-hidden className="surface-card p-2.5">
      <div className="aspect-square animate-pulse rounded-[17px] bg-background" />
      <div className="px-2 pt-4 pb-2">
        <div className="min-h-10">
          <div className="h-4 w-3/4 animate-pulse rounded bg-background" />
        </div>
        <div className="mt-1 h-5 w-16 animate-pulse rounded bg-background" />
      </div>
    </li>
  )
}
