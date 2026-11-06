import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

// Vercel Sandbox explicitly (not DefaultSandbox), so `eve dev` runs in the same
// environment as production instead of falling back to Docker or just-bash.
export const environment = VercelSandbox.environment();

export default defineSandbox(() => environment.open());

