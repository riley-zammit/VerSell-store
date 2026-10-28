import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-4xl md:text-5xl">Page not found</h1>
      <p className="mt-4 text-foreground/70">That page doesn&apos;t exist, or the product is no longer available.</p>
      <Link href="/search" className="button-dark mt-8">
        Browse products
      </Link>
    </div>
  );
}
