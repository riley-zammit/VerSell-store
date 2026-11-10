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

export type Stock = {
    productId: string
    stock: number
    inStock: boolean
    lowStock: boolean // stock between 1 and 5
}

export type StoreConfig = {
    storeName: string
    currency: string
    features: {
        wishlist: boolean
        productComparison: boolean
        reviews: boolean
        liveChat: boolean
        recentlyViewed: boolean
    }
    socialLinks: { twitter: string; github: string; discord: string }
    seo: { defaultTitle: string; titleTemplate: string; defaultDescription: string }
}

export enum RedisStatus {
    Connected = 'connected',
    Error = 'error',
}

export type Health = {
    status: string
    timestamp: string
    services: { redis: RedisStatus }
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

export type CartItem = {
    productId: string
    quantity: number
    addedAt: string
    product: Product
    lineTotal: number
}

// Token stays on the server. The UI only sees lines and totals.
export type ApiCart = {
    items: CartItem[]
    totalItems: number
    subtotal: number
    currency: string
    createdAt: string
    updatedAt: string
}

// What the client cart list needs from a server line. Slim, so whole products don't cross into the client.
export type CartLine = {
    productId: string
    name: string
    slug: string
    image: string
    quantity: number
    lineTotal: number | null // cents; null on an optimistic line the server hasn't priced yet
    stockMessage: string | null
}

// The cart as the client holds it. The layout streams the first one; each cart action returns the next.
export type Cart = {
    lines: CartLine[]
    totalItems: number
    subtotal: number // cents
}

// Form field names shared by the cart forms and their Server Actions.
export enum CartField {
    ProductId = 'productId',
    Quantity = 'quantity',
}

// Why a cart action failed. The no-JS forms carry it in the /cart URL, so it's a closed set rather than the API's text.
export enum CartErrorCode {
    InvalidQuantity = 'invalid-quantity',
    ProductUnavailable = 'product-unavailable',
    ItemMissing = 'item-missing',
    OutOfStock = 'out-of-stock',
    NotEnoughStock = 'not-enough-stock',
    AddFailed = 'add-failed',
    UpdateFailed = 'update-failed',
}

// Shared by the cart client components and the /cart page (server), so it lives outside both.
export const cartErrorMessages: Record<CartErrorCode, string> = {
    [CartErrorCode.InvalidQuantity]: 'Enter a whole number for the quantity.',
    [CartErrorCode.ProductUnavailable]: 'That product is no longer available.',
    [CartErrorCode.ItemMissing]: 'That item isn’t in your cart anymore.',
    [CartErrorCode.OutOfStock]: 'That product is out of stock.',
    [CartErrorCode.NotEnoughStock]: 'There isn’t enough stock to add more.',
    [CartErrorCode.AddFailed]: 'We couldn’t add that item. Try again.',
    [CartErrorCode.UpdateFailed]: 'We couldn’t update the quantity. Try again.',
}
