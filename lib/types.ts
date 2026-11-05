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

export type CartItem = {
  productId: string
  quantity: number
  addedAt: string
  product: Product
  lineTotal: number
}

// Token stays on the server. The UI only sees lines and totals.
export type Cart = {
  items: CartItem[]
  totalItems: number
  subtotal: number
  currency: string
  createdAt: string
  updatedAt: string
}

export type CartResult = { cart: Cart } | { error: string }

// Form field names shared by the add-to-cart form and its Server Action.
export enum CartField {
  ProductId = 'productId',
  Quantity = 'quantity',
}
