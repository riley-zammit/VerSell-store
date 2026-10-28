import { HeroVisual } from './hero-visual'
import { NavLink } from '../../components/nav-link'

export function Hero() {
  return (
    <section className="relative isolate h-[70vh] max-h-[700px] min-h-[420px] overflow-hidden rounded-[25px] shadow-card">
      <HeroVisual />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 text-white sm:p-10">
        <h1 className="text-5xl md:text-7xl">Ship it in style.</h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          Official Vercel swag for people who deploy on Fridays. Minimal design, built to last.
        </p>
        <NavLink href="/search" prefetch className="button-light pointer-events-auto relative mt-6">
          Shop all products
        </NavLink>
      </div>
    </section>
  )
}
