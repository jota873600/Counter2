// @ts-nocheck
/**
 * Armas cujo visual vem de um modelo .gltf baixado (em vez de ser montado por código,
 * como as outras em models.ts). Carrega em paralelo, sem travar nada — enquanto não
 * carrega, buildWeapon() usa uma arma procedural comum no lugar (ver models.ts).
 *
 * Pra adicionar outra arma assim: 1) bota os arquivos em public/models/weapons/<id>/,
 * 2) acrescenta uma entrada aqui em EXTERNAL_WEAPONS, 3) cria a entrada correspondente
 * em W (weapons.ts) com os números de jogo (dano, cadência, etc.) — essa parte não tem
 * nada a ver com o modelo 3D em si.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const EXTERNAL_WEAPONS = {
  ak47pix: {
    url: '/models/weapons/ak47pix/scene.gltf',
    // Ponto de partida — ainda não vi o modelo rodando de verdade, então isso tudo é
    // chute inicial (igual a arma na mão do personagem 3D): calibre depois de testar.
    scale: 0.045,                         // o arquivo vem em "unidades" bem maiores que metros
    rotation: new THREE.Euler(0, Math.PI / 2, 0), // tenta alinhar o cano com -Z (convenção do jogo)
    position: new THREE.Vector3(0, -0.02, 0.1),   // desloca até a empunhadura ficar na origem
    lh: new THREE.Vector3(-0.01, -0.05, -0.18),   // mão de apoio (guarda-mão)
    rh: new THREE.Vector3(0, 0, 0.02),            // mão de disparo (empunhadura)
    magPos: new THREE.Vector3(0, -0.1, -0.1),
    sightY: 0.09,
  },
};

const templates = {};   // id -> THREE.Group já escalado/rotacionado (não clonado ainda)
const loadPromises = {};

export function preloadExternalWeapons() {
  for (const id of Object.keys(EXTERNAL_WEAPONS)) {
    if (loadPromises[id]) continue;
    const spec = EXTERNAL_WEAPONS[id];
    loadPromises[id] = new GLTFLoader().loadAsync(spec.url).then((gltf) => {
      const wrap = new THREE.Group();
      gltf.scene.scale.setScalar(spec.scale);
      gltf.scene.rotation.copy(spec.rotation);
      gltf.scene.position.copy(spec.position);
      wrap.add(gltf.scene);
      templates[id] = wrap;
      console.log('[externalWeapon] "' + id + '" carregado de "' + spec.url + '".');
    }).catch((err) => {
      console.warn('[externalWeapon] Não consegui carregar "' + id + '" — usando a arma procedural normalmente.', err);
    });
  }
}

export function isExternalWeaponReady(id) { return !!templates[id]; }

/** Devolve um THREE.Group novo (clone) pronto pra usar, ou null se ainda não carregou. */
export function buildExternalWeaponVisual(id) {
  if (!templates[id]) return null;
  return templates[id].clone();
}
