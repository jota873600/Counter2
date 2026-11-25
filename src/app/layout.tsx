import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import PwaRegister from "./PwaRegister";

export const metadata: Metadata = {
  title: "BASTIÃO — FPS tático multiplayer",
  description: "FPS tático em primeira pessoa, 1v1 a 4v4, com bots, loja, amigos e salas online.",
  applicationName: "BASTIÃO",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "BASTIÃO", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0f16",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0b0f16", overflow: "hidden" }}>
        {children}
        <PwaRegister />
        {/* Console visual pra depurar pelo celular (sem precisar de computador). Mostra um
            botãozinho flutuante no canto da tela — toque nele pra ver os logs do jogo.
            Depois que não precisar mais, é só apagar este <script>. */}
        <script src="https://cdn.jsdelivr.net/npm/eruda@3.4.1/eruda.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: "eruda.init();" }} />
      </body>
    </html>
  );
}
