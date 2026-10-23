// Goblin Defenders: icons (HUD, tower medallion emblems, sell and upgrade) and projectiles, modelled so they share
// the towers' lighting and materials. Each returns { obj, frame?, sheet? }; flat icons are tilted to face the camera.
import * as THREE from 'three';
import { mats } from './models.js';

const ELEV = 40 * Math.PI / 180;
function mesh(g, m) { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; }
function ext(shape, depth, mat, bev) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev || depth * .4, bevelSize: bev || depth * .4, bevelSegments: 4, curveSegments: 16 });
  g.center(); return mesh(g, mat);
}
function star5(R, r) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * d, -Math.sin(a) * d); } s.closePath(); return s; }
function std(o) { return new THREE.MeshStandardMaterial(o); }
// icons face the camera head on, where shiny metal only mirrors the sky: so their gold and steel are painted, not polished
let IG, IS, IB;
function igold() { return IG || (IG = std({ color: 0xffb21e, metalness: .45, roughness: .32, emissive: 0x7a3a00, emissiveIntensity: .28 })); }
function isteel() { return IS || (IS = std({ color: 0xb8c4d0, metalness: .5, roughness: .3, emissive: 0x1a2430, emissiveIntensity: .2 })); }
function ibrass() { return IB || (IB = std({ color: 0xd08a2a, metalness: .5, roughness: .35, emissive: 0x4a2400, emissiveIntensity: .2 })); }
function up(o) { const g = new THREE.Group(); o.rotation.y += .32; o.rotation.x += .12; g.add(o); g.rotation.x = -ELEV; return g; }   // XY-plane art, turned to face the camera

function star() { return { obj: up(ext(star5(.42, .19), .08, std({ color: 0x2a7aff, metalness: .2, roughness: .35, emissive: 0x0a2a90, emissiveIntensity: .3 }), .05)) }; }
function coin() {
  const M = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.4, .4, .09, 40), igold()).rotateX(Math.PI / 2));
  g.add(mesh(new THREE.TorusGeometry(.36, .035, 10, 40), ibrass()));
  // the swirl stamped on the face
  const pts = []; for (let i = 0; i < 60; i++) { const a = i * .22, r = .04 + i * .0045; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, .05)); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .022, 6), std({ color: 0xe86a00, metalness: .3, roughness: .4 })));
  return { obj: up(g) };
}
function gem() {
  const g = new THREE.Group(), m = std({ color: 0xff2ab8, emissive: 0x8a0060, emissiveIntensity: .4, metalness: .1, roughness: .2, flatShading: true });
  const geo = new THREE.CylinderGeometry(.36, .44, .16, 8, 1); g.add(mesh(geo, m).translateY(.08));
  g.add(mesh(new THREE.ConeGeometry(.44, .4, 8), m).rotateX(Math.PI).translateY(.2));
  g.add(mesh(new THREE.CylinderGeometry(.2, .36, .02, 8), std({ color: 0xff8ae0, emissive: 0xc02a9a, emissiveIntensity: .3, flatShading: true })).translateY(.17));
  g.rotation.set(.35, .4, 0); const w = new THREE.Group(); w.add(g); w.rotation.x = .1; return { obj: w };
}
function skullObj(mat, eyeMat) {
  const M = mats(), g = new THREE.Group(); mat = mat || M.bone;
  g.add(mesh(new THREE.SphereGeometry(.3, 28, 20), mat).translateY(.06));
  g.add(mesh(new THREE.BoxGeometry(.3, .18, .26), mat).translateY(-.16).translateZ(.04));
  [-1, 1].forEach(k => { const e = mesh(new THREE.SphereGeometry(.085, 16, 12), eyeMat || M.dark); e.position.set(k * .11, .02, .25); e.scale.set(1, 1.1, .5); g.add(e); });
  const n = mesh(new THREE.ConeGeometry(.04, .07, 3), M.dark); n.position.set(0, -.08, .29); n.rotation.x = Math.PI; g.add(n);
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(.04, .05, .02), M.dark).translateX(-.075 + i * .05).translateY(-.2).translateZ(.17));
  return g;
}
function skull() { const g = skullObj(); g.rotation.x = -.15; return { obj: g }; }
function shield() {
  const s = new THREE.Shape(); s.moveTo(0, .42); s.quadraticCurveTo(.2, .44, .36, .34); s.quadraticCurveTo(.4, -.1, 0, -.44); s.quadraticCurveTo(-.4, -.1, -.36, .34); s.quadraticCurveTo(-.2, .44, 0, .42);
  const g = new THREE.Group(); g.add(ext(s, .08, igold(), .04));
  const half = new THREE.Shape(); half.moveTo(0, .4); half.quadraticCurveTo(.18, .41, .32, .32); half.quadraticCurveTo(.36, -.08, 0, -.4); half.closePath();
  const h = ext(half, .02, std({ color: 0xffe08a, metalness: .3, roughness: .35, emissive: 0x6a4a00, emissiveIntensity: .2 }), .01); h.position.set(.14, 0, .07); h.scale.set(.85, .9, 1); g.add(h);
  return { obj: up(g) };
}
function arrowhead() {
  const M = mats(), g = new THREE.Group(), s = new THREE.Shape();
  s.moveTo(0, .48); s.lineTo(.26, -.05); s.lineTo(.1, -.02); s.lineTo(.08, -.28); s.lineTo(-.08, -.28); s.lineTo(-.1, -.02); s.lineTo(-.26, -.05); s.closePath();
  g.add(ext(s, .06, isteel(), .04));
  g.add(mesh(new THREE.CylinderGeometry(.055, .055, .32, 10), M.woodDark).translateY(-.4));
  [-1, 1].forEach(k => { const f = mesh(new THREE.BoxGeometry(.1, .18, .015), std({ color: 0xff7a2a, roughness: .7 })); f.position.set(k * .07, -.5, 0); f.rotation.z = k * .3; g.add(f); });
  g.rotation.z = -.75; return { obj: up(g) };
}
function bombIcon() {
  const M = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(.34, 32, 24), M.black).translateY(-.05));
  g.add(mesh(new THREE.CylinderGeometry(.1, .12, .1, 16), M.ironDark).translateY(.31));
  const fuse = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .34, 0), new THREE.Vector3(.08, .46, 0), new THREE.Vector3(.2, .48, .02), new THREE.Vector3(.26, .4, .02)]);
  g.add(mesh(new THREE.TubeGeometry(fuse, 20, .025, 6), M.rope));
  g.add(mesh(new THREE.SphereGeometry(.06, 12, 8), std({ color: 0xffe07a, emissive: 0xffa010, emissiveIntensity: 2 })).translateX(.27).translateY(.4));
  const hl = mesh(new THREE.SphereGeometry(.08, 12, 8), std({ color: 0xffffff, roughness: .1, transparent: true, opacity: .35 })); hl.position.set(-.13, .08, .26); g.add(hl);
  return { obj: g };
}
function snowflake() {
  const g = new THREE.Group(), m = std({ color: 0xc8eeff, emissive: 0x3aa0ff, emissiveIntensity: .7, roughness: .3 });
  for (let i = 0; i < 6; i++) {
    const arm = new THREE.Group(); arm.add(mesh(new THREE.BoxGeometry(.06, .42, .05), m).translateY(.21));
    [.2, .32].forEach(y => [-1, 1].forEach(k => { const b = mesh(new THREE.BoxGeometry(.045, .14, .04), m); b.position.set(k * .05, y, 0); b.rotation.z = -k * .8; arm.add(b); }));
    arm.rotation.z = i * Math.PI / 3; g.add(arm);
  }
  g.add(mesh(new THREE.CylinderGeometry(.09, .09, .07, 6), m).rotateX(Math.PI / 2));
  return { obj: up(g) };
}
function poisonSkull() {
  const g = skullObj(std({ color: 0x2a2a2a, roughness: .6 }), std({ color: 0x9dff3a, emissive: 0x6ad010, emissiveIntensity: 1.2 })); g.rotation.x = -.15;
  return { obj: g };
}
function clawIcon() {
  // the heavy claw: three curved iron talons round a wooden grip
  const M = mats(), g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const t = mesh(new THREE.TorusGeometry(.32, .06 - i * .008, 10, 24, Math.PI * .7), i === 1 ? M.steel : M.iron);
    t.position.set(-.05 + i * .14, -.05 + i * .02, i * .02); t.rotation.z = Math.PI * .1; t.scale.set(1, 1.15, 1); g.add(t);
    const tip = mesh(new THREE.ConeGeometry(.06 - i * .008, .16, 10), M.steel); tip.position.set(-.05 + i * .14 + Math.cos(Math.PI * .8) * .32, -.05 + i * .02 + Math.sin(Math.PI * .8) * .37, i * .02); tip.rotation.z = Math.PI * .85 + .3; g.add(tip);
  }
  g.add(mesh(new THREE.CylinderGeometry(.08, .1, .3, 12), M.woodDark).translateX(.18).translateY(-.32).rotateZ(.5));
  g.rotation.z = .2; return { obj: up(g) };
}
function teslaIcon() {
  const M = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(.24, 24, 18), M.orb).translateY(.12)); g.add(mesh(new THREE.SphereGeometry(.12, 16, 12), M.orbCore).translateY(.12));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.TorusGeometry(.16 - i * .01, .03, 8, 24), M.coil).rotateX(Math.PI / 2).translateZ(.18 + i * .07));
  return { obj: g };
}
function shellIcon() {
  const M = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(.16, .16, .36, 24), M.brass)); g.add(mesh(new THREE.SphereGeometry(.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.black).translateY(.18));
  g.add(mesh(new THREE.ConeGeometry(.16, .26, 24), M.black).translateY(.38)); g.add(mesh(new THREE.TorusGeometry(.165, .025, 8, 24), M.redCloth).rotateX(Math.PI / 2).translateZ(-.05));
  g.rotation.z = -.6; return { obj: g };
}
function spikeIcon() {
  const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.24, 24, 18), M.ironDark));
  const ds = []; for (let i = 0; i < 14; i++) { const y = 1 - (i + .5) / 14 * 2, r = Math.sqrt(1 - y * y), a = i * 2.4; ds.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
  ds.forEach(d => { const c = mesh(new THREE.ConeGeometry(.06, .2, 8), M.steel); c.position.copy(d.clone().multiplyScalar(.3)); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(c); });
  return { obj: g };
}
function sellCoins() {
  const M = mats(), g = new THREE.Group();
  [[-.17, -.05, 0], [.17, -.05, .02], [0, .12, .04]].forEach(([x, y, z]) => { const c = coin().obj; c.scale.setScalar(.55); c.position.set(x, y, z); g.add(c); });
  return { obj: g };
}
function upArrow() {
  const s = new THREE.Shape(); s.moveTo(0, .44); s.lineTo(.36, .04); s.lineTo(.15, .04); s.lineTo(.15, -.4); s.lineTo(-.15, -.4); s.lineTo(-.15, .04); s.lineTo(-.36, .04); s.closePath();
  return { obj: up(ext(s, .1, std({ color: 0x2ec02e, emissive: 0x0a5a0a, emissiveIntensity: .3, roughness: .4 }), .05)) };
}
function swords() {
  const M = mats(), g = new THREE.Group();
  [-1, 1].forEach(k => { const s = new THREE.Group(); s.add(mesh(new THREE.BoxGeometry(.07, .62, .03), isteel()).translateY(.12)); s.add(mesh(new THREE.ConeGeometry(.05, .1, 4), isteel()).translateY(.47)); s.add(mesh(new THREE.BoxGeometry(.26, .05, .05), M.brass).translateY(-.2)); s.add(mesh(new THREE.CylinderGeometry(.03, .03, .14, 8), M.leather).translateY(-.29)); s.rotation.z = k * .7; g.add(s); });
  return { obj: up(g) };
}
function heartFlag() { const s = new THREE.Shape(); s.moveTo(0, -.32); s.bezierCurveTo(-.46, .0, -.34, .4, 0, .2); s.bezierCurveTo(.34, .4, .46, 0, 0, -.32); return { obj: up(ext(s, .1, std({ color: 0xf01a30, emissive: 0x6a0010, emissiveIntensity: .25, roughness: .4 }), .05)) }; }
function lockIcon() {
  const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(.46, .36, .14), igold()).translateY(-.1));
  g.add(mesh(new THREE.TorusGeometry(.15, .045, 10, 24, Math.PI), isteel()).translateY(.08)); g.add(mesh(new THREE.CylinderGeometry(.045, .045, .1, 8), M.steel).translateX(.15).translateY(.05)); g.add(mesh(new THREE.CylinderGeometry(.045, .045, .1, 8), M.steel).translateX(-.15).translateY(.05));
  g.add(mesh(new THREE.CylinderGeometry(.05, .05, .02, 12), M.dark).rotateX(Math.PI / 2).translateZ(.075).translateY(-.08));
  return { obj: up(g) };
}
function crown() {
  const g = new THREE.Group(), M = mats();
  g.add(mesh(new THREE.CylinderGeometry(.3, .3, .2, 24, 1, true), igold()).translateY(-.1));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(.07, .2, 8), igold()).translateX(Math.cos(a) * .28).translateZ(Math.sin(a) * .28).translateY(.08)); g.add(mesh(new THREE.SphereGeometry(.04, 8, 6), mats().orb).translateX(Math.cos(a) * .28).translateZ(Math.sin(a) * .28).translateY(.19)); }
  return { obj: g };
}

// projectiles (small, viewed from the game's camera; the game turns the bolt and shard to their heading)
const P = { w: 56, h: 56, unit: 128, ax: 28, ay: 28, outline: 1, oc: 'rgba(20,10,4,.85)' };
function proj(o) { return { obj: o, frame: P, sheet: 'proj' }; }
function boltP() { const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.018, .018, .32, 8), M.woodPale).rotateZ(Math.PI / 2)); g.add(mesh(new THREE.ConeGeometry(.035, .08, 8), M.steel).rotateZ(-Math.PI / 2).translateY(.19)); [-1, 1].forEach(k => g.add(mesh(new THREE.BoxGeometry(.07, .015, .05), mats().redCloth).translateX(-.13).translateZ(k * .02))); return proj(g); }
function bombP() { const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.09, 18, 14), M.black)); g.add(mesh(new THREE.SphereGeometry(.025, 8, 6), std({ color: 0xffd040, emissive: 0xff8a10, emissiveIntensity: 2 })).translateY(.1).translateX(.03)); return proj(g); }
function rockP() { const M = mats(), geo = new THREE.DodecahedronGeometry(.12, 1); return proj(mesh(geo, M.rock)); }
function iceP() { const g = new THREE.OctahedronGeometry(.07, 0); g.scale(2.2, 1, 1); return proj(mesh(g, mats().ice)); }
function acidP() { const g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.08, 16, 12), mats().acid)); g.add(mesh(new THREE.SphereGeometry(.04, 10, 8), mats().acid).translateX(-.08).translateY(.03)); return proj(g); }
function shellP() { const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.SphereGeometry(.12, 18, 14), M.black)); g.add(mesh(new THREE.TorusGeometry(.12, .02, 8, 20), M.brass).rotateX(Math.PI / 2)); return proj(g); }
function rocketP() { const M = mats(), g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.05, .05, .3, 12), M.redCloth).rotateZ(Math.PI / 2)); g.add(mesh(new THREE.ConeGeometry(.05, .1, 12), M.brass).rotateZ(-Math.PI / 2).translateY(.2)); [-1, 1].forEach(k => g.add(mesh(new THREE.BoxGeometry(.08, .02, .1), M.iron).translateX(-.13).translateZ(k * .05))); return proj(g); }

export const ICONS = { star, coin, gem, skull, shield, swords, heart: heartFlag, lock: lockIcon, crown, arrowhead, bomb: bombIcon, snowflake, poison: poisonSkull, claw: clawIcon, tesla: teslaIcon, shell: shellIcon, spikes: spikeIcon, sell: sellCoins, upgrade: upArrow,
  p_bolt: boltP, p_bomb: bombP, p_rock: rockP, p_ice: iceP, p_acid: acidP, p_shell: shellP, p_rocket: rocketP };
