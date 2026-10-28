'use server'

import { cookies } from 'next/headers'
import { ApiError, apiFetch, getStock } from './api'
import { ApiHeader, ApiPath, CookieName, MAX_QUANTITY } from './constants'
import type { ActionResult, Cart } from './types'

type CookieJar = Awaited<ReturnType<typeof cookies>>

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const // no maxAge → session cookie, matching "same browser session"

const isValid = (productId: unknown, quantity: unknown, min: number): productId is string =>
  typeof productId === 'string' && productId.length > 0 && productId.length < 100 &&
  Number.isInteger(quantity) && (quantity as number) >= min && (quantity as number) <= MAX_QUANTITY

export async function addToCart(productId: string, quantity: number): Promise<ActionResult> {
  if (!isValid(productId, quantity, 1)) return { ok: false, message: 'Invalid quantity.' }

  // The API does not enforce stock (verified: it accepts 9999 and sold-out items), so check it here.
  // Checks the requested quantity only, not what's already in the cart: inventory is reserved at checkout, not here.
  const stock = await getStock(productId)
  if (stock && !stock.inStock) return { ok: false, message: "Sorry, that's out of stock." }
  if (stock && quantity > stock.stock) return { ok: false, message: `Sorry, only ${stock.stock} left.` }

  const body = JSON.stringify({ productId, quantity })
  return mutate(async (jar, token) => {
    try {
      await cartFetch(ApiPath.Cart, token, 'POST', body)
    } catch (e) {
      // 404 = cart expired (24 h idle) or unknown product. Recreate once, only if the cart is really gone.
      if (!(e instanceof ApiError && e.status === 404) || (await cartExists(token))) throw e
      await cartFetch(ApiPath.Cart, await createCart(jar), 'POST', body)
    }
  })
}

/** quantity 0 removes the line. */
export async function setQuantity(productId: string, quantity: number): Promise<ActionResult> {
  if (!isValid(productId, quantity, 0)) return { ok: false, message: 'Invalid quantity.' }
  const path = `${ApiPath.Cart}/${encodeURIComponent(productId)}`
  return mutate(async (_jar, token) => {
    if (quantity === 0) await cartFetch(path, token, 'DELETE')
    else await cartFetch(path, token, 'PATCH', JSON.stringify({ quantity }))
  })
}

async function mutate(run: (jar: CookieJar, token: string) => Promise<void>): Promise<ActionResult> {
  const jar = await cookies()
  try {
    await run(jar, jar.get(CookieName.CartToken)?.value ?? (await createCart(jar)))
    bumpVersion(jar)
    return { ok: true }
  } catch (e) {
    // A 404 means our cached view is wrong (expired cart / item gone): refresh it so the UI shows the truth.
    if (e instanceof ApiError && e.status === 404) bumpVersion(jar)
    console.error('cart mutation failed', e)
    return { ok: false, message: "Couldn't update your cart. Please try again." }
  }
}

// A fresh version = a new cache key for getCart, so this response re-renders with the fresh cart.
const bumpVersion = (jar: CookieJar) => jar.set(CookieName.CartVersion, Date.now().toString(36), cookieOptions)

const cartFetch = (path: string, token: string, method: string, body?: string) =>
  apiFetch<Cart>(path, {
    method,
    body,
    headers: { [ApiHeader.CartToken]: token, ...(body && { 'content-type': 'application/json' }) },
  })

async function createCart(jar: CookieJar) {
  const { token } = await apiFetch<Cart>(ApiPath.CartCreate, { method: 'POST' }) // body token = x-cart-token header
  jar.set(CookieName.CartToken, token, cookieOptions)
  return token
}

const cartExists = (token: string) =>
  apiFetch<Cart>(ApiPath.Cart, { headers: { [ApiHeader.CartToken]: token } }).then(
    () => true,
    (e) => !(e instanceof ApiError && e.status === 404),
  )
