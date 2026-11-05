# Principles
- Optimistic UI

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

## Collection
- Keep collection pages dynamic to account for future different possible filters. e.g. featured=true, category=x

## Cart
- Cart drawer as an intercepted route was extremely complex due to optimistic UI; remove that in favor of a client component but keep progressive enhancement
- Keep only the API cart token in an httpOnly cookie. The header streams the numeric badge from `GET /cart` and shows the plain cart icon while it resolves.
- Cart mutations are client-handled controls that call validated Server Actions. Checkout is an inert button, disabled until the cart on screen is the API response.
- The add POST waits until the drawer is open. The navigation and the action share one router queue, so sending the POST in the click holds the drawer until the response. 
- Add to cart is progressively enhanced: one `useActionState` Server Action. No-JS posts back to the product page (no redirect; a `/cart` permalink 409s because Next only resolves actions on pages that render them). With JS, `onSubmit` opens the drawer and adds the optimistic line. Quantity controls still require JavaScript.

## Agent
### Ideas
- Swag creator & drop
- Private store-within-a-store

### Reqs
- Durable turns based on Workflows
- Blob storage for files
- 

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

# Opportunities
