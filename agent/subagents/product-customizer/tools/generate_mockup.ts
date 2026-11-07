import { generateText } from "ai";
import { defineWorkflowTool, toolOutput, toolOutputPart } from "eve/tools";
import { FatalError } from "eve/workflow";
import { z } from "zod";
import { putMockupImage, setMockup } from "../../../../lib/bundle";
import { bundleIdFor } from "../../../lib/bundle-id";
import { fetchImage } from "../../../lib/images";

// Gemini is only for putting the creative onto the product. Anything that can be done by editing
// the existing mockup goes through the image-editing skill instead.
const MOCKUP_MODEL = "google/gemini-3.1-flash-image";

const inputSchema = z.object({
    itemKey: z.string().min(1),
    productTitle: z.string().min(1),
    productImageUrl: z.url(),
    creativeUrl: z.url(),
    placement: z.string().min(1).describe("Where and how big, e.g. 'centered on the front, about 1/3 of the width'"),
    feedback: z.string().optional().describe("The customer's feedback on the previous mockup, when regenerating"),
});

// A workflow tool so the generated image is checkpointed: after a crash or a failed save, the
// retry reuses the uploaded image instead of paying for another Gemini generation.
export default defineWorkflowTool({
    description:
        "Generate a new mockup of the creative printed on the product, and make it the item's current mockup. " +
        "Use it for the first mockup, and for feedback that editing can't handle (placement, angle, print style). " +
        "Returns the image so you can check it.",
    inputSchema,
    label: { start: ({ productTitle }) => `Mocking up ${productTitle}` },
    async execute(input, ctx) {
        "use workflow";
        const bundleId = bundleIdFor(ctx);
        const mockup = await generateMockup(bundleId, input, ctx.abortSignal);
        await saveMockup(bundleId, input.itemKey, mockup.mockupUrl, input.creativeUrl);
        return {
            itemKey: input.itemKey,
            mockupUrl: mockup.mockupUrl,
            mediaType: mockup.mediaType,
        };
    },
    toModelOutput: (output) => {
        // A new message aborts the generation, and eve settles the call as { interrupted: true }.
        if ("interrupted" in output) {
            return toolOutput.text("Stopped early because a new message arrived.");
        }
        // The URL stays readable for the whole session (public Blob), so the model can keep seeing it.
        return toolOutput.content([
            toolOutputPart.text(`New mockup for ${output.itemKey}: ${output.mockupUrl}`),
            toolOutputPart.fileUrl(output.mockupUrl, { mediaType: output.mediaType }),
        ]);
    },
});

// Generates and uploads in one step: step results are saved in the workflow history, so it
// returns the Blob URL rather than the image bytes.
async function generateMockup(bundleId: string, input: z.infer<typeof inputSchema>, abortSignal: AbortSignal) {
    "use step";
    const { itemKey, productTitle, productImageUrl, creativeUrl, placement, feedback } = input;
    const [product, creative] = await Promise.all([
        fetchImage(productImageUrl, abortSignal),
        fetchImage(creativeUrl, abortSignal),
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
                    {
                        type: "text",
                        text: prompt,
                    },
                    {
                        type: "file",
                        data: product.bytes,
                        mediaType: product.mediaType,
                    },
                    {
                        type: "file",
                        data: creative.bytes,
                        mediaType: creative.mediaType,
                    },
                ],
            },
        ],
        abortSignal,
    });

    const image = result.files.find((file) => file.mediaType.startsWith("image/"));
    if (!image) {
        // Fatal so the step doesn't retry: the model reads Gemini's reply and decides what to change.
        throw new FatalError(`The image model returned no image. Its reply: ${result.text || "(empty)"}`);
    }

    const mockupUrl = await putMockupImage(bundleId, itemKey, image.uint8Array, image.mediaType);
    return {
        mockupUrl,
        mediaType: image.mediaType,
    };
}

// Its own step, so a failed save retries without generating again. Safe to repeat: it overwrites.
async function saveMockup(bundleId: string, itemKey: string, mockupUrl: string, creativeUrl: string) {
    "use step";
    await setMockup(bundleId, itemKey, {
        mockupUrl,
        creativeUrl,
    });
}
