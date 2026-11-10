'use client'

import { calls, type CallObservation } from 'eve/events'
import type { UseEveAgentReturn } from 'eve/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { useCart } from '@/components/cart/cart-provider'
import { getStoreProducts } from '@/actions/bundle'
import { CartField, type Product } from '@/lib/types'

export const FINDER_AGENT = 'product-finder'
export const CUSTOMIZER_AGENT = 'product-customizer'
const CONCEPT_TOOL = 'approve_bundle_concept'
const FINALIZE_TOOL = 'finalize_bundle'
// The subagents' tools that change what the bundle page shows: a finder saving its slot's product, and a customizer
// publishing a mockup. generate_mockup only makes a draft, which the customer doesn't see.
const PAGE_CHANGING_TOOLS = ['save_bundle_item', 'publish_mockup']

const BUNDLE_PATH = /^\/bundle\//
// The bundle page's App Shell doesn't depend on the id, so prefetching any bundle URL caches it for all of them
// (partialPrefetching).
const ANY_BUNDLE_PATH = '/bundle/new'

// The concierge starts each subagent's message with lines like `Bundle: <id>` and `Slot: <key>`
// (agent/skills/bundle-building). A continued task only names them in its first message, so pass the task's first call.
export function readTaskLine(call: CallObservation, label: string) {
    const input = call.input as { message?: unknown } | undefined
    if (typeof input?.message !== 'string') {
        return null
    }
    const pattern = new RegExp(`^${label}: (\\S+)`, 'm')
    return input.message.match(pattern)?.[1] ?? null
}

// Moves the store along with the agent's bundle work: opens the bundle page when a concept is approved, refreshes it
// as finders and customizers save, and adds the bundle's store products to the cart when it's finalized.
export function useBundleFlow(agent: UseEveAgentReturn) {
    const router = useRouter()
    const cart = useCart()
    // Catch-up replays the whole session; only live changes should navigate, refresh, or touch the cart.
    const isResuming = agent.status === 'resuming'
    const { view, agents } = agent

    // While the concept waits for approval, fetch the bundle page's static shell, so approving opens it at once and
    // only the products stream in. Production only: dev doesn't prefetch.
    const conceptCalls = calls(view, { name: CONCEPT_TOOL })
    const isConceptPending = conceptCalls.some((call) => call.outcome === undefined)
    useEffect(() => {
        if (isConceptPending) {
            router.prefetch(ANY_BUNDLE_PATH)
        }
    }, [isConceptPending, router])

    // React to calls as they settle. Calls seen while resuming are marked seen without acting, so a reload never
    // reopens the page or adds to the cart again.
    const seenCallIds = useRef(new Set<string>())
    useEffect(() => {
        const settledCalls = calls(view).filter((call) => call.outcome !== undefined)
        const newCalls = settledCalls.filter((call) => !seenCallIds.current.has(call.callId))
        for (const call of newCalls) {
            seenCallIds.current.add(call.callId)
        }

        // A finder saving a product or a customizer saving a mockup, from its followed session. Keyed by session too,
        // since call ids are per session.
        let hasPageChange = false
        for (const child of Object.values(agents)) {
            if (child.observation.status === 'not-followed') {
                continue
            }
            const childCalls = calls(child.observation.conversation.view)
            for (const call of childCalls) {
                const seenKey = `${child.sessionId}/${call.callId}`
                if (call.outcome === undefined || seenCallIds.current.has(seenKey)) {
                    continue
                }
                seenCallIds.current.add(seenKey)
                if (PAGE_CHANGING_TOOLS.includes(call.name)) {
                    hasPageChange = true
                }
            }
        }

        if (isResuming) {
            return
        }
        const approvedConcept = newCalls.find((call) => call.name === CONCEPT_TOOL && returnedApproved(call))
        const approvedProducts = newCalls.find((call) => call.name === FINALIZE_TOOL && returnedApproved(call))

        // The concept tool returns the new bundle's id.
        const newBundleId = (approvedConcept?.output as { bundleId?: string } | undefined)?.bundleId
        if (newBundleId) {
            router.push(`/bundle/${encodeURIComponent(newBundleId)}`)
        } else if ((newCalls.length > 0 || hasPageChange) && BUNDLE_PATH.test(window.location.pathname)) {
            // The page reads Redis on the server, so a settled call, a saved product, or a saved mockup is when it
            // changes.
            router.refresh()
        }

        // finalize_bundle is called with the bundle's id.
        const approvedBundleId = (approvedProducts?.input as { bundleId?: string } | undefined)?.bundleId
        if (approvedBundleId) {
            addStoreProductsToCart(approvedBundleId, cart.add).catch((error) => {
                console.error('Could not add the bundle’s VerSell products to the cart', error)
            })
        }
    }, [view, agents, isResuming, router, cart])
}

// One of each, through the cart's own add, so the drawer opens and shows them arriving. The customer sets quantities
// in the cart.
async function addStoreProductsToCart(bundleId: string, add: (product: Product, formData: FormData) => void) {
    const products = await getStoreProducts(bundleId)
    for (const product of products) {
        const formData = new FormData()
        formData.set(CartField.ProductId, product.id)
        formData.set(CartField.Quantity, '1')
        add(product, formData)
    }
}

// The gate tools return `{ approved: true }` when the customer clicks Approve.
function returnedApproved(call: CallObservation) {
    const output = call.output
    return typeof output === 'object' && output !== null && 'approved' in output && output.approved === true
}
