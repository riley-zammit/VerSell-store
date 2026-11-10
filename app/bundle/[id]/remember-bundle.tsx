'use client'

import { useEffect } from 'react'

import { rememberOpenedBundle } from '@/actions/bundle'

// Adds the bundle to the visitor's list on /bundles whenever its page opens, including the first time, right after
// the concept is approved, and links someone shared. A Server Function that sets no cookie, so the client's prefetch
// cache stays.
export function RememberBundle({ bundleId }: { bundleId: string }) {
    useEffect(() => {
        rememberOpenedBundle(bundleId).catch((error) => {
            console.error('Could not add the bundle to your list', error)
        })
    }, [bundleId])
    return null
}
