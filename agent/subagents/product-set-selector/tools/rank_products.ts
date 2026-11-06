import { decide } from "eve/ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { BundleProduct } from "../../../../lib/bundle";

const Candidate = BundleProduct.extend({
    summary: z.string().describe("One line on what it is: material, size, notable features"),
});
type Candidate = z.infer<typeof Candidate>;

const describe = (c: Candidate) =>
    [c.title, `${(c.priceCents / 100).toFixed(2)} ${c.currency}`, c.seller, c.summary].filter(Boolean).join(" · ");

export default defineTool({
    description:
        "Rank Shop search candidates for one bundle slot and return the best one and a runner-up. " +
        "Copy 2–10 candidates from a shop-mcp__search_catalog result. Use `best` as the item's product " +
        "and `alternate` as its alternate.",
    inputSchema: z.object({
        need: z.string().min(1).describe("What this slot needs, e.g. 'a laptop tote under $25'"),
        brief: z.string().min(1).describe("The customer's brief, as you received it"),
        candidates: z.array(Candidate).min(2).max(10),
    }),
    label: { start: ({ need }) => `Ranking options for ${need}` },
    async execute({ need, brief, candidates }, ctx) {
        // One choice question with one option per candidate. Jev returns a probability for every
        // option, and the code (not the model) keeps the top two.
        const criteria = Object.fromEntries(candidates.map((candidate, i) => [`c${i + 1}`, describe(candidate)]));
        const { answers } = await decide({
            state: { brief, need },
            questions: {
                best: {
                    type: "choice",
                    instructions: "Pick the product that best fills this slot of a gift bundle, given the brief and the slot's need.",
                    criteria,
                },
            },
            signal: ctx.abortSignal,
        });

        const candidateFor = (key: string) => candidates[Number(key.slice(1)) - 1];
        const { choice, probabilities } = answers.best;
        if (!probabilities) {
            return { best: candidateFor(choice), alternate: null, note: "Jev returned no scores, so there's no runner-up." };
        }
        const [first, second] = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
        return {
            best: { ...candidateFor(first[0]), score: first[1] },
            alternate: second ? { ...candidateFor(second[0]), score: second[1] } : null,
        };
    },
});
