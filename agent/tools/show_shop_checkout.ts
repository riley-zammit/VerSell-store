import { defineTool } from "eve/tools";
import { z } from "zod";

// Display only: the chat renders this call as a button from its input. The agent still runs the checkout itself with
// the shop skill.
export default defineTool({
    description: `
        Show the customer a button that opens one store's Shop checkout in a new tab.
        Use it whenever you'd give a checkout link, instead of writing the link.
        One store at a time: don't show the next store's checkout until this one is done.
    `,
    inputSchema: z.object({
        store: z.string().min(1).describe("The store's name, as the customer knows it"),
        checkoutUrl: z.url().describe("The checkout's complete continue_url, unchanged"),
    }),
    label: { start: ({ store }) => `Showing ${store}'s checkout` },
    async execute({ store }) {
        return `The customer now sees a button for ${store}'s checkout. Follow the shop skill from here.`;
    },
});
