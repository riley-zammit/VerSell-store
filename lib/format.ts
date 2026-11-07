const LOCALE = 'en-US'

// Fixed locale so server and client always agree (no hydration mismatch).
const price = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'USD',
})

export const formatPrice = (cents: number) => price.format(cents / 100)
