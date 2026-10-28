import 'server-only'
import { cacheLife, navigation } from 'next/cache'
import { cookies } from 'next/headers'
import { ApiError, apiFetch } from './api'
import { ApiHeader, ApiPath, CookieName } from './constants'
import type { Cart } from './types'

export async function getCart() {
  await navigation() // out of every shell and prefetch
  const jar = await cookies()
  const token = jar.get(CookieName.CartToken)?.value
  if (!token) return null // no cookie → zero upstream calls (most visitors)
  return fetchCart(token, jar.get(CookieName.CartVersion)?.value ?? '')
}

// `version` exists only to be part of the cache key: every mutation bumps it, so stale entries
// become unreachable on every instance with zero coordination.
async function fetchCart(token: string, version: string) {
  'use cache'
  cacheLife('hours')
  void version
  return apiFetch<Cart>(ApiPath.Cart, { headers: { [ApiHeader.CartToken]: token } }).catch((e) => {
    if (e instanceof ApiError && e.status === 404) return null // expired cart: definitive, cache it
    throw e // transient: the hole renders "Cart unavailable"
  })
}
