"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-foreground/70">Please try again in a moment.</p>
      <button onClick={reset} className="mt-6 rounded-full bg-foreground px-5 py-2 font-medium text-background">
        Try again
      </button>
    </div>
  );
}
