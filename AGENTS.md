# Operating rules
1. if you find yourself going in a loop churning and overthinking, STOP and ask for direction.
2. Don't automatically run client-side tests unless I tell you. You can ask the user if they want you to run them.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Next.js conventions
Follow these when changing this app.

### General Decisions
- Leverage Progressive enhancement: All major site functionality needs to work without JS. Forms work without JS: native GET `action`. `preventDefault` runs only when JS handles the submit.
- Leverage optimistic UI where it makes sense for UX.
- Links go through `NavLink` (`Link` plus a delayed `useLinkStatus` overlay, `absolute` so it does not shift). Primary destinations set `prefetch`.

### Shell and data
- Rendering strategy matters and must be purposefully designed. We try our best to prerender and prefetch as much as possible without sacrificing any dynamic functionality.
- `cacheComponents` is on. Shared data uses a named `cacheLife` 
- Fetching lives in `lib/`, marked `server-only`.
- Pages compose sections. Data is always fetched from the component which consumes it.
- `searchParams` and `params` are read inside the nearest Suspense child, so the shell still prerenders. A heading that does not need the request stays outside the boundary.
- CLS must be zero everywhere. Therefore we leverage skeletons any time suspense is used.

### Errors and requests
- A data function returns `{ data }` or a definitive error string. 404 and 422 return a value, so they cache and render (`notFound()`, or the API message). Transient failures throw and stay uncached.
- `fetch` uses `AbortSignal.timeout`.
- API responses are a discriminated union. Closed sets are enums. Prices are integer cents, formatted with a fixed locale.

### Images, fonts, client leaves
- Optimize images and fonts according to NextJS best practices
- Client components are islands (motion, scroll, form state).

### Comments
- A comment states a constraint the code does not show: why this is cached, why the boundary is here, why the timeout.
