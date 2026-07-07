import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodVibe — zero-commission food delivery",
    short_name: "FoodVibe",
    description:
      "Open-source, zero-commission food delivery for Pakistan. No cut from restaurants, riders, or buyers.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbeb",
    theme_color: "#b45309",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
