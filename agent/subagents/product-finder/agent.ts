import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Finds the product for ONE bundle slot and saves it to the bundle. Start one task per slot, all at once. " +
    "Start the message with the lines `Bundle: <id>` and `Slot: <key>`, then the slot's label and source (store or " +
    "shop), the brief, " +
    "and anything the customer asked for. For a different product in that slot, continue its task with the change.",
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "medium",
});
