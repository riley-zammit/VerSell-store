'use client'

import Image from 'next/image'
import { useState } from 'react'

// A client island so a thumbnail click swaps the main image without a server round trip. Before hydration the
// thumbnails are inert and the first image shows.
export function ProductGallery({ name, images }: { name: string; images: string[] }) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    return (
        <div className="surface-card p-2.5">
            <div className="relative aspect-square overflow-hidden rounded-[17px] bg-background">
                <Image
                    src={images[selectedIndex]}
                    alt={name}
                    fill
                    preload
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover mix-blend-multiply"
                />
            </div>
            {/* A single image needs no thumbnails. */}
            {images.length > 1 ? (
                <ul className="mt-2.5 flex flex-wrap gap-2.5">
                    {images.map((src, index) => {
                        const isSelected = index === selectedIndex
                        // A border rather than a ring, so the highlight never changes the thumbnail's size.
                        const borderClass = isSelected ? 'border-foreground' : 'border-transparent opacity-60 hover:opacity-100'
                        return (
                            <li key={src}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIndex(index)}
                                    aria-label={`Show image ${index + 1} of ${images.length}`}
                                    aria-pressed={isSelected}
                                    className={`relative block size-16 overflow-hidden rounded-xl border-2 bg-background ${borderClass}`}
                                >
                                    <Image src={src} alt="" fill sizes="64px" className="object-cover mix-blend-multiply" />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            ) : null}
        </div>
    )
}
