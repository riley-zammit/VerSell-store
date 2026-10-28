"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="text-4xl md:text-5xl">Something went wrong</h1>
      <p className="mt-4 text-foreground/70">Please try again in a moment.</p>
      <button onClick={reset} className="button-dark mt-8">
        Try again
      </button>
    </div>
  );
}
