'use client'

import type { PointerEvent } from 'react'

// Pointer-reactive gradient + tilting triangle. Writes CSS vars directly, so no re-renders.
export function HeroVisual() {
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--x', `${x * 100}%`)
    el.style.setProperty('--y', `${y * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - y) * 30}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 30}deg`)
  }

  function onPointerLeave(e: PointerEvent<HTMLDivElement>) {
    for (const v of ['--x', '--y', '--rx', '--ry']) e.currentTarget.style.removeProperty(v)
  }

  return (
    <div
      aria-hidden
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="absolute inset-0 -z-10 grid place-items-center overflow-hidden bg-neutral-950"
    >
      <div className="absolute -inset-1/4 bg-[conic-gradient(from_0deg,#ff0080,#7928ca,#0070f3,#50e3c2,#f5a623,#ff0080)] opacity-60 blur-3xl motion-safe:animate-[spin_14s_linear_infinite]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at var(--x, 50%) var(--y, 50%), transparent 0, rgb(10 10 10 / 0.85) 45%)',
        }}
      />
      <svg
        viewBox="0 0 76 65"
        className="relative w-1/4 max-w-56 fill-white drop-shadow-[0_20px_40px_rgb(0_0_0/0.5)] transition-transform duration-300 ease-out"
        style={{ transform: 'perspective(600px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
      >
        <path d="M37.5 0 75 65H0z" />
      </svg>
      <span className="absolute top-6 right-6 rotate-[-8deg] font-sans rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-neutral-950 shadow-lg">
        deployed on a Friday ✓
      </span>
    </div>
  )
}
