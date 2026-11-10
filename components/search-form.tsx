'use client'

import { useEffect, useRef, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// The URL is the only source of truth.
export function SearchForm() {
    const { replace } = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    
    // Debounced so each keystroke doesn't trigger a server render + uncached API call.
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => () => clearTimeout(timer.current), []) // don't navigate back to /search after leaving

    function handleSearch(term: string) {
        const params = new URLSearchParams(searchParams);
        params.delete('page'); // a new query starts back at page 1
        if (term) {
            params.set('query', term);
        } else {
            //remove the parameter if there's no query
            params.delete('query');
        }
        startTransition(() => replace(`${pathname}?${params.toString()}`));
    }

    return (
        <div className="relative flex flex-1 shrink-0">
            <label htmlFor="search" className="sr-only">
                Search
            </label>
            <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                placeholder="Search for products"
                onChange={(e) => {
                    const term = e.target.value
                    clearTimeout(timer.current)
                    timer.current = setTimeout(() => handleSearch(term), 150)
                }}
                defaultValue={searchParams.get('query')?.toString()}
            />
            {/* Overlays the outline, so it never shifts layout or blocks typing. */}
            {isPending && <span role="status" aria-label="Loading results" className="search-shimmer" />}
        </div>
    )
}
