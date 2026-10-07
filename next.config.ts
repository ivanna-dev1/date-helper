import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos of places live in our Vercel Blob storage. next/image only
    // loads pictures from addresses we allow here.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
