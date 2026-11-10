import { defineAgent } from "eve";

//Require bundle ID and 
export default defineAgent({
  description: `
    Once we have a bundle concept approved, this product-finder finds the product for a SINGLE bundle slot and saves it to the bundle.
    Start one task per slot, all at once.
    Start the message with the lines \`Bundle: <id>\` and \`Slot: <key>\`, then the slot's label and source (store or shop), the use case and general guidance, 
    and anything the customer asked for.
    For a different product in that slot, continue its task with the change. This subagent returns a short explainer string which the orchestrator should
    pass along to the customer.
  `,
  // It reads untrusted merchant text, so it gets only its own tools and the allow-listed Shop catalog (through
  // eve__tool, which defaultTools doesn't remove). No bash, files, or web.
  defaultTools: false,
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "medium",
});
