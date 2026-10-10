// ═══════════════════════════════════════════════════════════════════════════
// Mystic 8 Ball: one of the Fortune Teller's tellers (games/fortune.html).
//
// A photo-real black 8 ball on a dark surface. Shake it (phone motion, or tap and swipe around quickly);
// when the shaking stops it rolls over, the 20-sided die drifts up out of the dark liquid in the window,
// wobbles, settles, and the answer comes into focus. Shake again and the die sinks and the ball rolls back.
//
// The 3D object lives in ./eightball/ball3d.js (three.js, loaded on demand). Without WebGL a 2D canvas
// version below takes over with the same contract and the same motion.
// Battery: frames are drawn only while something moves, at most ~60 a second; nothing runs while the page
// is hidden (the devicemotion listener comes off too), and unmount disposes the GPU resources.
// Test hook while mounted: window.__eight (state, shake(), info()).
// ═══════════════════════════════════════════════════════════════════════════

// The 20 standard answers (10 yes, 5 maybe, 5 no), with the classic line breaks for the triangle
const ANSWERS = [
  ['It is certain', 'IT IS|CERTAIN', 'yes'],
  ['It is decidedly so', 'IT IS|DECIDEDLY|SO', 'yes'],
  ['Without a doubt', 'WITHOUT|A|DOUBT', 'yes'],
  ['Yes definitely', 'YES|DEFINITELY', 'yes'],
  ['You may rely on it', 'YOU MAY|RELY ON|IT', 'yes'],
  ['As I see it, yes', 'AS I|SEE IT,|YES', 'yes'],
  ['Most likely', 'MOST|LIKELY', 'yes'],
  ['Outlook good', 'OUTLOOK|GOOD', 'yes'],
  ['Yes', 'YES', 'yes'],
  ['Signs point to yes', 'SIGNS|POINT|TO|YES', 'yes'],
  ['Reply hazy, try again', 'REPLY|HAZY,|TRY|AGAIN', 'maybe'],
  ['Ask again later', 'ASK|AGAIN|LATER', 'maybe'],
  ['Better not tell you now', 'BETTER|NOT TELL|YOU|NOW', 'maybe'],
  ['Cannot predict now', 'CANNOT|PREDICT|NOW', 'maybe'],
  ['Concentrate and ask again', 'CONCEN-|TRATE|AND ASK|AGAIN', 'maybe'],
  ["Don't count on it", "DON'T|COUNT|ON IT", 'no'],
  ['My reply is no', 'MY|REPLY|IS NO', 'no'],
  ['My sources say no', 'MY|SOURCES|SAY|NO', 'no'],
  ['Outlook not so good', 'OUTLOOK|NOT SO|GOOD', 'no'],
  ['Very doubtful', 'VERY|DOUBTFUL', 'no']
].map(a => ({ text: a[0], lines: a[1].split('|'), kind: a[2] }));

const MOTION_KEY = 'eightball_motion';   // this device's answer to the iOS motion prompt
const ELEV = 15 * Math.PI / 180;

const CSS = `
.eb-root{position:absolute;inset:0;overflow:hidden;background:#030304;
  background:radial-gradient(70% 55% at 50% 58%,#242428 0%,#101012 45%,#030304 100%);
  touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:grab;}
.eb-root.held{cursor:grabbing;}
.eb-root>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none;}
.eb-foot{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;flex-direction:column;align-items:center;gap:12px;
  padding:0 calc(env(safe-area-inset-right,0px) + 16px) 0 calc(env(safe-area-inset-left,0px) + 16px);pointer-events:none;}
.eb-hint{display:flex;align-items:center;gap:8px;min-height:22px;color:rgba(236,236,242,.66);font-weight:800;font-size:.96rem;letter-spacing:.01em;
  text-align:center;opacity:0;transform:translateY(6px);transition:opacity .5s ease,transform .5s ease;text-shadow:0 1px 2px rgba(0,0,0,.6);}
.eb-hint.on{opacity:1;transform:none;}
.eb-hint .ico{width:20px;height:20px;flex:none;opacity:.85;}
.eb-allow{pointer-events:auto;display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 20px;border-radius:23px;border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.1);color:#f4f4f8;font-weight:800;font-size:1rem;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:pointer;}
.eb-allow:active{transform:scale(.96);background:rgba(255,255,255,.16);}
.eb-allow .ico{width:20px;height:20px;}
.eb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
`;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

// ── Small rotation helpers for the 2D version (3x3 matrices as arrays of rows) ──
function mul(A, B) { const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; return C; }
function rx(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
function rz(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; }
function ap(M, v) { return [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]; }
const SE = Math.sin(ELEV), CE = Math.cos(ELEV);
// the ball's rest orientation: local -Y (the 8) toward the camera, local +Z up on screen
const BASE = [[1, 0, 0], [0, -SE, CE], [0, -CE, -SE]];
// world -> view: x right, y up on screen, z toward the camera
function toView(v) { return [v[0], v[1] * CE - v[2] * SE, v[1] * SE + v[2] * CE]; }

// ── 2D fallback: the same ball drawn with gradients on a canvas ──
function create2D(host) {
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  host.insertBefore(cv, host.firstChild);
  let W = 300, H = 400, top = 0, bottom = 0, dpr = 1, R = 100, frames = 0;
  const off = document.createElement('canvas'); off.width = off.height = 256;   // the 8 decal
  (function () {
    const c = off.getContext('2d'); c.fillStyle = '#f0efea'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
    c.fillStyle = '#0b0b0d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 180px "Helvetica Neue", Helvetica, Arial, sans-serif'; c.fillText('8', 128, 140);
  })();
  function layout(w, h, t, b) {
    W = Math.max(2, w); H = Math.max(2, h); top = t || 0; bottom = b || 0; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    R = Math.max(40, Math.min(W * 0.31, (H - top - bottom) * 0.3, 200));
  }
  // an ellipse-mapped cap on the ball: pole p, up u (view coords), half-angle a; fn draws in a unit disc
  function cap(cx, cy, r, p, u, a, fn) {
    if (p[2] < -Math.sin(a) * 0.6) return;
    const rt = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];   // u x p = right
    const ca = Math.cos(a), sa = Math.sin(a);
    g.save();
    g.beginPath(); g.arc(cx, cy, r * 0.995, 0, 7); g.clip();
    g.transform(rt[0] * sa * r, -rt[1] * sa * r, -u[0] * sa * r, u[1] * sa * r, cx + p[0] * ca * r, cy - p[1] * ca * r);
    fn(clamp(p[2] * 1.4, 0, 1));
    g.restore();
  }
  function draw(S) {
    frames++;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fe = S.flip * S.flip * (3 - 2 * S.flip), roll = Math.sin(Math.PI * clamp(S.flip, 0, 1));
    const r = R * (1 + 0.2 * fe) * (1 + (S.pz + 0.12 * roll) * 0.08);
    const cx0 = W / 2, cy0 = top + (H - top - bottom) / 2;
    const cx = cx0 + S.px * r, cy = cy0 - (S.lift + 0.04 * roll) * r * CE + (S.pz + 0.12 * roll) * r * SE;
    const fy = cy0 + r * CE;   // where the ball would touch the surface
    // surface and spotlight
    g.fillStyle = '#030304'; g.fillRect(0, 0, W, H);
    let gr = g.createRadialGradient(cx0, fy, 0, cx0, fy, Math.max(W, H) * 0.7);
    gr.addColorStop(0, '#2b2b30'); gr.addColorStop(0.35, '#151518'); gr.addColorStop(1, '#030304');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // contact shadow
    const lift = Math.max(0, S.lift), k = 1 / (1 + lift * 2.2);
    g.save(); g.translate(cx, cy + (S.lift + 0.04 * roll) * r * CE + r * CE * 0.98); g.scale(1, 0.26);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.4 * (1 + lift * 0.6));
    gr.addColorStop(0, 'rgba(0,0,0,' + (0.9 * k).toFixed(3) + ')'); gr.addColorStop(0.45, 'rgba(0,0,0,' + (0.5 * k).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.4 * (1 + lift * 0.6), 0, 7); g.fill(); g.restore();
    // the ball body
    gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r);
    gr.addColorStop(0, '#2c2c31'); gr.addColorStop(0.5, '#0d0d10'); gr.addColorStop(1, '#030304');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    // orientation: roll with travel, the half-turn, tilt
    const M = mul(mul(mul(rx(S.pz + S.tiltX), rz(-S.px + S.tiltZ)), rx(Math.PI * S.flip)), BASE);
    const pe = toView(ap(M, [0, -1, 0])), ue = toView(ap(M, [0, 0, 1]));
    const pw = toView(ap(M, [0, 1, 0])), uw = toView(ap(M, [0, 0, -1]));
    cap(cx, cy, r, pe, ue, 0.5, (lit) => { g.globalAlpha = 0.35 + 0.65 * lit; g.drawImage(off, -1, -1, 2, 2); g.globalAlpha = 1; });
    cap(cx, cy, r, pw, uw, 0.62, (lit) => {
      g.fillStyle = '#0a0a0c'; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill();
      gr = g.createRadialGradient(0, 0, 0, 0, 0, 0.93); gr.addColorStop(0, '#0e1f62'); gr.addColorStop(1, '#03081e');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 0.93, 0, 7); g.fill();
      const vis = Math.pow(clamp(1 - S.depth, 0, 1), 1.6) * lit;
      if (vis > 0.01) {
        const a = ANSWERS[S.face | 0], tr = 0.8, w = S.wobZ * 0.08, s = 1 - S.spin * 0.04;
        g.save(); g.rotate(S.wobY * 0.3 + S.spin * 0.25); g.translate(w, S.wobX * 0.06); g.scale(s, s);
        g.globalAlpha = vis;
        g.fillStyle = '#1c34a0'; g.beginPath(); g.moveTo(0, -tr); g.lineTo(tr * 0.866, tr / 2); g.lineTo(-tr * 0.866, tr / 2); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(214,226,255,.8)'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(0, -tr * 0.86); g.lineTo(tr * 0.745, tr * 0.43); g.lineTo(-tr * 0.745, tr * 0.43); g.closePath(); g.stroke();
        const n = a.lines.length, f = n > 3 ? 0.13 : n > 2 ? 0.15 : 0.17;
        g.fillStyle = '#f4f7ff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + f + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
        a.lines.forEach((t, i) => g.fillText(t, 0, 0.12 + (i - (n - 1) / 2) * f * 1.05));
        g.restore();
      }
      (S.bubbles || []).forEach(b => {
        if (b.a <= 0) return; g.globalAlpha = b.a * Math.exp(-b.y * 4) * 0.7;
        g.strokeStyle = '#cfe0ff'; g.lineWidth = 0.012; g.beginPath(); g.arc(b.x * 0.9, -b.z * 0.9, 0.02 + b.r * 0.03, 0, 7); g.stroke();
      });
      g.globalAlpha = 1;
      // glass sheen
      gr = g.createLinearGradient(-1, -1, 0.6, 0.6); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 0.93, 0, 7); g.fill();
    });
    // studio reflections: the overhead softbox and a rim on the right
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    g.translate(cx - r * 0.12, cy - r * 0.62); g.rotate(-0.12); g.scale(1, 0.42);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.5); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.5, 0, 7); g.fill(); g.restore();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
    g.lineWidth = r * 0.05; g.strokeStyle = 'rgba(170,190,240,.22)'; g.beginPath(); g.arc(cx - r * 0.03, cy, r * 0.985, -0.9, 0.5); g.stroke(); g.restore();
  }
  return {
    is3D: false, cv, layout, draw, ballPx: () => R, adapt() {},
    info: () => ({ frames, dpr }),
    destroy() { if (cv.parentNode) cv.parentNode.removeChild(cv); cv.width = cv.height = 0; }
  };
}

// three.js post-processing add-ons, if the page's importmap lets them load (they import 'three' by name)
function loadPost() {
  const base = '../../vendor/three/addons/postprocessing/';
  return Promise.all(['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass'].map(n => import(base + n + '.js')))
    .then(ms => ({ EffectComposer: ms[0].EffectComposer, RenderPass: ms[1].RenderPass, UnrealBloomPass: ms[2].UnrealBloomPass, OutputPass: ms[3].OutputPass }))
    .catch(() => null);
}

function mount(stage, api) {
  const Kit = (api && api.Kit) || window.Kit;
  const onAnswer = (api && api.onAnswer) || function () {};
  const ac = new AbortController(), sig = { signal: ac.signal };
  let dead = false;

  if (!document.getElementById('eb-style')) { const st = document.createElement('style'); st.id = 'eb-style'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'eb-root';
  root.innerHTML = '<div class="eb-foot"><button class="eb-allow" type="button" hidden></button><div class="eb-hint" role="note"></div></div><div class="eb-sr" aria-live="polite"></div>';
  stage.appendChild(root);
  const foot = root.querySelector('.eb-foot'), hintEl = root.querySelector('.eb-hint'), allowBtn = root.querySelector('.eb-allow'), srEl = root.querySelector('.eb-sr');
  const icon = n => (Kit && Kit.icon ? Kit.icon(n) : '');
  allowBtn.innerHTML = icon('phone') + '<span>Allow motion</span>';

  // ── State the renderers draw ──
  const S = { glow: 0, px: 0, lift: 0, pz: 0, tiltX: 0, tiltZ: 0, flip: 0, depth: 1, face: 0, spinAxis: [0.3, 1, 0.2], spin: 0, wobX: 0, wobY: 0, wobZ: 0, bubbles: [] };
  let phase = 'rest';            // rest | shake | reveal | rise | answer
  let ox = 0, oy = 0, vx = 0, vy = 0, tx = 0, ty = 0;   // the ball's offset on screen, in ball radii (y up)
  let fx = 0, fy = 0, fT = 0;    // push from the phone's motion (ball radii / s^2) and when it last came
  let vflip = 0, flipTarget = 0, riseT = 0, landed = false, spin0 = 0, wph = [0, 0, 0], shakeLast = 0, shakeVia = '', answers = 0, lastFace = -1;
  let R = null, raf = 0, lastT = 0, lastDraw = 0, W = 0, H = 0, needDraw = true, hidden = document.visibilityState !== 'visible';

  // ── Loop: frames only while something moves; at most ~60 draws a second ──
  function kick() { if (!raf && !dead && !hidden && R) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0; if (dead || hidden || !R) return;
    if (lastDraw && now - lastDraw < 12) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
    if (lastDraw) R.adapt(now - lastDraw);
    const moving = step(dt, now);
    if (!hook.noRender) R.draw(S);
    lastDraw = now; needDraw = false;
    if (moving) raf = requestAnimationFrame(frame);
    else lastDraw = 0;
  }

  function step(dt, now) {
    // the ball on its spring: follows the finger tightly while held, bounces home when let go
    const held = !!ptr, k = held ? 150 : 70, c = held ? 17 : 7.2;
    if (now - fT > 120) { fx = 0; fy = 0; }
    if (!held) { tx = 0; ty = 0; }
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      vx += (k * (tx - ox) - c * vx + fx) * h; vy += (k * (ty - oy) - c * vy + fy) * h;
      ox += vx * h; oy += vy * h;
      if (oy < -0.7) { oy = -0.7; if (vy < 0) vy *= -0.3; }
      vflip += (30 * (flipTarget - S.flip) - 8.5 * vflip) * h; S.flip += vflip * h;
    }
    ox = clamp(ox, -1.25, 1.25); oy = clamp(oy, -0.7, 1.0);
    S.px = ox; S.lift = Math.max(0, oy); S.pz = Math.max(0, -oy) * 1.3;
    S.tiltZ = clamp(-vx * 0.035, -0.35, 0.35); S.tiltX = clamp(-vy * 0.03, -0.3, 0.3);
    let busy = held || Math.abs(ox) + Math.abs(oy) > 0.0015 || Math.abs(vx) + Math.abs(vy) > 0.01 || Math.abs(flipTarget - S.flip) > 0.0015 || Math.abs(vflip) > 0.01;

    // phases
    if (phase === 'shake') {
      S.depth = Math.min(1, S.depth + dt * 2.4);
      S.spin += dt * 3 * (1 - S.depth * 0.6);
      if (S.depth > 0.45) flipTarget = 0;
      if (Math.random() < dt * 14) bubble(0.35 + Math.random() * 0.5);
      const quiet = shakeVia === 'touch' ? 650 : 520;
      if ((shakeVia !== 'touch' || ptr) && now - shakeLast > quiet) endShake();
      busy = true;
    } else if (phase === 'reveal') {
      S.depth = Math.min(1, S.depth + dt * 2.4);
      flipTarget = 1;
      if (S.depth >= 1 && S.flip > 0.86) startRise();
      busy = true;
    } else if (phase === 'rise') {
      riseT += dt;
      const T = 2.1, u = Math.min(1, riseT / T);
      S.depth = Math.pow(1 - u, 2.3);
      S.spin = spin0 * Math.pow(1 - u, 2.6);
      // a slow drift while it floats up, then a quicker wobble that dies away as it settles on the glass
      const drift = 0.55 * Math.pow(1 - u, 1.5), settle = riseT > 1.5 ? 0.42 * Math.exp(-(riseT - 1.5) / 0.42) * Math.min(1, (riseT - 1.5) * 6) : 0;
      S.wobX = drift * Math.sin(5.1 * riseT + wph[0]) + settle * Math.sin(10.5 * (riseT - 1.5));
      S.wobZ = drift * Math.sin(4.3 * riseT + wph[1]) + settle * 0.7 * Math.sin(9.1 * (riseT - 1.5) + 1.1);
      S.wobY = drift * 0.8 * Math.sin(2.9 * riseT + wph[2]) + settle * 0.4 * Math.sin(7.3 * (riseT - 1.5) + 0.4);
      if (riseT < 1.4 && Math.random() < dt * 10) bubble(S.depth * 0.9 + 0.1);
      // the face meets the glass: a crisp brighten with the chime
      if (riseT > 2.05 && !landed) { landed = true; sfx('sparkle', 0.6); Kit && Kit.haptic && Kit.haptic('success'); }
      S.glow = glowAt(riseT);
      if (riseT > 3.0) { S.wobX = S.wobY = S.wobZ = 0; S.spin = 0; S.depth = 0; showAnswer(); }
      busy = true;
    } else if (phase === 'answer' && S.glow > 0.02) {
      riseT += dt; S.glow = glowAt(riseT); if (S.glow <= 0.02) S.glow = 0;
      busy = true;
    }
    // bubbles drift up to the glass and pop
    if (S.bubbles.length) {
      for (const b of S.bubbles) { if (phase === 'answer' || phase === 'rest') b.a -= dt * 1.2; b.y -= b.v * dt; b.x += Math.sin(now / 300 + b.ph) * dt * 0.03; if (b.y < 0.01) b.a -= dt * 3; }
      S.bubbles = S.bubbles.filter(b => b.a > 0);
      busy = true;
    }
    return busy;
  }
  function glowAt(t) { return t < 2.05 ? 0 : t < 2.25 ? (t - 2.05) / 0.2 : Math.exp(-(t - 2.25) / 0.38); }
  function bubble(y) {
    if (S.bubbles.length > 26) return;
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.92;
    S.bubbles.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: clamp(y, 0.05, 0.9), v: 0.3 + Math.random() * 0.4, r: Math.random(), a: 0.5 + Math.random() * 0.5, ph: Math.random() * 6 });
  }

  // ── Shake → reveal ──
  function startShake(via) {
    shakeVia = via; shakeLast = performance.now();
    if (phase !== 'shake') { phase = 'shake'; S.glow = 0; srEl.textContent = ''; Kit && Kit.haptic && Kit.haptic('medium'); }
    kick();
  }
  function endShake() {
    if (phase !== 'shake') return;
    phase = 'reveal'; flipTarget = 1; kick();
  }
  function startRise() {
    let f = Math.floor(Math.random() * 20);
    S.face = f; lastFace = f;
    const a = [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5], l = Math.hypot(a[0], a[1], a[2]) || 1;
    S.spinAxis = a.map(x => x / l); spin0 = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 1.6); S.spin = spin0;
    wph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
    riseT = 0; landed = false; phase = 'rise';
    for (let i = 0; i < 8; i++) bubble(0.5 + Math.random() * 0.4);
    sfx('splash', 0.22);
  }
  function showAnswer() {
    phase = 'answer'; answers++;
    const a = ANSWERS[S.face];
    srEl.textContent = a.text;
    setHint(null);
    try { onAnswer(a.text); } catch (e) {}
  }
  let sfxT = {};
  function sfx(name, vol, gap) {
    const now = performance.now(); if (gap && now - (sfxT[name] || 0) < gap) return; sfxT[name] = now;
    try { Kit && Kit.sfx && Kit.sfx(name, vol); } catch (e) {}
  }
  function slosh(strength) {   // a soft liquid slosh while shaking
    sfx('splash', 0.18 + 0.2 * clamp(strength, 0, 1), 240);
    const now = performance.now();
    if (now - (sfxT._hap || 0) > 140) { sfxT._hap = now; Kit && Kit.haptic && Kit.haptic('tick'); }
  }

  // ── Tap and swipe around to shake: press anywhere in the stage and move quickly, back and forth or in
  // circles. The ball follows the finger. It counts as a shake once there's been enough fast travel AND
  // enough change of direction (about a full circle, or two reversals), so a tap, a slow drag or one
  // straight flick never counts. ──
  let ptr = null;
  const FAST = 0.45;   // px per ms
  function ptrDown(e) {
    if (e.button > 0 || ptr) return;
    if (e.target.closest && e.target.closest('button,a,input,select,textarea')) return;
    askMotionOnTap();
    ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now(), dir: null, E: 0, turn: 0, lastFast: 0, ok: false };
    root.classList.add('held');
    try { root.setPointerCapture(e.pointerId); } catch (x) {}
    kick();
  }
  function ptrMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    (list && list.length ? list : [e]).forEach(track);
    const bp = R ? R.ballPx() : 120, dx = (e.clientX - ptr.x0) / bp, dy = -(e.clientY - ptr.y0) / bp;
    tx = 1.15 * Math.tanh(dx / 1.15); ty = dy > 0 ? 0.9 * Math.tanh(dy / 0.9) : -0.7 * Math.tanh(-dy / 0.7);
    kick();
  }
  function track(ev) {
    const p = ptr, t = ev.timeStamp || performance.now(), ddx = ev.clientX - p.x, ddy = ev.clientY - p.y, seg = Math.hypot(ddx, ddy), dtm = Math.max(1, t - p.t);
    if (seg < 2) return;
    p.x = ev.clientX; p.y = ev.clientY; p.t = t;
    const speed = seg / dtm;
    if (speed > FAST) {
      const dir = Math.atan2(ddy, ddx);
      if (p.dir != null) {
        let d = Math.abs(dir - p.dir); if (d > Math.PI) d = 2 * Math.PI - d;
        p.turn += d;
        if (d > 2.0) slosh(speed / 2);
      }
      p.dir = dir; p.E += seg; p.lastFast = t;
      const need = Math.max(320, Math.min(W, H) * 0.85);
      if (!p.ok && p.E > need && p.turn > 2 * Math.PI) { p.ok = true; startShake('touch'); }
      if (p.ok) { shakeLast = performance.now(); if (phase !== 'shake') startShake('touch'); }
    } else if (t - p.lastFast > 380) { p.E *= 0.5; p.turn *= 0.5; p.dir = null; }
  }
  function ptrUp(e) {
    if (!ptr || (e && e.pointerId !== ptr.id)) return;
    ptr = null; root.classList.remove('held');
    if (phase === 'shake' && shakeVia === 'touch') endShake();
    kick();
  }

  // ── Phone motion: a shake is a few sharp acceleration spikes close together; the ball lags the motion ──
  const touchDev = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasDM = typeof window.DeviceMotionEvent !== 'undefined' && touchDev;
  const needsPerm = hasDM && typeof DeviceMotionEvent.requestPermission === 'function';
  let motionOn = false, motionSeen = false, spikes = [], grav = null;
  function onMotion(e) {
    let a = e.acceleration, x, y, z;
    if (a && a.x != null) { x = a.x; y = a.y; z = a.z || 0; }
    else {
      const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
      if (!grav) grav = [g.x, g.y, g.z || 0];
      grav[0] += (g.x - grav[0]) * 0.1; grav[1] += (g.y - grav[1]) * 0.1; grav[2] += ((g.z || 0) - grav[2]) * 0.1;
      x = g.x - grav[0]; y = g.y - grav[1]; z = (g.z || 0) - grav[2];
    }
    if (!motionSeen) { motionSeen = true; updateHint(); }
    const m = Math.hypot(x, y, z), now = performance.now();
    if (m > 2.5) {
      // into screen axes (x right, y up) for the current orientation
      const ang = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
      const sx = x * ca - y * sa, sy = x * sa + y * ca;
      fx = -sx * 1.1; fy = -sy * 1.1; fT = now; kick();
    }
    if (m > 13 && now - (spikes[spikes.length - 1] || 0) > 90) {
      spikes.push(now); spikes = spikes.filter(t => now - t < 1000);
      if (phase === 'shake') shakeLast = now;
      else if (spikes.length >= 3) startShake('motion');
      if (phase === 'shake') slosh((m - 13) / 15);
    }
  }
  function listenMotion(on) {
    if (on && !motionOn) window.addEventListener('devicemotion', onMotion);
    if (!on && motionOn) window.removeEventListener('devicemotion', onMotion);
    motionOn = on;
  }
  let motionState = needsPerm ? (lsGet(MOTION_KEY) || 'ask') : (hasDM ? 'granted' : 'none');   // ask | granted | denied | none
  let permAsked = false;
  function requestMotion(fromButton) {
    permAsked = true;
    DeviceMotionEvent.requestPermission().then(r => {
      if (dead) return;
      motionState = r === 'granted' ? 'granted' : 'denied'; lsSet(MOTION_KEY, motionState);
      if (motionState === 'granted') listenMotion(true);
      else if (fromButton && Kit && Kit.toast) Kit.toast('Motion is off. Tap and swipe around to shake.');
      updateHint();
    }).catch(() => { if (dead) return; motionState = 'denied'; lsSet(MOTION_KEY, 'denied'); updateHint(); });
  }
  // iPhone asks on every visit; when it was allowed before, the first tap here asks again (silently)
  function askMotionOnTap() { if (needsPerm && motionState === 'granted' && !motionOn && !permAsked) requestMotion(false); }
  allowBtn.addEventListener('click', () => { Kit && Kit.sfx && Kit.sfx('tap'); requestMotion(true); }, sig);
  if (hasDM && (!needsPerm)) listenMotion(true);

  // ── Hint ──
  let hintShown = false, hintTimer = 0;
  function setHint(kind) {
    if (!kind || answers > 0) { hintEl.classList.remove('on'); allowBtn.hidden = true; return; }
    const H2 = {
      shake: [icon('phone'), 'Shake your phone'],
      tapshake: [icon('phone'), 'Tap the ball, then shake your phone'],
      swipe: [icon('hand'), 'Tap and swipe around to shake'],
      or: [icon('hand'), 'Or tap and swipe around to shake']
    }[kind];
    hintEl.innerHTML = H2[0] + '<span>' + H2[1] + '</span>';
    allowBtn.hidden = kind !== 'or';
    hintEl.classList.add('on');
  }
  function updateHint() {
    if (answers > 0) return setHint(null);
    if (needsPerm) {
      if (motionState === 'ask') return setHint('or');
      if (motionState === 'granted') return setHint(motionOn && motionSeen ? 'shake' : motionOn ? 'shake' : 'tapshake');
      return setHint('swipe');
    }
    if (hasDM && motionSeen) return setHint('shake');
    if (hasDM && !hintShown) return;   // still waiting to hear from the sensor
    setHint('swipe');
  }
  // give the sensor a moment to report before choosing the hint
  hintTimer = setTimeout(() => { hintShown = true; updateHint(); }, hasDM && !needsPerm ? 900 : 350);

  // ── Size, visibility, leaving ──
  function layout() {
    const r = root.getBoundingClientRect(); W = r.width; H = r.height;
    if (!R || W < 2 || H < 2) return;
    const fh = foot.getBoundingClientRect();
    const bottom = Math.max(56, r.bottom - fh.top + 10);
    R.layout(W, H, 10, bottom); R.draw(S);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(() => layout()) : null;
  if (ro) ro.observe(root); else window.addEventListener('resize', layout, sig);
  document.addEventListener('visibilitychange', () => {
    hidden = document.visibilityState !== 'visible';
    if (hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; listenMotion(false); ptr = null; root.classList.remove('held'); }
    else { if (motionState === 'granted' && hasDM && (!needsPerm || permAsked)) listenMotion(true); lastDraw = 0; kick(); }
  }, sig);
  root.addEventListener('pointerdown', ptrDown, sig);
  root.addEventListener('pointermove', ptrMove, sig);
  root.addEventListener('pointerup', ptrUp, sig);
  root.addEventListener('pointercancel', ptrUp, sig);
  root.addEventListener('lostpointercapture', ptrUp, sig);
  window.addEventListener('pagehide', () => unmount(), sig);

  // ── Renderer: 3D when WebGL and the module load, the 2D canvas otherwise ──
  function use(r) {
    if (dead) { if (r) r.destroy(); return; }
    if (R) { if (r) r.destroy(); return; }
    R = r || create2D(root); layout(); kick();
  }
  const force2D = /[?&]eb=2d\b/.test(location.search);
  if (!force2D && webglOK()) {
    const late = setTimeout(() => use(null), 8000);
    Promise.all([import('./eightball/ball3d.js'), loadPost()]).then(([m, post]) => {
      clearTimeout(late); if (R || dead) return;
      let r = null; try { r = m.create(root, ANSWERS, post); } catch (e) { console.error(e); r = null; }
      use(r);
    }).catch(e => { clearTimeout(late); console.error(e); use(null); });
  } else use(null);

  function unmount() {
    if (dead) return; dead = true;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    clearTimeout(hintTimer); ac.abort(); listenMotion(false); if (ro) ro.disconnect();
    if (R) { try { R.destroy(); } catch (e) {} R = null; }
    if (root.parentNode) root.parentNode.removeChild(root);
    if (window.__eight === hook) delete window.__eight;
  }

  // ── Test hook ──
  const hook = window.__eight = {
    noRender: false,   // tests: run the motion without drawing (software GL is too slow for real-time gestures)
    get phase() { return phase; }, get state() { return Object.assign({ phase, ox, oy, answers, motionOn, motionSeen, motionState, hint: hintEl.classList.contains('on') ? hintEl.textContent : '', allow: !allowBtn.hidden, drawing: !!raf, held: !!ptr, ptr: ptr ? { E: Math.round(ptr.E), turn: +ptr.turn.toFixed(2), ok: ptr.ok } : null, renderer: R ? (R.is3D ? '3d' : '2d') : '' }, S, { bubbles: S.bubbles.length }); },
    get answer() { return phase === 'answer' ? ANSWERS[S.face].text : null; },
    answers: ANSWERS,
    shake(ms) { startShake('test'); shakeLast = performance.now() + 1e6; setTimeout(() => endShake(), ms || 600); },
    info: () => (R ? R.info() : null),
    R: () => R,
    redraw: () => { if (R) R.draw(S); }
  };
  return { unmount };
}

export default {
  id: 'eightball',
  name: 'Mystic 8 Ball',
  blurb: 'Shake for a yes, no or maybe',
  rules:
    '<h3>Mystic 8 Ball</h3>' +
    '<p>Think of a question that can be answered yes or no. Then shake the ball.</p>' +
    '<ul><li><b>On a phone:</b> shake the phone. On an iPhone, tap <b>Allow motion</b> the first time.</li>' +
    '<li><b>Anywhere else:</b> tap and swipe around quickly, back and forth or in circles. A plain tap or a slow drag won\'t do it.</li>' +
    '<li>When you stop, the ball rolls over and the answer floats up in its window.</li>' +
    '<li>Shake again for a new answer.</li></ul>' +
    '<p>There are 20 answers: ten say yes, five say maybe and five say no. Every shake is a fresh pick.</p>',
  mount
};
