import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
  type ConnectionPrincipal,
  type TokenResult,
} from "eve/connections";

// Shop's public device-flow client: for prototypes only, not for an app you distribute.
// https://shop.dev/docs/authentication#device-flow
const CLIENT_ID = "5c733ab2-1903-400a-891e-7ba20c09e2a3";
const OAUTH_URL = "https://accounts.shop.app/oauth";

// eve never stores tokens. Kept on globalThis because eve bundles workflow steps separately
// from the server, so plain module state may not be shared within one process.
// TODO(prod): in-memory, so it's lost on restart and not shared across Vercel instances.
// Move tokens to shared storage (KV/DB) before deploying.
const store = globalThis as typeof globalThis & { shopTokens?: Map<string, TokenResult> };
const tokens = (store.shopTokens ??= new Map());

const keyFor = (principal: ConnectionPrincipal) =>
  principal.type === "user" ? JSON.stringify([principal.issuer, principal.id]) : "app";

async function postForm(path: string, body: Record<string, string>) {
  const res = await fetch(`${OAUTH_URL}/${path}`, {
    method: "POST",
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(30_000),
  });
  return (await res.json()) as Record<string, string | number | undefined>;
}

// The device flow has no redirect, so nothing calls eve's callback URL on its own.
// Poll Shop until the shopper approves, then hit the callback so eve resumes the turn.
// TODO(prod): this promise runs outside any workflow step. Locally the dev server keeps it alive,
// but on Vercel the function can freeze when the step returns and nothing resumes it.
// Make it durable before deploying: a workflow loop of `sleep(interval)` + a "use step" token check.
async function waitForApproval(key: string, deviceCode: string, interval: number, expiresIn: number, callbackUrl: string) {
  const deadline = Date.now() + expiresIn * 1000;
  let error = "expired_token";
  try {
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      const res = await postForm("token", {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: CLIENT_ID,
        device_code: deviceCode,
      });
      if (typeof res.access_token === "string") {
        tokens.set(key, { token: res.access_token, expiresAt: Date.now() + Number(res.expires_in) * 1000 });
        error = "";
        break;
      }
      if (res.error === "slow_down") interval += 5;
      else if (res.error !== "authorization_pending") {
        error = String(res.error ?? "server_error");
        break;
      }
    }
  } catch {
    error = "server_error"; // Shop's guide: stop on a transport failure rather than retry.
  }
  const url = new URL(callbackUrl);
  if (error) url.searchParams.set("error", error);
  await fetch(url, { signal: AbortSignal.timeout(30_000) });
}

export default defineMcpClientConnection({
  url: "https://mcp.shop.com",
  description: "Use this MCP to shop for, and purchase products. This uses Shopify's global catalog and exposes billions of products",
  auth: defineInteractiveAuthorization({
    displayName: "Shop",
    getToken: async ({ principal }) => {
      const saved = tokens.get(keyFor(principal));
      if (!saved || (saved.expiresAt ?? 0) <= Date.now()) throw new ConnectionAuthorizationRequiredError("shop-mcp");
      return saved;
    },
    startAuthorization: async ({ principal, callbackUrl }) => {
      const device = await postForm("device", {
        client_id: CLIENT_ID,
        resource: "https://mcp.shop.com", // byte-exact, no trailing slash
        scope: "openid email personal_agent",
        device_name: "VerSell agent", // how this connection appears in the shopper's Shop account
      });
      if (typeof device.device_code !== "string") {
        throw new ConnectionAuthorizationFailedError("shop-mcp", { reason: String(device.error ?? "device_request_failed") });
      }
      const expiresIn = Number(device.expires_in);
      void waitForApproval(keyFor(principal), device.device_code, Number(device.interval ?? 5), expiresIn, callbackUrl);
      return {
        challenge: {
          url: String(device.verification_uri_complete ?? device.verification_uri),
          userCode: String(device.user_code),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      };
    },
    completeAuthorization: async ({ principal, callback }) => {
      const saved = tokens.get(keyFor(principal));
      // Shop: don't restart denied or expired consent without asking, so no retry in this turn.
      if (callback.params.error || !saved) {
        throw new ConnectionAuthorizationFailedError("shop-mcp", {
          reason: callback.params.error ?? "token_missing",
          retryable: false,
        });
      }
      return saved;
    },
    evict: ({ principal }) => {
      tokens.delete(keyFor(principal));
    },
  }),
});
