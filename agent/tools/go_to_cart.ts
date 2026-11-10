import { defineTool } from "eve/tools";
import { z } from "zod";

// The cart is a cookie only the browser has, so the browser does the navigating: it opens /cart when this call
// settles (useBundleFlow).
export default defineTool({
    description: `
        Send the customer to their cart page to pay for the VerSell products.
        Call it once every Shop checkout in the bundle is done.
    `,
    inputSchema: z.object({}),
    label: { start: () => "Opening your cart" },
    async execute() {
        return "The customer is on their cart page now.";
    },
});
