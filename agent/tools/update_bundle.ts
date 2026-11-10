import { defineTool } from "eve/tools";
import { z } from "zod";
import { updateBundle } from "../../lib/bundle";
import { BundleId, BundleSlot } from "../../lib/bundle-schema";

export default defineTool({
    description:
        "Change the bundle's slots: add slots (then start a product-finder for each), remove slots, or swap a " +
        "slot's product for its alternate. To find a different product for a slot, continue that slot's " +
        "product-finder task instead. Any change means the customer approves the bundle again.",
    inputSchema: z.object({
        bundleId: BundleId,
        add: z.array(BundleSlot).default([]).describe("New, empty slots"),
        remove: z.array(z.string()).default([]).describe("Keys of slots to drop, with their products and mockups"),
        useAlternate: z.array(z.string()).default([]).describe("Keys of slots whose alternate becomes the product"),
    }),
    label: { start: () => "Updating the bundle" },
    async execute({ bundleId, ...change }) {
        const result = await updateBundle(bundleId, change);
        if ("error" in result) {
            throw new Error(result.error);
        }
        return {
            slots: result.slots.map((slot) => slot.key),
        };
    },
});
