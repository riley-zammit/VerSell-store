import { defineTool } from "eve/tools";
import { z } from "zod";
import type { BundleProduct } from "../../../../lib/bundle-schema";
import { apiFetch, Category } from "../../../../lib/swag-api/client";
import type { Product } from "../../../../lib/types";

export default defineTool({
    description: `
        Search the VerSell store's own catalog.
        Results are already in the shape save_bundle_item expects for \`product\`, plus a description.
    `,
    inputSchema: z.object({
        query: z.string().optional().describe("Search terms, e.g. 'insulated'. Omit to list everything."),
        limit: z.number().int().min(1).max(20).default(10),
    }),
    label: { start: ({ query }) => `Searching the store for ${query ?? "products"}` },
    async execute({ query, limit }) {
        const params = new URLSearchParams({ limit: String(limit) });
        if (query) {
            params.set("search", query);
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
