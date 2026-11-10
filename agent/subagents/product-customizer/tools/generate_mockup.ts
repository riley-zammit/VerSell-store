import { generateText } from "ai";
import { defineWorkflowTool, toolOutput, toolOutputPart } from "eve/tools";
import { FatalError } from "eve/workflow";
import { z } from "zod";
import { putMockupImage } from "../../../../lib/bundle";
import { BundleId } from "../../../../lib/bundle-schema";
import { fetchImage } from "../../../lib/images";

// Gemini is only for putting the creative onto the product. Anything that can be done by editing
// the existing mockup goes through the image-editing skill instead.
const MOCKUP_MODEL = "google/gemini-3.1-flash-image";

const inputSchema = z.object({
    bundleId: BundleId.describe("The bundle id from the `Bundle:` line of your task"),
    itemKey: z.string().min(1),
    productTitle: z.string().min(1),
    productImageUrl: z.url(),
    creativeUrl: z.url(),
    placement: z.string().min(1).describe("Where and how big, e.g. 'centered on the front, about 1/3 of the width'"),
    feedback: z.string().optional().describe("The customer's feedback on the previous mockup, when regenerating"),
});

// A workflow tool so the generated image is checkpointed: a retry after a crash reuses the
// uploaded draft instead of paying for another Gemini generation.
// It only makes a draft. Gemini's first try is often off, and the customer's page would show
// every rejected try, so the customizer checks the draft and publishes it with publish_mockup.
export default defineWorkflowTool({
    description: `
        Generate a draft mockup of the creative printed on the product.
        The customer doesn't see it until you publish it with publish_mockup.
        Use it for the first mockup, and for feedback that editing can't handle (placement, angle, print style).
        Returns the draft so you can check it.
    `,
    inputSchema,
    label: { start: ({ productTitle }) => `Mocking up ${productTitle}` },
    async execute(input, ctx) {
        "use workflow";
        const draft = await generateMockup(input, ctx.abortSignal);
        return {
            itemKey: input.itemKey,
            draftUrl: draft.draftUrl,
            mediaType: draft.mediaType,
        };
    },
    toModelOutput: (output) => {
        // A new message aborts the generation, and eve settles the call as { interrupted: true }.
        if ("interrupted" in output) {
            return toolOutput.text("Stopped early because a new message arrived.");
        }
        // The URL stays readable for the whole session (public Blob), so the model can keep seeing it.
        return toolOutput.content([
            toolOutputPart.text(`Draft mockup for ${output.itemKey}, not published yet: ${output.draftUrl}`),
            toolOutputPart.fileUrl(output.draftUrl, { mediaType: output.mediaType }),
        ]);
    },
});

// Generates and uploads in one step: step results are saved in the workflow history, so it
// returns the Blob URL rather than the image bytes.
async function generateMockup(input: z.infer<typeof inputSchema>, abortSignal: AbortSignal) {
    "use step";
    const { bundleId, itemKey, productTitle, productImageUrl, creativeUrl, placement, feedback } = input;
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
        "Make to capture the lighting, angle, material, and any imperfections that exist on the product, and include how they would manifest on the printed logo.",
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

    const draftUrl = await putMockupImage(bundleId, itemKey, image.uint8Array, image.mediaType);
    return {
        draftUrl,
        mediaType: image.mediaType,
    };
}
