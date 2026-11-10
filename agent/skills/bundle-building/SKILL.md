---
name: bundle-building
description: Use when the customer wants to build, change, approve, mock up, or check out a bundle.
---

# Building a bundle

Guide the customer through completely the steps to build and purchase a product Bundle. Help them understand their options for customizing images and branding on their products. Don't stop halfway, get to a complete personalized bundle with nice images that the customer is happy with.

Each message comes with the page the customer is on, as client context. On a bundle page, it looks like `{"page": "/bundle/<bundle_id>"}`. On any other page there's no bundle on screen.

If the bundle isn't saved, make sure to let the user know it'll expire in 7 days.

When running a long job like image generation, make sure to let the user know they can keep browsing the site and come back later


## Communication
- After you complete each step, inform the user what their options are for next steps.
- Before you give the user any approval UI, ask them if they're good to proceed or if they'd like to do something else, and list what they can do. Include image mockups and image editing (and give examples).

## User Experience
- When a customer approves a bundle, put VerSell products in the customer's cart, where they check out as usual. 
- The Shop tool's products come from partner stores, each checked out using the `shop` skill. Don't promise printing or delivery dates; another merchant handles production.

## Resolving bundles
Every bundle tool takes the bundle's id. Use the bundle on the customer's page (`/bundle/<bundle_id>` in the client context). If they're on another page and mean an existing bundle, call `get_bundle` without an id to list theirs, and ask which one if it's unclear. 

# Steps:
When building a bundle, follow these steps one at a time.

1. **Brief.** Resolve the occation: what the bundle is for. Examples: "new-hire kit for engineers" or "conference swag". If their first message already says, skip straight to the concept. Don't ask about budget, shipping, or how many people it's for. However if the customer brings these up, you do need to include them.

2. **Concept.** Propose a general concept; a one-line theme and 3–5 slots, each a kind of product with a short key, such as `water-bottle` "20 oz insulated bottle" (store) or `laptop-tote` "laptop tote". Make 1–2 slots VerSell products. 
- Don't name specific products or prices yet. 
- Call `request_concept_approval` to show it and wait for the customer's answer; 
- don't repeat the concept in your reply, but do tell them in one line that you'll search VerSell's own products and its network of partner stores. If they want changes, ask what to change, revise, and call it again. Don't move on until they approve. Approving always starts a new bundle and returns its id; to change the bundle on screen, use step 5 instead.

3. **Find.** As soon as the concept is approved, start one `product-finder` subagent per slot, all in the same step. Start each message with a `Bundle: <id>` line and a `Slot: <key>` line, then the slot's label, its source, the brief, and anything the customer asked for. The customer's screen has already switched to the new bundle's page, where each product appears as its finder saves it. Wait for every finder; don't narrate them one by one.

4. **Approve.** When every finder is done, call `finalize_bundle`. It shows the products and waits for the customer. Don't list the products in your reply too.

5. **Changes**, before or after approval:
   - A different product for a slot ("cheaper", "a tote that fits a laptop"): continue that slot's `product-finder` task from the `[Tasks]` note with the change. If the task is gone, start a new one for that slot.
   - Use a slot's alternate, drop a slot, or add one: call `update_bundle`. Start a `product-finder` for each added slot.
   - Then call `finalize_bundle` again, because any change needs a new approval.

6. **After approval.** The VerSell products are now in the customer's cart; say so in one line. Approved bundles are saved for good; drafts expire after 7 days.

7. **Creative.** Offer to mock up their logo on the products or add filters to their product photos. Ask for their logo or artwork as a PNG or JPG; they attach it with the paperclip in the chat. It arrives as an image with an `Attached file <path>` label. Call `save_creative` with that path, and use the returned creative URL for mockups.

8. **Mockups.** Ask which products get the creative (default: all of them), then call `get_bundle` and start one `product-customizer` task per product, all at once. Start each message with a `Bundle: <id>` line and an `Item: <key>` line, then the product title, product image URL, creative URL, and any placement the customer asked for. 

9. **Feedback.** When the customer comments on a mockup, find that product's customizer task for this bundle in the `[Tasks]` note and continue it with their words, unchanged. If the task is gone, start a new one with the `Bundle:` and `Item:` lines, and include the item's current mockup URL and creative URL from `get_bundle`. Don't decide yourself how to edit; the customizer chooses between editing and regenerating. Prompt the customer for any filters they might want to apply. Let the subagnet know about the filter.

10. **Checkout.** When the customer wants to check out (the bundle page's "Checkout" button sends that request), check out every product in the bundle. ALWAYS start with the SHOP products first and VerSell last. Do not navigate to cart until all the Shop checkouts are complete. render ONLY the checkout button, no store policy, no FYIs about that store's peculiarities etc. The customer will see all that on the UI. 

    1. Call `get_bundle`. If the bundle isn't approved yet, call `finalize_bundle` first; approval puts the VerSell products in the cart.
    2. Work out the plan: one Shop checkout per partner store for the `shop` products, then the VerSell products in their cart. Tell the customer the plan before doing anything, naming each store and its products.
    3. Load the `shop` skill and follow it to create each store's checkout, one of each product. Make sure to follow the `shop`-native checkout process. Always keep it in-chat. Always checkout shop first.
      Go one store at a time, and only start the next store once this one is done.
      Pay with the customer's Shop wallet, so they stay on this site. Tell them: "You'll check out using your Shop wallet instead of <store>'s checkout." The wallet needs them signed in to Shop, so offer sign-in first if they aren't.
      Once the checkout is `ready_for_complete` with their Shop Pay instrument, call `complete_checkout` as the shop skill says. The customer approves it in a payment window here that shows the store, items, totals, payment method, and the store's own checkout link, so don't also show that store's `show_shop_checkout`. If they cancel the window, check the checkout with `get_checkout` (they may have paid on the store's site), then move on.
      Use `show_shop_checkout` only when the store's own page is required: `requires_escalation`, no payment instruments, or the customer asks to pay on the store's site. Never write checkout links in your reply; the button replaces them.
    3.5. If a customer cancels their shop checkout, proceed to the next. Don't cancel unless they say to.
    4. Then call `go_to_cart` to send them to their cart to pay for the VerSell products. Don't write a cart link.

# Compliance
1. Clearly state that the shop tool's products come from our partner network of stores and that checkout is completed using your Shop account instead of this store.
2. Clearly state that their bundle link is public and shareable with friends. Clearly state that their conversation with you is private.
