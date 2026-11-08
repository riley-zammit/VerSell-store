# Cart drawer as a parallel + intercepting route: plan

Status: built. Source references are to Next 16.4.3 / React 19.3. The code is the source of truth; snippets below are
the pre-build sketch.

## Changes made while building

- **The add is sent after the drawer's navigation commits, not in the submit event.** Your old log was right: "sending
  the POST in the click holds the drawer until the response." Every router dispatch is
  `startTransition(() => setState(promise))` on one `useState` queue. Two dispatches in one event share a transition
  lane, React renders the latest state (the action's promise), and the drawer waits for the add. `router.push`
  returns nothing, so `CartProvider.add()` queues the form data and pushes, and an effect on `usePathname()` takes
  the queue once and sends it. The add is *not* wrapped in an async `startTransition`, because a pending async action
  entangles every later transition (closing the drawer would wait for the add).
- **Error codes cover both paths.** The enum is `AddError` (`InvalidQuantity`, `ProductUnavailable`, `Failed`), mapped
  from the API's 422 / 404 / other. `addToCart` returns the code, and the drawer and the `/cart` page share one
  message map (`addErrorMessages` in `lib/types.ts`). The API's raw text never reaches the shopper on add.
- **No-JS quantity errors only show after hydration.** With `cacheComponents` the post-back HTML is a PPR resume, and
  Next doesn't pass `formState` to `resumeToFizzStream`. Successful +/−/Remove render fine without JS.
- **Esc uses `onClose`, not `onCancel`.** The dialog closes natively, then `router.back()`. This also covers native
  closes that can't be cancelled.

## Goal

- The drawer is the docs' "modal" pattern: an `@cart` slot in the root layout that intercepts `/cart`.
- No optimistic UI. The cart lines on screen are always the server's cart.
- Progressive enhancement: without JS, every cart form is a plain form post that lands on a real page.
- User feedback is key: add progress and add errors show in the cart (drawer or page), never only under the add form.

## Flows

| Trigger | No JS / hard load | JS (soft navigation) |
| --- | --- | --- |
| Add to cart | POST → `addToCartAndRedirect` → 303 → `/cart` (`?error=<code>` on failure) | push `/cart` (drawer opens) → `addToCart` → `refresh()` re-renders the drawer |
| Header badge | `<a href="/cart">` → full page | `<Link>` → intercepted → drawer |
| Modified click / refresh / shared URL | full `/cart` page | full `/cart` page |
| Quantity −/+/Remove | form POST on the `/cart` page → re-render | same action, `refresh()` re-renders the drawer |
| Close drawer (button, backdrop, Esc) | n/a | `router.back()` |
| Link inside the drawer | n/a | slot falls to the null catch-all → drawer unmounts |
| Back / forward | normal | closes / reopens the drawer |

## Add to cart

### With JS

1. The form's `onSubmit` calls `preventDefault()`, so React skips the form's action (react-dom's form listener checks
   `defaultPrevented`). It then calls `router.push('/cart', { scroll: false })`, then `add(product, formData)` from
   the cart context.
2. The drawer opens with the current cart and an "Adding {name}…" status. The badge link already prefetched the
   drawer's static shell.
3. `add` calls the `addToCart` Server Action. The router queue runs it after the navigation, so it runs against the
   intercepted tree and sends `Next-Url`.
4. `addToCart` adds the item and calls `refresh()`. The server re-renders the intercepted tree, so the drawer shows
   the new line and the badge updates. The status clears in the same commit.
5. On failure, `addToCart` returns the API's message, and the context puts it in the drawer. Thrown failures
   (timeouts, 5xx) are caught in the provider and shown as a generic message.

### Without JS

1. The form posts natively to `addToCartAndRedirect`.
2. That action calls `addToCart`, then redirects: `/cart` on success, `/cart?error=add-failed` on failure.
3. The `/cart` page shows the message for that code above the lines.

### Why two actions instead of one action plus a flag

- An action can't tell JS from no-JS on its own: both are POSTs to the same action. Next distinguishes them
  internally, but there's no public API for it.
- React types a form's `action` as returning `void` (confirmed with `tsc`). So `addToCart`, which returns the error
  string, can't be the form's action directly. The void wrapper the form needs *is* the no-JS entry point.
- So the entry point says which path it is. There's no flag to set or explain.

### `lib/cart-actions.ts`

```ts
// JS path: the add form's submit handler calls this after opening the drawer. Returns the error to show, or null.
export async function addToCart(formData: FormData): Promise<string | null> {
    const parsed = addSchema.safeParse({
        productId: formData.get(CartField.ProductId),
        quantity: formData.get(CartField.Quantity),
    })
    if (!parsed.success) {
        return 'Enter a quantity of at least 1.'
    }
    const { productId, quantity } = parsed.data
    const result = await addItem(productId, quantity)
    if ('error' in result) {
        return result.error
    }
    // The drawer is already open, so re-rendering in place shows the new line and badge count.
    refresh()
    return null
}

// No-JS path: the add form's native action before hydration. A plain post always lands on the cart page.
export async function addToCartAndRedirect(formData: FormData) {
    const error = await addToCart(formData)
    // A fixed code rather than the API's text, so a crafted link can't put arbitrary words on the cart page.
    redirect(error ? `/cart?error=${error}` : '/cart')
}
```

### `components/cart/cart-provider.tsx` (rewrite, much smaller)

```tsx
// The add form and the drawer render in different routes. This is how the drawer hears about an add in flight.
export function CartProvider({ children }: { children: ReactNode }) {
    const [adding, setAdding] = useState<Product | null>(null)
    const [error, setError] = useState<string | null>(null)

    const add = (product: Product, formData: FormData) => {
        setAdding(product)
        setError(null)
        startTransition(async () => {
            let result
            try {
                result = await addToCart(formData)
            } catch {
                result = 'We couldn’t add that item. Try again.'
            }
            // Updates after an await need their own transition, so the status clears with the refreshed cart.
            startTransition(() => {
                setAdding(null)
                setError(result)
            })
        })
    }
    // ...context value: adding, error, add, clearError (stable)
}
```

- No cart promise, no `useOptimistic`, no cart math.
- The drawer clears `error` when it unmounts, so an old failure doesn't greet the next open. If a failure lands after
  the drawer closed, it shows on the next open; that's feedback the shopper would otherwise miss.

### `components/cart/add-to-cart-form.tsx`

```tsx
const router = useRouter()
const { adding, add } = useCart()

// Before hydration the form posts natively and lands on the /cart page.
<form
    action={addToCartAndRedirect}
    onSubmit={(event) => {
        // Open the drawer first. The router runs the action after this navigation,
        // so the action's refresh() re-renders the open drawer.
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        router.push('/cart', { scroll: false })
        add(product, formData)
    }}
>
    ...
    <button type="submit" disabled={disabled || adding !== null}>
```

There's no `useActionState` and no error under the form.

## Drawer

### `app/@cart/(.)cart/page.tsx`

```tsx
// Soft navigations to /cart land here. Hard loads get app/cart/page.tsx.
export default function Page() {
    return (
        <CartDrawer>
            <AddStatus />
            <CartBoundary>
                <Suspense fallback={<CartSkeleton />}>
                    <CartLines variant="drawer" />
                </Suspense>
            </CartBoundary>
        </CartDrawer>
    )
}
```

`(.)cart` sits at the root even though the folder is under `@cart`: interception counts route segments, and slots
aren't segments.

### `components/cart/cart-drawer.tsx` (rewrite)

- Only the intercepted route mounts it, so it's always a soft navigation with a history entry behind it.
- The ref callback calls `showModal()` on mount. The existing `@starting-style` CSS slides it in.
- The close button, backdrop click, and Esc (`onCancel` + `preventDefault`) all call `router.back()`.
- The "close on link click" handler goes away. A link navigates, and the slot's null catch-all unmounts the drawer.
- `CartBoundary` stays inside the sheet, so a failed cart load shows its error in the drawer.

### `AddStatus` (client, in `cart-parts.tsx`)

- Shows "Adding {name}…" (`aria-live="polite"`) while `adding` is set, and the error (`role="alert"`) otherwise.
- Its row has a reserved height, so showing or clearing a message never moves the lines (zero CLS).

## Cart lines, quantity, and badge

- **`getCart`** (`lib/cart.ts`): wrapped in React `cache()`. The badge and the lines both call it, once per request.
- **`CartLines`** (`components/cart/cart.tsx`): becomes an async server component that awaits `getCart()`. It takes
  an optional `error` prop for the page's no-JS add error.
- **`QuantityForm`** (client, in `cart-parts.tsx`): one form per line, using `useActionState(setCartQuantity)`.
  - −, +, and Remove are submit buttons named `quantity`, with values `q - 1`, `q + 1`, and `0`.
  - Buttons disable while pending, and errors show under the line, inside the cart.
  - Works without JS on `/cart`, since that page renders the form and so its action resolves.
- **`setCartQuantity(_prev, formData)`** (`lib/cart-actions.ts`): replaces `updateCartItem` and `removeCartItem`.
  It validates, removes the line at 0 or updates it otherwise, calls `refresh()` on success, and returns the error or
  null.
- **`CartCount`** (server, in `cart.tsx`): `await getCart()` → `<CartBadge count={...} />`. The header keeps its
  `Suspense` with a plain `CartBadge` fallback.
- **`CartBadge`**: a plain `NavLink href="/cart" scroll={false}`, with no `onClick`. It drops `prefetch={false}`, so
  the default prefetch fetches the drawer's static shell and the drawer opens instantly.
- **Checkout**: stays an inert button with no pending state.

## `/cart` page (`app/cart/page.tsx`)

- The heading stays outside Suspense.
- Inside the existing Suspense, a child awaits `searchParams`, maps `?error=<AddError>` to a message, and renders
  `<CartLines variant="page" error={message} />`.
- Comment: it's the page for hard loads, modified clicks, and the no-JS add.

## File structure

```
app/
  layout.tsx                    + `cart` slot prop, render {cart}; CartProvider takes no cart promise; − CartDrawer, − getCart()
  @cart/
    default.tsx                 NEW: null (hard loads)
    page.tsx                    NEW: null (soft nav to `/` closes the drawer)
    [...catchAll]/page.tsx      NEW: null (soft nav anywhere else closes the drawer)
    (.)cart/page.tsx            NEW: CartDrawer + AddStatus + CartBoundary + Suspense + CartLines
  cart/page.tsx                 + no-JS add error from ?error, read inside Suspense
components/cart/
  add-to-cart-form.tsx          rewrite: native action for no-JS, onSubmit → push + add() for JS
  cart-provider.tsx             rewrite: adding + error + add(); no cart promise, no optimistic changes
  cart-drawer.tsx               rewrite: opens on mount, every close is router.back(), takes children
  cart.tsx                      server component: async CartLines + CartCount
  cart-parts.tsx                CartBadge loses onClick; + QuantityForm; + AddStatus
  state-helpers.ts              DELETE
components/layout/root/header.tsx   import CartCount from cart.tsx
lib/
  cart.ts                       cache(getCart)
  cart-actions.ts               addToCart (JS) + addToCartAndRedirect (no JS); setCartQuantity replaces update/remove
  types.ts                      + AddError enum + addErrorMessages
architecture-decisions-log.md   rewrite the Cart section
```

## Trade-offs and edge cases

- **Old cart while adding.** The drawer shows the old cart plus the "Adding…" status until the refresh lands. That's
  a pending state, not optimistic UI.
- **Relies on router queue order.** The push must queue before the action. In the queue, a later action waits behind
  a navigation, but a later navigation *discards* a pending action's state. That ordering is undocumented and being
  rewritten (`experimental.concurrentRouterQueue`). The old drawer relied on the same ordering.
- **Closing mid-add.** The action still completes, and the badge updates through `refresh()`. An error shows on the
  next open.
- **Double submit.** The button is disabled while `adding` is set, and the modal covers the form anyway.
- **No close animation.** `router.back()` unmounts the dialog immediately, so the slide-out CSS goes unused.
- **Badge on the full `/cart` page** opens the drawer over the cart page. Harmless.
- **Scroll.** `scroll: false` on the push and the badge, so the page under the drawer doesn't jump.
- **Refreshing with the drawer open** loads the full `/cart` page, as the docs describe.
- **No-JS errors are generic.** It's one code, not the API's message. More codes can be added if we learn the 422
  cases.
- **First add** writes the cookie, which clears the client prefetch cache once. No change from today.

## Build order

1. **Spike the routing** with the slot, `(.)cart`, the null pages, and the layout prop. Check:
   - badge soft nav → drawer; hard load of `/cart` → full page
   - a link inside the drawer closes it; back/forward toggles it
   - `/` and an unknown URL still render (home, 404)
   - `next build` passes under `cacheComponents`: catch-all slot next to the products' `generateStaticParams`, and the
     docs' "if one slot is dynamic, all slots at that level must be" note
2. **Spike the add ordering:** push, then the action. Confirm:
   - the drawer re-renders with the new line and the badge updates
   - the action resolves when POSTed to the intercepted `/cart`, where Next may forward it to another worker
3. **Server pieces:** `cache(getCart)`, `CartLines` and `CartCount` as server components, `addToCart` and
   `addToCartAndRedirect`, `setCartQuantity`, and the `/cart` error code.
4. **Client pieces:** the provider, the drawer, `AddStatus`, `QuantityForm`, the add form, and the badge.
5. Delete `state-helpers.ts`, and update the decisions log.
6. **Manual pass:** with JS (every flow above, including a forced 422 and a thrown failure), then with JS disabled (add
   success, add failure → `/cart?error=`, quantity forms).

## Open questions

1. OK to lose the drawer's slide-out animation for now? YES
2. OK to make quantity controls forms (works without JS) rather than client `onClick` buttons? YES
3. One generic no-JS error code, or a few (e.g. unavailable vs. quantity) once we see the API's 422 messages? As specific errors as possible!

---

## Explored options (for reference)

### A. The action calls `redirect('/cart')` on both paths

- **Idea:** without JS it's a 303 to the cart page; with JS, the redirect would get intercepted into the drawer.
- **Why not:** a Server Action only sends `Next-Url` when the current tree already contains an interception route
  (`server-action-reducer.js`, `hasInterceptionRouteInCurrentTree`). From a product page the redirect renders and
  navigates to the full `/cart` page, never the drawer.
- This is a documentation gap; a Next.js feedback report was drafted.

### B. The action returns; the form pushes to `/cart` after the add lands

- **Idea:** the drawer opens only once the item is in. It needs no provider and uses only documented behavior.
- **Why not:** add errors render under the form, which is a no-go. Feedback belongs in the cart. The drawer also
  opens a full round trip after the click.

### C. Push on submit; the form's action calls `redirect('/cart', RedirectType.replace)`

- **Idea:** one action and no flag. The drawer is open by the time the action runs, so its redirect is intercepted.
  Must be `replace`, or history gets two `/cart` entries.
- **Why not:**
  - Nothing in the drawer says an add is pending, so it looks like the cart without the item.
  - Errors land on the form behind the drawer.
- **Variant:** redirect to `/cart?error=<code>` on failure. That puts errors in the drawer, but there's still no
  pending signal.

### D. Push to `/cart?add=…`; the drawer page does the add while it renders

- **Why not:**
  - A page render can't set cookies (Next's `cookies` docs), and the first add creates the cart and writes the token.
  - It re-runs whenever that URL renders again: `refresh()` from a quantity change, back/forward, reload, prefetch.
    That means duplicate adds.
  - A GET with a side effect has no CSRF protection, unlike a Server Action. Any external link could add items.

### E. A context holds the pending add; the drawer runs it on mount

- **Why not:**
  - It's a mutation in an effect. Strict Mode double-runs it in dev, and remounts (back/forward, the boundary's
    retry) can re-run it.
  - If the drawer never mounts (a slow navigation, a quick back), the add is lost or late.
  - It couples the drawer to add logic the submit handler already has.
- The chosen design keeps the context but runs the add in the submit handler.

### F. Ways for one action to tell JS from no-JS

- **A flag field set only by `onSubmit`:** this worked, but the form's `action` must return `void`, so it still
  needed a wrapper. That wrapper is the chosen second action.
- **Read Next's internal `next-action` request header:** undocumented, so it could break silently.
- **Always redirect and catch the redirect on the client:** success arrives as a thrown redirect that has to be told
  apart from real errors.

### G. The previous design (what this replaces)

- An always-mounted `<dialog>` in the root layout, opened by DOM calls, with `useOptimistic` cart math in a provider.
- It was dropped for complexity. The intercepted-route version had been abandoned earlier only because of the
  optimistic UI.
