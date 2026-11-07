# Operating rules
1. if you find yourself going in a loop churning and overthinking, STOP and ask for direction.
2. Don't automatically run client-side tests unless I tell you. You can ask the user if they want you to run them.
3. Ensure all code is simple and human-readable. Don't over-abstract; humans need to be able to follow along.

# Progressive Enhancement
- Rule: We're building for slow networks, not devices with JS disabled. Therefore assume slow hydration but still leverage suspense boundaries.

# Skills
If you're the Pi coding agent, look inside ./cursor for skills and subagents. In there, the skills format and folder structure is standard.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Next.js conventions
Follow these when changing this app.

### General Decisions
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

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
