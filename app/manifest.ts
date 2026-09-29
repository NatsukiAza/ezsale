import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Toque",
    short_name: "Toque",
    description:
      "Punto de venta para comercios: ventas, productos, reportes y equipo.",
    start_url: "/new-sale",
    scope: "/",
    display: "standalone",
    background_color: "#21201d",
    theme_color: "#21201d",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
