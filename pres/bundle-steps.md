 0. Page load. proxy.ts sets the visitor cookie if it's missing. AgentContextProvider reads eve-session from
 localStorage and replays that session if there is one.

 1. First message. agent.send creates Eve's main session, owned by the visitor id, and the session cursor is saved
 to localStorage. Every message also carries the current page path. That's how Eve finds out the bundle id on a
 bundle page.

 2. request_concept_approval
 - Bundle: pauses for Approve, then saves a draft bundle:<id> to Redis with a 7-day expiry. This is where a bundle
   id is created.
 - Session: the returned bundleId sits in Eve's conversation history from here on.
 - Browser: opens /bundle/<id>, and RememberBundle adds the id to visitor:<visitorId>:bundles.

 3. product-finder ×N
 - Session: each call starts a task (taskId) with its own child session, which the browser follows.
 - Bundle: the finder learns the bundle id and slot only from the Bundle: and Slot: lines in its first message.
 - Shop tools call mcp.shop.com with the Shop token for the visitor id. The sign-in is per customer and shared
   across sessions.
 - Store search and rank_products are read-only: the swag API and one model call.
 - save_bundle_item writes bundle:<id>:items with the id from the Bundle: line and resets the expiry.
 - Afterwards: the browser refreshes the page. The task goes idle with its conversation intact and is listed in
   Eve's [Tasks] note.

 4. finalize_bundle(bundleId)
 - Bundle: reads Redis and pauses for Approve. Approving marks the bundle approved and removes the expiry on
   bundle:<id>, its items and its mockups.
 - Browser: takes the bundleId from the call's input, then adds the VerSell products to the cart through the swag
   API and the cart cookie.

 5. Changes
 - Which bundle: Eve gets the id from the page path sent with the message, or from its conversation history.
 - Different product: Eve continues the finder with its taskId. The same child session remembers its bundle and
   slot, and saves again.
 - Add, drop or swap slots: update_bundle(bundleId) rewrites the slots, items and mockups in Redis and turns the
   bundle back into a 7-day draft.

 6. Creative
 - Session: the attachment lands in the main session's sandbox (.eve/attachments).
 - Bundle: save_creative(bundleId, path) copies it to Blob at bundles/<id>/creative/…. The creative URL then lives
   only in the conversation until a mockup is published.

 7. get_bundle
 - With an id: reads bundle:<id>, its items and its mockups.
 - Without an id: uses the session owner (the visitor id) to list that visitor's bundles.

 8. product-customizer ×N
 - Session: each call is a task with a child session, plus its own sandbox with no network. The bundle id and item
   come from the Bundle: and Item: lines.
 - generate_mockup creates the image with Gemini and saves a draft to Blob at bundles/<id>/mockups/<item>/….
 - load_image copies a Blob image into the customizer's sandbox for editing.
 - publish_mockup checks that the draft's path matches this bundle and item, then writes bundle:<id>:mockups.
 - Feedback continues the same taskId.

 9. Checkout. The button sends a message, so the page path tells Eve the bundle id. get_bundle runs, then the Shop
 checkout calls, using the visitor's Shop token. Eve then links to /cart.