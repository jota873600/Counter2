"use client";

import { useEffect, useRef, useState } from "react";

/** Monta o jogo (Three.js) somente no navegador. */
export default function GameClient() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/game/client/main");
        if (!cancelled && ref.current) mod.startApp(ref.current);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div ref={ref} style={{ position: "fixed", inset: 0 }} />
      {error && (
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#0b0f16", color: "#fca5a5", padding: 24, textAlign: "center" }}>
          <div>
            <h2>Não foi possível iniciar o jogo</h2>
            <p>{error}</p>
            <p>Verifique se o navegador suporta WebGL2.</p>
          </div>
        </div>
      )}
    </>
  );
}
