# Optimistic cart (count and lines): plan

Status: not built. Builds on `cart-plan.md` (intercepted `@cart` drawer, `CartProvider`, `refresh()` after actions).

The previous attempt (`cart-plan.md` §G) did `useOptimistic` cart math in an always-mounted dialog and was dropped for
complexity. This version keeps the intercepted route, does no math, and keeps adds out of transitions.

## Goal

- The header count and the cart lines show the shopper's change immediately.
- No client math. We never want to try to reproduct an ecomm engine's calculations which can be complex (various currencies, taxes etc). Line totals and the subtotal stay the server's values and update with `refresh()`.
- The server stays the source of truth. Optimistic state is temporary and is dropped when its action settles.
- No-JS is unchanged: forms still post, client components still render to HTML on the server.

## What's optimistic

| Thing | Optimistic? | Source |
| --- | --- | --- |
| Line quantity | yes | quantity changes, pending add |
| Line shown or hidden (new line on add, hidden at 0) | yes | quantity changes, pending add |
| Header count | yes | server count + pending changes |
| Line total, subtotal | no | server, updates with the refresh |
| Stock message, checkout disabled | no | server |

## Pending state: two sources, both in `CartProvider`

1. **Adds use the existing `adding` state, not `useOptimistic`.** `useOptimistic` needs the add inside an async
   transition, and a pending async action entangles every later transition: closing the drawer would wait for the
   add (`cart-plan.md`, "Changes made while building"). `adding` widens from `Product` to `{ product, quantity }`. It
   already clears in a transition together with the result.
2. **Quantity changes (+/−/Remove) use `useOptimistic`.** The line's `useActionState` action is already a transition,
   so calling the provider's setter there holds the change until that action settles. No new entanglement: these
   actions are transitions today.

```tsx
// One entry per +/−/Remove in flight. React drops it when that action settles.
type QuantityChange = {
    productId: string
    quantity: number // absolute; 0 hides the line
    countChange: number // for the header count
}

const [quantityChanges, addQuantityChange] = useOptimistic(
    [] as QuantityChange[],
    (changes, change: QuantityChange) => [...changes, change],
)
```

The line calls it at the start of its action:

```tsx
const [error, formAction, pending] = useActionState(async (previous: string | null, formData: FormData) => {
    const quantity = Number(formData.get(CartField.Quantity))
    addQuantityChange({
        productId,
        quantity,
        countChange: quantity - shownQuantity,
    })
    return setCartQuantity(previous, formData)
}, null)
```

## Deriving what's shown

Lines, in order:

1. Start from the server's lines.
2. The latest quantity change for a product sets its quantity. 0 hides the line.
3. A pending add for a product already in the cart adds to its quantity. Otherwise it appends a new line built from
   `adding.product`, with no line total.

Count: server count + every `countChange` + `adding.quantity` while adding.

## Components

- **`CartLines` (server)** becomes the loader: `getCart()` and the stock checks. It passes plain props to the client
  list: slim lines (`productId`, `name`, `slug`, `image`, `quantity`, `lineTotal`), stock messages by product id,
  `overStock`, `subtotal`, `variant`, `error`.
- **`CartLineList` (client)** owns the empty state, the list, the subtotal row and checkout. It reads `useCart()` and
  derives the shown lines. The empty state moves here because a pending add can turn "empty" into one line.
- **`CartLine` + `QuantityForm` (client).** `QuantityForm` absorbs `QuantityActionForm`. The buttons stop being server
  children, since their values come from the shown quantity.
- **`CartCount` (server)** stays the fetcher. **`CartBadge` becomes client** and applies the pending changes. The
  Suspense fallback (`<CartBadge />`, no count) still shows no number.

## Totals while a change is pending

- No math. A changed line's total and the subtotal show the server's (stale) values, dimmed with `aria-busy`, until
  the refresh replaces them.
- A new line's price slot is a fixed-width placeholder, so nothing shifts when the real total arrives.
- When the server cart is empty and an add is pending, the subtotal row shows the same placeholder.

## Flows

| Trigger | Count | Lines | On failure |
| --- | --- | --- | --- |
| Add (JS) | + quantity immediately | line appears or grows once the drawer's lines mount | reverts; error in the status row |
| + / − | changes on click | quantity changes; totals dim | reverts; error under the line |
| Remove | drops on click | line hides; last line shows the empty state | line returns; error under the line |
| No JS | unchanged | unchanged | unchanged |

## Edge cases and things to verify

- **No blink on handoff.** Adds rely on `setAdding(null)` landing in the same commit as the refreshed lines
  (`cart-plan.md` says the status already does). Quantity changes rely on the action's refresh committing with the
  action. Verify neither flashes the old value.
- **Line order.** A new line is appended at the end. Verify the API's order, or it jumps when the refresh lands.
- **Skeleton phase.** The add is sent while `CartSkeleton` shows, so the new line only appears once the lines mount.
  The "Adding {name}…" status covers that gap.
- **One change at a time per line.** The fieldset stays disabled while pending. Rapid clicks would queue in
  `useActionState`, and a queued action's optimistic update only applies when it starts, so the number would lag.
- **Stock.** New or changed lines show no stock message until the refresh. Checkout's disabled state is the server's.
- **Closing mid-change.** Same as today: quantity actions are already transitions.

## Files

```text
components/cart/
  cart.tsx            CartLines becomes the loader; CartCount passes its count to the client badge
  cart-lines.tsx      new, client: CartLineList, CartLine, QuantityForm, CartBadge
  cart-islands.tsx    QuantityActionForm removed (absorbed); CartError stays
  cart-provider.tsx   adding gains quantity; quantityChanges + addQuantityChange
  add-to-cart-form.tsx  unchanged (still `adding !== null`)
app/@cart/(.)cart/cart-drawer.tsx   status reads adding.product.name
lib/types.ts          slim line type shared by the loader and the client list
architecture-decisions-log.md       Cart section: optimistic count and lines, no math
.agents/cart-plan.md  Goal: drop "No optimistic UI", point here
```

## Build order

1. Provider state: widen `adding`, add `quantityChanges`.
2. Move the lines to the client with no optimism yet. Check parity, including the no-JS `/cart` page.
3. Apply the pending changes to the lines and the count.
4. Pending totals: dimming and the new-line placeholder.
5. Update the decisions log and `cart-plan.md`.

## Open questions

- Should the drawer's fallback show the pending add line during the skeleton phase? It needs a client fallback and
  care with CLS.
- Allow rapid clicks? Needs the `useActionState` queueing worked out.
- Dim stale totals, or leave them as they are until the refresh?
