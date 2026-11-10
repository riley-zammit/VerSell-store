import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";

export const metadata: Metadata = {
    title: "About",
    description: "Versell is the official swag store for Vercel. Hoodies, mugs, tees, bottles, and more, for people who build on the web.",
};

export default function AboutPage() {
    return (
        <article className="mx-auto max-w-2xl py-8">
            <h1 className="text-5xl md:text-7xl">About Versell</h1>
            <p className="mt-6 text-xl text-foreground/70">
                Versell is the official swag store for Vercel. Hoodies, mugs, tees, bottles, and more, for people who build on the web.
            </p>

            <section className="mt-12">
                <h2 className="text-3xl md:text-4xl">Company swag, done right</h2>
                <p className="mt-4 text-lg text-foreground/70">
                    Good swag is the stuff you actually reach for: the hoodie you wear to every offsite, the mug that never leaves your desk.
                    We keep the designs minimal and the materials durable, so it outlasts the launch it was made for.
                </p>
            </section>

            <section className="mt-12">
                <h2 className="text-3xl md:text-4xl">Built on Vercel</h2>
                <p className="mt-4 text-lg text-foreground/70">
                    Vercel helps teams build and ship fast web experiences, and it&apos;s the team behind Next.js. This store is built with
                    Next.js and deployed on Vercel, so every page you browse is a small demo of the platform.
                </p>
            </section>

            <section className="mt-12">
                <h2 className="text-3xl md:text-4xl">Go touch grass</h2>
                <p className="mt-4 text-lg text-foreground/70">
                    Shipping is great. So is logging off. Our favorite swag photos are taken outside: at picnics, in parks, on the walk
                    after a Friday deploy. Put on the hoodie, close the laptop, and go touch some grass. The deploy will be fine.
                </p>
            </section>

            <NavLink href="/collection/all" prefetch className="button-dark relative mt-12">
                Shop all products
            </NavLink>
        </article>
    );
}
