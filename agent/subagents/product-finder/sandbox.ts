import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

// The finder has no sandbox tools, but without this file a declared subagent falls back to eve's default sandbox
// and its network policy. Deny-all, so nothing in this agent can reach the network from a sandbox.
export const environment = VercelSandbox.environment();

export default defineSandbox(() => environment.open({ networkPolicy: "deny-all" }));
