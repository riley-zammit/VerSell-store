'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

const ChatWindowContext = createContext<{ isOpen: boolean; setIsOpen: (isOpen: boolean) => void } | null>(null)

// Whether the chat window is open. It lives here, not in the window, so a page can open the chat too, like the bundle
// page's checkout button.
export function useChatWindow() {
    const chatWindow = useContext(ChatWindowContext)
    if (!chatWindow) {
        throw new Error('useChatWindow must render inside ChatWindowContextProvider')
    }
    return chatWindow
}

export function ChatWindowContextProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const chatWindow = {
        isOpen,
        setIsOpen,
    }

    return <ChatWindowContext.Provider value={chatWindow}>{children}</ChatWindowContext.Provider>
}
