import { defineTool } from "eve/tools";
import { z } from "zod";
import { putMockupImage, setMockup } from "../../../../lib/bundle";
import { BundleId } from "../../../../lib/bundle-schema";
import { MAX_IMAGE_BYTES, mediaTypeForPath } from "../../../lib/images";

// The only tool that changes the customer's page. Drafts and edits stay private until the
// customizer has checked them, so the customer never sees a try that got thrown away.
export default defineTool({
    description: `
        Make a checked image the item's current mockup, which the customer sees right away.
        Pass either \`draftUrl\` (a draft from generate_mockup) or \`path\` (an edited image in the sandbox).
        Only publish once you've checked the image and it looks right.
    `,
    inputSchema: z.object({
        bundleId: BundleId.describe("The bundle id from the `Bundle:` line of your task"),
        itemKey: z.string().min(1),
        creativeUrl: z.url().describe("The creative URL from your task"),
        draftUrl: z.url().optional().describe("The draft URL generate_mockup returned"),
        path: z.string().min(1).optional().describe("Absolute path of an edited PNG, JPEG, or WebP in the sandbox"),
    }),
    label: { start: () => "Publishing the mockup" },
    async execute({ bundleId, itemKey, creativeUrl, draftUrl, path }, ctx) {
        let mockupUrl: string;

        if (draftUrl && !path) {
            // Only this item's drafts: the page renders mockups through the image optimizer, which only
            // allows our Blob host.
            const { hostname, pathname } = new URL(draftUrl);
            const isOurBlob = hostname.endsWith(".blob.vercel-storage.com");
            const isThisItem = pathname.startsWith(`/bundles/${bundleId}/mockups/${itemKey}/`);
            if (!isOurBlob || !isThisItem) {
                throw new Error(`That isn't a draft of ${itemKey}. Use the draftUrl generate_mockup returned.`);
            }
            mockupUrl = draftUrl;
        } else if (path && !draftUrl) {
            const mediaType = mediaTypeForPath(path);
            if (!mediaType) {
                throw new Error("Save the edit as .png, .jpg, or .webp first.");
            }
            const sandbox = await ctx.getSandbox();
            const bytes = await sandbox.readBinaryFile({ path });
            if (!bytes) {
                throw new Error(`No file at ${path}.`);
            }
            if (bytes.byteLength > MAX_IMAGE_BYTES) {
                throw new Error("The edited image is larger than 20 MB. Resize it first.");
            }
            mockupUrl = await putMockupImage(bundleId, itemKey, bytes, mediaType);
        } else {
            throw new Error("Pass either draftUrl or path, not both.");
        }

        await setMockup(bundleId, itemKey, {
            mockupUrl,
            creativeUrl,
        });
        return {
            itemKey,
            mockupUrl,
        };
    },
});
