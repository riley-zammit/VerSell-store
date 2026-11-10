'use client'

// Tailwind's lg, where the chat docks (chat-window.tsx).
const DOCKED_MEDIA = '(min-width: 64rem)'

// Makes room on the right for the docked chat. It's in the bundle page's static shell, so the room is there from the
// first paint, before the chat (which reads the URL) streams in.
// Next keeps a page you've left mounted but hidden (Activity), so the ref switches the rule off while the page is
// hidden. A plain global rule would keep the room on the next page.
export function ChatDockSpace() {
    return (
        <style
            media={DOCKED_MEDIA}
            ref={(style) => {
                if (!style) {
                    return
                }
                style.media = DOCKED_MEDIA
                return () => {
                    style.media = 'not all'
                }
            }}
        >
            {'body { padding-right: var(--chat-width); }'}
        </style>
    )
}
