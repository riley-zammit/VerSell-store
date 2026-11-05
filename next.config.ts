import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    inlineCss: true, // keep only if Lighthouse shows FCP/LCP gains (architecture §17)
  },
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // 3 minutes is considered a 'good' browsing session in ecomm; average is 2.5 mins. 
    // set stale to 5 mins to ensure catalog performance and stability for most single sessions as those 2 minutes cost us nothing
    // Revalidate at 10 to ensure fresh catalog
    catalog: { stale: 300, revalidate: 600 }
  },
  images: {
    remotePatterns: [new URL("https://i8qy5y6gxkdgdcv9.public.blob.vercel-storage.com/storefront/**")],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 days: product image URLs are stable
  },
  logging: { fetches: { fullUrl: true } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withEve(nextConfig);
