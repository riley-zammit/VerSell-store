import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CartLines, CartSkeleton } from '@/components/cart/cart-shared'
import { AddError, addErrorMessages } from '@/lib/types'

export const metadata: Metadata = { title: 'Your cart' }

// The drawer's View cart, hard loads, shared links, modified or pre-hydration cart icon clicks, and the no-JS add land here.
export default function Page({ searchParams }: PageProps<'/cart'>) {
    return (
        <>
            <h1 className="text-4xl md:text-5xl">Your cart</h1>
            <div className="mt-8">
                <Suspense fallback={<CartSkeleton />}>
                    <PageLines searchParams={searchParams} />
                </Suspense>
            </div>
        </>
    )
}

// A failed no-JS add redirects here with ?error=<AddError>. Unknown values show nothing.
async function PageLines({ searchParams }: { searchParams: PageProps<'/cart'>['searchParams'] }) {
    const { error } = await searchParams
    const code = Object.values(AddError).find((value) => value === error)
    const message = code ? addErrorMessages[code] : null

    return <CartLines variant="page" error={message} />
}
