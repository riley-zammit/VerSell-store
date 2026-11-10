import { z } from 'zod'

// The bundle shapes, kept apart from lib/bundle.ts's Redis and Blob code. The agent's workflow tools use these in
// their input schemas, and a workflow bundle can't import Node.js APIs, so this file must import nothing but zod.

export enum ItemSource {
    Store = 'store',
    Shop = 'shop',
}

export enum BundleStatus {
    Draft = 'draft',
    Approved = 'approved',
}

export const BundleId = z.uuid().describe('The bundle id, from the /bundle/<id> page the customer is on or from get_bundle')

export const BundleSlot = z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/).describe('Short stable slug, e.g. "water-bottle"'),
    label: z.string().min(1).describe('What goes here, e.g. "20 oz insulated bottle" or "laptop tote"'),
    source: z.enum(ItemSource).describe('store for a VerSell product, shop for anything else'),
})
export type BundleSlot = z.infer<typeof BundleSlot>

export const BundleProduct = z.object({
    title: z.string().min(1),
    priceCents: z.number().int().nonnegative().describe('Price in minor units, e.g. 2999 for $29.99'),
    currency: z.string().length(3).describe('ISO 4217 code, e.g. USD'),
    imageUrl: z.url(),
    productUrl: z.string().min(1).describe('Full URL for Shop products; /products/<slug> for store products'),
    seller: z.string().optional(),
    productId: z.string().min(1),
    variantId: z.string().optional(),
})
export type BundleProduct = z.infer<typeof BundleProduct>

export const BundleItem = z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/).describe('The slot key from the brief, e.g. "water-bottle"'),
    source: z.enum(ItemSource),
    product: BundleProduct,
    alternate: BundleProduct.optional().describe("Jev's runner-up for this slot, if there was one"),
    reason: z.string().min(1).describe('One sentence on why it fits the brief'),
})
export type BundleItem = z.infer<typeof BundleItem>

export const Bundle = z.object({
    id: z.string(),
    status: z.enum(BundleStatus),
    concept: z.string(),
    brief: z.string(),
    slots: z.array(BundleSlot),
    createdAt: z.string(),
    updatedAt: z.string(),
    approvedAt: z.string().optional(),
})
export type Bundle = z.infer<typeof Bundle>

export const Mockup = z.object({
    mockupUrl: z.url(),
    creativeUrl: z.url(),
    updatedAt: z.string(),
})
export type Mockup = z.infer<typeof Mockup>
