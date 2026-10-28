import { HeroVisual } from './hero-visual'
import { NavLink } from './nav-link'

export function Hero() {
  return (
    <section className="grid items-center gap-8 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Ship it in style.</h1>
        <p className="mt-4 max-w-md text-lg text-foreground/70">
          Official Vercel swag for people who deploy on Fridays. Minimal design, built to last.
        </p>
        <NavLink
          href="/search"
          prefetch
          className="relative mt-6 inline-flex h-12 items-center rounded-full bg-foreground px-6 font-medium text-background hover:opacity-90"
        >
          Shop all products
        </NavLink>
      </div>
      <HeroVisual />
    </section>
  )
}
