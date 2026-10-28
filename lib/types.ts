import type { CartOpType } from './constants.ts'

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number // cents
  currency: string
  category: string
  images: string[]
  featured: boolean
  tags: string[]
  createdAt: string
}

/** The fields the cart UI needs to render a line optimistically. */
export type ProductSummary = Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'images'>

export type CategoryInfo = { slug: string; name: string; productCount: number }

export type Promotion = {
  id: string
  title: string
  description: string
  discountPercent: number
  code: string
  validFrom: string
  validUntil: string
  active: boolean
}

export type StockInfo = { productId: string; stock: number; inStock: boolean; lowStock: boolean }

export type CartItem = {
  productId: string
  quantity: number
  addedAt?: string
  product: ProductSummary
  lineTotal: number
}

export type Cart = {
  token: string
  items: CartItem[]
  totalItems: number
  subtotal: number
  currency: string
}

export type CartOp = { type: CartOpType; product: ProductSummary; quantity: number }

export type DeliveryEstimate = { earliest: string; latest: string } // ISO dates

export type ActionResult = { ok: true } | { ok: false; message?: string }

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code?: string; message: string } }
