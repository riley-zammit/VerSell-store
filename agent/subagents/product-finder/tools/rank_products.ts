import { decide } from "eve/ai";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { BundleProduct } from "../../../../lib/bundle-schema";

const Candidate = BundleProduct.extend({
    summary: z.string().describe("One line on what it is: material, size, notable features"),
});
type Candidate = z.infer<typeof Candidate>;

export default defineTool({
    description: `
        Rank Shop search candidates for one bundle slot and return the best one and a runner-up.
        Copy 2–10 candidates from a shop-mcp__search_catalog result.
        Use \`best\` as the item's product and \`alternate\` as its alternate.
    `,
    inputSchema: z.object({
        need: z.string().min(1).describe("What this slot needs, e.g. 'a laptop tote under $25'"),
        brief: z.string().min(1).describe("The customer's brief, as you received it"),
        candidates: z.array(Candidate).min(2).max(10),
    }),
    label: { start: ({ need }) => `Ranking options for ${need}` },
    async execute({ need, brief, candidates }, ctx) {
        // decide() identifies each option by a key, so keep a lookup from key back to its candidate.
        const criteria: Record<string, string> = {};
        const candidatesByKey: Record<string, Candidate> = {};
        for (const [index, candidate] of candidates.entries()) {
            const key = `c${index + 1}`;
            const price = `${(candidate.priceCents / 100).toFixed(2)} ${candidate.currency}`;
            const details = [candidate.title, price, candidate.seller, candidate.summary].filter(Boolean);
            criteria[key] = details.join(" · ");
            candidatesByKey[key] = candidate;
        }

        // One choice question with one option per candidate. Jev returns a probability for every
        // option, and the code (not the model) keeps the top two.
        const { answers } = await decide({
            state: {
                brief,
                need,
            },
            questions: {
                best: {
                    type: "choice",
                    instructions: "Pick the product that best fills this slot of a bundle, given the brief and the slot's need.",
                    criteria,
                },
            },
            signal: ctx.abortSignal,
        });

        const { choice, probabilities } = answers.best;
        if (!probabilities) {
            return {
                best: candidatesByKey[choice],
                alternate: null,
                note: "Jev returned no scores, so there's no runner-up.",
            };
        }

        const scoredCandidates = Object.entries(probabilities).map(([key, score]) => ({
            ...candidatesByKey[key],
            score,
        }));
        const [best, alternate = null] = scoredCandidates.sort((a, b) => b.score - a.score);
        return {
            best,
            alternate,
        };
    },
});
