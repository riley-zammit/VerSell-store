import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    inlineCss: true, // keep only if Lighthouse shows FCP/LCP gains (architecture §17)
  },
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Refresh hourly. //stale 15 mins
    catalog: { stale: 900, revalidate: 3600 },
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

export default nextConfig;
