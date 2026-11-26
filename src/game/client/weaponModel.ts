// @ts-nocheck
/**
 * Carrega modelos de arma prontos (.gltf/.glb) pra usar no lugar da geometria procedural
 * de models.ts, pra armas específicas. Segue a mesma convenção das armas procedurais:
 * origem na empunhadura, cano apontando pra -Z, topo +Y (ver cabeçalho de models.ts).
 *
 * Como funciona: cada entrada em CONFIG.MODELS tem o id da arma que ela substitui
 * (CONFIG.forId) — quando o modelo termina de carregar, buildWeapon(id) em models.ts
 * passa a devolver esse modelo em vez da arma procedural, automaticamente, tanto na mão
 * do boneco quanto na visão em primeira pessoa (os dois já usam buildWeapon).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MODELS = [
  {
    forId: 'ar',
    url: '/models/pixel_ak47/scene.gltf',
    // Calibrado a partir da caixa delimitadora do modelo (eixo longo original = Y) —
    // pode precisar de ajuste fino depois de ver renderizado.
    scale: 0.064,
    rotation: [-Math.PI / 2, 0, 0], // leva o "comprimento" do modelo (Y) pro cano em -Z
    position: [0, 0, 0],
    // pontos de apoio das mãos, no mesmo estilo dos valores default de buildWeapon():
    lh: [0, -0.03, -0.22], rh: [0, -0.02, 0], magPos: [0, -0.1, -0.15], sightY: 0.1,
    // Crédito exigido pela licença CC-BY-4.0 do modelo (Sketchfab "Pixel AK-47" por FireWarden) —
    // mantenha isso visível em algum lugar do jogo (tela de créditos, about, etc.)
    credit: 'Modelo "Pixel AK-47" por FireWarden (sketchfab.com/FireWarden), licença CC-BY-4.0.',
  },
];

const templates = {}; // forId -> THREE.Group (bind, nunca animado/alterado depois de carregado)
const loading = {};

export function isWeaponModelReady(forId) { return !!templates[forId]; }

export async function preloadWeaponModels() {
  for (const m of MODELS) {
    if (templates[m.forId] || loading[m.forId]) continue;
    loading[m.forId] = new GLTFLoader().loadAsync(m.url).then((gltf) => {
      templates[m.forId] = gltf.scene;
      console.log('[weaponModel] "' + m.forId + '" carregado de ' + m.url + '. ' + m.credit);
    }).catch((err) => {
      console.warn('[weaponModel] Não consegui carregar "' + m.url + '" — a arma "' + m.forId + '" continua procedural.', err);
    });
  }
}

export function buildWeaponFromModel(forId) {
  const cfg = MODELS.find((m) => m.forId === forId);
  const template = templates[forId];
  if (!cfg || !template) return null;
  const g = new THREE.Group();
  const inner = template.clone();
  inner.scale.setScalar(cfg.scale);
  inner.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);
  inner.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
  inner.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(inner);
  return {
    g, parts: {},
    sightY: cfg.sightY,
    lh: new THREE.Vector3(...cfg.lh), rh: new THREE.Vector3(...cfg.rh), magPos: new THREE.Vector3(...cfg.magPos),
    scope: false, kind: 'gun',
  };
}
