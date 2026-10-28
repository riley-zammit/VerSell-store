import type { Metadata } from "next";
import { Suspense } from "react";
import { Cart } from "@/components/cart/cart";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

// Full-page cart: the no-JS / pre-hydration / deep-link (e.g. email) home of the drawer's contents.
export default function CartPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Your cart</h1>
      <Suspense fallback={<div aria-busy className="h-64 animate-pulse rounded bg-foreground/5" />}>
        <Cart page />
      </Suspense>
    </div>
  );
}
