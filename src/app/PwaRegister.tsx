"use client";

import { useEffect } from "react";

/** Registra o service worker (somente em produção, para não atrapalhar o `next dev`). */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") reg();
    else window.addEventListener("load", reg, { once: true });
  }, []);
  return null;
}
