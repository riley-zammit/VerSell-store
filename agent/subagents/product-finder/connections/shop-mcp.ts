import { defineMcpClientConnection } from "eve/connections";
import { SHOP_MCP_URL, shopAuth } from "../../../lib/shop-auth";

// Research only. The allow list hides Shop's cart, checkout, spend-request, and order tools,
// so this agent can't see or call them. Same sign-in as the root's Shop connection.
export default defineMcpClientConnection({
  url: SHOP_MCP_URL,
  description: "Search Shopify's global catalog for products and read product details.",
  auth: shopAuth,
  tools: { allow: ["search_catalog", "lookup_catalog", "get_product"] },
});
