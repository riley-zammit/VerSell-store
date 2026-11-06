import { generateText } from "ai";
import { defineTool, toolOutput, toolOutputPart } from "eve/tools";
import { z } from "zod";
import { putMockupImage, setMockup } from "../../../../lib/bundle";
import { bundleIdFor } from "../../../lib/bundle-id";
import { fetchImage } from "../../../lib/images";

// Gemini is only for putting the creative onto the product. Anything that can be done by editing
// the existing mockup goes through the image-editing skill instead.
const MOCKUP_MODEL = "google/gemini-3.1-flash-image";

export default defineTool({
  description:
    "Generate a new mockup of the creative printed on the product, and make it the item's current mockup. " +
    "Use it for the first mockup, and for feedback that editing can't handle (placement, angle, print style). " +
    "Returns the image so you can check it.",
  inputSchema: z.object({
    itemKey: z.string().min(1),
    productTitle: z.string().min(1),
    productImageUrl: z.url(),
    creativeUrl: z.url(),
    placement: z.string().min(1).describe("Where and how big, e.g. 'centered on the front, about 1/3 of the width'"),
    feedback: z.string().optional().describe("The customer's feedback on the previous mockup, when regenerating"),
  }),
  label: { start: ({ productTitle }) => `Mocking up ${productTitle}` },
  async execute({ itemKey, productTitle, productImageUrl, creativeUrl, placement, feedback }, ctx) {
    const [product, creative] = await Promise.all([
      fetchImage(productImageUrl, ctx.abortSignal),
      fetchImage(creativeUrl, ctx.abortSignal),
    ]);

    const prompt = [
      "Create a photorealistic product mockup.",
      `Image 1 is the product: ${productTitle}. Image 2 is the customer's artwork.`,
      `Print the artwork onto the product: ${placement}.`,
      "Keep the product's shape, colour, material, camera angle, lighting, and background exactly as in image 1.",
      "Reproduce the artwork faithfully. Don't redraw it, restyle it, or add any text.",
      feedback ? `Customer feedback on the previous version, apply it: ${feedback}` : "",
    ].join("\n");

    const result = await generateText({
      model: MOCKUP_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: product.bytes, mediaType: product.mediaType },
            { type: "file", data: creative.bytes, mediaType: creative.mediaType },
          ],
        },
      ],
      abortSignal: ctx.abortSignal,
    });

    const image = result.files.find((file) => file.mediaType.startsWith("image/"));
    if (!image) throw new Error(`The image model returned no image. Its reply: ${result.text || "(empty)"}`);

    const bundleId = bundleIdFor(ctx);
    const mockupUrl = await putMockupImage(bundleId, itemKey, image.uint8Array, image.mediaType);
    await setMockup(bundleId, itemKey, { mockupUrl, creativeUrl });
    return { itemKey, mockupUrl, mediaType: image.mediaType };
  },
  // The URL stays readable for the whole session (public Blob), so the model can keep seeing it.
  toModelOutput: ({ itemKey, mockupUrl, mediaType }) =>
    toolOutput.content([
      toolOutputPart.text(`New mockup for ${itemKey}: ${mockupUrl}`),
      toolOutputPart.fileUrl(mockupUrl, { mediaType }),
    ]),
});
