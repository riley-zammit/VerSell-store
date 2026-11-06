import { defineMcpClientConnection } from "eve/connections";
import { SHOP_MCP_URL, shopAuth } from "../lib/shop-auth";

export default defineMcpClientConnection({
  url: SHOP_MCP_URL,
  description: "Use this MCP to shop for, and purchase products. This uses Shopify's global catalog and exposes billions of products",
  auth: shopAuth,
});
