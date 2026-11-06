import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Builds or revises a product bundle and saves it as a draft. Picks 1–2 products from the VerSell store " +
    "and sources the rest from Shop. Send the full brief: who it's for, occasion, quantity, budget per person, " +
    "ship-to country, and style. To change a bundle it already built, continue its task with the change.",
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "medium",
});
