import { defineAgent } from "eve";

export default defineAgent({
  description: `
    Mocks up the customer's creative on ONE bundle product, and revises that mockup from feedback.
    Start one task per product.
    Start the message with the lines \`Bundle: <id>\` and \`Item: <key>\`, then the product title, product image URL, creative URL, and placement notes.
    For feedback on a mockup, continue that product's task with the customer's words.
  `,
  // Needs vision: it checks every image it produces.
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "high",
});
