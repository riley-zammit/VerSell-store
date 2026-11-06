# Bundle builder: plan

Status: draft v2 for review. Nothing below is built yet.

## 1. What the customer experiences

1. The customer opens the **chat bubble** (bottom right, on every store page) and describes what they want:
   "a welcome kit for 20 new hires, around $60 each".
2. The concierge (root agent) hands the brief to the **product-set-selector** subagent. As soon as it starts, the chat
   expands into the full-page **bundle page** (`/bundle/[id]`) through a client-side navigation with a view transition.
3. The selector proposes a concept, picks 1–2 products from this store, and sources the rest from Shop. For each Shop
   search, **Jev scores the candidates and code keeps the top two**: the best becomes the item, the runner-up is kept as
   its alternate. The selector saves a **draft** bundle, and the bundle page fills in live.
4. The customer tweaks the bundle ("swap the notebook for a tote", "use the alternate bottle"). The concierge continues
   the same selector with its `taskId`.
5. The customer **uploads creative** (PNG or JPG only) from the chat composer.
6. The customer picks which products get the creative. The concierge calls the **product-customizer** once per product,
   and the calls run in parallel. Each one makes a mockup with `google/gemini-3.1-flash-image`.
7. The customer gives feedback on a mockup ("crop it tighter", "logo on the other side"). The concierge passes the
   feedback to that item's customizer task. The customizer **edits with ImageMagick if it can**, and only regenerates
   with Gemini if ImageMagick can't make the change.
8. The customer **confirms** the bundle, and it's saved. Unconfirmed drafts expire on their own. There's no purchase.
   Mockups are illustrations only; another merchant would do the printing.

## 2. Agents and tools

Every step is its own tool, so the whole flow stays agentic and shows up in traces.

```
agent/                                   ROOT: concierge
  instructions.md                        rewrite: VerSell concierge, bundle flow, feedback routing
  connections/shop-mcp.ts                unchanged behaviour; auth moved to agent/lib/shop-auth.ts
  skills/shop/                           unchanged (rename skill.md → SKILL.md, see §10)
  tools/escalate.ts                      existing
  tools/get_bundle.ts                    read this session's bundle + latest mockups (Redis)
  tools/confirm_bundle.ts                mark the bundle confirmed so it stops expiring (Redis)
  lib/shop-auth.ts                       shared Shop device-flow auth + token store (moved out of shop-mcp.ts)

  subagents/product-set-selector/
    agent.ts                             description + model
    instructions.md                      ideate → store picks → Shop search → Jev → get_product → save
    connections/shop.ts                  Shop MCP, same auth, tools.allow = search/lookup/get only (§3)
    skills/shop-search.md                search section of the Shop skill (skills are per agent)
    tools/search_store_products.ts       this store's catalog (bottles, cups, mugs)
    tools/rank_products.ts               Jev: one choice question, code returns the top two (§4)
    tools/save_bundle.ts                 validate with the zod schema, write the draft to Redis

  subagents/product-customizer/
    agent.ts                             description + model (needs vision to check its output)
    instructions.md                      generate; on feedback, ImageMagick first, regenerate only if needed
    sandbox.ts                           its own Vercel Sandbox, ImageMagick installed in prepare (§6)
    skills/image-editing/SKILL.md        what versell-img can and can't do, and the edit loop
    skills/image-editing/scripts/versell-img   ImageMagick wrapper CLI (bash)
    tools/generate_mockup.ts             Gemini (product image + creative [+ feedback]) → Blob → Redis (§5)
    tools/load_image.ts                  image URL → file in the sandbox
    tools/publish_mockup.ts              sandbox file → Blob → Redis, returns the image so the model can check it

lib/
  bundle.ts                              Bundle zod schema + Redis read/write helpers (no Next imports; shared by agent and app)
  swag-api.ts                            plain store API fetch, moved out of lib/api.ts (agent can't import `server-only`/`next/cache`)
```

### Root (concierge)
- Owns the conversation, the creative, and which products get customized.
- Calls `product-set-selector` to build or revise the bundle, and `product-customizer` once per selected product.
- **Feedback routing:** for feedback on a mockup, the root continues that item's customizer task with its `taskId`.
  eve's `[Tasks]` note lists idle tasks. If the task is gone, it starts a new one with the current mockup URL from
  `get_bundle`.
- Uses `get_bundle` to read item details (image URLs, item keys) instead of relying on a subagent's reply text.
- Calls `confirm_bundle` only after the customer clearly says to save. The bundle page's "Save bundle" button sends that
  message, so the agent stays the only path.
- No image tools and no ImageMagick. Its existing `sandbox.ts` is unchanged.

### product-set-selector
- Input: the brief in plain text (recipient, occasion, quantity, budget, ship-to, style).
- Loop:
  1. Come up with a concept of 3–6 items.
  2. `search_store_products` for 1–2 store items.
  3. For each Shop item: `search_catalog` → `rank_products` (Jev) → `get_product` on the winner → `save_bundle`.
- **Why `get_product`:**
  - Search results already include one image per product. The Shop skill tells agents to show "each product's
    returned image".
  - `get_product` gives the variant ID, a confirmed price and stock, and the full image set. A clean product shot makes
    a better mockup.
  - So we call it once per winner, not for every candidate. The alternate only gets a `get_product` call if the
    customer swaps to it.
- Reply: a short summary. The bundle itself lives in Redis.

### product-customizer
- First call: one item (`itemKey`, product title, product image URL, creative URL, placement notes) →
  `generate_mockup`. It checks the returned image (logo readable, product unchanged) and retries at most twice.
- **Feedback** (same task, continued by the root): edit first, regenerate last.
  1. Read the `image-editing` skill and decide whether a `versell-img` command covers the request. Examples:
     - ImageMagick can: crop, resize, rotate, brightness/contrast/saturation, remove a flat background, pad, sharpen,
       or convert format.
     - ImageMagick can't: move the logo to another part of the product, change the angle, change the print style
       (embroidery, engraving), or change the product's colour realistically.
  2. If it's covered: `load_image` (latest mockup) → `bash versell-img …` → `publish_mockup`, then check the returned
     image.
  3. If it isn't: `generate_mockup` again with the feedback added to the prompt.
  4. Its reply says which path it took ("edited" or "regenerated") and why.
- The edit-or-regenerate check is written into the instructions, not a separate tool. If it proves unreliable, a Jev
  boolean question can make the call instead.

### Bundle ID
- `bundleId` = the root session ID.
- Subagent tools read it from `ctx.session.parent.rootSessionId`, so the model never copies IDs around. Root tools use `ctx.session.id`.
- The client already knows the session ID, so it can navigate to `/bundle/<sessionId>` without asking the agent.

## 3. Shop in the selector, without cart tools

The selector gets its own Shop connection file. The eve-native way to keep cart and checkout tools out of reach is the
connection's **tool filter**, not a hook:

```ts
// agent/subagents/product-set-selector/connections/shop.ts
export default defineMcpClientConnection({
  url: "https://mcp.shop.com",
  description: "Search Shopify's global catalog for products.",
  auth: shopAuth, // from agent/lib/shop-auth.ts: same token store as the root connection
  tools: { allow: ["search_catalog", "lookup_catalog", "get_product"] },
});
```

- Blocked tools are never listed to the model, so it can't call them at all. Hooks run *after* events are recorded and
  can't veto a call; the closest a hook gets is cancelling the whole turn.
- Belt and braces, if wanted: add an `approval` policy that returns `"denied"` for any name containing `cart`,
  `checkout`, `spend_request`, or `order`.
- Sign-in prompts from the child show up in the root session, which is the documented subagent behaviour. Search
  works anonymously, so research normally needs no sign-in.

## 4. Jev: `rank_products`

- `decide()` from `eve/ai`. With no `model` it uses `typesafe-ai/jev` **through Vercel AI Gateway**, with the same auth as
  our other models (`AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN`). No extra credentials needed.
- Input (the model copies fields from the `search_catalog` result):
  `{ need, brief, candidates: [{ id, title, price, currency, seller, url, imageUrl, summary }] }`, with 2–10 candidates.
- **One choice question:**
  - criteria keys are `c1…cN`, each describing one candidate (title · price · seller · summary)
  - the instructions say to pick the best fit for `need` within `brief`
- **The code picks the top two:**
  - a choice answer includes `probabilities` for every option
  - sort the candidates by that score and return the top two, each with its score: `{ best, alternate }`
  - the model doesn't do the ranking
- If `probabilities` is missing, return `{ best: choice, alternate: null }` and note it in the result.
- The selector saves `best` as the item and `alternate` on the same item.

## 5. Mockups with `google/gemini-3.1-flash-image`

- AI Gateway lists this model as a **language model**, not an image model: it isn't in `GatewayImageModelId`. So we call
  `generateText` with two image parts (product + creative) plus text, and read the image from `result.files`.
  `generateImage` doesn't apply. Verify in phase 3.
- The app runtime fetches both images as bytes and passes them inline.
- Output goes to Blob at `bundles/<id>/mockups/<itemKey>/<random>.png`. The tool then sets the latest mockup for that
  item in Redis (§7).
- Gemini is used **only** to create a mockup from the customer's creative, including regenerating with feedback.
  Everything ImageMagick can do goes through ImageMagick (§6).

## 6. Image editing: the customizer's own sandbox with ImageMagick

- **Yes, a subagent can have its own sandbox.**
  - A declared subagent's folder can hold its own `sandbox/`. Without one it gets eve's default, not the root's.
  - Only a subagent using `defineParentSandbox()` shares the root's. That's also the case that can't declare its own
    skill files, so ours can.
  - So `agent/subagents/product-customizer/sandbox.ts`:
    ```ts
    export default defineSandbox({
      environment: VercelSandbox.environment({
        prepare: async (sandbox) => {
          await sandbox.run({ command: "sudo apt-get update && sudo apt-get install -y imagemagick" });
        },
      }),
    });
    ```
  - `prepare` runs at build time into a snapshot. Sessions start with ImageMagick already installed.
  - The root's sandbox stays as it is.
- **One sandbox per customizer task.**
  - Parallel customizers don't share files.
  - A sandbox is only opened on first use, so a mockup that never gets an edit never starts one.
  - Every edit starts with `load_image` from the latest Blob URL, so nothing depends on files surviving in the sandbox.
- **CLI:** `skills/image-editing/scripts/versell-img`, a small bash script with one subcommand per operation. It calls `magick`
  when present and falls back to `convert` (Ubuntu ships ImageMagick 6).
  - `info <in>`: size, format, has-alpha
  - `resize <in> <out> --width N | --height N | --fit WxH`
  - `crop <in> <out> --box WxH+X+Y` and `trim <in> <out>`
  - `rotate <in> <out> --degrees N`
  - `adjust <in> <out> [--brightness N] [--contrast N] [--saturation N]`
  - `remove-bg <in> <out> [--fuzz 10%]`: make a near-uniform background transparent
  - `pad <in> <out> --to WxH [--color #fff]`
  - `sharpen <in> <out>`, `convert <in> <out.png|jpg>`
- **Skill:** `SKILL.md` has two parts: the can/can't list from §2, which is the decision rule, and the loop:
  `load_image` → `bash $HOME/.agents/skills/image-editing/scripts/versell-img …` → `publish_mockup`.
- **Moving files:**
  - `load_image` and `publish_mockup` run in the app runtime, so the Blob and Redis tokens never enter the sandbox and
    the sandbox needs no network.
  - `publish_mockup` returns the image (`toolOutputPart.fileUrl`) so the model sees the result.

## 7. Storage

### Options on Vercel for the bundle record

| Option | Fit |
| --- | --- |
| **Upstash Redis** (Marketplace; this is what Vercel KV became) | **Recommended.** Key/value with per-key expiry, so drafts clean themselves up. Updates to one field are safe when several things write at once. One package (`@upstash/redis`), no schema. eve already integrates with Upstash for memory. |
| Neon Postgres (Marketplace; this is what Vercel Postgres became) | Proper tables and queries, e.g. "all confirmed bundles" for the printing merchant. Costs a schema and migrations. Worth it once confirmed bundles need to be listed or reported on. |
| Edge Config | Built for fast reads and rare writes. Wrong fit. |
| Blob (v1 plan) | Fine for files, poor for a record that keeps changing. Every update rewrites the whole JSON, CDN caching can serve a stale copy, and parallel customizers would conflict. |
| eve session state only | Subagents and the bundle page can't read it. |

**Decision for v1: Upstash Redis for the bundle record, Blob for images.** Drafts expire, and confirmed bundles stay.
Moving to Postgres later only means swapping out `lib/bundle.ts`.

### Keys
```
bundle:<id>            JSON Bundle. status "draft" with a 7-day TTL; confirm_bundle sets "confirmed" + PERSIST
bundle:<id>:mockups    hash: itemKey → { mockupUrl, creativeUrl, updatedAt }  (same TTL / PERSIST)
```
- `save_bundle` overwrites `bundle:<id>`. Only the selector writes it.
- Each customizer writes only its own `itemKey` field in the mockups hash, so parallel runs can't overwrite each other.

### Blob (images only)
```
bundles/<id>/creative/<random>.png|jpg            customer uploads
bundles/<id>/mockups/<itemKey>/<random>.png       every mockup version, generated or edited
```
- **Images get versioned paths.** Overwriting a public blob's path can serve a stale copy from the CDN. New files avoid
  that and keep history, so undo becomes possible later. Redis points to the latest version.
- Draft images aren't cleaned up in v1. A daily cron that deletes `bundles/<id>/` when `bundle:<id>` is gone can come
  later.

### Schema (`lib/bundle.ts`, zod)
```
Bundle    { id, status: "draft" | "confirmed", concept, brief, createdAt, updatedAt, confirmedAt?, items: Item[] }
Item      { key, source: "store" | "shop", product: Product, alternate?: Product, reason }
Product   { title, priceCents, currency, imageUrl, productUrl, seller?, productId, variantId? }
```
`source` and `status` are closed sets, so they're enums. Prices are integer cents, per the repo conventions.

## 8. Frontend: chat bubble → bundle page

### Recommendation: a persistent client chat in the root layout, not a parallel route
- Both the bubble and the bundle page must share **one live `useEveAgent` store**. Otherwise the conversation, stream,
  and in-flight turn reset on navigation. That store has to live in the root layout, which persists across soft
  navigations, whether or not we use a slot.
- With the state already in the layout, a `@chat` slot would only decide how the chat looks. It would cost:
  - a `default.tsx` plus a catch-all `null` page to close it on other routes
  - stale slot content on soft navigation (documented Next behaviour)
  - no slot state after a hard reload
- This matches the cart drawer decision in `architecture-decisions-log.md`: the intercepted route was dropped for a client
  component.
- Alternative, if you'd still rather use a slot: `app/@chat/default.tsx` (bubble) + `app/@chat/bundle/[id]/page.tsx`
  (docked panel), with the provider still in the root layout.

### Pieces
- `components/eve/chat-provider.tsx` (client):
  - one `useEveAgent({ followAgents: true, initialSession, resume })`
  - saves the session cursor to `localStorage` from `onSessionChange`, so a reload on `/bundle/[id]` resumes the same chat
- `components/eve/chat-surface.tsx` (client):
  - **one** mounted component with two modes, chosen by `usePathname()`: a floating bubble panel on store pages, and a
    docked side panel on `/bundle/*`
  - because it never remounts, scroll position and composer text survive the transition
- `components/eve/chat-messages.tsx` and `chat-composer.tsx`:
  - extracted from `app/chat/page.tsx`
  - the composer gets a PNG/JPG picker that uploads to Blob from the browser (`@vercel/blob/client` `upload()`), then sends
    `[{ type: "text" }, { type: "file", data: blobUrl, mediaType }]`
  - eve fetches the public URL, so the model sees the creative and has its URL for the customizer
- `app/api/creative-upload/route.ts`: the `handleUpload` token route
  - allows only `image/png` and `image/jpeg`, with a size cap (e.g. 10 MB)
  - the pathname must start with `bundles/<sessionId>/creative/`
- **Auto-expand:** when a `product-set-selector` tool part appears and we're not on `/bundle`, the provider calls
  `router.push(\`/bundle/${sessionId}\`, { transitionTypes: ["bundle-open"] })`.
- **`app/bundle/[id]/page.tsx`:**
  - the heading sits outside Suspense; the Suspense child reads `params` and loads the bundle and mockups from Redis,
    with a skeleton matching the grid for zero CLS
  - not cached, because it changes while the agent works
  - shows items, newest mockups, and per-item status from the followed child sessions ("selecting", "generating
    mockup", "editing")
  - a **Save bundle** button sends a chat message; it shows as "Saved" once `status` is `confirmed`
- **Live updates:** when a selector or customizer call settles, call `router.refresh()`.
- **View transitions** (React `<ViewTransition>`, no config needed in Next 16):
  - the chat surface is wrapped with `name="eve-chat" share="morph"`, so the bubble morphs into the docked panel
  - the bundle page uses enter/exit keyed on `bundle-open` / `bundle-close`
  - pointer events pass through `::view-transition`, and `prefers-reduced-motion` turns animation off
- **Layout:**
  - move the store pages into an `app/(store)/` route group that owns `Header`/`Footer`/`CartDrawer`
  - `/bundle/[id]` gets a minimal header ("← Back to store", `nav-back`) for the full-page feel
  - the root layout keeps `<html>`, fonts, providers, and the chat surface
  - URLs don't change
- Remove `app/chat/page.tsx`. Its UI moves into the components above.
- `next.config.ts` `images.remotePatterns`: add the Blob store's `bundles/**` and Shop's image CDN host (confirm from real
  `search_catalog` results).

## 9. Config and env

- `npm i @vercel/blob @upstash/redis`. `@vercel/blob` is only there indirectly today.
- Blob store on the Vercel project → `BLOB_READ_WRITE_TOKEN`.
- Upstash Redis from the Vercel Marketplace, connected to the project. The integration injects the REST URL and token;
  `vercel env pull` brings them down locally.
- Already present: AI Gateway auth (covers Sonnet, Jev, Gemini), `SWAG_API_URL`, `SWAG_API_BYPASS_TOKEN`.
- No secrets in either sandbox.

## 10. To verify during the build

1. **Gemini output:** that `generateText` + `result.files` returns the edited image for `google/gemini-3.1-flash-image`,
   and that it accepts two input images.
2. **Jev scores:** that `decide()` accepts runtime-built criteria keys (`c1…cN`) and that Jev fills in `probabilities`
   for a choice answer.
3. **Customizer sandbox:**
   - that a subagent's own `sandbox.ts` gets its own build snapshot with ImageMagick
   - whether a continued task (same `taskId`) keeps the same sandbox; we don't rely on it either way
4. **Sandbox file transfer:** that the `ctx.getSandbox()` handle can write and read binary files for `load_image` /
   `publish_mockup`.
5. **Parent session ID:** that `ctx.session.parent.rootSessionId` is present in subagent tool contexts.
6. **File messages:** that `useEveAgent().send()` accepts a URL file part from the composer.
7. **Upstash env names:** confirm which variable names the integration injects, and use `Redis.fromEnv()` or pass them
   explicitly.
8. **Skill filename:** `agent/skills/shop/skill.md` is lowercase. Packaged skills require `SKILL.md`; it works on macOS
   (case-insensitive) but may break on Linux builds. Rename it.
9. **Upload route auth:** there's no auth (any caller can write to any session's prefix). Acceptable for the prototype;
   mark `TODO(prod)` like the existing Shop token store.

## 11. Build order (each phase testable on its own with `eve dev`)

1. **Foundations:** `@vercel/blob` + `@upstash/redis`, both stores, `lib/bundle.ts`, `lib/swag-api.ts` (and point
   `lib/api.ts` at it).
2. **Selector:** `agent/lib/shop-auth.ts`, the filtered Shop connection, `search_store_products`, `rank_products`,
   `save_bundle`, instructions. Check: a brief in the TUI produces a valid draft in Redis, with alternates.
3. **Customizer, generate:** `generate_mockup` + instructions. Check: one store product + a sample logo URL → a mockup
   in Blob, pointer in Redis.
4. **Customizer, edit:** its `sandbox.ts`, `versell-img`, skill, `load_image` / `publish_mockup`. Check:
   - "crop and brighten it" → edited with ImageMagick
   - "put the logo on the other side" → regenerated
5. **Root:** instructions rewrite (flow + feedback routing), `get_bundle`, `confirm_bundle`.
6. **Frontend:**
   - chat provider/surface/composer + upload route
   - `(store)` route group
   - bundle page
   - auto-expand + view transitions
   - remove `/chat`
   - image hosts

## 12. Out of scope

Purchase/checkout, real printing, customer auth, cleaning up draft images, the Slack staff→customer reply path, and
evals (worth adding after phase 5).
