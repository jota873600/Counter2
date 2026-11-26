// @ts-nocheck
/**
 * Fachada dos personagens: usa o modelo .glb (charModel.ts) quando ele já carregou,
 * e cai pro boneco procedural (models.ts) caso contrário. main.ts e preview.ts devem
 * importar DAQUI (em vez de './models') pra ganhar isso automaticamente.
 *
 * Cada personagem já construído "lembra" com qual sistema nasceu (checando userData.mixer),
 * então não existe risco de misturar os dois no mesmo boneco.
 */
import {
  buildCharacter as buildCharacterProcedural,
  setCharWeapon as setCharWeaponProcedural,
  animateCharacter as animateCharacterProcedural,
} from './models';
import {
  isCharacterModelReady, preloadCharacterModel,
  buildCharacterGLTF, setCharWeaponGLTF, animateCharacterGLTF,
  getHandMesh,
} from './charModel';

export { preloadCharacterModel, isCharacterModelReady, getHandMesh };

export function buildCharacter(color, skinId) {
  return isCharacterModelReady() ? buildCharacterGLTF(color, skinId) : buildCharacterProcedural(color, skinId);
}
export function setCharWeapon(ch, id) {
  return ch.userData.mixer ? setCharWeaponGLTF(ch, id) : setCharWeaponProcedural(ch, id);
}
export function animateCharacter(ch, dt, st) {
  return ch.userData.mixer ? animateCharacterGLTF(ch, dt, st) : animateCharacterProcedural(ch, dt, st);
}
