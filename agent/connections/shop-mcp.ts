import { defineMcpClientConnection } from "eve/connections";
import { SHOP_MCP_URL, shopAuth } from "../lib/shop-auth";

export default defineMcpClientConnection({
  url: SHOP_MCP_URL,
  description: "Check out the bundle's Shop products with the customer's Shop wallet.",
  auth: shopAuth,
  // Checkout only. Search lives in product-finder; carts, spend requests (card issuing), orders, and store
  // locations are hidden so a prompt injection can't reach them. get_account supplies saved addresses and confirms sign-in.
  tools: { allow: ["get_account", "create_checkout", "get_checkout", "update_checkout", "complete_checkout"] },
  // complete_checkout pays and places the order, so the customer approves every call in code, not just by instruction.
  // The chat shows that approval as a payment window (components/chat/parts/shop-payment-dialog.tsx).
  approval: ({ toolName }) => (toolName === "shop-mcp__complete_checkout" ? "user-approval" : "not-applicable"),
});
