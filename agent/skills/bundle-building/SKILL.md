---
name: bundle-building
description: Use when the customer wants to build, change, mock up, or save a bundle.
---

# Building a bundle

1. **Brief.** Find out who it's for and the occasion. Ask only for what's missing and matters; make sensible assumptions for the rest and say what you assumed.
2. **Ideate.** Propose a high-level concept: a one-line theme and 3–5 kinds of product, such as "20 oz insulated bottle (VerSell)" or "laptop tote". Include 1–2 VerSell products (bottles, cups, mugs). Don't name specific products or prices yet. Call `approve_bundle_concept` to show it and wait for the customer's answer; don't repeat the concept in your reply. If they ask for changes, revise and call it again. Don't move on until they approve.
3. **Select.** Send the full brief and the approved concept to `product-set-selector`. It finds the products, sources the rest from Shop, and saves a draft. The customer's screen switches to their bundle page as soon as it starts.
4. **Revise.** For changes to the product set ("swap the tote", "use the alternate", "cheaper"), continue the same `product-set-selector` task with its `taskId` and the change.
5. **Creative.** Ask for their logo or artwork as a PNG or JPG; they attach it with the paperclip in the chat. An upload arrives as an image plus a line `Creative uploaded: <url>`. Use that URL for mockups.
6. **Mockups.** Ask which products get the creative (default: all of them), then call `get_bundle` and start one `product-customizer` task per product, all at once. Send each one: the item key, product title, product image URL, creative URL, and any placement the customer asked for.
7. **Feedback.** When the customer comments on a mockup, find that product's customizer task in the `[Tasks]` note and continue it with their words, unchanged. If the task is gone, start a new one and include the item's current mockup URL from `get_bundle`. Don't decide yourself how to edit; the customizer chooses between editing and regenerating.
8. **Save.** When the customer says to save or confirm, call `confirm_bundle`. Mention that drafts expire after 7 days, and that confirming isn't a purchase.
