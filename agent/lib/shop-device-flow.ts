import type { TokenResult } from "eve/connections";
import { sleep } from "eve/workflow";
import { redis } from "../../lib/redis";

// Shop's device flow, apart from shop-auth.ts because eve bundles any module with "use workflow" into the workflow
// runtime, and that runtime can't import eve/workflow/api, which shop-auth.ts needs for start().

// Shop's public device-flow client: for prototypes only, not for an app you distribute.
// https://shop.dev/docs/authentication#device-flow
export const CLIENT_ID = "5c733ab2-1903-400a-891e-7ba20c09e2a3";
const OAUTH_URL = "https://accounts.shop.app/oauth";

export async function postForm(path: string, body: Record<string, string>) {
  const res = await fetch(`${OAUTH_URL}/${path}`, {
    method: "POST",
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(30_000),
  });
  return (await res.json()) as Record<string, string | number | undefined>;
}

// The device flow has no redirect, so nothing calls eve's callback URL on its own. This run polls Shop until the
// shopper approves, then hits the callback so eve resumes the turn. It's a durable workflow because a plain promise
// freezes on Vercel as soon as the step that started it returns; sleep() holds no compute while it waits.
export async function pollForApproval(tokenKey: string, deviceCode: string, interval: number, expiresAt: number, callbackUrl: string) {
  "use workflow";
  let error = "expired_token";
  let delay = interval;
  while (Date.now() < expiresAt) {
    await sleep(delay * 1000);
    const status = await checkForToken(tokenKey, deviceCode);
    if (status === "approved") {
      error = "";
      break;
    }
    if (status === "slow_down") {
      delay += 5;
    } else if (status !== "authorization_pending") {
      error = status;
      break;
    }
  }
  await resumeTurn(callbackUrl, error);
}

// Asks Shop once whether the shopper approved, and saves the token where shop-auth.ts reads it when they have.
async function checkForToken(tokenKey: string, deviceCode: string) {
  "use step";
  try {
    const res = await postForm("token", {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: CLIENT_ID,
      device_code: deviceCode,
    });
    if (typeof res.access_token !== "string") {
      return String(res.error ?? "server_error");
    }
    const expiresIn = Number(res.expires_in);
    const token: TokenResult = {
      token: res.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    await redis().set(tokenKey, token, { ex: expiresIn });
    return "approved";
  } catch {
    // Shop's guide: stop on a transport failure rather than retry, so this returns instead of throwing.
    return "server_error";
  }
}

async function resumeTurn(callbackUrl: string, error: string) {
  "use step";
  const url = new URL(callbackUrl);
  if (error) {
    url.searchParams.set("error", error);
  }
  await fetch(url, { signal: AbortSignal.timeout(30_000) });
}
