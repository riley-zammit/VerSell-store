import { defineTool } from "eve/tools";
import { saveItem } from "../../../../lib/bundle";
import { BundleId, BundleItem } from "../../../../lib/bundle-schema";

export default defineTool({
    description:
        "Save the product for your slot. The customer's bundle page shows it right away. Call it again to " +
        "replace it after a revision.",
    inputSchema: BundleItem.extend({
        bundleId: BundleId.describe("The bundle id from the `Bundle:` line of your task"),
    }),
    label: { start: () => "Adding it to the bundle" },
    async execute({ bundleId, ...item }) {
        const result = await saveItem(bundleId, item);
        if ("error" in result) {
            throw new Error(result.error);
        }
        return result;
    },
});
