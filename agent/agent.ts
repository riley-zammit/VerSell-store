import { defineAgent } from "eve";

// A plain "provider/model" string routes through the Vercel AI Gateway.
// Auth comes from AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN (.env.local).
export default defineAgent({
  model: "anthropic/claude-opus-5.5",
  reasoning: "high",
});
