import { unstable_rethrow } from 'next/navigation'
import { formatDeliveryDate } from '@/lib/format'
import { getDeliveryEstimate } from '@/lib/sap'
import type { DeliveryEstimate as Estimate } from '@/lib/types'

// Not optimistic: any date we invent would be a fabricated promise. Reserve the space, reveal once.
export async function DeliveryEstimate({ productId }: { productId: string }) {
  const estimate = await getDeliveryEstimate(productId).catch((e) => {
    unstable_rethrow(e)
    return null
  })
  return <DeliveryLine estimate={estimate} />
}

/** undefined = skeleton (the Suspense fallback), null = unavailable. Fixed height either way. */
export function DeliveryLine({ estimate }: { estimate?: Estimate | null }) {
  return (
    <p className="flex h-5 items-center gap-2 text-sm" aria-busy={estimate === undefined}>
      <span className="text-foreground/60">Estimated delivery</span>
      {estimate === undefined ? (
        <span className="h-4 w-36 animate-pulse rounded bg-foreground/10" />
      ) : estimate ? (
        <span>
          {formatDeliveryDate(estimate.earliest)} – {formatDeliveryDate(estimate.latest)}
        </span>
      ) : (
        <span className="text-foreground/60">unavailable</span>
      )}
    </p>
  )
}
