import { defineTool } from "eve/tools";
import { z } from "zod";
import type { BundleProduct } from "../../../../lib/bundle-schema";
import { apiFetch, Category } from "../../../../lib/swag-api";
import type { Product } from "../../../../lib/types";

export default defineTool({
    description:
        "Search the VerSell store's own catalog (bottles, cups, and mugs). Results are already in the shape " +
        "save_bundle_item expects for `product`, plus a description.",
    inputSchema: z.object({
        query: z.string().optional().describe("Words to match, e.g. 'insulated'. Omit to list everything."),
        category: z.enum(Category).optional(),
        limit: z.number().int().min(1).max(20).default(10),
    }),
    label: { start: ({ query, category }) => `Searching the store for ${query ?? category ?? "products"}` },
    async execute({ query, category, limit }) {
        const params = new URLSearchParams({ limit: String(limit) });
        if (query) {
            params.set("search", query);
        }
        if (category) {
            params.set("category", category);
        }
        const { data } = await apiFetch<Product[]>(`/products?${params}`);
        return data.map((product) => ({
            title: product.name,
            priceCents: product.price,
            currency: product.currency,
            imageUrl: product.images[0],
            productUrl: `/products/${product.slug}`,
            seller: "VerSell",
            productId: product.id,
            description: product.description,
        } satisfies BundleProduct & { description: string }));
    },
});
