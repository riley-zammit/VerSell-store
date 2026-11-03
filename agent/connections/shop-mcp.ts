// import { connect } from "@vercel/connect/eve"
import { defineMcpClientConnection } from "eve/connections"

export default defineMcpClientConnection({
  url: "https://mcp.shop.com",
  description: "Use this MCP to shop for, and purchase products. This uses Shopify's global catalog and exposes billions of products"
});