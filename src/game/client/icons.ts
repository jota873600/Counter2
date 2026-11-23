// @ts-nocheck
/** Ícones SVG (viewBox 24×24, usam currentColor) dos botões de toque e do HUD. */
const S = (inner, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${inner}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const ICON = {
  // botões de toque
  fire: S(`<circle cx="8.5" cy="4.2" r="2.3" fill="currentColor"/><g ${STROKE}><path d="M8.5 8v6.5M8.5 14.5L5.5 21M8.5 14.5l3.5 6.5M8.5 9.5l6.5 1.3"/></g><path d="M10 10.6l11-1.8.5 2.4-11 1.8z" fill="currentColor"/>`),
  aim: S(`<g ${STROKE}><circle cx="12" cy="12" r="6.2"/><path d="M12 1.8v4.4M12 17.8v4.4M1.8 12h4.4M17.8 12h4.4"/></g><circle cx="12" cy="12" r="1.7" fill="currentColor"/>`),
  jump: S(`<g ${STROKE} stroke-width="2.8"><path d="M4.5 12.5L12 5l7.5 7.5M4.5 19.5L12 12l7.5 7.5"/></g>`),
  reload: S(`<g ${STROKE}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.8v4.6h-4.6"/></g>`),
  crouch: S(`<circle cx="13.5" cy="4.2" r="2.3" fill="currentColor"/><g ${STROKE}><path d="M12.5 8l-.5 5M12 13l5 1.5V20M12 13l-4 4 4 3M12.5 9.5l5 1.5"/></g><path d="M12.5 10.2l8.5-1.3.4 2.2-8.5 1.3z" fill="currentColor"/>`),
  swap: S(`<g ${STROKE}><path d="M4 8h13M13 4l4 4-4 4"/><path d="M20 16H7M11 12l-4 4 4 4"/></g>`),
  grenade: S(`<circle cx="12" cy="14.2" r="6.6" fill="currentColor"/><rect x="9.6" y="3.6" width="4.8" height="4.4" rx="1" fill="currentColor"/><path d="M14.4 4.6l5-1.8.8 2.2-5.8 2.4z" fill="currentColor"/><path d="M8.6 12.4a4 4 0 0 1 3-2.2" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6" stroke-linecap="round"/>`),
  shop: S(`<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M14.6 8.6c-.6-.9-1.6-1.4-2.7-1.4-1.6 0-2.7.8-2.7 2 0 3 5.6 1.5 5.6 4.5 0 1.2-1.2 2-2.9 2-1.2 0-2.3-.5-2.9-1.5M12 5.6v1.6M12 16.8v1.6" ${STROKE} stroke-width="1.9"/>`),
  medkit: S(`<rect x="2.8" y="6.8" width="18.4" height="13" rx="2.4" fill="currentColor"/><path d="M8.4 6.8V5.2c0-.8.6-1.4 1.4-1.4h4.4c.8 0 1.4.6 1.4 1.4v1.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9.6v7M8.5 13.1h7" stroke="#1b1e23" stroke-width="2.4" stroke-linecap="round"/>`),
  // HUD
  health: S(`<path d="M9 2.5h6V9h6.5v6H15v6.5H9V15H2.5V9H9z" fill="currentColor"/>`),
  shield: S(`<path d="M12 2.2l8.2 3v6.2c0 5.2-3.5 9.2-8.2 10.6-4.7-1.4-8.2-5.4-8.2-10.6V5.2z" fill="currentColor"/>`),
  coins: S(`<ellipse cx="12" cy="6.2" rx="7.4" ry="3.2" fill="currentColor"/><path d="M4.6 8.6v3.2c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2V8.6c0 1.8-3.3 3.2-7.4 3.2S4.6 10.4 4.6 8.6z" fill="currentColor"/><path d="M4.6 13.6v3.2c0 1.8 3.3 3.2 7.4 3.2s7.4-1.4 7.4-3.2v-3.2c0 1.8-3.3 3.2-7.4 3.2s-7.4-1.4-7.4-3.2z" fill="currentColor"/>`),
  bullet: S(`<g transform="rotate(45 12 12)"><path d="M12 1.6c2.6 2.2 4.1 4.8 4.1 8.4v8H7.9v-8c0-3.6 1.5-6.2 4.1-8.4z" fill="currentColor"/><rect x="7.9" y="19" width="8.2" height="3.2" rx="1" fill="currentColor"/></g>`),
};
