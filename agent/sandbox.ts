import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

// Vercel Sandbox explicitly (not DefaultSandbox), so `eve dev` runs in the same
// environment as production instead of falling back to Docker or just-bash.
export const environment = VercelSandbox.environment();

// No network: the concierge's sandbox is only for local work, and everything that
// talks to the outside world runs as an app-runtime tool or in a subagent.
// Applies only when a session's sandbox is created; existing sandboxes keep their policy.
export default defineSandbox(() => environment.open({ networkPolicy: "deny-all" }));

