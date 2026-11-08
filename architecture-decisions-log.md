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

# Caching layer
- Original instinct was to cache at the data layer. Going to move this into components because it provides finer-grain control. Data layer is more flexible but we're not building a general-purpose WYSIWYG here, we're building a highly-optimized site. (We're building a ferrari not a minivan!) Might shift to caching to data layer if we were to allow non-developers to edit the UI via a pagebuilder, or potentially needed the API call in a client component.

# Progressive Enhancement
- Defined here as slow network delays JS bundle. We assume Suspense still works becuase it's inline JS
- Decision: build for the vast majority of users with JS enabled rather than edge-casey no-JS. The problem we're solving for is slow networks on mobile devices; that has real business impact. Building a bad experienfe for those customers just so we can handle a few JS-disabled devices is the wrong call.

# Decisions
## Product
- Use Grid: Fixed even widths, easier to size children consistently so there's no cls between skeleton and not
- Add collection pages to handle large product collections and pagination more gracefully. use query params so its easier to leverage partial prerendering
- Minimize page-level suspense boundaries. Even just a page-level title with an immediate suspense child is better UX
- Keep productRow as generic instead of wrapping it in CategoryRow or FeaturedRow.
- Cache at the function level to let us create multiple product layouts

## Cart
- We may need to make a tradeoff between optimistic ui and progressive enhancement because for PE we should be using parallel routes rather than a client cart component (client component makes makes the no-js experience feel a no-op because we can't as cleanly redirect to /cart dynamically)
- Originally used a parallel route for cart so we could server-render but Cart should be client component to feel snappy. The server round-trip to open the drawer felt slow. Once we moved that to the client, the parallel route started getting in the way: Prefetching the route, managing the state across routes - optimistic add was a pain

- Keep only the API cart token in an httpOnly cookie. Cart views are server components reading `cache(getCart)`. The header streams the numeric badge and shows the plain cart icon while it resolves.
- Add with JS: the form opens the drawer (`router.push('/cart')`), and `CartProvider` sends the add once that navigation commits. Sent in the submit event, the add joins the navigation's transition (React renders the router's latest state, the action's), which holds the drawer until the add lands. The drawer shows "Adding…" and any error from the provider. Errors never show under the form.
- Add without JS: a second action (`addToCartAndRedirect`) redirects to `/cart`, or `/cart?error=<AddError>` on failure. A code, not API text, so crafted links can't put words on the page. A redirect from a Server Action can't open the drawer: the action only sends `Next-Url` when the tree already holds an intercepted route.
- Quantity controls are one form per line (`useActionState(setCartQuantity)`), so they work without JS. Known gap: with `cacheComponents` the post-back HTML is a PPR resume, which doesn't receive `formState`, so a no-JS quantity *error* only appears after hydration. Successful changes render fine.
- The API doesn't enforce stock on add or update (an over-stock quantity returns 201/200). Checkout is an inert button.

# Agent
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
