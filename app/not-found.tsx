import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-foreground/70">That page doesn&apos;t exist, or the product is no longer available.</p>
      <Link href="/search" className="mt-6 inline-block underline">
        Browse products
      </Link>
    </div>
  );
}
