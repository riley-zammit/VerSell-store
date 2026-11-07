import { defineWorkflowTool } from "eve/tools";
import { z } from "zod";

// A workflow tool so the turn pauses on ctx.ask until the customer clicks or types an answer.
// The pause is durable, so the customer can take as long as they like to answer.
export default defineWorkflowTool({
    description:
        "Show the customer a high-level bundle concept and wait for them to approve it or ask for changes. " +
        "Call it before asking product-set-selector to build a new bundle. Name the kinds of products, not specific products or prices.",
    inputSchema: z.object({
        concept: z.string().describe("One sentence on the theme, e.g. 'A desk-ready welcome kit for new engineers.'"),
        slots: z.array(z.string()).min(2).max(6).describe("One short line per product, e.g. 'insulated bottle (VerSell)' or 'Laptop tote'."),
    }),
    label: { start: () => "Checking the bundle idea with you" },
    async execute({ concept, slots }, ctx) {
        "use workflow";
        const slotLines = slots.map((slot) => `• ${slot}`);
        const answer = await ctx.ask({
            title: "Your bundle idea",
            prompt: [concept, ...slotLines, "Approve it, or tell me what to change."].join("\n"),
            display: "confirmation",
            options: [
                {
                    id: "approve",
                    label: "Looks good",
                    style: "primary",
                },
            ],
            allowFreeform: true,
        });

        if (answer.status === "answered" && answer.optionId === "approve") {
            return { approved: true as const };
        }
        if (answer.status === "answered") {
            return {
                approved: false as const,
                changes: answer.text ?? "",
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
