'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Slides the header out of view on scroll down, back in on scroll up.
export function ScrollHeader({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      // Don't hide until the page has scrolled past the header itself.
      setHidden(y > lastY && y > (ref.current?.offsetHeight ?? 0))
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      className={`${className} transition-transform duration-300 motion-reduce:transition-none ${hidden ? '-translate-y-full' : ''}`}
    >
      {children}
    </header>
  )
}
