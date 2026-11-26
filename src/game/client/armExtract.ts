// @ts-nocheck
/**
 * Tira um pedaço rígido (ex: a mão) de dentro de uma malha com esqueleto (SkinnedMesh),
 * usando o peso de influência de cada vértice pros ossos — sem precisar que o modelo
 * já venha com a mão como uma malha separada.
 *
 * Como funciona: pra cada triângulo da malha, olha qual osso mais influencia cada vértice
 * (o de maior peso). Se pelo menos 2 dos 3 vértices do triângulo são "dominados" por um dos
 * ossos pedidos (ex: "rightHand"), o triângulo entra no recorte. O corte fica limpo porque
 * a transição entre dois ossos (antebraço -> mão) já é onde o peso muda de um pro outro.
 *
 * O resultado é uma geometria ESTÁTICA (sem esqueleto), com os vértices já convertidos pro
 * espaço local do primeiro osso pedido — assim dá pra usar o pedaço como um objeto rígido
 * comum (mover/girar ele já posiciona a "mão" certinha, sem precisar de esqueleto nenhum).
 *
 * IMPORTANTE: só funciona certo se a malha ainda estiver na pose de descanso (bind pose) —
 * ou seja, antes de qualquer AnimationMixer tocar nela. Use isso só na malha "template"
 * (antes de clonar pra criar personagens), igual o retarget.ts já faz.
 */
import * as THREE from 'three';

function findSkinnedMeshByName(scene, name) {
  let found = null;
  scene.traverse((o) => { if (!found && o.isSkinnedMesh && o.name === name) found = o; });
  return found;
}

function compAt(attr, i, k) {
  if (k === 0) return attr.getX(i);
  if (k === 1) return attr.getY(i);
  if (k === 2) return attr.getZ(i);
  return attr.getW(i);
}

function dominantBoneIndex(skinIndexAttr, skinWeightAttr, vertexIdx) {
  let best = -1, bestW = -1;
  for (let k = 0; k < 4; k++) {
    const w = compAt(skinWeightAttr, vertexIdx, k);
    if (w > bestW) { bestW = w; best = compAt(skinIndexAttr, vertexIdx, k); }
  }
  return best;
}

/**
 * meshName: nome do SkinnedMesh de origem (ex: "Body").
 * boneNames: ossos que formam a peça (ex: ["rightHand"]) — o PRIMEIRO da lista vira o
 * referencial local do resultado (é nele que o pedaço fica "parado"/centralizado).
 * Retorna um THREE.Mesh estático (geometria só, material clonado da malha de origem) ou null.
 */
export function extractRigidPart(scene, meshName, boneNames) {
  const mesh = findSkinnedMeshByName(scene, meshName);
  if (!mesh) { console.warn('[armExtract] Malha "' + meshName + '" não encontrada.'); return null; }
  const geom = mesh.geometry;
  const posAttr = geom.attributes.position, normAttr = geom.attributes.normal, uvAttr = geom.attributes.uv;
  const skinIndexAttr = geom.attributes.skinIndex, skinWeightAttr = geom.attributes.skinWeight;
  if (!posAttr || !skinIndexAttr || !skinWeightAttr) { console.warn('[armExtract] "' + meshName + '" não tem dados de esqueleto (skinIndex/skinWeight).'); return null; }

  const bones = mesh.skeleton.bones;
  const wanted = new Set();
  for (const n of boneNames) { const i = bones.findIndex((b) => b.name === n); if (i >= 0) wanted.add(i); else console.warn('[armExtract] Osso "' + n + '" não achado no esqueleto de "' + meshName + '".'); }
  if (!wanted.size) return null;

  const localBone = bones.find((b) => b.name === boneNames[0]);
  mesh.updateMatrixWorld(true);
  localBone.updateMatrixWorld(true);
  const invBone = new THREE.Matrix4().copy(localBone.matrixWorld).invert();
  const toLocal = new THREE.Matrix4().multiplyMatrices(invBone, mesh.matrixWorld); // malha -> mundo -> local do osso

  const index = geom.index ? geom.index.array : null;
  const triCount = index ? index.length / 3 : posAttr.count / 3;
  const vIndexOf = (t, k) => (index ? index[t * 3 + k] : t * 3 + k);

  const newPos = [], newNorm = [], newUv = [], newIndex = [];
  const remap = new Map();
  const v = new THREE.Vector3(), n = new THREE.Vector3();

  function remapVertex(oldIdx) {
    let idx = remap.get(oldIdx);
    if (idx !== undefined) return idx;
    v.fromBufferAttribute(posAttr, oldIdx).applyMatrix4(toLocal);
    newPos.push(v.x, v.y, v.z);
    if (normAttr) { n.fromBufferAttribute(normAttr, oldIdx).transformDirection(toLocal); newNorm.push(n.x, n.y, n.z); }
    if (uvAttr) newUv.push(uvAttr.getX(oldIdx), uvAttr.getY(oldIdx));
    idx = newPos.length / 3 - 1;
    remap.set(oldIdx, idx);
    return idx;
  }

  for (let t = 0; t < triCount; t++) {
    const a = vIndexOf(t, 0), b = vIndexOf(t, 1), c = vIndexOf(t, 2);
    const da = wanted.has(dominantBoneIndex(skinIndexAttr, skinWeightAttr, a));
    const db = wanted.has(dominantBoneIndex(skinIndexAttr, skinWeightAttr, b));
    const dc = wanted.has(dominantBoneIndex(skinIndexAttr, skinWeightAttr, c));
    if ((da ? 1 : 0) + (db ? 1 : 0) + (dc ? 1 : 0) < 2) continue; // maioria fora da peça -> descarta
    newIndex.push(remapVertex(a), remapVertex(b), remapVertex(c));
  }

  if (!newIndex.length) { console.warn('[armExtract] Nenhum triângulo bateu com os ossos', boneNames, 'em "' + meshName + '".'); return null; }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  if (newNorm.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(newNorm, 3));
  if (newUv.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(newUv, 2));
  out.setIndex(newIndex);
  if (!newNorm.length) out.computeVertexNormals();

  const mat = Array.isArray(mesh.material) ? mesh.material[0].clone() : mesh.material.clone();
  return new THREE.Mesh(out, mat);
}
