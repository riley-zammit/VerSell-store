import { defineTool } from "eve/tools";
import { z } from "zod";
import { BundleItem, ItemSource, saveDraft } from "../../../../lib/bundle";
import { bundleIdFor } from "../../../lib/bundle-id";

export default defineTool({
    description:
        "Save the whole bundle as a draft, replacing any earlier version. Call it once the items are chosen, " +
        "and again after every revision. The customer's bundle page shows what you save.",
    inputSchema: z.object({
        concept: z.string().min(1).describe("One or two sentences tying the bundle together"),
        brief: z.string().min(1).describe("The customer's brief, as you received it"),
        items: z
            .array(BundleItem)
            .min(2)
            .max(8)
            .refine((items) => new Set(items.map((item) => item.key)).size === items.length, "Item keys must be unique.")
            .refine((items) => {
                const fromStore = items.filter((item) => item.source === ItemSource.Store).length;
                return fromStore >= 1 && fromStore <= 2;
            }, "Include 1 or 2 products from the VerSell store."),
    }),
    label: { start: () => "Saving the bundle" },
    async execute(input, ctx) {
        const bundle = await saveDraft(bundleIdFor(ctx), input);
        return { saved: true, itemKeys: bundle.items.map((item) => item.key) };
    },
});
