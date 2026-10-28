import 'server-only'
import { connection } from 'next/server'
import { setTimeout } from 'node:timers/promises'
import type { DeliveryEstimate } from './types'

const DAY_MS = 86_400_000
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString()

// Mock SAP ATP. Same signature a real client would expose; swap the body later.
// Called in-process (not via a route handler) to avoid an extra function hop.
export async function getDeliveryEstimate(productId: string): Promise<DeliveryEstimate> {
  void productId
  await connection() // request-time only: never prerendered or prefetched (also makes Date/random legal)
  const [min, max] = [800, 2500]
  await setTimeout(min + Math.random() * (max - min))
  const days = 2 + Math.floor(Math.random() * 4) // ponytail: mock. Real ATP uses stock, warehouse, cutoff, destination
  return { earliest: inDays(days), latest: inDays(days + 2) }
}
