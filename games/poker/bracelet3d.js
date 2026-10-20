// The championship bracelet as a real 3D piece (three.js r160): a band of polished gold links in a ring, and a
// champion's plate set with a frame of diamonds. Studio light reflects off the gold; the stones flash as the piece
// turns, and it follows the device's tilt (or your finger / pointer). Loaded on demand by poker.html:
//   window.Bracelet3D(host, {top, bottom}) -> {dispose(), askMotion()}   (null when there's no WebGL)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const LINKS = 40;            // links around the band
const R = 1;                 // band radius
const PLATE = { w: 1.08, h: 0.58, d: 0.13 };

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

// the plate's face: brushed gold with the words engraved (a colour map and a matching bump map)
function plateFace(top, bottom) {
  const W = 1024, H = 556;
  const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [cc, c] = make(), [bc, b] = make();
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#fff1b0'); g.addColorStop(0.35, '#e9bd4c'); g.addColorStop(0.6, '#b9861f'); g.addColorStop(1, '#f6d77a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) { c.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.06) + ')'; c.fillRect(0, y, W, 1); }   // brushing
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  // a recessed panel inside the stone frame
  const inset = (ctx, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(150, 120, W - 300, H - 240, 34); ctx.fill(); };
  inset(c, 'rgba(120,80,10,.35)'); inset(b, '#5a5a5a');
  const words = (ctx, col, dy) => {
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 104px Georgia, "Times New Roman", serif'; ctx.fillText(top, W / 2, H / 2 - 44 + dy);
    ctx.font = '700 58px Georgia, "Times New Roman", serif'; ctx.fillText(bottom, W / 2, H / 2 + 66 + dy);
  };
  words(c, 'rgba(255,240,190,.75)', 3); words(c, '#5e3c05', 0); words(b, '#202020', 0);
  const t = new THREE.CanvasTexture(cc); t.colorSpace = THREE.SRGBColorSpace;
  const bt = new THREE.CanvasTexture(bc);
  return [t, bt];
}

// a brilliant-cut stone: a flat table on a cone, faceted (flat shading makes each facet catch light on its own)
function stoneGeo(r) {
  const crown = new THREE.CylinderGeometry(r * 0.62, r, r * 0.38, 12, 1);
  crown.translate(0, r * 0.19, 0);
  const pav = new THREE.ConeGeometry(r, r * 0.85, 12, 1);
  pav.rotateX(Math.PI); pav.translate(0, -r * 0.42, 0);
  const g = new THREE.BufferGeometry();
  const a = crown.toNonIndexed(), p = pav.toNonIndexed();
  const pos = new Float32Array(a.attributes.position.array.length + p.attributes.position.array.length);
  pos.set(a.attributes.position.array, 0); pos.set(p.attributes.position.array, a.attributes.position.array.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);   // table facing +z (out of the plate)
  return g;
}

window.Bracelet3D = function (host, opts) {
  if (!supported()) return null;
  opts = opts || {};
  const w = host.clientWidth || 320, h = host.clientHeight || 240;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

  const scene = new THREE.Scene();
  // a jeweller's velvet behind it
  const bg = document.createElement('canvas'); bg.width = 512; bg.height = 512;
  const bx = bg.getContext('2d'), rg = bx.createRadialGradient(256, 230, 20, 256, 256, 360);
  rg.addColorStop(0, '#4a1420'); rg.addColorStop(0.55, '#24080e'); rg.addColorStop(1, '#0b0306');
  bx.fillStyle = rg; bx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { bx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.025) + ')'; bx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
  const bgT = new THREE.CanvasTexture(bg); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  camera.position.set(0, 0.42, 4.5); camera.lookAt(0, -0.02, 0);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.35 });
  const goldSide = new THREE.MeshPhysicalMaterial({ color: 0xd9a63a, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 });
  const stone = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f5, metalness: 0.1, roughness: 0.02, ior: 2.4, reflectivity: 1, clearcoat: 1, envMapIntensity: 1.6, flatShading: true });

  const piece = new THREE.Group(); scene.add(piece);
  // the band: centre links (polished) between side links (brushed), each a little rounded block on the ring
  const centreGeo = new RoundedBoxGeometry(0.17, 0.2, 0.07, 3, 0.03);
  const sideGeo = new RoundedBoxGeometry(0.15, 0.09, 0.06, 2, 0.025);
  const plateGap = 0.62;   // the part of the ring (radians, at the front) the plate covers
  const centres = new THREE.InstancedMesh(centreGeo, gold, LINKS), sides = new THREE.InstancedMesh(sideGeo, goldSide, LINKS * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let nc = 0, ns = 0;
  for (let i = 0; i < LINKS; i++) {
    const a = (i + 0.5) / LINKS * Math.PI * 2;   // a = 0 is the front (facing the camera, +z)
    const d = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(d) < plateGap / 2) continue;
    q.setFromAxisAngle(up, a);
    p.set(Math.sin(a) * R, 0, Math.cos(a) * R); m.compose(p, q, s); centres.setMatrixAt(nc++, m);
    for (const dy of [-0.15, 0.15]) {
      const a2 = a + Math.PI / LINKS;
      q.setFromAxisAngle(up, a2); p.set(Math.sin(a2) * R * 0.995, dy, Math.cos(a2) * R * 0.995); m.compose(p, q, s); sides.setMatrixAt(ns++, m);
    }
  }
  centres.count = nc; sides.count = ns;
  piece.add(centres, sides);

  // the plate, at the front of the ring, with its engraved face and its frame of stones
  const [faceT, faceB] = plateFace(opts.top || 'WORLD CHAMPION', opts.bottom || '');
  const plate = new THREE.Group(); plate.position.set(0, 0, R + 0.02); piece.add(plate);
  const body = new THREE.Mesh(new RoundedBoxGeometry(PLATE.w, PLATE.h, PLATE.d, 4, 0.05), gold); plate.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PLATE.w * 0.94, PLATE.h * 0.9),
    new THREE.MeshPhysicalMaterial({ map: faceT, bumpMap: faceB, bumpScale: 3, metalness: 0.7, roughness: 0.34, envMapIntensity: 1, emissive: 0xffffff, emissiveMap: faceT, emissiveIntensity: 0.22 }));
  face.position.z = PLATE.d / 2 + 0.008; plate.add(face);
  const sg = stoneGeo(0.03), bigSg = stoneGeo(0.045), spots = [];
  const fx = PLATE.w / 2 - 0.06, fy = PLATE.h / 2 - 0.055;
  for (let k = 0; k <= 12; k++) { const x = -fx + k * (2 * fx / 12); spots.push([x, fy, 0], [x, -fy, 0]); }
  for (let k = 1; k <= 5; k++) { const y = -fy + k * (2 * fy / 6); spots.push([-fx, y, 0], [fx, y, 0]); }
  const stones = new THREE.InstancedMesh(sg, stone, spots.length);
  spots.forEach((sp, k) => { p.set(sp[0], sp[1], PLATE.d / 2 + 0.012); q.identity(); m.compose(p, q, s); stones.setMatrixAt(k, m); });
  plate.add(stones);
  const corners = new THREE.InstancedMesh(bigSg, stone, 4);
  [[-fx, fy], [fx, fy], [-fx, -fy], [fx, -fy]].forEach((c, k) => { p.set(c[0], c[1], PLATE.d / 2 + 0.018); m.compose(p, q.identity(), s); corners.setMatrixAt(k, m); });
  plate.add(corners);

  // lights that move: they make the stones flash as the piece turns
  const key = new THREE.PointLight(0xffffff, 9, 12); key.position.set(2.2, 2.6, 3.4); scene.add(key);
  const glint = new THREE.PointLight(0xfff4d6, 7, 10); scene.add(glint);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.32, 0.25, 0.93); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // the light follows the device's tilt or your finger; while nothing moves, the piece turns gently on its own
  let gx = 0, gy = 0, tx = 0, ty = 0, last = 0, dead = false;
  const onTilt = e => { if (e.gamma == null) return; gx = Math.max(-1, Math.min(1, e.gamma / 35)); gy = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 35)); last = performance.now(); };
  const onMove = e => { const pt = e.touches ? e.touches[0] : e; if (!pt) return; gx = (pt.clientX / innerWidth - 0.5) * 2; gy = (pt.clientY / innerHeight - 0.5) * 2; last = performance.now(); };
  window.addEventListener('deviceorientation', onTilt);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  const t0 = performance.now();
  function frame(now) {
    if (dead) return;
    if (!host.isConnected) return api.dispose();
    const tt = (now - t0) / 1000, idle = now - last > 2500;
    const ax = idle ? Math.sin(tt * 0.45) * 0.55 : gx, ay = idle ? Math.sin(tt * 0.31) * 0.25 : gy;
    tx += (ax - tx) * 0.08; ty += (ay - ty) * 0.08;
    const intro = Math.min(1, tt / 1.4), ease = 1 - Math.pow(1 - intro, 3);
    piece.rotation.y = tx * 0.75 + (1 - ease) * -2.4;
    piece.rotation.x = 0.22 + ty * 0.22;
    piece.position.y = -0.05 + (1 - ease) * 0.9;
    piece.scale.setScalar(0.6 + 0.4 * ease);
    glint.position.set(Math.sin(tt * 1.3 + tx * 3) * 2.2, 1.2 + Math.cos(tt * 0.9 + ty * 2) * 0.8, 2.6);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const api = {
    askMotion() { try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) {} },
    dispose() {
      if (dead) return; dead = true;
      window.removeEventListener('deviceorientation', onTilt); window.removeEventListener('pointermove', onMove); window.removeEventListener('touchmove', onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { if (mt.map) mt.map.dispose(); if (mt.bumpMap) mt.bumpMap.dispose(); mt.dispose(); }); });
      pmrem.dispose(); composer.dispose && composer.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.remove();
    }
  };
  return api;
};
