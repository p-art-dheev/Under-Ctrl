import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // answers can carry up to three downsized photos (see components/question-form.tsx)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
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
