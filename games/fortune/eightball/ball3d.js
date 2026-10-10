// Mystic 8 Ball as a real object: a glossy black ball with a deep clearcoat on a dark surface under a soft
// spotlight, the white "8" on one side and, on the other, a round window into dark blue liquid where a
// 20-sided die floats up with the answer (three.js r160, vendored).
//
// Imported on demand by ../eightball.js (the Fortune Teller's 8 ball), which keeps all the motion, shake
// detection and timing. create(host, ANSWERS, post) returns null without WebGL; otherwise an object with the
// same contract as the 2D fallback there: cv, layout(w, h, top, bottom), draw(S), ballPx(), adapt(), info(),
// destroy(). S = { px, lift, pz, tiltX, tiltZ, flip, depth, face, spinAxis, spin, wobX, wobY, wobZ, bubbles }.
// post = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } when the page's importmap lets the
// three.js add-ons load (for a touch of bloom), or null to render straight to the screen.
// three.js core is imported by path, so no importmap is needed; with one, it is the same module instance.
import * as THREE from '../../../vendor/three/three.module.min.js';

// ── The object, in world units (ball radius = 1, resting on the floor at y = -1) ──
const TW = 0.7;                       // half-angle of the window opening (from the +Y pole)
const RH = Math.sin(TW), YH = Math.cos(TW);
const RIN = RH - 0.045, YG = YH - 0.055;   // the glass: radius and height (recessed behind a lip)
const T8 = 0.5, TC = T8 + 0.08;       // the white circle's half-angle and the decal cap around it (-Y pole)
const RD = 1.02 * (Math.sin(0.7) - 0.045) / 0.6070619;   // die circumradius: its face triangle just fills the window (only the part inside the ball is drawn)
const INR = RD * 0.7946545;           // die inradius (centre to face)
const DIE_Y = YG - 0.008 - INR;       // die centre when its face touches the glass
const SINK = 0.78;                    // how far the die sinks
const FOV = 30, ELEV = 15 * Math.PI / 180;
const LIQ = new THREE.Color(0.006, 0.014, 0.055);   // the liquid (linear)

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
function cv2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// A small photo studio for reflections: a dark room, a big overhead softbox, two strip lights at the sides
// and a dim floor, so the black clearcoat shows long soft highlights like a product shot.
function studio() {
  const s = new THREE.Scene(), geos = [], mats = [];
  function panel(w, h, c, pos, look) {
    const g = new THREE.PlaneGeometry(w, h), m = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    const p = new THREE.Mesh(g, m); p.position.set(pos[0], pos[1], pos[2]); p.lookAt(look[0], look[1], look[2]); s.add(p); geos.push(g); mats.push(m); return p;
  }
  const room = new THREE.BoxGeometry(30, 18, 30), rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.012, 0.014), side: THREE.BackSide });
  const r = new THREE.Mesh(room, rm); r.position.y = 6; s.add(r); geos.push(room); mats.push(rm);
  panel(40, 40, new THREE.Color(0.03, 0.03, 0.034), [0, -1.05, 0], [0, 10, 0]);                 // the surface
  panel(7, 3.2, new THREE.Color(5.5, 5.4, 5.2), [-0.6, 6.5, 1.8], [0, 0, 0]);                  // overhead softbox
  panel(1.1, 6, new THREE.Color(3.2, 3.15, 3.0), [-6.5, 1.5, 2.5], [0, 0.5, 0]);              // left strip
  panel(0.9, 5, new THREE.Color(1.5, 1.65, 2.0), [6, 1.2, -1.2], [0, 0.5, 0]);                // right strip, cool
  panel(5, 1.6, new THREE.Color(0.35, 0.35, 0.38), [0, 1.2, 9], [0, 0, 0]);                   // faint fill behind the camera
  return { scene: s, dispose() { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); } };
}

export function create(host, ANSWERS, post) {
  if (!supported()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !post, alpha: false, powerPreference: 'default', stencil: false });
  } catch (e) { return null; }
  const cv = renderer.domElement;
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Mystic 8 Ball');
  host.insertBefore(cv, host.firstChild);
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const disp = [];   // everything to dispose
  function keep(x) { disp.push(x); return x; }
  function tex(canvas, srgb) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = maxAniso; return keep(t);
  }

  // ── Environment: the studio, prefiltered for reflections ──
  const pm = new THREE.PMREMGenerator(renderer);
  const room = studio();
  const envRT = pm.fromScene(room.scene, 0.02, 0.1, 60); pm.dispose(); room.dispose();
  keep(envRT);
  const scene = new THREE.Scene(); scene.environment = envRT.texture;
  scene.fog = new THREE.Fog(0x000000, 10, 30);   // only the surface takes fog: it fades to black past the light
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 60);

  // ── Textures ──
  function decalTex() {
    const N = 1024, [c, g] = cv2d(N, N), s = Math.sin(TC), rr = Math.sin(T8) / s * N / 2;
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, N, N);
    g.fillStyle = '#efeee9'; g.beginPath(); g.arc(N / 2, N / 2, rr, 0, Math.PI * 2); g.fill();
    // the "8": two stacked rounded loops, drawn as a bold sans figure
    const fs = rr * 1.42;
    g.fillStyle = '#0b0b0d'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = '700 ' + fs + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const m = g.measureText('8'), asc = m.actualBoundingBoxAscent || fs * 0.72, des = m.actualBoundingBoxDescent || 0;
    g.fillText('8', N / 2, N / 2 + (asc - des) / 2);
    return tex(c);
  }
  // the die: 20 triangles in a 4 x 5 atlas, apex up, each with its answer in white capitals
  const CELL = renderer.capabilities.isWebGL2 ? 512 : 384, AW = CELL * 4, AH = CELL * 5, RT = CELL * 0.47;
  function cellOf(j) { const cx = (j % 4) * CELL + CELL / 2, cy = Math.floor(j / 4) * CELL + CELL * 0.56; return [cx, cy]; }
  function paintFace(g, j) {
    const [cx, cy] = cellOf(j), x0 = (j % 4) * CELL, y0 = Math.floor(j / 4) * CELL;
    const bg = g.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.6);
    bg.addColorStop(0, '#2340b8'); bg.addColorStop(1, '#13247a');
    g.fillStyle = bg; g.fillRect(x0, y0, CELL, CELL);
    // the raised triangle: a thin bright rim, a soft inner bevel
    const tri = (r) => { g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.8660254, cy + r / 2); g.lineTo(cx - r * 0.8660254, cy + r / 2); g.closePath(); };
    tri(RT * 0.86); g.lineJoin = 'round'; g.lineWidth = CELL * 0.012; g.strokeStyle = 'rgba(214,226,255,.85)'; g.stroke();
    tri(RT * 0.80); g.lineWidth = CELL * 0.02; g.strokeStyle = 'rgba(8,14,60,.35)'; g.stroke();
    // text: the biggest size where every line fits the triangle at its height
    const lines = ANSWERS[j].lines, n = lines.length, apexY = cy - RT * 0.8, baseY = cy + RT * 0.4, baseW = RT * 0.8 * 1.7320508;
    const font = (f) => '700 ' + f + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    let lo = 8, hi = CELL * 0.2, fit = lo;
    function ok(f) {
      g.font = font(f);
      const lh = f * 1.04, top = cy + RT * 0.06 - (n * lh) / 2;
      if (top - f * 0.1 < apexY + RT * 0.42 * (n > 1 ? 0.45 : 1) || top + n * lh > baseY - f * 0.18) return false;
      for (let i = 0; i < n; i++) {
        const yTop = top + i * lh + f * 0.12, avail = (yTop - apexY) / (baseY - apexY) * baseW - f * 0.5;
        if (g.measureText(lines[i]).width > avail) return false;
      }
      return true;
    }
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (ok(m)) { fit = m; lo = m; } else hi = m; }
    g.font = font(fit); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4f7ff';
    const lh = fit * 1.04, top = cy + RT * 0.06 - (n * lh) / 2;
    g.shadowColor = 'rgba(180,200,255,.35)'; g.shadowBlur = fit * 0.12;
    lines.forEach((s, i) => g.fillText(s, cx, top + i * lh + lh / 2));
    g.shadowBlur = 0;
  }
  function dieTex() {
    const [c, g] = cv2d(AW, AH);
    for (let j = 0; j < 20; j++) paintFace(g, j);
    return tex(c);
  }
  function radial(n, stops) {
    const [c, g] = cv2d(n, n), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, n, n); return tex(c, false);
  }
  function bubbleTex() {
    const n = 64, [c, g] = cv2d(n, n), gr = g.createRadialGradient(n / 2, n / 2, n * 0.2, n / 2, n / 2, n / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(255,255,255,.18)'); gr.addColorStop(0.9, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(n * 0.38, n * 0.36, n * 0.07, 0, 7); g.fill();
    return tex(c, false);
  }
  // fine grain for the surface so the spotlight's falloff doesn't band
  function grainTex() {
    const n = 256, [c, g] = cv2d(n, n), id = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const v = 118 + (Math.random() * 20 - 10) | 0; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0);
    const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); return t;
  }

  // ── Materials ──
  const sheen = { sheen: 0.35, sheenColor: new THREE.Color(0x2a3550), sheenRoughness: 0.45 };
  const M = {
    ball: keep(new THREE.MeshPhysicalMaterial(Object.assign({ color: 0x0a0a0c, roughness: 0.24, specularIntensity: 0.55, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0 }, sheen))),
    decal: keep(new THREE.MeshPhysicalMaterial(Object.assign({ map: decalTex(), roughness: 0.3, specularIntensity: 0.4, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, sheen))),
    lip: keep(new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.32, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.7, side: THREE.DoubleSide })),
    glass: keep(new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.9, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })),
    die: null,
    interior: keep(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uCol: { value: new THREE.Color(0.02, 0.05, 0.19) }, uYG: { value: YG }, uK: { value: 3.2 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; uniform float uYG; uniform float uK; varying vec3 vP; void main(){ float d = max(0.0, uYG - vP.y); float r = length(vP.xz); gl_FragColor = vec4(uCol * exp(-d * uK) * (0.55 + 0.45 * smoothstep(0.7, 0.0, r)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
    })),
    floor: keep(new THREE.MeshStandardMaterial({ color: 0x2c2c31, roughness: 0.82, metalness: 0, envMapIntensity: 0.0, dithering: true })),
    shadow: keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, opacity: 0.9 })),
    shadowCore: keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, opacity: 0.95 })),
    bubbles: keep(new THREE.PointsMaterial({ size: 0.075, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true }))
  };
  Object.keys(M).forEach(k => { if (M[k] && k !== 'floor') M[k].fog = false; });
  M.floor.roughnessMap = grainTex();
  M.shadow.alphaMap = radial(256, [[0, 'rgb(150,150,150)'], [0.35, 'rgb(90,90,90)'], [0.7, 'rgb(25,25,25)'], [1, 'rgb(0,0,0)']]);
  M.shadowCore.alphaMap = radial(256, [[0, 'rgb(255,255,255)'], [0.3, 'rgb(200,200,200)'], [0.65, 'rgb(60,60,60)'], [1, 'rgb(0,0,0)']]);
  M.bubbles.map = bubbleTex();

  // The die: lit like the rest, then mixed into the liquid by its distance behind the glass; anything
  // outside the ball's shell is dropped (the die is bigger than a real one could be, for a readable face)
  const dieU = { uLocal: { value: new THREE.Matrix4() }, uYG: { value: YG }, uK: { value: 26.0 }, uLiq: { value: LIQ.clone() } };
  M.die = keep(new THREE.MeshPhysicalMaterial({ roughness: 0.34, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.25, envMapIntensity: 0.55, emissive: 0xffffff, emissiveIntensity: 0.1 }));
  M.die.map = dieTex(); M.die.emissiveMap = M.die.map; M.die.fog = false;
  M.die.customProgramCacheKey = () => 'eb-die';
  M.die.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, dieU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uLocal; varying vec3 vBall; varying float vFace;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBall = (uLocal * vec4(transformed, 1.0)).xyz; vFace = normalize(mat3(uLocal) * objectNormal).y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uYG; uniform float uK; uniform vec3 uLiq; varying vec3 vBall; varying float vFace;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(vBall) > 0.965) discard;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n{ float d = max(0.0, uYG - vBall.y - 0.012); float f = max(1.0 - exp(-d * uK), 0.9 * (1.0 - smoothstep(0.86, 0.985, vFace))); gl_FragColor.rgb = mix(gl_FragColor.rgb, uLiq * exp(-d * 2.0), f); }');
  };

  // ── Geometry ──
  const ball = new THREE.Group(); scene.add(ball);
  function mesh(geo, mat, parent) { const m = new THREE.Mesh(keep(geo), mat); (parent || scene).add(m); return m; }
  mesh(new THREE.SphereGeometry(1, 128, 96, 0, Math.PI * 2, TW, Math.PI - TW), M.ball, ball);
  {
    const g = new THREE.SphereGeometry(1.0004, 128, 28, 0, Math.PI * 2, Math.PI - TC, TC), p = g.attributes.position, uv = g.attributes.uv, s = Math.sin(TC);
    for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * s), 0.5 + p.getZ(i) / (2 * s));
    uv.needsUpdate = true;
    mesh(g, M.decal, ball).renderOrder = 1;
  }
  {
    // the lip around the window: a rounded rim curling in and down to the glass
    const pts = [], n = 14;
    for (let i = 0; i <= n; i++) { const a = TW + 0.012 - i / n * 0.05; pts.push(new THREE.Vector2(Math.sin(a) * (1 + 0.006 * Math.sin(i / n * Math.PI)), Math.cos(a) + 0.004 * Math.sin(i / n * Math.PI))); }
    const last = pts[pts.length - 1];
    for (let i = 1; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(last.x + (RIN - last.x) * Math.sin(t * Math.PI / 2), last.y + (YG - last.y) * t)); }
    mesh(new THREE.LatheGeometry(pts.reverse(), 128), M.lip, ball);
  }
  const glass = mesh(new THREE.CircleGeometry(RIN + 0.004, 96), M.glass, ball); glass.rotation.x = -Math.PI / 2; glass.position.y = YG; glass.renderOrder = 10;
  const interior = mesh(new THREE.SphereGeometry(0.97, 48, 32), M.interior, ball); interior.renderOrder = -2;

  // the die, with UVs that put each face's triangle (apex up) into its atlas cell
  const ALIGN = [];
  const die = (function () {
    const src = new THREE.IcosahedronGeometry(RD, 0), p = src.attributes.position, uv = new Float32Array(p.count * 2);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), cen = new THREE.Vector3(), n = new THREE.Vector3(), u = new THREE.Vector3(), r = new THREE.Vector3(), tmp = new THREE.Vector3();
    const T = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)), F = new THREE.Matrix4();
    for (let f = 0; f < 20; f++) {
      A.fromBufferAttribute(p, f * 3); B.fromBufferAttribute(p, f * 3 + 1); C.fromBufferAttribute(p, f * 3 + 2);
      cen.copy(A).add(B).add(C).divideScalar(3); n.copy(cen).normalize(); u.copy(A).sub(cen).normalize(); r.crossVectors(u, n);
      const [cx, cy] = cellOf(f), bl = tmp.copy(B).sub(cen).dot(r) < 0;   // is B the bottom-left corner?
      const put = (i, x, y) => { uv[i * 2] = x / AW; uv[i * 2 + 1] = 1 - y / AH; };
      put(f * 3, cx, cy - RT);
      put(f * 3 + (bl ? 1 : 2), cx - RT * 0.8660254, cy + RT / 2);
      put(f * 3 + (bl ? 2 : 1), cx + RT * 0.8660254, cy + RT / 2);
      F.makeBasis(r.clone(), u.clone(), n.clone());
      ALIGN.push(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().multiplyMatrices(T, F.clone().transpose())));
    }
    src.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return mesh(src, M.die, ball);
  })();

  // bubbles (positions written per frame)
  const NB = 28, bPos = new Float32Array(NB * 3), bCol = new Float32Array(NB * 3), bGeo = keep(new THREE.BufferGeometry());
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  const bubbles = new THREE.Points(bGeo, M.bubbles); bubbles.frustumCulled = false; bubbles.renderOrder = 9; ball.add(bubbles);

  // surface and contact shadow
  const floor = mesh(new THREE.PlaneGeometry(160, 160), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.y = -1;
  const shadow = mesh(new THREE.PlaneGeometry(1, 1), M.shadow); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.998; shadow.renderOrder = 1;
  const shadowCore = mesh(new THREE.PlaneGeometry(1, 1), M.shadowCore); shadowCore.rotation.x = -Math.PI / 2; shadowCore.position.y = -0.997; shadowCore.renderOrder = 2;

  // ── Lights: a soft key spot from above (the pool on the surface), a cool rim from behind ──
  const key = new THREE.SpotLight(0xfff1e2, 420, 0, 0.36, 1, 2); key.position.set(-1.2, 8, 2.2); key.target.position.set(0.1, -1, 0.5); scene.add(key); scene.add(key.target);
  // the rims come mostly from the studio's strip lights; these only add a faint edge (kept low: at a grazing
  // angle they would light the whole surface)
  const rim = new THREE.DirectionalLight(0xcfdcff, 0.25); rim.position.set(1.2, 2.2, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffe8d0, 0.1); rim2.position.set(-3, 1.2, -2.5); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x8090b0, 0x050505, 0.08));

  // ── Orientation: the 8 faces the camera at rest; a half-turn about x brings the window round ──
  const VIEW = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
  const BASE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -Math.sin(ELEV), -Math.cos(ELEV)), new THREE.Vector3(0, Math.cos(ELEV), -Math.sin(ELEV))));
  const X = new THREE.Vector3(1, 0, 0), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), e1 = new THREE.Euler(), ax = new THREE.Vector3();

  // ── Post (when the add-ons loaded): a touch of bloom on the brightest highlights ──
  let composer = null, bloom = null;
  if (post) {
    try {
      const rt = keep(new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? 4 : 0 }));
      composer = new post.EffectComposer(renderer, rt);
      composer.addPass(new post.RenderPass(scene, camera));
      bloom = new post.UnrealBloomPass(new THREE.Vector2(2, 2), 0.22, 0.45, 0.92); composer.addPass(bloom);
      composer.addPass(new post.OutputPass());
    } catch (e) { composer = null; bloom = null; }
  }

  let zoomK = 0.17, W = 300, H = 400, top = 0, bottom = 0, dpr = 1, maxDpr = 2, dist = 8, level = 0, slowT = 0, frames = 0, lastMs = 0, dead = false;
  function layout(w, h, t, b) {
    W = Math.max(2, w); H = Math.max(2, h); top = t || 0; bottom = b || 0;
    dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(W, H); }
    camera.aspect = W / H;
    // a believable size: about 60% of the width on a phone, less of the height on wide screens
    const avail = H - top - bottom, rPx = Math.max(40, Math.min(W * 0.31, avail * 0.32, 200));
    // at the reveal the camera pushes in until the window reads: a little on a phone held upright, more on a short landscape screen
    zoomK = 1 - rPx / Math.max(rPx, Math.min(W * 0.38, (H - 16) * 0.45, 260));
    dist = (H / 2) / (rPx * Math.tan(FOV / 2 * Math.PI / 180));
    // put the ball in the middle of the free area (between the top and bottom insets)
    const shift = (top + avail / 2) - H / 2;
    camera.setViewOffset(W, H, 0, -shift, W, H);
    camera.near = Math.max(0.3, dist * 0.3); camera.far = dist + 40;
    scene.fog.near = dist - 0.5; scene.fog.far = dist + 7.5;
    camera.updateProjectionMatrix();
  }
  function ballPx() { return (H / 2) / (dist * Math.tan(FOV / 2 * Math.PI / 180)); }

  function draw(S) {
    if (dead) return;
    const t0 = performance.now();
    const f = S.flip, fe = f * f * (3 - 2 * f), roll = Math.sin(Math.PI * Math.min(1, Math.max(0, f)));
    // camera: pushes in a little while the window is round, so the answer reads
    const d = dist * (1 - zoomK * Math.min(1, Math.max(0, fe)));
    camera.position.set(0, d * Math.sin(ELEV), d * Math.cos(ELEV)); camera.lookAt(0, 0, 0);
    // ball: rolls with its travel across the surface, plus the half-turn and a little tilt
    ball.position.set(S.px, S.lift + 0.04 * roll, S.pz + 0.12 * roll);
    q1.setFromAxisAngle(X, Math.PI * f);
    e1.set(S.pz + S.tiltX, 0, -S.px + S.tiltZ); q2.setFromEuler(e1);
    ball.quaternion.copy(q2).multiply(q1).multiply(BASE);
    // die
    const face = Math.max(0, Math.min(19, S.face | 0));
    ax.set(S.spinAxis[0], S.spinAxis[1], S.spinAxis[2]).normalize();
    q1.setFromAxisAngle(ax, S.spin);
    e1.set(S.wobX * 0.14, S.wobY * 0.25, S.wobZ * 0.14); q2.setFromEuler(e1);
    die.quaternion.copy(q2).multiply(q1).multiply(ALIGN[face]);
    die.position.set(S.wobZ * 0.02, DIE_Y - SINK * S.depth, -S.wobX * 0.02);
    die.visible = S.depth < 0.995;
    M.die.emissiveIntensity = 0.1 + 0.55 * (S.glow || 0);   // the brief brighten as the answer lands
    die.updateMatrix(); dieU.uLocal.value.copy(die.matrix);
    // bubbles: x, z across the window, y = depth behind the glass
    const B = S.bubbles || [];
    for (let i = 0; i < NB; i++) {
      const b = B[i];
      if (!b || b.a <= 0) { bCol[i * 3] = bCol[i * 3 + 1] = bCol[i * 3 + 2] = 0; bPos[i * 3 + 1] = -5; continue; }
      bPos[i * 3] = b.x * RIN; bPos[i * 3 + 1] = YG - 0.01 - b.y; bPos[i * 3 + 2] = b.z * RIN;
      const k = b.a * Math.exp(-b.y * 3) * 1.1; bCol[i * 3] = k * 0.75; bCol[i * 3 + 1] = k * 0.85; bCol[i * 3 + 2] = k;
    }
    bGeo.attributes.position.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;
    bubbles.visible = B.length > 0;
    // contact shadow: tight and dark on the surface, softer and lighter as the ball lifts
    const lift = Math.max(0, ball.position.y), k = 1 / (1 + lift * 2.2);
    shadow.position.set(ball.position.x + 0.08, -0.998, ball.position.z - 0.05); shadow.scale.setScalar(2.9 * (1 + lift * 0.6)); M.shadow.opacity = 0.85 * k;
    shadowCore.position.set(ball.position.x + 0.03, -0.997, ball.position.z); shadowCore.scale.setScalar(1.15 * (1 + lift * 1.4)); M.shadowCore.opacity = 0.95 * k * k;
    if (composer) composer.render(); else renderer.render(scene, camera);
    frames++; lastMs = performance.now() - t0;
  }
  // slow device: drop the bloom, then resolution in steps
  function adapt(gapMs) {
    if (gapMs > 400) return;
    slowT = gapMs > 24 ? slowT + gapMs / 1000 : Math.max(0, slowT - gapMs / 3000);
    if (slowT > 0.7 && level < 3) {
      slowT = 0; level++;
      if (level === 1 && bloom) bloom.enabled = false;
      else { if (level === 1) level = 2; maxDpr = level === 2 ? 1.5 : 1; layout(W, H, top, bottom); }
    }
  }
  function destroy() {
    if (dead) return; dead = true;
    try { if (composer) composer.dispose(); if (bloom) bloom.dispose(); } catch (e) {}
    disp.forEach(x => { try { x.dispose(); } catch (e) {} });
    try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
    if (cv.parentNode) cv.parentNode.removeChild(cv);
  }
  return {
    is3D: true, cv, layout, draw, ballPx, adapt, destroy,
    _dbg: { scene, M, key, rim, rim2, camera },
    info: () => ({ level, dpr, post: !!composer, bloom: !!(bloom && bloom.enabled), frames, ms: +lastMs.toFixed(2), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries })
  };
}
