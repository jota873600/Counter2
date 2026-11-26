// @ts-nocheck
/**
 * Retargeting: pega uma animação feita pro esqueleto padrão do Mixamo (ossos "mixamorig:X")
 * e gera um clipe equivalente pro esqueleto do nosso boneco (Prisma3D Pro, ossos "hip",
 * "rightUpperArm" etc.), mesmo os dois esqueletos tendo convenções de eixo bem diferentes.
 *
 * COMO FUNCIONA (resumo): pra cada osso, comparamos a orientação de "pose de referência"
 * (T-pose) dele no Mixamo com a orientação de referência do osso correspondente no nosso
 * boneco. Essa diferença vira uma "correção" fixa; usamos essa correção pra traduzir,
 * quadro a quadro, a rotação animada de um esqueleto pro outro, sem adivinhar nenhum eixo
 * na mão — é matemática de quatérnions, não chute.
 *
 * Isso não precisa ser perfeito pra ficar bom: pequenas imprecisões de mapeamento (ex: o
 * Mixamo tem 3 ossos de coluna e o boneco só tem 2) só deixam o balanço do tronco levemente
 * diferente, não quebram a animação.
 */
import * as THREE from 'three';

/** Mixamo (esquerda) -> nosso boneco Prisma3D (direita). Ajuste aqui se os nomes do seu
 *  modelo forem diferentes dos vistos no boneco1/boneco2.
 *  IMPORTANTE: o FBXLoader do three.js remove os ":" dos nomes ao carregar (ex:
 *  "mixamorig:Hips" vira "mixamorigHips") — por isso aqui já está tudo sem os dois-pontos. */
export const BONE_MAP = [
  ['mixamorigHips', 'hip'],
  ['mixamorigSpine', 'waist'],
  ['mixamorigNeck', 'neck'],
  ['mixamorigHead', 'head'],
  ['mixamorigRightShoulder', 'rightShoulder'],
  ['mixamorigRightArm', 'rightUpperArm'],
  ['mixamorigRightForeArm', 'rightForearm'],
  ['mixamorigRightHand', 'rightHand'],
  ['mixamorigLeftShoulder', 'leftShoulder'],
  ['mixamorigLeftArm', 'leftUpperArm'],
  ['mixamorigLeftForeArm', 'leftForearm'],
  ['mixamorigLeftHand', 'leftHand'],
  ['mixamorigRightUpLeg', 'rightThigh'],
  ['mixamorigRightLeg', 'rightCalf'],
  ['mixamorigRightFoot', 'rightFoot'],
  ['mixamorigLeftUpLeg', 'leftThigh'],
  ['mixamorigLeftLeg', 'leftCalf'],
  ['mixamorigLeftFoot', 'leftFoot'],
];
// "chest" no boneco não tem um correspondente direto (o Mixamo tem Spine1+Spine2); somamos
// as duas rotações do Mixamo pra aproximar o movimento do tronco superior.
export const CHEST_EXTRA_SOURCES = ['mixamorigSpine1', 'mixamorigSpine2'];
export const CHEST_TARGET = 'chest';
// só o osso raiz costuma ter POSIÇÃO animada (os outros só giram) — importante pra animações
// como "Death", onde o quadril precisa realmente cair/deslizar, não só os membros dobrarem.
export const ROOT_BONE_SOURCE = 'mixamorigHips';
export const ROOT_BONE_TARGET = 'hip';

function findBone(root, name) {
  let found = null;
  root.traverse((o) => { if (!found && o.name === name) found = o; });
  return found;
}

/** Converte o objeto "quaternion local de repouso" (bind pose) de um osso em sua orientação
 *  acumulada no mundo, SEM aplicar nenhuma animação — exatamente a pose em que o objeto foi
 *  carregado (por isso é importante chamar isto antes de tocar qualquer animação nele). */
function worldBindQuat(bone) {
  return bone.getWorldQuaternion(new THREE.Quaternion());
}

/** Amostra o valor (quaternion) de uma track em um instante t, com interpolação. */
function sampleTrack(track, t) {
  const interp = track.createInterpolant();
  const out = new THREE.Quaternion();
  interp.evaluate(t);
  out.fromArray(interp.resultBuffer);
  return out;
}

function findQuatTrack(clip, boneName) {
  return clip.tracks.find((tr) => tr.name === boneName + '.quaternion' && tr instanceof THREE.QuaternionKeyframeTrack);
}

function findPosTrack(clip, boneName) {
  return clip.tracks.find((tr) => tr.name === boneName + '.position' && tr instanceof THREE.VectorKeyframeTrack);
}

function sampleVec3(track, t) {
  const interp = track.createInterpolant();
  const out = new THREE.Vector3();
  interp.evaluate(t);
  out.fromArray(interp.resultBuffer);
  return out;
}

/**
 * Gera um THREE.AnimationClip com tracks pro esqueleto ALVO (targetScene, já no bind pose,
 * isto é, logo depois de carregado, antes de tocar qualquer mixer nele), a partir de um clipe
 * de origem (sourceClip) tocado num esqueleto de origem (sourceRoot) no padrão Mixamo.
 */
export function retargetClip(sourceRoot, sourceClip, targetScene, clipName, fps = 30) {
  const duration = sourceClip.duration;
  const nFrames = Math.max(2, Math.round(duration * fps) + 1);
  const times = new Float32Array(nFrames);
  for (let i = 0; i < nFrames; i++) times[i] = Math.min(duration, (i / (nFrames - 1)) * duration);

  const tracks = [];

  function buildPair(targetName, sourceNames) {
    const targetBone = findBone(targetScene, targetName);
    if (!targetBone) { console.warn('[retarget] osso alvo "' + targetName + '" não encontrado no boneco.'); return; }
    const sourceBones = sourceNames.map((n) => findBone(sourceRoot, n));
    if (sourceBones.some((b) => !b)) { console.warn('[retarget] osso(s) de origem faltando pra "' + targetName + '":', sourceNames); return; }
    const srcTracks = sourceNames.map((n) => findQuatTrack(sourceClip, n));
    if (srcTracks.some((t) => !t)) { console.warn('[retarget] sem animação de rotação pra:', sourceNames); return; }

    const bindTargetLocal = targetBone.quaternion.clone();
    const worldBindTarget = worldBindQuat(targetBone);

    // correção por osso-fonte: mapeia o referencial local de cada osso do Mixamo pro
    // referencial local do osso do boneco, usando as poses de T-pose de ambos
    const bindSourceLocals = sourceBones.map((b) => b.quaternion.clone());
    const corrections = sourceBones.map((b) => {
      const worldBindSource = worldBindQuat(b);
      return worldBindTarget.clone().invert().multiply(worldBindSource); // C
    });

    const values = new Float32Array(nFrames * 4);
    const tmp = new THREE.Quaternion();
    const deltaTargetTotal = new THREE.Quaternion();
    for (let i = 0; i < nFrames; i++) {
      const t = times[i];
      deltaTargetTotal.identity();
      for (let k = 0; k < sourceNames.length; k++) {
        const full = sampleTrack(srcTracks[k], t);
        const delta = bindSourceLocals[k].clone().invert().multiply(full); // delta no referencial da fonte
        const C = corrections[k];
        const deltaInTarget = C.clone().multiply(delta).multiply(C.clone().invert()); // conjugação -> referencial do alvo
        deltaTargetTotal.multiply(deltaInTarget); // soma (composição) quando há mais de uma fonte (ex: coluna)
      }
      const out = bindTargetLocal.clone().multiply(deltaTargetTotal);
      values[i * 4 + 0] = out.x; values[i * 4 + 1] = out.y; values[i * 4 + 2] = out.z; values[i * 4 + 3] = out.w;
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(targetName + '.quaternion', times, values));
  }

  function buildRootPosition() {
    const targetBone = findBone(targetScene, ROOT_BONE_TARGET);
    const sourceBone = findBone(sourceRoot, ROOT_BONE_SOURCE);
    const srcTrack = findPosTrack(sourceClip, ROOT_BONE_SOURCE);
    if (!targetBone || !sourceBone || !srcTrack) return; // sem movimento de raiz nessa animação (ex: Idle/Walk) — tudo bem, fica parado

    const bindTargetLocalPos = targetBone.position.clone();
    const bindSourceLocalPos = sourceBone.position.clone();
    // os dois bonecos têm tamanhos diferentes — usa a altura do quadril (em relação ao
    // chão) de cada um pra escalar o deslocamento, assim a queda fica proporcional
    const targetHipY = targetBone.getWorldPosition(new THREE.Vector3()).y;
    const sourceHipY = sourceBone.getWorldPosition(new THREE.Vector3()).y;
    const scale = (targetHipY > 0.01 && sourceHipY > 0.01) ? (targetHipY / sourceHipY) : 1;

    const values = new Float32Array(nFrames * 3);
    for (let i = 0; i < nFrames; i++) {
      const t = times[i];
      const full = sampleVec3(srcTrack, t);
      const delta = full.clone().sub(bindSourceLocalPos).multiplyScalar(scale);
      const out = bindTargetLocalPos.clone().add(delta);
      values[i * 3 + 0] = out.x; values[i * 3 + 1] = out.y; values[i * 3 + 2] = out.z;
    }
    tracks.push(new THREE.VectorKeyframeTrack(ROOT_BONE_TARGET + '.position', times, values));
  }

  for (const [src, tgt] of BONE_MAP) buildPair(tgt, [src]);
  buildPair(CHEST_TARGET, CHEST_EXTRA_SOURCES);
  buildRootPosition();

  if (!tracks.length) { console.warn('[retarget] nenhum osso bateu — confira BONE_MAP em retarget.ts.'); return null; }
  return new THREE.AnimationClip(clipName, duration, tracks);
}
