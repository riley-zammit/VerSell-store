# Principles
- Optimistic UI
- Progressive enhancement (full-page cart fallback + form)

# Assumptions
- Product names can change
- Catalog can grow and shrink
- Build for a large catalog size

# Decisions
## Product
- Use Grid: Fixed even widths, easier to size children consistently so there's no cls between skeleton and not
- Add collection pages to handle large product collections and pagination more gracefully. use query params so its easier to leverage partial prerendering
- Minimize page-level suspense boundaries. Even just a page-level title with an immediate suspense child is better UX
- Keep productRow as generic instead of wrapping it in CategoryRow or FeaturedRow.

## Cart
- Soft navigation to `/cart` is intercepted into a drawer. A hard load, or a submit with JavaScript off, renders the full page. That page blocks on the cart so the lines are in the HTML, because a Suspense hole is revealed by a script. The `@cart` default and catch-all also set `instant` to false. An unconfigured page segment counts as instant, and that rejects the blocking fetch.
- Two httpOnly cookies: the API cart token, and the item count. The count paints the header badge without `GET /cart`. Line items stay on the API.
- Add, quantity, and remove are forms. Checkout is an inert button, disabled until the cart on screen is the API response.
- The add POST waits until the drawer is open. The navigation and the action share one router queue, so sending the POST in the click holds the drawer until the response. 

# Opportunities
