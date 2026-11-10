---
name: bundle-building
description: Use when the customer wants to build, change, approve, or mock up a bundle.
---

# Building a bundle

1. **Brief.** The only thing to ask is the topic: what the bundle is for, such as "new-hire kit for engineers" or "conference swag". If their first message already says, skip straight to the concept. Never ask about budget, shipping, or how many people it's for. If the customer brings any of these up, pass them along.
2. **Concept.** Propose a one-line theme and 3–5 slots, each a kind of product with a short key, such as `water-bottle` "20 oz insulated bottle" (store) or `laptop-tote` "laptop tote" (shop). Make 1–2 slots VerSell products (bottles, cups, mugs). Don't name specific products or prices yet. Call `approve_bundle_concept` to show it and wait for the customer's answer; don't repeat the concept in your reply. If they want changes, ask what to change, revise, and call it again. Don't move on until they approve.
3. **Find.** As soon as the concept is approved, start one `product-finder` per slot, all in the same step. Start each message with `Slot: <key>`, then the slot's label, its source, the brief, and anything the customer asked for. The customer's screen has already switched to their bundle page, where each product appears as its finder saves it. Wait for every finder; don't narrate them one by one.
4. **Approve.** When every finder is done, call `finalize_bundle`. It shows the products and waits for the customer. Don't list the products in your reply too.
5. **Changes**, before or after approval:
   - A different product for a slot ("cheaper", "a tote that fits a laptop"): continue that slot's `product-finder` task from the `[Tasks]` note with the change. If the task is gone, start a new one for that slot.
   - Use a slot's alternate, drop a slot, or add one: call `update_bundle`. Start a `product-finder` for each added slot.
   - Then call `finalize_bundle` again, because any change needs a new approval.
6. **After approval.** The VerSell products are now in the customer's cart; say so in one line. The Shop products link to their merchants on the bundle page. Approved bundles are saved for good; drafts expire after 7 days.
7. **Creative.** Offer to mock up their logo on the products. Ask for their logo or artwork as a PNG or JPG; they attach it with the paperclip in the chat. It arrives as an image with an `Attached file <path>` label. Call `save_creative` with that path, and use the returned creative URL for mockups.
8. **Mockups.** Ask which products get the creative (default: all of them), then call `get_bundle` and start one `product-customizer` task per product, all at once. Send each one: the item key, product title, product image URL, creative URL, and any placement the customer asked for.
9. **Feedback.** When the customer comments on a mockup, find that product's customizer task in the `[Tasks]` note and continue it with their words, unchanged. If the task is gone, start a new one and include the item's current mockup URL from `get_bundle`. Don't decide yourself how to edit; the customizer chooses between editing and regenerating.
