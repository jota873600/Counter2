// @ts-nocheck
/**
 * Skins cosméticas dos bonecos. A cor do TIME continua no torso/mangas (para identificar aliados e inimigos);
 * a skin muda cabeça/mãos, pernas, sapatos, rosto e acessório. Só o índice trafega pela rede.
 */
export const SKINS = [
  { name: 'Clássico', skin: 0xc6c9ce, legs: 0x59606c, shoes: 0x2a2e35, face: 'smile' },
  { name: 'Dourado', skin: 0xe3b341, legs: 0x7a5c1e, shoes: 0x3a2c0c, face: 'smile', metal: true },
  { name: 'Ninja', skin: 0x1d2026, legs: 0x16181c, shoes: 0x0e0f12, face: 'ninja', acc: 'headband', accColor: 0xc92a2a },
  { name: 'Zumbi', skin: 0x7fa65a, legs: 0x4a5a3a, shoes: 0x2a2a22, face: 'zombie' },
  { name: 'Robô', skin: 0xaeb8c4, legs: 0x6b7684, shoes: 0x353b44, face: 'robot', acc: 'antenna', accColor: 0xfbbf24, metal: true },
  { name: 'Soldado', skin: 0xd9a47b, legs: 0x4f5a34, shoes: 0x1b1b1d, face: 'smile', acc: 'cap', accColor: 0x4f5a34 },
  { name: 'Descolado', skin: 0xe0b48a, legs: 0x2e3b5a, shoes: 0xe9edf0, face: 'shades' },
  { name: 'Gato', skin: 0xe08a3c, legs: 0x8a4f1c, shoes: 0x3b2410, face: 'cat', acc: 'ears', accColor: 0xe08a3c },
  { name: 'Fantasma', skin: 0xeef2f6, legs: 0xcfd6df, shoes: 0xaab4c0, face: 'ghost' },
  { name: 'Punk', skin: 0xf0a0c0, legs: 0x2a2a33, shoes: 0xc92a2a, face: 'grin', acc: 'mohawk', accColor: 0x3b82f6 },
];
export const SKIN_COUNT = SKINS.length;
export const clampSkin = (n) => { n = Number(n) | 0; return n >= 0 && n < SKIN_COUNT ? n : 0; };
/** Skin estável derivada de um id (usada pelos bots). */
export const skinFromId = (id) => { let h = 7; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % SKIN_COUNT; };
