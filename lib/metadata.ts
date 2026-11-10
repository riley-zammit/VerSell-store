import type { Metadata } from 'next'

// Metadata merges shallowly, so a page that sets openGraph replaces the root layout's and must spread these back in.
// No title or description:
export const siteOpenGraph: Metadata['openGraph'] = {
    siteName: 'Versell',
    type: 'website',
    locale: 'en_US',
}
