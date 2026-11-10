import { defineMcpClientConnection } from "eve/connections";
import { SHOP_MCP_URL, shopAuth } from "../lib/shop-auth";

export default defineMcpClientConnection({
  url: SHOP_MCP_URL,
  description: "Use this MCP to shop for, and purchase products. This uses Shopify's global catalog and exposes billions of products",
  auth: shopAuth,
  // complete_checkout pays and places the order, so the customer approves every call in code, not just by instruction.
  // The chat shows that approval as a payment window (components/chat/parts/shop-payment-dialog.tsx).
  approval: ({ toolName }) => (toolName === "shop-mcp__complete_checkout" ? "user-approval" : "not-applicable"),
});
