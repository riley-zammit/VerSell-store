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

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type ApiResponse<T> =
  | { success: true; data: T; meta?: { pagination: Pagination } } // meta: list endpoints only
  | { success: false; error: { code?: string; message: string } }
