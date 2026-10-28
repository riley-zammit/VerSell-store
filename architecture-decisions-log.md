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

# Opportunities
