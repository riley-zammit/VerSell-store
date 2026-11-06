import type { ToolContext } from "eve/tools";

/**
 * A bundle's id is the customer's chat session id. Subagents run in child sessions, so they use
 * the root session's id. The model never has to pass ids around, and the browser already knows it.
 */
export const bundleIdFor = (ctx: ToolContext) => ctx.session.parent?.rootSessionId ?? ctx.session.id;
