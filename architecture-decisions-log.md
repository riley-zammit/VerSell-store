# Principles
- Optimistic UI

# Assumptions
- Product and collection "stable" data may change frequenty
- Catalog can grow and shrink
- Build for a large catalog size

# Prerendering
- Keep ProductGrid static; does not resolve url params. Wrap it in an async component to resolve URL page params so we can cache the grid with clean keys. 10-minute expiry in case the collection updates. Remember cache and build time are completely separate things. genereally speaking cache is a fallback to knowing at build time.
- Collection prerendering: Option to fully generate all collection pages by changing url to /[collection-slug]/[page]. ProductGrid already doesn't care about how we get the page, 
so changing this here wouldn't affect other layouts. Decision: Let's not do this because we want to keep optionality for a huge catalog and we'd have to hit the API for each page at build. Right now the Grid is cached remotely by page so the added build time isn't really buying us much... but it's worth testing out to confirm if that network hop to the cache is really detrimental.

# Prefetching
- Use partial prefetch `true` to resolve dynamic routes when quantity of routes is known or small. Use `auto` when it's unknown or larger (product grid)

# Caching layer
- Original instinct was to cache at the data layer. Going to move this into components because it provides finer-grain control. Data layer is more flexible but we're not building a general-purpose WYSIWYG here, we're building a highly-optimized site. (We're building a ferrari not a minivan!) Might shift to caching to data layer if we were to allow non-developers to edit the UI via a pagebuilder, or potentially needed the API call in a client component.
- Cache locally for mostly static components (since remote has an added cost of a network hop), cache remotely when the component cost is high (API call)

# Progressive Enhancement
- Defined here as slow network delays JS bundle. We assume Suspense still works becuase it's inline JS
- Decision: build for the vast majority of users with JS enabled rather than edge-casey no-JS. The problem we're solving for is slow networks on mobile devices; that has real business impact. Building a bad experienfe for those customers just so we can handle a few JS-disabled devices is the wrong call.

# Decisions
## Product
- Use Grid: Fixed even widths, easier to size children consistently so there's no cls between skeleton and not
- Add collection pages to handle large product collections and pagination more gracefully.
- Minimize page-level suspense boundaries. Even just a page-level title with an immediate suspense child is better UX

## Cart
- Originally used a parallel route for cart so we could server-render but Cart should be client component to feel snappy. The server round-trip to open the drawer felt slow. Once we moved that to the client, the parallel route started getting in the way: Prefetching the route, managing the state across routes - optimistic add was too complex
- Enforce random stock differences in the cart as a second layer. Typically we'd do this at checkout if we accept the cart add, but bring it up since we're not writing checkout.
- An add or `+` that would take a line past available stock fails rather than clamping, and the optimistic change rolls back. Lowering always applies, since that's how the shopper clears a stock message. A failed stock check doesn't block: checkout makes the final call.
- Keep only the API cart token in an httpOnly cookie. The root layout starts `getCart()` without awaiting it and passes the promise to the client `CartProvider`; cart readers `use()` it inside Suspense. The header shows the plain cart icon while it resolves.
- Add with JS: `onSubmit` opens the drawer (plain client state) and sends `addToCart` in a transition with an optimistic line. The drawer shows "Adding…" and any error from the provider. Errors never show under the form.
- Add without JS: a second action (`addToCartAndRedirect`) redirects to `/cart`, or `/cart?error=<AddError>` on failure
- Ensure errors show on non-JS cart page via redirect


# Agent
## Design
- Wrap useEveAgent in a provider to have it available across the store
- Tie a bundle to a specific conversation ID. Eve manages context, so there's no benefit to allowing a new conversation within a bundle. This also removes some complexity which comes from either a) keying bundles to a session cookie and b) fetching related sessions, possibly multiple, per bundle.
- Use redis because bundles are short-lived and drafts can expire. Also we only ever query by ID - no complex schema management needed.

## Subagents
### Propose-products
- Needs to know about bundle ID. Easier this way to delegate multiple subagents and have the parent simply pass feedback, rather than need to know about populating the UI


## Features
Bundle builder and customizer. 
- Build bundles with products from Versell AND from our partner stores
- Customize them all with your logo
- Purchase

“We’re having a company offsite next Friday. Use our website to create a three-product capsule collection for 20 contributors under $1,200. Keep it tasteful, generate print-ready artwork, build an approval page, and prepare the cart.”

 That single workflow can showcase:

 - Web browsing: go to the company's site and get logos and colors
 - Blob Storage
 - Image generation
 - Iteration and validation & recovery
 - Budget reasoning/decision making
 - Page deployment
 - Commerce actions
 - Email when complete?

## Limitations and Decisons
- Saving bundles should obviously rely on auth in production but for demo purposes don't force everyone to go through and create accounts just to try it out. That would make it much easier to manage stale mockups and persist the bundle (which right now is just a cookie). Currently they just pile up and we proabably need a job to prune the blob store