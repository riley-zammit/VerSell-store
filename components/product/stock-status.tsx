import { getStock } from '@/lib/api'
import { StockReport } from './purchase-form'

// Server half of the stock hole: live reading (or last good), never during prefetch.
export async function StockStatus({ slug }: { slug: string }) {
  return <StockReport stock={await getStock(slug)} />
}
