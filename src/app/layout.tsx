import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BASTIÃO — FPS tático multiplayer",
  description: "FPS tático em primeira pessoa, 1v1 a 4v4, com bots, loja, amigos e salas online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0b0f16", overflow: "hidden" }}>{children}</body>
    </html>
  );
}
