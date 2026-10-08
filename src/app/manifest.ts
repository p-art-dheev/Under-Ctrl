import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cognify",
    short_name: "Cognify",
    description: "Adaptive learning workspace: a persistent skill graph that changes with your assessment evidence.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6faf7",
    theme_color: "#0b8457",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
