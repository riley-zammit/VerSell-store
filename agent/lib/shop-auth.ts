import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  type ConnectionPrincipal,
  type TokenResult,
} from "eve/connections";
import { start } from "eve/workflow/api";
import { redis } from "../../lib/redis";
import { CLIENT_ID, pollForApproval, postForm } from "./shop-device-flow";

// Shared by the root's Shop connection and product-finder's, so one sign-in covers both.
// Both connection files are named shop-mcp.ts, which is the name used in the errors below.
const CONNECTION = "shop-mcp";

export const SHOP_MCP_URL = "https://mcp.shop.com";

// eve never stores tokens. They're in Redis because the poll that receives one, eve's callback, and every later tool
// call run in separate function invocations, often on different instances.
const tokenKey = (principal: ConnectionPrincipal) =>
  principal.type === "user" ? `shop-token:${JSON.stringify([principal.issuer, principal.id])}` : "shop-token:app";

async function readToken(key: string) {
  const saved = await redis().get<TokenResult>(key);
  if (!saved || (saved.expiresAt ?? 0) <= Date.now()) {
    return undefined;
  }
  return saved;
}

export const shopAuth = defineInteractiveAuthorization({
  displayName: "Shop",
  getToken: async ({ principal }) => {
    const saved = await readToken(tokenKey(principal));
    if (!saved) {
      throw new ConnectionAuthorizationRequiredError(CONNECTION);
    }
    return saved;
  },
  startAuthorization: async ({ principal, callbackUrl }) => {
    const device = await postForm("device", {
      client_id: CLIENT_ID,
      resource: SHOP_MCP_URL, // byte-exact, no trailing slash
      scope: "openid email personal_agent",
      device_name: "VerSell agent", // how this connection appears in the shopper's Shop account
    });
    if (typeof device.device_code !== "string") {
      throw new ConnectionAuthorizationFailedError(CONNECTION, { reason: String(device.error ?? "device_request_failed") });
    }
    const expiresAt = Date.now() + Number(device.expires_in) * 1000;
    const interval = Number(device.interval ?? 5);
    await start(pollForApproval, [tokenKey(principal), device.device_code, interval, expiresAt, callbackUrl]);
    return {
      challenge: {
        url: String(device.verification_uri_complete ?? device.verification_uri),
        userCode: String(device.user_code),
        expiresAt: new Date(expiresAt).toISOString(),
      },
    };
  },
  completeAuthorization: async ({ principal, callback }) => {
    const saved = await readToken(tokenKey(principal));
    // Shop: don't restart denied or expired consent without asking, so no retry in this turn.
    if (callback.params.error || !saved) {
      throw new ConnectionAuthorizationFailedError(CONNECTION, {
        reason: callback.params.error ?? "token_missing",
        retryable: false,
      });
    }
    return saved;
  },
  evict: async ({ principal }) => {
    await redis().del(tokenKey(principal));
  },
});
