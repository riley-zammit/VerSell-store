# Bundle builder: plan

Status: draft for review. Nothing below is built yet.

## 1. What the customer experiences

1. The customer opens the **chat bubble** (bottom right, on every store page) and describes what they want:
   "a welcome kit for 20 new hires, around $60 each".
2. The concierge (root agent) hands the brief to the **product-researcher** subagent. As soon as research starts, the
   chat expands into the full-page **bundle page** (`/bundle/[id]`) through a client-side navigation with a view transition.
3. The researcher proposes a concept, picks 1–2 products from this store, and sources the rest from Shop. **Jev picks
   the best match** from each Shop search. It saves the bundle to Blob, and the bundle page fills in live.
4. The customer tweaks the bundle ("swap the notebook for a tote"). The concierge continues the same researcher with
   its `taskId`.
5. The customer **uploads creative** (PNG or JPG only) from the chat composer.
6. The customer picks which products get the creative. The concierge calls the **product-customizer** subagent once per
   product, and the calls run in parallel. Each one makes a mockup with `google/gemini-3.1-flash-image`.
7. The customer asks for edits ("crop it tighter", "make it brighter", "remove the white background"). The concierge
   edits with the **ImageMagick CLI in the sandbox**, not Gemini.
8. The bundle is saved. There's no purchase. Mockups are illustrations only; another merchant would do the printing.

## 2. Agents and tools

Every step is its own tool, so the whole flow stays agentic and shows up in traces.

```
agent/                                   ROOT: concierge
  instructions.md                        rewrite: VerSell concierge, bundle flow, image-edit rules (§6)
  sandbox.ts                             + prepare: install ImageMagick (§6)
  connections/shop-mcp.ts                unchanged behaviour; auth moved to agent/lib/shop-auth.ts
  skills/shop/                           unchanged (rename skill.md → SKILL.md, see §10)
  skills/image-editing/SKILL.md          how and when to use versell-img
  skills/image-editing/scripts/versell-img   ImageMagick wrapper CLI (bash)
  tools/escalate.ts                      existing
  tools/get_bundle.ts                    read this session's bundle from Blob
  tools/load_image.ts                    Blob/HTTPS image URL → sandbox file
  tools/publish_image.ts                 sandbox file → Blob (new mockup or creative version)
  lib/shop-auth.ts                       shared Shop device-flow auth + token store (moved out of shop-mcp.ts)

  subagents/product-researcher/
    agent.ts                             description + model
    instructions.md                      ideate → store picks → Shop sourcing → Jev → save
    connections/shop.ts                  Shop MCP, same auth, tools.allow = search/lookup/get only (§3)
    skills/shop-search.md                search section of the Shop skill (skills are per agent)
    tools/search_store_products.ts       this store's catalog (bottles, cups, mugs)
    tools/pick_best_product.ts           Jev decide() over Shop candidates (§4)
    tools/save_bundle.ts                 validate with the zod schema, write bundle.json to Blob

  subagents/product-customizer/
    agent.ts                             description + model (needs vision to check its output)
    instructions.md                      one product per call; generate → inspect → retry ≤2
    tools/generate_mockup.ts             Gemini (product image + creative) → Blob (§5)

lib/
  bundle.ts                              Bundle zod schema + Blob read/write helpers (no Next imports; shared by agent and app)
  swag-api.ts                            plain store API fetch, moved out of lib/api.ts (agent can't import `server-only`/`next/cache`)
```

### Root (concierge)
- Owns the conversation, the creative, and which products get customized.
- Calls `product-researcher` to build or revise the bundle, and `product-customizer` once per selected product.
- Uses `get_bundle` to read item details (image URLs, item keys) instead of relying on the researcher's reply text.
- Image edits go through the `image-editing` skill, using `load_image` → `bash versell-img …` → `publish_image`.

### product-researcher
- Input: the brief in plain text (recipient, occasion, quantity, budget, ship-to, style).
- Loop: come up with a concept of 3–6 items → `search_store_products` for 1–2 store items → per Shop item, `search_catalog`
  → `pick_best_product` (Jev) → optional `get_product` to confirm options/price → `save_bundle`.
- Reply: a short summary. The bundle itself lives in Blob.

### product-customizer
- Input: one item: `itemKey`, product title, product image URL, creative URL, placement notes.
- `generate_mockup` returns the Blob URL plus the image itself (`toolOutputPart.fileUrl`), so the model can check
  that the logo is readable and the product unchanged. It retries with clearer placement at most twice.
- Reply: the final mockup URL and any caveats.

### Bundle ID
- `bundleId` = the root session ID.
- Subagent tools read it from `ctx.session.parent.rootSessionId`, so the model never copies IDs around. Root tools use `ctx.session.id`.
- The client already knows the session ID, so it can navigate to `/bundle/<sessionId>` without asking the agent.

## 3. Shop in the researcher, without cart tools

The researcher gets its own Shop connection file. The eve-native way to keep cart and checkout tools out of reach is the
connection's **tool filter**, not a hook:

```ts
// agent/subagents/product-researcher/connections/shop.ts
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

## 4. Jev: `pick_best_product`

- `decide()` from `eve/ai`. With no `model` it uses `typesafe-ai/jev` **through Vercel AI Gateway**, with the same auth as
  our other models (`AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN`). No extra credentials needed.
- Input (the model copies fields from the `search_catalog` result):
  `{ need, brief, candidates: [{ id, title, price, currency, seller, url, imageUrl, summary }] }`, with at most 10 candidates.
- Implementation: one `choice` question. The criteria keys are `c1…cN`, each describing its candidate (title · price ·
  seller · summary). The instructions say to pick the best fit for `need` within `brief`.
- Output: the chosen candidate object, unchanged. The researcher passes it on to `save_bundle`.

## 5. Mockups with `google/gemini-3.1-flash-image`

- AI Gateway lists this model as a **language model**, not an image model: it isn't in `GatewayImageModelId`. So we call
  `generateText` with two image parts (product + creative) plus text, and read the image from `result.files`.
  `generateImage` doesn't apply. Verify in phase 3.
- The app runtime fetches both images as bytes and passes them inline.
- Output goes to `bundles/<id>/mockups/<itemKey>/<random>.png`.
- Gemini is used **only** to create a mockup from the customer's creative. All later edits use ImageMagick (§6).

## 6. Image editing: ImageMagick CLI in the sandbox

- **Install:** in the root `agent/sandbox.ts`, add `prepare` to run
  `sudo apt-get update && sudo apt-get install -y imagemagick` (eve's base image is Ubuntu). `prepare` runs once per
  snapshot, not per session.
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
- **Skill:** `image-editing/SKILL.md` documents the commands and the loop: `load_image` → run `bash
  $HOME/.agents/skills/image-editing/scripts/versell-img …` → check the result with `read_file` → `publish_image`.
- **Moving files:**
  - `load_image` and `publish_image` run in the app runtime, so the Blob token never enters the sandbox and the sandbox needs no network.
  - `publish_image({ path, target: { kind: "mockup", itemKey } | { kind: "creative" } })` writes a new versioned file.
- **Rule** (root instructions):
  - Image edit requests use ImageMagick by default.
  - Use `product-customizer` only to create a mockup from creative, or when the request can't be done in 2D. For example, "move the logo to the side of the mug" means regenerating with new placement notes.

## 7. Storage (Vercel Blob)

```
bundles/<bundleId>/bundle.json                  the bundle (overwritten by save_bundle)
bundles/<bundleId>/creative/<random>.png|jpg    uploads + edited versions
bundles/<bundleId>/mockups/<itemKey>/<random>.png   every mockup version; newest wins
```

- **Images get versioned paths.** Overwriting a public blob's path can serve a stale copy from the CDN. New files avoid
  that, keep history (undo becomes possible later), and mean parallel customizers never write the same file.
- **The bundle page** reads `bundle.json`, then lists `mockups/` and takes the newest file per `itemKey` (`uploadedAt`).
- **Bundle schema** (`lib/bundle.ts`, zod):
  ```
  Bundle { id, concept, brief, createdAt, updatedAt, items: Item[] }
  Item   { key, source: "store" | "shop", title, priceCents, currency, imageUrl, productUrl,
           seller?, productId, variantId?, reason }
  ```
  `source` is a closed set, so it's an enum. Prices are integer cents, per the repo conventions.

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
- **Auto-expand:** when a `product-researcher` tool part appears and we're not on `/bundle`, the provider calls
  `router.push(\`/bundle/${sessionId}\`, { transitionTypes: ["bundle-open"] })`.
- **`app/bundle/[id]/page.tsx`:**
  - the heading sits outside Suspense; the Suspense child reads `params` and loads the bundle from Blob, with a
    skeleton matching the grid for zero CLS
  - not cached, because it changes while the agent works
  - shows items, newest mockups, and per-item status from the followed child sessions (researching / generating mockup)
- **Live updates:** when a researcher/customizer call or `publish_image` settles, call `router.refresh()`.
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

- `npm i @vercel/blob` as a direct dependency (it's only there indirectly today).
- Create a Blob store on the Vercel project and `vercel env pull` → `BLOB_READ_WRITE_TOKEN`.
- Already present: AI Gateway auth (covers Sonnet, Jev, Gemini), `SWAG_API_URL`, `SWAG_API_BYPASS_TOKEN`.
- No new secrets in the sandbox.

## 10. To verify during the build

1. **Gemini output:** that `generateText` + `result.files` returns the edited image for `google/gemini-3.1-flash-image`, and that it accepts two input images.
2. **Jev candidate keys:** that `decide()` accepts runtime-built criteria keys (`c1…cN`) and returns one of them.
3. **Sandbox file transfer:** that the `ctx.getSandbox()` handle can write and read binary files for `load_image` / `publish_image`.
4. **Parent session ID:** that `ctx.session.parent.rootSessionId` is present in subagent tool contexts.
5. **File messages:** that `useEveAgent().send()` accepts a URL file part from the composer.
6. **Skill filename:** `agent/skills/shop/skill.md` is lowercase. Packaged skills require `SKILL.md`; it works on macOS
   (case-insensitive) but may break on Linux builds. Rename it.
7. **Upload route auth:** there's no auth (any caller can write to any session's prefix). Acceptable for the prototype;
   mark `TODO(prod)` like the existing Shop token store.

## 11. Build order (each phase testable on its own with `eve dev`)

1. **Foundations:** `@vercel/blob`, Blob store, `lib/bundle.ts`, `lib/swag-api.ts` (and point `lib/api.ts` at it).
2. **Researcher:** `agent/lib/shop-auth.ts`, the filtered Shop connection, `search_store_products`, `pick_best_product`,
   `save_bundle`, instructions. Check: a brief in the TUI produces a valid `bundle.json`.
3. **Customizer:** `generate_mockup` + instructions. Check: one store product + a sample logo URL → a mockup in Blob.
4. **Image editing:** sandbox `prepare`, `versell-img`, skill, `load_image` / `publish_image`. Check: "crop and brighten
   the mug mockup" produces a new version.
5. **Root:** instructions rewrite (flow + edit rule), `get_bundle`.
6. **Frontend:**
   - chat provider/surface/composer + upload route
   - `(store)` route group
   - bundle page
   - auto-expand + view transitions
   - remove `/chat`
   - image hosts

## 12. Out of scope

Purchase/checkout, real printing, customer auth, the Slack staff→customer reply path, and evals (worth adding after
phase 5).
