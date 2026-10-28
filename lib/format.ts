import { CURRENCY } from './constants'

const LOCALE = 'en-US'

// Fixed locale + timezone so server and client always agree (no hydration mismatch).
const price = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })
const date = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

export const formatPrice = (cents: number) => price.format(cents / 100)
export const formatDeliveryDate = (iso: string) => date.format(new Date(iso))
