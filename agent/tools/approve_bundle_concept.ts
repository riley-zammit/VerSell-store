import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";
import { BundleSlot, ItemSource, startBundle } from "../../lib/bundle";

// A workflow tool so the turn pauses on ctx.ask until the customer clicks an answer.
// The pause is durable, so the customer can take as long as they like to answer.
// Two buttons only, no text box: the changes themselves come as an ordinary chat message.
export default defineWorkflowTool({
    description:
        "Show the customer a high-level bundle concept and wait for them to approve it or ask for changes. " +
        "Approving saves a new bundle with its slots still empty and returns its id; then start one product-finder " +
        "per slot. Earlier bundles stay as they are; use update_bundle to change one instead. " +
        "Name the kinds of products, not specific products or prices.",
    inputSchema: z.object({
        concept: z.string().describe("One sentence on the theme, e.g. 'A desk-ready welcome kit for new engineers.'"),
        brief: z.string().min(1).describe("The topic, plus any budget, quantity, ship-to country, or style the customer mentioned"),
        slots: z
            .array(BundleSlot)
            .min(2)
            .max(6)
            .refine((slots) => {
                const keys = slots.map((slot) => slot.key);
                return new Set(keys).size === keys.length;
            }, "Slot keys must be unique.")
            .refine((slots) => {
                const fromStore = slots.filter((slot) => slot.source === ItemSource.Store).length;
                return fromStore >= 1 && fromStore <= 2;
            }, "Include 1 or 2 slots from the VerSell store."),
    }),
    label: { start: () => "Checking the bundle idea with you" },
    async execute({ concept, brief, slots }, ctx) {
        "use workflow";
        const slotLines = slots.map((slot) => `• ${slot.label}`);
        const answer = await ctx.ask({
            title: "Your bundle idea",
            prompt: [concept, ...slotLines].join("\n"),
            display: "confirmation",
            options: [
                {
                    id: "approve",
                    label: "Approve",
                    style: "primary",
                },
                {
                    id: "change",
                    label: "Make changes",
                },
            ],
        });

        if (answer.status === "answered" && answer.optionId === "approve") {
            // The browser opens the bundle page when this call returns approved, so the empty slots are already saved.
            const bundleId = await saveConcept(concept, brief, slots);
            return {
                approved: true as const,
                bundleId,
                note: "Saved with empty slots. Start one product-finder per slot now, all at once, with this bundle id.",
            };
        }
        if (answer.status === "answered") {
            return {
                approved: false as const,
                note: "The customer wants changes. Ask what they'd like to change, in one short line.",
            };
        }
        if (answer.status === "cancelled") {
            return {
                approved: false as const,
                note: "The customer sent a new message instead. Read it before going on.",
            };
        }
        return {
            approved: false as const,
            note: "Can't ask here. Ask for approval in your reply instead.",
        };
    },
});

// A step, so a replay reuses the saved bundle instead of starting another one.
async function saveConcept(concept: string, brief: string, slots: BundleSlot[]) {
    "use step";
    const bundle = await startBundle({ concept, brief, slots });
    return bundle.id;
}
