import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";
import { approveBundle, getBundle, getItems } from "../../lib/bundle";
import { BundleId, ItemSource } from "../../lib/bundle-schema";
import { formatMoney } from "../../lib/format";

// Same gate as the concept: two buttons, and changes come as an ordinary chat message.
// The browser watches for this call to return approved, then adds the bundle's VerSell products (from the call's
// bundleId) to the customer's cart. The cart is a cookie only the browser has.
export default defineWorkflowTool({
    description:
        "Show the customer the finished products and wait for them to approve or ask for changes. Call it once " +
        "every product-finder is done. Approving saves the bundle for good and puts its VerSell products in the " +
        "customer's cart.",
    inputSchema: z.object({
        bundleId: BundleId,
    }),
    label: { start: () => "Checking the products with you" },
    async execute({ bundleId }, ctx) {
        "use workflow";
        const summary = await summarize(bundleId);
        if ("error" in summary) {
            return {
                approved: false as const,
                note: summary.error,
            };
        }

        const answer = await ctx.ask({
            title: "Your bundle",
            prompt: summary.prompt,
            display: "confirmation",
            options: [
                {
                    id: "approve",
                    label: "Approve",
                    style: "primary",
                },
                {
                    id: "change",
                    label: "Make changes",
                },
            ],
        });

        if (answer.status === "answered" && answer.optionId === "approve") {
            return await approve(bundleId);
        }
        if (answer.status === "answered") {
            return {
                approved: false as const,
                note: "The customer wants changes. Ask what they'd like to change, in one short line.",
            };
        }
        if (answer.status === "cancelled") {
            return {
                approved: false as const,
                note: "The customer sent a new message instead. Read it before going on.",
            };
        }
        return {
            approved: false as const,
            note: "Can't ask here. Ask for approval in your reply instead.",
        };
    },
});

async function summarize(bundleId: string) {
    "use step";
    const [bundle, items] = await Promise.all([getBundle(bundleId), getItems(bundleId)]);
    if (!bundle) {
        return { error: "There is no bundle yet. Get the concept approved first." };
    }
    const emptySlots = bundle.slots.filter((slot) => !items[slot.key]);
    if (emptySlots.length > 0) {
        return { error: `Still finding: ${emptySlots.map((slot) => slot.key).join(", ")}. Wait for those finders first.` };
    }

    const lines = bundle.slots.map((slot) => {
        const { product } = items[slot.key];
        return `• ${product.title}, ${formatMoney(product.priceCents, product.currency)} (${product.seller ?? "Shop"})`;
    });
    return { prompt: [bundle.concept, ...lines].join("\n") };
}

async function approve(bundleId: string) {
    "use step";
    const result = await approveBundle(bundleId);
    if ("error" in result) {
        return {
            approved: false as const,
            note: result.error,
        };
    }
    const storeItems = result.items.filter((item) => item.source === ItemSource.Store);
    const shopItems = result.items.filter((item) => item.source === ItemSource.Shop);
    return {
        approved: true as const,
        addedToCart: storeItems.map((item) => item.product.title),
        shopProducts: shopItems.map(({ key, product }) => ({
            key,
            title: product.title,
            seller: product.seller,
            productUrl: product.productUrl,
            productId: product.productId,
            variantId: product.variantId,
        })),
    };
}
