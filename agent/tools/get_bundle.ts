import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBundle, getMockups } from "../../lib/bundle";
import { bundleIdFor } from "../lib/bundle-id";

export default defineTool({
  description:
    "Read this customer's saved bundle: status, items (with item keys, product image URLs, and alternates), " +
    "and each item's current mockup. Use it before briefing product-customizer, instead of relying on a " +
    "subagent's reply text.",
  inputSchema: z.object({}),
  label: { start: () => "Reading the bundle" },
  async execute(_input, ctx) {
    const id = bundleIdFor(ctx);
    const [bundle, mockups] = await Promise.all([getBundle(id), getMockups(id)]);
    if (!bundle) return { found: false as const, note: "No bundle saved yet. Ask product-set-selector to build one." };
    return { found: true as const, bundle, mockups };
  },
});
