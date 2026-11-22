import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` é carregado pelo servidor de jogo (src/instrumentation.ts) e não deve ser empacotado.
  serverExternalPackages: ["ws"],
  reactStrictMode: false,
};

export default nextConfig;
