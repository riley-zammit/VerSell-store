import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchImage, IMAGE_EXTENSIONS } from "../../../lib/images";

export default defineTool({
    description:
        "Copy an image into the sandbox so you can edit it (ImageMagick or a script). Use the item's current mockup URL. " +
        "Returns the file's absolute path.",
    inputSchema: z.object({
        url: z.url().describe("A Vercel Blob URL, such as a mockup URL"),
        name: z.string().regex(/^[a-z0-9-]{1,40}$/).describe("File name without extension, e.g. 'water-bottle-v1'"),
    }),
    label: { start: () => "Loading the image" },
    async execute({ url, name }, ctx) {
        // Only our own Blob images, so the model can't point the app runtime at arbitrary hosts.
        const { hostname } = new URL(url);
        if (!hostname.endsWith(".blob.vercel-storage.com")) {
            throw new Error("Only Vercel Blob image URLs can be loaded. Use the item's mockup URL.");
        }
        const { bytes, mediaType } = await fetchImage(url, ctx.abortSignal);
        const sandbox = await ctx.getSandbox();
        const extension = IMAGE_EXTENSIONS[mediaType];
        const path = sandbox.resolvePath(`images/${name}.${extension}`);
        await sandbox.writeBinaryFile({
            path,
            content: bytes,
        });
        return {
            path,
            mediaType,
            bytes: bytes.byteLength,
        };
    },
});
