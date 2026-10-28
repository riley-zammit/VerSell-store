'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import type { CategoryInfo } from '@/lib/types'
import { Spinner } from './notify-form'

const toUrl = (q: string, category: string) => {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (category) params.set('category', category)
  const qs = params.toString()
  return qs ? `/search?${qs}` : '/search'
}

// The URL is the only source of truth; every trigger funnels through navigate().
export function SearchForm({ categories }: { categories: CategoryInfo[] }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [isPending, startTransition] = useTransition()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const navigate = (q: string, category: string) => {
    clearTimeout(timer.current)
    startTransition(() => router.replace(toUrl(q, category), { scroll: false }))
  }

  return (
    <SearchFields
      categories={categories}
      q={q}
      category={category}
      pending={isPending}
      onSubmit={(e) => {
        e.preventDefault() // without JS this is a native GET to the same URL
        navigate(q, category)
      }}
      onQueryChange={(value) => {
        setQ(value)
        clearTimeout(timer.current)
        if (value.trim().length >= 3 || !value.trim())
          timer.current = setTimeout(() => navigate(value, category), 300)
      }}
      onCategoryChange={(value) => {
        setCategory(value)
        navigate(q, value)
      }}
    />
  )
}

type FieldsProps = {
  categories: CategoryInfo[]
  q?: string
  category?: string
  pending?: boolean
  disabled?: boolean
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  onQueryChange?: (value: string) => void
  onCategoryChange?: (value: string) => void
}

/** Shared markup: SearchForm renders it live; the Suspense fallback renders it disabled (same footprint). */
export function SearchFields({ categories, q, category, pending, disabled, onSubmit, onQueryChange, onCategoryChange }: FieldsProps) {
  return (
    <form
      action="/search"
      role="search"
      onSubmit={onSubmit}
      data-pending={pending || undefined}
      aria-busy={pending}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        type="search"
        name="q"
        value={q}
        onChange={onQueryChange && ((e) => onQueryChange(e.target.value))}
        disabled={disabled}
        placeholder="Search products…"
        aria-label="Search products"
        className="h-11 min-w-0 flex-1 rounded-full border border-foreground/20 bg-transparent px-4 disabled:opacity-60"
      />
      <div className="flex gap-2">
        <select
          name="category"
          value={category}
          onChange={onCategoryChange && ((e) => onCategoryChange(e.target.value))}
          disabled={disabled}
          aria-label="Category"
          className="h-11 min-w-0 flex-1 rounded-full border border-foreground/20 bg-background px-4 disabled:opacity-60 sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          disabled={disabled}
          className="flex h-11 items-center gap-2 rounded-full bg-foreground px-5 font-medium text-background disabled:opacity-60"
        >
          <span className="w-4">{pending && <Spinner />}</span>
          Search
        </button>
      </div>
    </form>
  )
}
