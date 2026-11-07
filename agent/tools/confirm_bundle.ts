import { defineTool } from "eve/tools";
import { z } from "zod";
import { confirmBundle } from "../../lib/bundle";
import { bundleIdFor } from "../lib/bundle-id";

export default defineTool({
    description:
        "Save the customer's bundle for good. Drafts expire after 7 days; confirmed bundles don't. Only call it " +
        "when the customer clearly asks to save or confirm. This is not a purchase: nothing is ordered or charged.",
    inputSchema: z.object({}),
    label: { start: () => "Saving your bundle" },
    async execute(_input, ctx) {
        const bundle = await confirmBundle(bundleIdFor(ctx));
        if (!bundle) {
            return {
                confirmed: false as const,
                note: "There's no bundle to confirm yet.",
            };
        }
        return {
            confirmed: true as const,
            itemCount: bundle.items.length,
            confirmedAt: bundle.confirmedAt,
        };
    },
});
