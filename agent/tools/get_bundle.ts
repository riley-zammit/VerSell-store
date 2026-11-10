import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBundle, getItems, getMockups, getRememberedBundleIds } from "../../lib/bundle";
import { BundleId } from "../../lib/bundle-schema";

export default defineTool({
    description:
        "Read a bundle: status, slots, each slot's product (with its image URL and alternate), and each item's " +
        "current mockup. A slot missing from `items` is still being found. Use it before briefing " +
        "product-customizer, instead of relying on a subagent's reply text. Without a bundle id, it lists the " +
        "bundles this customer has opened, newest first.",
    inputSchema: z.object({
        bundleId: BundleId.optional(),
    }),
    label: { start: () => "Reading the bundle" },
    async execute({ bundleId }, ctx) {
        if (!bundleId) {
            // The caller is the customer's visitor cookie (agent/channels/eve.ts), which keys their list.
            const visitorId = ctx.session.auth.current?.principalId;
            const ids = visitorId ? await getRememberedBundleIds(visitorId) : [];
            const lookups = ids.map((id) => getBundle(id));
            const bundles = await Promise.all(lookups);
            const summaries = [];
            for (const bundle of bundles) {
                if (bundle) {
                    summaries.push({
                        id: bundle.id,
                        concept: bundle.concept,
                        status: bundle.status,
                        updatedAt: bundle.updatedAt,
                    });
                }
            }
            return { bundles: summaries };
        }

        const [bundle, items, mockups] = await Promise.all([getBundle(bundleId), getItems(bundleId), getMockups(bundleId)]);
        if (!bundle) {
            return {
                found: false as const,
                note: "No bundle with that id. It may be a draft that expired.",
            };
        }
        return {
            found: true as const,
            bundle,
            items,
            mockups,
        };
    },
});
