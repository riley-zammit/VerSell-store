'use client'

// Shared by the /cart page's error.tsx and the drawer's boundary.
export function CartError({ reset }: { reset: () => void }) {
    return (
        <div className="px-5 py-16 text-center">
            <p className="text-lg">The cart didn’t load.</p>
            <button type="button" onClick={reset} className="button-dark mt-6">
                Try again
            </button>
        </div>
    )
}
