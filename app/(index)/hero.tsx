import Image from 'next/image'
import { NavLink } from '@/components/nav-link'
import HeroWorkImage from "@/public/hero-work.jpg"
import HeroPlayImage from "@/public/hero-grass.jpg"

// The page column is max-w-6xl and centered, so shifting by half the column
// and half the viewport lands this on the viewport edges.
export function Hero() {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 -mt-8">
      <div className="grid grid-cols-1 md:h-[min(72svh,760px)] md:grid-cols-2">
        <div className="relative h-[64svh] min-h-[440px] md:h-full">
          <Image
            // src="/hero-work.jpg"
            src={HeroWorkImage}
            alt="Friends in black hoodies hanging out with a laptop in a sunny office"
            fill
            preload
            // sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-28 pr-6 pb-8 pl-[max(1rem,calc((100vw-72rem)/2+1rem))] sm:pr-10 sm:pb-10">
            <h1 className="text-5xl text-white md:text-7xl">Ship it in style.</h1>
            <p className="mt-4 max-w-md text-lg text-white/85">
              Official Vercel swag for people who deploy on Fridays. Minimal design, built to last.
            </p>
            <NavLink href="/collection/all" prefetch className="button-light relative mt-6">
              Shop all products
            </NavLink>
          </div>
        </div>
        <div className="relative h-[48svh] min-h-[300px] md:h-full">
          <Image
            // src="/hero-grass.jpg"
            src={HeroPlayImage}
            alt="Friends on a picnic blanket in a Toronto park, skyline behind them"
            fill
            loading="eager"
            // sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  )
}
