import { posix } from "node:path";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { putCreativeImage } from "../../lib/bundle";
import { bundleIdFor } from "../lib/bundle-id";

// Runs in the app runtime, not the sandbox: it reads the upload through the sandbox API and
// writes it to Blob, so the sandbox needs no network access and never sees Blob credentials.
export default defineTool({
  description:
    "Save the logo or artwork the customer attached, so product-customizer can use it. Pass the path from " +
    "the image's \"Attached file\" label. Returns the creative URL to send to product-customizer.",
  inputSchema: z.object({
    path: z
      .string()
      .min(1)
      .describe("Absolute sandbox path from the attachment label, e.g. /workspace/.eve/attachments/<hash>/logo.png"),
  }),
  label: { start: () => "Saving your artwork" },
  async execute({ path }, ctx) {
    const sandbox = await ctx.getSandbox();
    const filePath = posix.normalize(path);

    // Only files the customer attached, not anything else the agent wrote in the sandbox.
    if (!filePath.startsWith(`${sandbox.resolvePath(".eve/attachments")}/`)) {
      throw new Error('Only attached files can be saved. Use the path from the image\'s "Attached file" label.');
    }

    const bytes = await sandbox.readBinaryFile({ path: filePath });
    if (!bytes) throw new Error(`No file at ${filePath}. Ask the customer to attach it again.`);

    const mediaType = imageTypeOf(bytes);
    if (!mediaType) throw new Error("That file isn't a PNG or JPEG. Ask the customer for a PNG or JPG.");

    const creativeUrl = await putCreativeImage(bundleIdFor(ctx), bytes, mediaType);
    return { creativeUrl };
  },
});

// Checked by the file's first bytes, so a missing or wrong extension doesn't matter.
function imageTypeOf(bytes: Uint8Array) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
