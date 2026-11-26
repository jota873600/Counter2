// @ts-nocheck
/**
 * Personagem baseado em modelo .glb (esqueleto + animações prontas), com fallback
 * automático para o boneco 100% procedural (models.ts) enquanto o arquivo não carrega
 * ou se ele falhar — o jogo nunca quebra por causa disso.
 *
 * COMO USAR
 * 1) Coloque o arquivo em `public/models/character.glb` (ou mude CONFIG.MODEL_URL).
 * 2) Rode o jogo e abra o console do navegador (F12): ao carregar, ele imprime os nomes
 *    dos ossos e das animações encontrados no arquivo.
 * 3) Ajuste os valores em CONFIG abaixo com esses nomes (osso da mão direita, nomes dos
 *    clipes de animação, nome do mesh/material do uniforme pra pintar com a cor do time).
 * 4) Pronto — build/setWeapon/animate do character.ts passam a usar o modelo sozinhos.
 *
 * Altura de referência do jogo (physics.ts/PARTBOX): pés em y=0, topo da cabeça em y≈1.78 —
 * ajuste CONFIG.SCALE até o seu modelo bater com essa altura.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { buildWeapon } from './models';
import { retargetClip } from './retarget';
import { extractRigidPart } from './armExtract';
import { W } from '../shared/weapons';

let handMeshes = null; // { right, left } — THREE.Mesh, extraídos uma vez do template

/** Mãos de verdade do boneco2 (extraídas da malha "Body"), pra usar no braço de primeira
 *  pessoa (viewmodel.ts) no lugar da caixinha procedural. null até o modelo carregar/se
 *  a extração falhar — quem usa trata isso como "ainda não disponível, usa o fallback". */
export function getHandMesh(side) {
  if (!handMeshes || !template) return null;
  return handMeshes[side] ? handMeshes[side].clone() : null;
}

function buildHandMeshes() {
  try {
    handMeshes = {
      right: extractRigidPart(template.scene, 'Body', ['rightHand']),
      left: extractRigidPart(template.scene, 'Body', ['leftHand']),
    };
  } catch (err) {
    console.warn('[charModel] Não consegui extrair as mãos do boneco2 — primeira pessoa usa o braço procedural normalmente.', err);
    handMeshes = null;
  }
}

/** Classe da arma atual, pra escolher a variante certa de animação (CONFIG.ANIM_VARIANTS).
 *  Por enquanto só distingue pistola; dá pra acrescentar 'sniper'/'big' depois do mesmo jeito. */
function weaponClass(wid) {
  if (!wid) return 'default';
  const w = W[wid];
  if (!w) return 'default';
  if (w.cat === 'pistols') return 'pistol';
  return 'default';
}

/* ------------------------------------------------------------------ */
/* Configuração — ajuste aqui, com base no console, ao trocar de .glb  */
/* ------------------------------------------------------------------ */
export const CONFIG = {
  MODEL_URL: '/models/character.gltf', // malha + esqueleto (o personagem "boneco2")
  // arquivos extras que só têm animação, MESMO esqueleto do boneco (ex: outro .glb
  // exportado do mesmo Prisma3D Pro). Coloque o caminho aqui, ex: '/models/boneco2-anim.glb'
  ANIM_URLS: [],
  // animações baixadas do Mixamo (esqueleto "mixamorig:X", diferente do boneco) — passam
  // pelo retargeting automático (retarget.ts) antes de entrar no jogo. "as" é o nome final
  // do clipe: um nome de CONFIG.ANIM (vale pra todo mundo) ou de CONFIG.ANIM_VARIANTS
  // (só pra quem tiver a classe de arma certa — ex: pistola).
  FBX_ANIMS: [
    { url: '/models/Idle.fbx', as: 'Idle' },
    { url: '/models/Walk.fbx', as: 'Walk' },
    { url: '/models/Run_Forward.fbx', as: 'Run' },
    { url: '/models/Pistol_Walk.fbx', as: 'Walk_Pistol' }, // andar atirando de pistola
    { url: '/models/Death.fbx', as: 'Death' },
  ],
  USE_DRACO: false,               // true se o arquivo foi exportado com compressão Draco
  DRACO_PATH: '/draco/',          // pasta com os decoders do draco (se USE_DRACO = true)
  SCALE: 1,                       // ajuste se o personagem nascer grande/pequeno demais
  YAW_OFFSET: Math.PI,            // gira o boneco no próprio eixo; Math.PI = 180° (testando pra corrigir "andando de costas")
  // peças do "boneco2" tintadas com a cor do time (olhos/pele/cabelo ficam como vieram)
  UNIFORM_NAME_HINTS: ['uniform', 'torso', 'shirt', 'jacket', 'vest', 'hoodie', 'trousers'],
  UNIFORM_TINT_STRENGTH: 0.55,    // 0 = cor original da textura, 1 = cor do time cheia (as roupas já têm textura própria, então mistura em vez de substituir)
  RIGHT_HAND_BONE: 'rightHand',   // osso real do "boneco2" (confirmado lendo o arquivo)
  ANIM: {
    // papel no jogo -> nome EXATO do clipe (veja o log de animações no console, depois de
    // colocar o arquivo de animação em ANIM_URLS). O "boneco2" ainda não tem animações.
    idle: 'Idle',
    walk: 'Walk',
    run: 'Run',
    crouch: 'CrouchWalk',
    crouchIdle: 'CrouchIdle',
    death: 'Death',
  },
  // sobrescreve o clipe de um papel quando weaponClass(arma atual) bate com a classe.
  // "Walk_Pistol" é o Pistol_Walk.fbx: só entra quando a arma equipada é uma pistola.
  ANIM_VARIANTS: {
    pistol: { walk: 'Walk_Pistol' },
  },
  CROSSFADE: 0.18,
};

let template = null; // { scene, animations, hasIdle }
let loadPromise = null;

/** Só considera "pronto" quando já tem pelo menos a animação de "idle" —
 *  assim, enquanto a animação não chega, o jogo continua com o boneco procedural
 *  em vez de mostrar o modelo novo parado/estático. */
export function isCharacterModelReady() { return !!template && template.hasIdle; }

function makeLoader() {
  const loader = new GLTFLoader();
  if (CONFIG.USE_DRACO) { const draco = new DRACOLoader(); draco.setDecoderPath(CONFIG.DRACO_PATH); loader.setDRACOLoader(draco); }
  return loader;
}

/** Chame uma vez no início do app (não precisa esperar — tem fallback procedural).
 *  Carrega a malha/esqueleto de CONFIG.MODEL_URL e, se houver, as animações extras
 *  de CONFIG.ANIM_URLS (arquivos separados, só com clipes, mesmo esqueleto). */
export async function preloadCharacterModel(url = CONFIG.MODEL_URL) {
  if (template) return template;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const gltf = await makeLoader().loadAsync(url);
      const animations = gltf.animations.slice();
      for (const animUrl of CONFIG.ANIM_URLS) {
        try {
          const animGltf = await makeLoader().loadAsync(animUrl);
          animations.push(...animGltf.animations);
        } catch (err) {
          console.warn('[charModel] Não consegui carregar a animação "' + animUrl + '".', err);
        }
      }
      for (const { url: fbxUrl, as: clipName } of CONFIG.FBX_ANIMS) {
        try {
          const fbxRoot = await new FBXLoader().loadAsync(fbxUrl);
          const srcClip = fbxRoot.animations[0];
          if (!srcClip) { console.warn('[charModel] "' + fbxUrl + '" não tem nenhuma animação dentro.'); continue; }
          const retargeted = retargetClip(fbxRoot, srcClip, gltf.scene, clipName);
          if (retargeted) { animations.push(retargeted); console.log('[charModel] Animação "' + clipName + '" retargetada a partir de "' + fbxUrl + '".'); }
        } catch (err) {
          console.warn('[charModel] Não consegui carregar/retargetar "' + fbxUrl + '".', err);
        }
      }
      const hasIdle = !!THREE.AnimationClip.findByName(animations, CONFIG.ANIM.idle);
      template = { scene: gltf.scene, animations, hasIdle };
      buildHandMeshes(); // precisa ser ANTES de qualquer mixer tocar (bind pose intacta)
      logGltfInfo(gltf, animations, hasIdle);
      return template;
    } catch (err) {
      console.warn('[charModel] Não consegui carregar "' + url + '" — usando o boneco procedural normalmente.', err);
      loadPromise = null;
      return null;
    }
  })();
  return loadPromise;
}

/** Ajuda a preencher CONFIG: lista ossos e clipes de animação achados no arquivo. */
function logGltfInfo(gltf, animations, hasIdle) {
  const bones = [];
  gltf.scene.traverse((o) => { if (o.isBone) bones.push(o.name); });
  console.log('[charModel] Modelo carregado. Ossos encontrados:', bones);
  console.log('[charModel] Animações encontradas:', animations.map((a) => a.name));
  if (!hasIdle) console.log('[charModel] Sem animação "' + CONFIG.ANIM.idle + '" ainda — continua usando o boneco procedural até ela chegar (veja CONFIG.ANIM_URLS).');
  console.log('[charModel] Ajuste CONFIG em charModel.ts com esses nomes se os papéis (idle/walk/run...) não baterem.');
}

/* ------------------------------------------------------------------ */
/* Construção do personagem a partir do template clonado               */
/* ------------------------------------------------------------------ */
function tintUniform(scene, color) {
  const col = new THREE.Color(color);
  scene.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    // o nome da peça está no node pai (Hoodie/Trousers/...), não no mesh em si
    const name = ((o.name || '') + ' ' + (o.parent && o.parent.name || '') + ' ' + (o.material.name || '')).toLowerCase();
    if (!CONFIG.UNIFORM_NAME_HINTS.some((h) => name.includes(h))) return;
    o.material = o.material.clone(); // nunca mexer no material compartilhado do template
    // essas peças já vêm com textura/cor própria (não são um uniforme branco liso),
    // então mistura com branco em vez de substituir, pra não "lavar" a textura original
    if (o.material.color) o.material.color.set(0xffffff).lerp(col, CONFIG.UNIFORM_TINT_STRENGTH);
  });
}

function findBoneByName(scene, name) {
  let found = null;
  scene.traverse((o) => { if (!found && o.isBone && o.name === name) found = o; });
  return found;
}

export function buildCharacterGLTF(color /*, skinId */) {
  const scene = SkeletonUtils.clone(template.scene);
  scene.scale.setScalar(CONFIG.SCALE);
  scene.rotation.y = CONFIG.YAW_OFFSET; // corrige a frente do modelo em relação à direção do jogo
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  tintUniform(scene, color);

  const root = new THREE.Group(); root.add(scene);
  const mixer = new THREE.AnimationMixer(scene);
  const clips = {};
  for (const [role, name] of Object.entries(CONFIG.ANIM)) {
    const clip = THREE.AnimationClip.findByName(template.animations, name);
    if (clip) {
      const action = mixer.clipAction(clip);
      // "death" é a única animação que não deve ficar em loop — toca uma vez e
      // congela no último quadro (o personagem fica caído, não "reiniciando" a queda)
      if (role === 'death') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
      clips[role] = action;
    }
    else console.warn('[charModel] Animação "' + name + '" (papel "' + role + '") não encontrada — confira CONFIG.ANIM.');
  }
  // variantes por classe de arma (CONFIG.ANIM_VARIANTS), guardadas como "papel__classe"
  for (const [cls, roles] of Object.entries(CONFIG.ANIM_VARIANTS || {})) {
    for (const [role, name] of Object.entries(roles)) {
      const clip = THREE.AnimationClip.findByName(template.animations, name);
      if (clip) clips[role + '__' + cls] = mixer.clipAction(clip);
      else console.warn('[charModel] Variante "' + name + '" (papel "' + role + '", classe "' + cls + '") não encontrada.');
    }
  }
  if (clips.idle) clips.idle.play();

  const handBone = findBoneByName(scene, CONFIG.RIGHT_HAND_BONE);
  if (!handBone) console.warn('[charModel] Osso "' + CONFIG.RIGHT_HAND_BONE + '" não encontrado — ajuste CONFIG.RIGHT_HAND_BONE (veja o log de ossos).');
  const mount = new THREE.Group();
  (handBone || scene).add(mount);

  root.userData = { mixer, clips, mount, handBone, weapon: null, weaponId: '', current: 'idle', deadT: 0 };
  return root;
}

export function setCharWeaponGLTF(ch, id) {
  const u = ch.userData;
  if (u.weaponId === id) return;
  u.weaponId = id;
  if (u.weapon) { u.mount.remove(u.weapon); u.weapon = null; }
  if (!id) return;
  const w = buildWeapon(id);
  u.mount.add(w.g); u.weapon = w.g;
  // Ponto de partida — calibre posição/rotação/escala olhando a arma na mão do seu rig:
  w.g.position.set(0, 0, 0); w.g.rotation.set(0, Math.PI / 2, 0); w.g.scale.setScalar(1.15);
}

function crossTo(u, role, fadeTime = CONFIG.CROSSFADE) {
  if (u.current === role || !u.clips[role]) return;
  const from = u.clips[u.current], to = u.clips[role];
  if (from) from.fadeOut(fadeTime);
  to.reset().fadeIn(fadeTime).play();
  u.current = role;
}

const clampNum = (v, a, b) => Math.max(a, Math.min(b, v));

/** Se existir uma variante pra (papel, classe da arma atual), usa ela — senão cai no papel normal. */
function resolveRole(u, role, wid) {
  const key = role + '__' + weaponClass(wid);
  return u.clips[key] ? key : role;
}

export function animateCharacterGLTF(ch, dt, st) {
  const u = ch.userData;
  if (!st.alive) {
    if (u.current !== 'death' && u.clips.death) { crossTo(u, 'death', 0.12); u.deadT = 0; }
    u.deadT += dt;
    u.mixer.update(dt);
    ch.rotation.order = 'YXZ'; ch.rotation.x = 0; ch.rotation.y = st.yaw;
    return;
  }
  u.deadT = 0;
  const sp = st.speed;
  let role = 'idle';
  if (st.cr > 0.5) role = sp > 0.3 && u.clips.crouch ? 'crouch' : (u.clips.crouchIdle ? 'crouchIdle' : 'idle');
  else if (sp > 4.2 && u.clips.run) role = 'run';
  else if (sp > 0.3) role = 'walk';
  crossTo(u, resolveRole(u, role, st.wid));
  const active = u.clips[u.current];
  if (active) active.timeScale = role === 'run' ? clampNum(sp / 6, 0.7, 1.4) : role === 'walk' || role === 'crouch' ? clampNum(sp / 3, 0.6, 1.6) : 1;
  u.mixer.update(dt);
  ch.rotation.order = 'YXZ'; ch.rotation.x = 0; ch.rotation.y = st.yaw;
}
