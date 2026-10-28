import Image from 'next/image'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/lib/types'
import { NavLink } from '../nav-link'

// const sizes = '(min-width: 1024px) 33vw, 50vw'

const sizes = ''
/** eager: above-the-fold cards (likely LCP), otherwise lazy. */
export function ProductCard({ product, eager }: { product: Product; eager?: boolean }) {
  return (
    <li>
      <NavLink href={`/products/${product.slug}`} prefetch className="group relative block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-foreground/5">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes={sizes}
            loading={eager ? 'eager' : undefined}
            className="object-cover transition-transform group-hover:scale-105"
          />
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-medium">{product.name}</h3>
        <p className="mt-1 h-5 text-sm text-foreground/70">{formatPrice(product.price)}</p>
      </NavLink>
    </li>
  )
}

// Same file as ProductCard so the footprints stay in sync.
export function ProductCardSkeleton() {
  return (
    <li aria-hidden>
      <div className="aspect-square animate-pulse rounded-lg bg-foreground/5" />
      <div className="mt-3 min-h-10">
        <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/5" />
      </div>
      <div className="mt-1 h-5 w-16 animate-pulse rounded bg-foreground/5" />
    </li>
  )
}
