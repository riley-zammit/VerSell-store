const LOCALE = 'en-US'

// Fixed locale so server and client always agree (no hydration mismatch).
const price = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'USD',
})

export const formatPrice = (cents: number) => price.format(cents / 100)

// Bundle products can come from any Shop merchant, so their currency varies.
export function formatMoney(cents: number, currency: string) {
    const money = new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency,
    })
    return money.format(cents / 100)
}
