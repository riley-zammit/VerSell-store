'use client'

import { flushSync } from 'react-dom'
import Form from 'next/form'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, startTransition, useActionState, useCallback, useContext, useEffect, useMemo, useOptimistic, useRef, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import { NavLink } from '@/components/nav-link'
import { addToCart, addToCartNow, forgetCart, removeCartItem, updateCartItem } from '@/lib/cart-actions'
import { formatPrice } from '@/lib/format'
import { CartField, type Cart, type CartItem, type CartResult, type Product } from '@/lib/types'

type Variant = 'page' | 'drawer'

type Session = {
    pending: boolean
    mutating: boolean
    optimistic: Cart | null
    partial: boolean
    settled: Cart | null
    error: string | null
    optimisticCount: number | null
}

const emptySession: Session = {
    pending: false,
    mutating: false,
    optimistic: null,
    partial: false,
    settled: null,
    error: null,
    optimisticCount: null,
}

type CartApi = Session & {
    syncCookie: (count: number) => void
    remember: (cart: Cart) => void
    startAdd: (product: Product, quantity: number) => void
    finishAdd: (result: CartResult) => void
    armAdd: (formData: FormData) => boolean
    releaseAdd: () => void
    cancelArmedAdd: () => void
    beginChange: (count: number | null) => void
    endChange: (count: number) => void
    clearCount: () => void
}

const CartContext = createContext<CartApi | null>(null)

function useCart() {
    const value = useContext(CartContext)
    if (!value) throw new Error('Cart controls must render inside CartProvider')
    return value
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState(emptySession)
    const [live, setLive] = useOptimistic(session, (_current: Session, next: Session) => next)
    const cookieCount = useRef(0)
    const known = useRef<Cart | null>(null)
    const sessionRef = useRef(session)
    const liveRef = useRef(live)
    const armedAdd = useRef<FormData | null>(null)
    const sendingAdd = useRef(false)

    useEffect(() => {
        sessionRef.current = session
        liveRef.current = live
    })

    const syncCookie = useCallback((count: number) => {
        cookieCount.current = count
    }, [])
    const remember = useCallback((cart: Cart) => {
        known.current = cart
    }, [])
    const startAdd = useCallback((product: Product, quantity: number) => {
        const had = known.current
        // Session, not the optimistic hook: that hook reverts when its transition ends, and this
        // update has to outlive the click so the drawer can open on it.
        const next = {
            pending: true,
            mutating: true,
            optimistic: applyAdd(had ?? emptyCart(product.currency), product, quantity),
            partial: !had,
            settled: null,
            error: null,
            optimisticCount: (had?.totalItems ?? cookieCount.current) + quantity,
        }
        setSession(next)
    }, [])
    const finishAdd = useCallback((result: CartResult) => {
        const previous = known.current
        const next: Session = 'error' in result
            ? { ...emptySession, error: result.error, settled: previous, optimisticCount: previous?.totalItems ?? null }
            : { ...emptySession, settled: result.cart, optimisticCount: result.cart.totalItems }
        if (!('error' in result)) known.current = result.cart
        setLive(next)
        setSession(next)
    }, [setLive])
    const dropAdd = useCallback(() => {
        const previous = known.current
        const next: Session = { ...emptySession, settled: previous, optimisticCount: previous?.totalItems ?? null }
        setLive(next)
        setSession(next)
    }, [setLive])
    const armAdd = useCallback((formData: FormData) => {
        if (sendingAdd.current || armedAdd.current) return false
        armedAdd.current = formData
        return true
    }, [])
    const releaseAdd = useCallback(() => {
        const formData = armedAdd.current
        if (!formData || sendingAdd.current) return
        armedAdd.current = null
        sendingAdd.current = true
        // The add and the /cart navigation share one router queue. Dispatching
        // the POST in the click holds that navigation until the response, so
        // the sheet never paints the pending cart. Send it once the sheet is open.
        startTransition(() => {
            void addToCartNow(formData).then(
                (result) => startTransition(() => {
                    sendingAdd.current = false
                    finishAdd(result)
                }),
                (caught: unknown) => startTransition(() => {
                    sendingAdd.current = false
                    dropAdd()
                    throw caught
                }),
            )
        })
    }, [finishAdd, dropAdd])
    const cancelArmedAdd = useCallback(() => {
        if (!armedAdd.current || sendingAdd.current) return
        armedAdd.current = null
        dropAdd()
    }, [dropAdd])
    const beginChange = useCallback((count: number | null) => {
        setLive({
            ...liveRef.current,
            mutating: true,
            error: null,
            optimisticCount: count ?? liveRef.current.optimisticCount,
        })
    }, [setLive])
    const endChange = useCallback((count: number) => {
        const next = { ...sessionRef.current, mutating: false, optimisticCount: count }
        setLive(next)
        setSession(next)
    }, [setLive])
    const clearCount = useCallback(() => {
        const next = { ...sessionRef.current, optimisticCount: null }
        setLive(next)
        setSession(next)
    }, [setLive])

    const api = useMemo<CartApi>(() => ({
        ...live,
        syncCookie,
        remember,
        startAdd,
        finishAdd,
        armAdd,
        releaseAdd,
        cancelArmedAdd,
        beginChange,
        endChange,
        clearCount,
    }), [live, syncCookie, remember, startAdd, finishAdd, armAdd, releaseAdd, cancelArmedAdd, beginChange, endChange, clearCount])

    return <CartContext.Provider value={api}>{children}</CartContext.Provider>
}

export function CartBadge({ count }: { count: number }) {
    const { optimisticCount, syncCookie } = useCart()
    useEffect(() => {
        syncCookie(count)
    }, [count, syncCookie])
    const shown = optimisticCount ?? count

    return (
        <NavLink
            href="/cart"
            prefetch
            aria-label={`Cart, ${shown} ${shown === 1 ? 'item' : 'items'}`}
            className="relative inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-foreground/5"
        >
            <BagIcon />
            <span className="min-w-4 text-center tabular-nums">{shown}</span>
        </NavLink>
    )
}

export function CartLinkSkeleton() {
    return (
        <span aria-hidden className="inline-flex items-center gap-1.5 px-2 py-1">
            <span className="size-5 animate-pulse rounded bg-foreground/10" />
            <span className="h-4 w-4 animate-pulse rounded bg-foreground/10" />
        </span>
    )
}

export function CartDrawer({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const releaseAdd = useCart().releaseAdd
    const ref = useRef<HTMLDialogElement>(null)
    // The slot can stay mounted after back(). Follow the URL so the sheet actually leaves.
    const open = pathname === '/cart'

    useEffect(() => {
        const dialog = ref.current
        if (!open || !dialog) return
        if (!dialog.open) dialog.showModal()
        releaseAdd()
        const close = () => router.back()
        const onCancel = (event: Event) => {
            event.preventDefault()
            close()
        }
        const onClick = (event: MouseEvent) => {
            if (event.target === dialog) close()
        }
        dialog.addEventListener('cancel', onCancel)
        dialog.addEventListener('click', onClick)
        return () => {
            dialog.removeEventListener('cancel', onCancel)
            dialog.removeEventListener('click', onClick)
            if (dialog.open) dialog.close()
        }
    }, [open, router, releaseAdd])

    if (!open) return null

    return (
        <dialog
            ref={ref}
            className="cart-drawer"
            aria-labelledby="cart-title"
            // :modal beats a class selector, so the sheet's box lives here.
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 'auto',
                margin: 0,
                padding: 0,
                border: 'none',
                height: '100dvh',
                maxHeight: 'none',
                width: 'min(100vw, 28rem)',
                maxWidth: 'none',
                background: 'transparent',
            }}
        >
            <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="flex shrink-0 items-center justify-between px-5 py-4">
                    <h2 id="cart-title" className="text-2xl">Your cart</h2>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="Close cart"
                        className="grid size-10 place-items-center rounded-full hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-foreground"
                    >
                        <CloseIcon />
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    )
}

export function CartScreen({ cart, count, variant }: { cart: Cart | null; count: number; variant: Variant }) {
    const router = useRouter()
    const { remember, clearCount, pending, settled, optimistic, partial, error } = useCart()
    const cleared = useRef(false)

    useEffect(() => {
        if (cart) remember(cart)
    }, [cart, remember])

    useEffect(() => {
        // Cookie count survived a cart the API no longer has. Drop it so the badge can return to zero.
        if (cleared.current || cart || count === 0 || pending || settled) return
        cleared.current = true
        clearCount()
        forgetCart().then(() => router.refresh())
    }, [cart, count, pending, settled, clearCount, router])

    const waitingOnAdd = pending && optimistic != null
    const shown = waitingOnAdd ? optimistic : prefer(settled, cart)

    return (
        <CartEditor
            cart={shown}
            confirmed={!waitingOnAdd}
            partial={waitingOnAdd && partial}
            addError={error}
            variant={variant}
        />
    )
}

export function CartFallback({ variant }: { variant: Variant }) {
    const live = useCart()
    const cart = live.pending && live.optimistic ? live.optimistic : live.settled
    if (!cart) return <CartSkeleton />
    return (
        <CartEditor
            cart={cart}
            confirmed={!live.pending}
            partial={live.pending && live.partial}
            addError={live.error}
            variant={variant}
        />
    )
}

export function CartSkeleton() {
    return (
        <div aria-hidden className="flex min-h-64 flex-1 flex-col">
            <div className="space-y-4 px-5 py-2">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="flex gap-3">
                        <div className="size-20 shrink-0 animate-pulse rounded-[17px] bg-foreground/5" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-foreground/5" />
                            <div className="h-4 w-16 animate-pulse rounded bg-foreground/5" />
                            <div className="h-10 w-32 animate-pulse rounded-full bg-foreground/5" />
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto space-y-3 px-5 py-5">
                <div className="h-6 animate-pulse rounded bg-foreground/5" />
                <div className="h-12 animate-pulse rounded-full bg-foreground/10" />
            </div>
        </div>
    )
}

export function CartError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="px-5 py-16 text-center">
            <p className="text-lg">The cart didn&apos;t load.</p>
            <button type="button" onClick={reset} className="button-dark mt-6">
                Try again
            </button>
        </div>
    )
}

export function AddToCartForm({ product }: { product: Product }) {
    const router = useRouter()
    const pathname = usePathname()
    const { startAdd, finishAdd, armAdd, releaseAdd, cancelArmedAdd, error } = useCart()
    const [state, dispatch] = useActionState(addToCart, null)
    const action = preservePostback(async (formData: FormData) => {
        finishAdd(await addToCartNow(formData))
    }, dispatch)
    const message = error ?? (state && 'error' in state ? state.error : null)
    const from = useRef<string | null>(null)

    useEffect(() => {
        if (from.current == null) return
        if (pathname === '/cart' || pathname === from.current) return
        from.current = null
        cancelArmedAdd()
    }, [pathname, cancelArmedAdd])

    return (
        <Form
            action={action}
            className="mt-8 flex flex-wrap items-center gap-3"
            onSubmit={(event) => {
                const form = event.currentTarget
                const quantity = wholeNumber(new FormData(form).get(CartField.Quantity))
                if (quantity == null || quantity < 1) return
                event.preventDefault()
                const formData = new FormData(form)
                if (!armAdd(formData)) {
                    if (window.location.pathname !== '/cart') router.push('/cart')
                    return
                }
                flushSync(() => startAdd(product, quantity))
                if (window.location.pathname === '/cart') {
                    releaseAdd()
                    return
                }
                from.current = window.location.pathname
                router.push('/cart')
            }}
        >
            <input type="hidden" name={CartField.ProductId} value={product.id} />
            <input
                type="number"
                name={CartField.Quantity}
                min={1}
                defaultValue={1}
                required
                aria-label="Quantity"
                className="h-12 w-24 rounded-full bg-white px-4 text-center font-sans shadow-card outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            />
            <AddButton />
            {message ? (
                <p role="alert" className="basis-full text-sm text-foreground/70">
                    {message}
                </p>
            ) : null}
        </Form>
    )
}

function CartEditor({
    cart,
    confirmed,
    partial,
    addError,
    variant,
}: {
    cart: Cart | null
    confirmed: boolean
    partial: boolean
    addError: string | null
    variant: Variant
}) {
    const [override, setOverride] = useState<Cart | null>(null)
    const [lineError, setLineError] = useState<string | null>(null)
    const { beginChange, endChange, mutating } = useCart()
    const base = override ?? cart
    const [optimistic, applyOptimistic] = useOptimistic(base, (_current: Cart | null, next: Cart) => next)
    const shown = optimistic ?? base
    const pad = variant === 'drawer' ? 'px-5' : ''
    const error = lineError ?? addError
    const waiting = !confirmed || mutating

    const commit = (result: CartResult) => {
        if ('error' in result) {
            setLineError(result.error)
            endChange(base?.totalItems ?? 0)
            return
        }
        setLineError(null)
        setOverride(result.cart)
        endChange(result.cart.totalItems)
    }

    if (!shown || shown.items.length === 0) {
        return (
            <div className={`${pad} py-6`}>
                {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
                <p className="text-lg text-foreground/70">Your cart is empty.</p>
                {variant === 'page' ? (
                    <NavLink href="/" className="button-light mt-6">
                        Continue shopping
                    </NavLink>
                ) : null}
            </div>
        )
    }

    return (
        <div className={`${pad} flex min-h-0 flex-1 flex-col`} aria-busy={waiting}>
            {error ? <p role="alert" className="mb-4 text-sm text-foreground/70">{error}</p> : null}
            <ul className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2">
                {shown.items.map((item) => (
                    <li key={item.productId} className="flex gap-3">
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-[17px] bg-background">
                            <Image src={item.product.images[0]} alt="" fill sizes="80px" className="object-cover mix-blend-multiply" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <NavLink href={`/products/${item.product.slug}`} className="font-sans text-base leading-tight">
                                    {item.product.name}
                                </NavLink>
                                <p className="shrink-0 font-sans text-sm font-bold tracking-tight">{formatPrice(item.lineTotal)}</p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <QuantityForm
                                    item={item}
                                    cart={shown}
                                    disabled={waiting}
                                    onPreview={(next) => {
                                        applyOptimistic(next)
                                        beginChange(next.totalItems)
                                    }}
                                    onCommit={commit}
                                    onStart={() => beginChange(null)}
                                />
                                <RemoveForm
                                    item={item}
                                    cart={shown}
                                    disabled={waiting}
                                    onPreview={(next) => {
                                        applyOptimistic(next)
                                        beginChange(next.totalItems)
                                    }}
                                    onCommit={commit}
                                    onStart={() => beginChange(null)}
                                />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="shrink-0 border-t border-foreground/10 py-5">
                <div className="flex items-baseline justify-between font-sans">
                    <span>Subtotal</span>
                    {partial ? (
                        <span className="text-sm text-foreground/60">Updating…</span>
                    ) : (
                        <span className="text-lg font-bold tracking-tight">{formatPrice(shown.subtotal)}</span>
                    )}
                </div>
                {!partial && waiting ? <p className="mt-1 text-sm text-foreground/60">Updating…</p> : null}
                {/* Inert until checkout exists. Disabled while the lines on screen are not the API cart. */}
                <button type="button" className="button-dark mt-4 w-full" disabled={waiting}>
                    Checkout
                </button>
            </div>
        </div>
    )
}

function QuantityForm({
    item,
    cart,
    disabled,
    onPreview,
    onCommit,
    onStart,
}: {
    item: CartItem
    cart: Cart
    disabled: boolean
    onPreview: (cart: Cart) => void
    onCommit: (result: CartResult) => void
    onStart: () => void
}) {
    const [, dispatch] = useActionState(updateCartItem, null)
    const action = preservePostback(async (formData: FormData) => {
        const quantity = wholeNumber(formData.get(CartField.Quantity))
        const next = quantity == null ? null : applyQuantity(cart, item.productId, quantity)
        onStart()
        if (next) onPreview(next)
        onCommit(await updateCartItem(null, formData))
    }, dispatch)

    return (
        <form action={action} className="inline-flex h-10 items-center rounded-full bg-background px-1">
            <input type="hidden" name={CartField.ProductId} value={item.productId} />
            <button
                type="submit"
                name={CartField.Quantity}
                value={Math.max(0, item.quantity - 1)}
                disabled={disabled}
                aria-label={`Decrease quantity of ${item.product.name}`}
                className="grid size-8 place-items-center rounded-full font-sans disabled:opacity-40"
            >
                −
            </button>
            <span className="min-w-6 text-center font-sans text-sm tabular-nums">{item.quantity}</span>
            <button
                type="submit"
                name={CartField.Quantity}
                value={item.quantity + 1}
                disabled={disabled}
                aria-label={`Increase quantity of ${item.product.name}`}
                className="grid size-8 place-items-center rounded-full font-sans disabled:opacity-40"
            >
                +
            </button>
        </form>
    )
}

function RemoveForm({
    item,
    cart,
    disabled,
    onPreview,
    onCommit,
    onStart,
}: {
    item: CartItem
    cart: Cart
    disabled: boolean
    onPreview: (cart: Cart) => void
    onCommit: (result: CartResult) => void
    onStart: () => void
}) {
    const [, dispatch] = useActionState(removeCartItem, null)
    const action = preservePostback(async (formData: FormData) => {
        const next = applyQuantity(cart, item.productId, 0)
        onStart()
        if (next) onPreview(next)
        onCommit(await removeCartItem(null, formData))
    }, dispatch)

    return (
        <form action={action}>
            <input type="hidden" name={CartField.ProductId} value={item.productId} />
            <button type="submit" disabled={disabled} className="px-2 font-sans text-sm text-foreground/60 underline-offset-2 hover:underline disabled:opacity-40">
                Remove
            </button>
        </form>
    )
}

function AddButton() {
    const { pending } = useFormStatus()
    return (
        <button type="submit" className="button-dark gap-2" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? 'Adding…' : 'Add to cart'}
        </button>
    )
}

// Keeps the no-JS post on the server action. The client function only runs once JS handles the submit.
function preservePostback<T extends (formData: FormData) => Promise<void>>(clientAction: T, serverAction: object) {
    const postback = (serverAction as { $$FORM_ACTION?: (prefix: unknown) => unknown }).$$FORM_ACTION
    if (typeof postback === 'function') Object.assign(clientAction, { $$FORM_ACTION: postback })
    return clientAction
}

function emptyCart(currency: string): Cart {
    return { items: [], totalItems: 0, subtotal: 0, currency, createdAt: '', updatedAt: '' }
}

function summarize(items: CartItem[], currency: string, stamp: Cart): Cart {
    return {
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
        currency,
        createdAt: stamp.createdAt,
        updatedAt: stamp.updatedAt,
    }
}

function applyAdd(cart: Cart, product: Product, quantity: number): Cart {
    const items = cart.items.some((item) => item.productId === product.id)
        ? cart.items.map((item) =>
            item.productId === product.id
                ? { ...item, quantity: item.quantity + quantity, lineTotal: item.product.price * (item.quantity + quantity) }
                : item,
        )
        : [...cart.items, { productId: product.id, quantity, addedAt: '', product, lineTotal: product.price * quantity }]
    return summarize(items, cart.currency || product.currency, cart)
}

function applyQuantity(cart: Cart, productId: string, quantity: number): Cart | null {
    if (!Number.isInteger(quantity) || quantity < 0) return null
    if (!cart.items.some((item) => item.productId === productId)) return null
    const items = quantity === 0
        ? cart.items.filter((item) => item.productId !== productId)
        : cart.items.map((item) =>
            item.productId === productId ? { ...item, quantity, lineTotal: item.product.price * quantity } : item,
        )
    return summarize(items, cart.currency, cart)
}

function wholeNumber(value: FormDataEntryValue | null) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
    return Number(value)
}

function prefer(settled: Cart | null, server: Cart | null) {
    if (!settled) return server
    if (!server) return settled
    if (server.updatedAt > settled.updatedAt) return server
    return settled
}

function Spinner() {
    return <span aria-hidden className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
}

function BagIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 8h12l-1 12H7L6 8Z" />
            <path d="M9 8V7a3 3 0 0 1 6 0v1" />
        </svg>
    )
}

function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M3 3l10 10M13 3L3 13" />
        </svg>
    )
}
