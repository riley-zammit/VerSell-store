'use server'

import type { ActionResult } from './types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function subscribeToRestock(productId: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  // Public endpoint: validate everything, including the bound productId.
  if (typeof productId !== 'string' || !productId || productId.length > 100 || email.length > 254 || !EMAIL.test(email))
    return { ok: false, message: 'Enter a valid email address.' }
  // ponytail: no DB yet. This log line is the "saved" record (PII in logs, no rate limiting). Swap for a store when one exists.
  console.info(JSON.stringify({ event: 'restock_subscribe', productId, email, at: new Date().toISOString() }))
  return { ok: true }
}
