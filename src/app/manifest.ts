import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StayEg - PG Accommodation Finder",
    short_name: "StayEg",
    description:
      "Find and book PG accommodations across India",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1D4ED8",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["real estate", "lifestyle", "business"],
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [],
  };
}
