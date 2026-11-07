import Image from 'next/image'
import { NavLink } from '@/components/nav-link'
import { getProduct } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { cacheLife } from 'next/cache'

// Half of the max-w-6xl column from md up; keep in sync if the layout changes.
const sizes = '(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw'


export async function FeaturedProduct({ slug }: { slug: string }) {
    "use cache: remote"
    cacheLife('catalog');

    const product = await getProduct(slug)
    if (!product) return null
    const { name, price, images, description } = product

    return (
        <article className="surface-card grid overflow-hidden md:grid-cols-2">
            <div className="relative aspect-square bg-background">
                <Image src={images[0]} alt={name} fill sizes={sizes} className="object-cover mix-blend-multiply" />
            </div>
            <div className="flex flex-col justify-center p-6 md:p-12">
                <NavLink href={`/products/${slug}`} prefetch className="relative self-start">
                    <h3 className="text-3xl hover:underline md:text-4xl">{name}</h3>
                </NavLink>
                <p className="mt-4 font-sans text-2xl font-bold tracking-tighter">{formatPrice(price)}</p>
                <p className="mt-6 text-lg text-foreground/70">{description}</p>
                <NavLink href={`/products/${slug}`} prefetch className="button-dark relative mt-8 self-start">
                    View product
                </NavLink>
            </div>
        </article>
    )
}
