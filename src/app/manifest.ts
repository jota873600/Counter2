import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BASTIÃO — FPS tático multiplayer",
    short_name: "BASTIÃO",
    description: "FPS tático em primeira pessoa, 1v1 a 4v4, com bots, loja, amigos e salas online.",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: "#0b0f16",
    theme_color: "#0b0f16",
    lang: "pt-BR",
    categories: ["games"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
