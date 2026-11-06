import { defineTool, toolOutput, toolOutputPart } from "eve/tools";
import { z } from "zod";
import { getMockups, putMockupImage, setMockup } from "../../../../lib/bundle";
import { bundleIdFor } from "../../../lib/bundle-id";
import { mediaTypeForPath } from "../../../lib/images";

const MAX_BYTES = 20 * 1024 * 1024;

export default defineTool({
  description:
    "Publish an edited image from the sandbox as the item's current mockup. Returns the image so you can " +
    "check it. Only publish once the edit looks right.",
  inputSchema: z.object({
    itemKey: z.string().min(1),
    path: z.string().min(1).describe("Absolute path of the edited PNG, JPEG, or WebP in the sandbox"),
  }),
  label: { start: () => "Publishing the edited mockup" },
  async execute({ itemKey, path }, ctx) {
    const mediaType = mediaTypeForPath(path);
    if (!mediaType) throw new Error("Save the edit as .png, .jpg, or .webp first.");

    const bundleId = bundleIdFor(ctx);
    const current = (await getMockups(bundleId))[itemKey];
    if (!current) throw new Error(`${itemKey} has no mockup yet. Generate one with generate_mockup first.`);

    const sandbox = await ctx.getSandbox();
    const bytes = await sandbox.readBinaryFile({ path });
    if (!bytes) throw new Error(`No file at ${path}.`);
    if (bytes.byteLength > MAX_BYTES) throw new Error("The edited image is larger than 20 MB. Resize it first.");

    const mockupUrl = await putMockupImage(bundleId, itemKey, bytes, mediaType);
    await setMockup(bundleId, itemKey, { mockupUrl, creativeUrl: current.creativeUrl });
    return { itemKey, mockupUrl, mediaType };
  },
  toModelOutput: ({ itemKey, mockupUrl, mediaType }) =>
    toolOutput.content([
      toolOutputPart.text(`Published edited mockup for ${itemKey}: ${mockupUrl}`),
      toolOutputPart.fileUrl(mockupUrl, { mediaType }),
    ]),
});
