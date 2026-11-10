'use client'

import type { ReactNode } from 'react'

// Below sm: a sheet from the right. The popover attribute opens it from the hamburger and closes it on Esc or a
// backdrop tap with no JS, so it works before hydration. `hidden open:flex` keeps it shut until opened.
const sheetClass = 'fixed inset-y-0 right-0 left-auto hidden h-dvh w-[min(100vw,20rem)] flex-col gap-1 bg-white p-5 text-foreground backdrop:bg-black/20 open:flex'
// From sm up, the same links sit inline in the header row. These undo the sheet and the popover's built-in box.
const inlineClass = 'sm:static sm:flex sm:h-auto sm:w-auto sm:flex-row sm:items-center sm:overflow-visible sm:bg-transparent sm:p-0'

// Client navigation keeps the header mounted, so an open menu would stay over the new page: a link click closes it.
// Before hydration, links load a full page, which closes it anyway.
export function NavMenu({ id, children }: { id: string; children: ReactNode }) {
    return (
        <div
            id={id}
            popover="auto"
            className={`${sheetClass} ${inlineClass}`}
            onClick={(event) => {
                const target = event.target as Element
                if (target.closest('a')) {
                    event.currentTarget.hidePopover()
                }
            }}
        >
            {children}
        </div>
    )
}
