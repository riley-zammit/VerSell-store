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
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "medium",
});
