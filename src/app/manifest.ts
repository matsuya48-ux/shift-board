import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHIFT BOARD",
    short_name: "SHIFT BOARD",
    description: "希望休とシフトを、軽やかに。",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f4f4",
    theme_color: "#1a1a1a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
