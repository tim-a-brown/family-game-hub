// The Great Zandor: a carnival fortune machine. Drop a token, the swami in the glass case wakes, waves his
// hands over the crystal ball, and a printed fortune card feeds out of the slot. One of the Fortune
// Teller's tellers (see ../fortune.html): export default { id, name, blurb, rules, mount(stage, api) }.
//
// Battery: at rest the case is one still frame and only the marquee bulbs change (a CSS opacity flip
// every half second). The swami's canvas animates only while he performs, at most ~60 draws a second,
// and nothing runs while the page is hidden. unmount() stops every timer, listener and sound.
import FORTUNES from './swami-fortunes.js';
import { createScene } from './swami/scene.js';
import { layout, paint, paintToken } from './swami/cabinet.js';
import { paintCard, CARD_RATIO } from './swami/card.js';

const DECK_KEY = 'fortune_swami_deck', VOICE_KEY = 'fortune_swami_voice';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const T_WAKE = 0.35, T_CARD = 3.7, FEED = 1.4, WIND = 1.3;   // seconds
const F = { bungee: '"ZD Bungee", Impact, "Arial Black", sans-serif', cinzel: '"ZD Cinzel", Georgia, serif', pagella: '"ZD Pagella", "Book Antiqua", Georgia, serif' };

// ── Storage ────────────────────────────────────────────────────────────────
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
// Deal from a shuffled deck kept in localStorage, so repeats wait until all 400 have come up
function deal(n) {
  let d = null;
  try { d = JSON.parse(lsGet(DECK_KEY) || 'null'); } catch (e) {}
  if (!d || !Array.isArray(d.o) || d.n !== n || d.o.length !== n || !(d.i >= 0) || d.i >= n) {
    const last = d && Array.isArray(d.o) ? d.o[(d.i || 1) - 1] : -1;
    const o = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    if (o[0] === last) [o[0], o[n - 1]] = [o[n - 1], o[0]];
    d = { n, o, i: 0 };
  }
  const idx = d.o[d.i++];
  lsSet(DECK_KEY, JSON.stringify(d));
  return idx;
}

// ── Fonts (already in the app's precache) ──────────────────────────────────
let fontsP = null;
function loadFonts() {
  if (fontsP) return fontsP;
  const u = f => new URL('../../fonts/' + f, import.meta.url).href;
  const faces = [['ZD Bungee', 'bungee.woff2', {}], ['ZD Cinzel', 'cinzel-700.woff2', { weight: '700' }], ['ZD Pagella', 'pagella-400.woff2', {}], ['ZD Pagella', 'pagella-400italic.woff2', { style: 'italic' }]];
  if (typeof FontFace === 'undefined') return (fontsP = Promise.resolve());
  fontsP = Promise.all(faces.map(([fam, file, d]) => {
    try { const ff = new FontFace(fam, 'url(' + u(file) + ')', d); return ff.load().then(x => { document.fonts.add(x); }).catch(() => {}); } catch (e) { return Promise.resolve(); }
  }));
  return fontsP;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const CSS = `
.zd{position:absolute;inset:0;overflow:hidden;background:#0b0507;color:#fbf3df;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;}
.zd canvas{position:absolute;display:block;}
.zd-cab{left:0;top:0;pointer-events:none;}
.zd-bulbs{position:absolute;inset:0;pointer-events:none;}
.zd-b{position:absolute;border-radius:50%;background:radial-gradient(circle at 40% 34%,#a07a48,#5a3414 55%,#2a1406);box-shadow:0 0 0 1.5px #d2a040,0 0 0 2.6px rgba(40,20,0,.75),inset 0 -1px 2px rgba(0,0,0,.5);}
.zd-b::after{content:"";position:absolute;inset:-1px;border-radius:50%;background:radial-gradient(circle at 42% 38%,#fffdf0 0 16%,#ffe08a 38%,#ffa424 70%,#e06a00 100%);box-shadow:0 0 7px 2px rgba(255,190,80,.7),0 0 18px 6px rgba(255,140,30,.28);opacity:0;transition:opacity .12s linear;}
.zd[data-ph="0"] .zd-b:not(.p0)::after,.zd[data-ph="1"] .zd-b:not(.p1)::after,.zd[data-ph="2"] .zd-b:not(.p2)::after,.zd[data-ph="all"] .zd-b::after{opacity:1;}
.zd.fast .zd-b::after{transition-duration:.05s;}
.zd-hit{position:absolute;border:0;padding:0;margin:0;background:transparent;border-radius:10px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.zd-hit:focus-visible{outline:2px solid #ffd36a;outline-offset:2px;}
.zd-hit.coin:active{background:rgba(255,230,160,.10);}
.zd-case{cursor:default;}
.zd-token{position:absolute;border-radius:50%;cursor:grab;touch-action:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.6));transition:opacity .4s;will-change:transform;}
.zd-token canvas{position:static;width:100%;height:100%;}
.zd-token.gone{opacity:0;pointer-events:none;}
.zd-token.lift{cursor:grabbing;filter:drop-shadow(0 10px 8px rgba(0,0,0,.55));}
.zd-token.hint{animation:zd-hint 2.4s ease-in-out 1.2s 2;}
@keyframes zd-hint{0%,100%{transform:none}45%{transform:translateY(-6px) rotate(-8deg)}55%{transform:translateY(-6px) rotate(8deg)}}
.zd-clip{position:absolute;overflow:hidden;pointer-events:none;}
.zd-card{position:absolute;left:0;top:0;width:100%;border-radius:3%/2.2%;box-shadow:0 2px 6px rgba(0,0,0,.55);cursor:pointer;pointer-events:auto;touch-action:manipulation;}
.zd-voice{position:absolute;right:10px;top:10px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,214,120,.45);background:rgba(20,8,10,.6);color:#f3d27a;display:grid;place-items:center;padding:0;cursor:pointer;}
.zd-voice svg{width:20px;height:20px;}
.zd-voice[aria-pressed="false"]{color:rgba(243,210,122,.55);}
.zd-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:18px;padding:16px;background:radial-gradient(90% 70% at 50% 45%,rgba(40,12,16,.82),rgba(6,2,3,.94));opacity:0;transition:opacity .35s;}
.zd-over.on{opacity:1;}
.zd-over.col{flex-direction:column;}
.zd-big{position:relative;flex:none;transform:rotate(-1.4deg);}
.zd-big .zd-card{position:static;width:100%;height:100%;box-shadow:0 18px 40px rgba(0,0,0,.6),0 2px 4px rgba(0,0,0,.4);cursor:default;}
.zd-acts{display:flex;gap:10px;flex:none;}
.zd-over:not(.col) .zd-acts{flex-direction:column;}
.zd-btn{min-height:48px;padding:0 20px;border-radius:14px;border:0;font:700 1rem/1 ui-rounded,system-ui,sans-serif;letter-spacing:.01em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
.zd-btn svg{width:18px;height:18px;}
.zd-btn.gold{color:#2b1600;background:linear-gradient(180deg,#ffe9a6,#e3b04a 55%,#c08a28);box-shadow:0 3px 0 #7a5212,inset 0 1px 0 rgba(255,255,255,.6);}
.zd-btn.plain{color:#f6e6c0;background:rgba(255,240,210,.08);box-shadow:inset 0 0 0 1.5px rgba(255,220,150,.35);}
.zd-btn:active{transform:translateY(2px);}
`;

export default {
  id: 'swami',
  name: 'The Great Zandor',
  blurb: 'Carnival fortune machine',
  rules: '<h3>The Great Zandor</h3>' +
    '<p>Zandor is an old carnival fortune machine. He sees all, and he has opinions.</p>' +
    '<p><b>Drop a token.</b> Tap the coin slot, or drag the brass token into it. The lights chase, his eyes glow, and he waves his hands over the crystal ball.</p>' +
    '<p><b>Take your card.</b> A few seconds later a printed fortune card slides out of the slot. Tap it to read it up close, with your lucky number and lucky day.</p>' +
    '<p>Tap <b>Put it away</b> to go back to the booth, or <b>Another token</b> to ask again. There are 400 fortunes, and he deals them like a deck, so you won\'t see one again until you\'ve seen them all.</p>' +
    '<p>The speaker button lets Zandor read your card aloud. It starts off.</p>' +
    '<p>For fun only. Zandor is a machine. A wise one, but a machine.</p>',

  mount(stage, api) {
    const Kit = (api && api.Kit) || window.Kit || null;
    const sfx = (n, v) => { try { Kit && Kit.sfx(n, v); } catch (e) {} };
    const haptic = k => { try { Kit && Kit.haptic(k); } catch (e) {} };
    const icon = n => (Kit && Kit.icon ? Kit.icon(n) : '');
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    let dead = false;

    // ── DOM ──
    let style = document.getElementById('zd-style');
    if (!style) { style = document.createElement('style'); style.id = 'zd-style'; style.textContent = CSS; document.head.appendChild(style); }
    const root = document.createElement('div'); root.className = 'zd'; root.dataset.ph = '0';
    const inner = document.createElement('canvas'); inner.className = 'zd-inner';
    const cab = document.createElement('canvas'); cab.className = 'zd-cab';
    const bulbsEl = document.createElement('div'); bulbsEl.className = 'zd-bulbs';
    const caseHit = document.createElement('div'); caseHit.className = 'zd-hit zd-case';
    const coinHit = document.createElement('button'); coinHit.type = 'button'; coinHit.className = 'zd-hit coin'; coinHit.setAttribute('aria-label', 'Drop a token in the slot');
    const clip = document.createElement('div'); clip.className = 'zd-clip';
    const token = document.createElement('div'); token.className = 'zd-token hint'; token.setAttribute('aria-hidden', 'true');
    const tokenCv = document.createElement('canvas'); token.appendChild(tokenCv);
    const voiceBtn = document.createElement('button'); voiceBtn.type = 'button'; voiceBtn.className = 'zd-voice';
    root.append(inner, cab, bulbsEl, caseHit, coinHit, clip, token);
    const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    if (canSpeak) root.appendChild(voiceBtn);
    stage.appendChild(root);

    const scene = createScene();
    let L = null, dpr = 1, W = 0, H = 0;
    let state = 'idle';           // idle | performing | card | open
    let perf = null, raf = 0, lastDraw = 0;
    let cardEl = null, cardData = null, over = null, feedAnim = null;

    // ── Layout & painting ──
    function relayout() {
      if (dead) return;
      const r = stage.getBoundingClientRect();
      W = Math.max(200, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      L = layout(W, H);
      cab.width = Math.round(W * dpr); cab.height = Math.round(H * dpr); cab.style.width = W + 'px'; cab.style.height = H + 'px';
      paint(cab.getContext('2d'), L, dpr, F);
      const o = L.open;
      inner.style.left = o.x + 'px'; inner.style.top = o.y + 'px'; inner.style.width = o.w + 'px'; inner.style.height = o.h + 'px';
      inner.width = Math.round(o.w * dpr); inner.height = Math.round(o.h * dpr);
      scene.build(o.w, o.h, dpr);
      drawNow();
      place(caseHit, o.x, o.y, o.w, o.h);
      place(coinHit, L.coin.cx - L.coin.w * 0.6, L.coin.cy - L.coin.h * 0.6, L.coin.w * 1.2, L.coin.h * 1.2);
      // bulbs
      bulbsEl.textContent = '';
      const d = L.bulbR * 2;
      L.bulbs.forEach((b, i) => {
        const e = document.createElement('i'); e.className = 'zd-b p' + (i % 3);
        e.style.cssText = 'left:' + (b.x - d / 2) + 'px;top:' + (b.y - d / 2) + 'px;width:' + d + 'px;height:' + d + 'px';
        bulbsEl.appendChild(e);
      });
      // token
      const tr = L.token.r, tpx = Math.round(tr * 2 * dpr);
      paintToken(tokenCv, tpx, F);
      place(token, L.token.cx - tr, L.token.cy - tr * 1.05, tr * 2, tr * 2);
      // card slot
      const cw = L.card.w, ch = cw * CARD_RATIO;
      place(clip, L.slot.cx - cw / 2, L.slot.y, cw, L.card.hang);
      if (cardEl && cardEl.parentNode === clip) { cardEl.style.height = ch + 'px'; if (!feedAnim) cardEl.style.transform = 'translateY(' + (L.card.hang - ch) + 'px)'; }
      if (over) sizeOver();
      voiceBtn.style.top = (L.wide ? 10 : Math.max(8, Math.min(10, L.y0 + 0.15 * L.W - 46))) + 'px';
    }
    function place(e, x, y, w, h) { e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = w + 'px'; e.style.height = h + 'px'; }

    function drawNow(now) {
      const g = inner.getContext('2d');
      if (!perf) { scene.draw(g, scene.pose(0, 0)); return; }
      const t = ((now || performance.now()) - perf.t0) / 1000 - T_WAKE;
      let wake;
      if (t < 0) wake = 0;
      else if (t < T_CARD - T_WAKE) wake = Math.min(1, t / 0.6);
      else wake = Math.max(0, 1 - (t - (T_CARD - T_WAKE)) / WIND);
      scene.draw(g, scene.pose(Math.max(0, t), wake));
      if (t > T_CARD - T_WAKE + WIND) { perf = null; scene.draw(g, scene.pose(0, 0)); }
    }
    function loop(now) {
      raf = 0;
      if (dead || !perf || document.hidden) return;
      if (now - lastDraw >= 12) { lastDraw = now; drawNow(now); }
      if (perf) raf = requestAnimationFrame(loop);
    }
    function startLoop() { if (!raf && perf && !document.hidden) raf = requestAnimationFrame(loop); }

    // ── Marquee bulbs: one attribute flip per tick ──
    let ph = 0, bulbTimer = 0, bulbFast = false;
    function bulbs(fast) {
      bulbFast = fast; clearInterval(bulbTimer); bulbTimer = 0;
      root.classList.toggle('fast', fast);
      if (document.hidden || dead) return;
      bulbTimer = setInterval(() => { ph = (ph + 1) % 3; root.dataset.ph = String(ph); }, fast ? 110 : 520);
    }

    // ── Sound: Kit's recorded effects plus a few made here ──
    let ac = null;
    const soundOn = () => lsGet('gn_sound') !== '0';
    function actx() {
      if (!soundOn()) return null;
      if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    }
    function ping(a, f, t0, dur, vol, type) {
      const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + t0;
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(a, t0, dur, vol, f, q) {
      const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + t0;
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q || 1; gn.gain.value = vol;
      s.buffer = b; s.connect(bp); bp.connect(gn); gn.connect(a.destination); s.start(t); s.stop(t + dur + 0.02);
    }
    // a brass token: a bright inharmonic clink, a smaller bounce, then it rattles down the chute and lands
    function coinSound() {
      sfx('chip', 0.7);
      const a = actx(); if (!a) return;
      [[2637, 0.09], [3954, 0.06], [5296, 0.04], [6912, 0.025]].forEach(([f, v]) => ping(a, f, 0.0, 0.35, v));
      [[2700, 0.04], [4100, 0.03]].forEach(([f, v]) => ping(a, f, 0.13, 0.18, v));
      for (let i = 0; i < 6; i++) noise(a, 0.22 + i * 0.045 + Math.random() * 0.02, 0.03, 0.07, 2500 + Math.random() * 1500, 3);
      ping(a, 110, 0.55, 0.22, 0.12); noise(a, 0.55, 0.08, 0.08, 400, 1);
    }
    // the swami's hum: a low voice through two vowel formants, sliding "mmm-ohh-aah", and a glassy shimmer
    function humSound(dur) {
      const a = actx(); if (!a) return;
      const t = a.currentTime, out = a.createGain();
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.22, t + 0.5);
      out.gain.setValueAtTime(0.22, t + dur - 0.7); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(a.destination);
      const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 2.2; lfo.connect(lg);
      const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), lp = a.createBiquadFilter();
      f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 7; lp.type = 'lowpass'; lp.frequency.value = 1800;
      f1.frequency.setValueAtTime(260, t); f1.frequency.linearRampToValueAtTime(480, t + dur * 0.35); f1.frequency.linearRampToValueAtTime(700, t + dur * 0.8);
      f2.frequency.setValueAtTime(900, t); f2.frequency.linearRampToValueAtTime(860, t + dur * 0.35); f2.frequency.linearRampToValueAtTime(1150, t + dur * 0.8);
      const mix = a.createGain(); mix.gain.value = 0.9;
      [98, 98.6, 49.2].forEach((f, i) => {
        const o = a.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(f * 0.94, t + dur); lg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
      });
      lp.connect(f1); lp.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(out);
      lfo.start(t); lfo.stop(t + dur + 0.1);
      // glass harmonica shimmer
      [1046.5, 1568, 2093].forEach((f, i) => {
        const o = a.createOscillator(), gn = a.createGain(), tr = a.createOscillator(), tg = a.createGain();
        o.frequency.value = f; gn.gain.setValueAtTime(0.0001, t + 0.3 + i * 0.25); gn.gain.exponentialRampToValueAtTime(0.018, t + 0.9 + i * 0.25);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        tr.frequency.value = 3 + i; tg.gain.value = 0.008; tr.connect(tg); tg.connect(gn.gain);
        o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.1); tr.start(t); tr.stop(t + dur + 0.1);
      });
    }
    // card feed: a little motor whirring in steps
    function feedSound(dur) {
      const a = actx(); if (!a) return;
      const t = a.currentTime, o = a.createOscillator(), lp = a.createBiquadFilter(), gn = a.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(62, t); o.frequency.linearRampToValueAtTime(74, t + dur);
      lp.type = 'lowpass'; lp.frequency.value = 520;
      gn.gain.setValueAtTime(0.0001, t);
      [[0, 0.07], [0.42, 0.07], [0.5, 0.012], [0.62, 0.07], [dur - 0.12, 0.07]].forEach(([d, v]) => gn.gain.linearRampToValueAtTime(v, t + d));
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }

    // ── Voice (optional, off by default) ──
    let voiceOn = canSpeak && lsGet(VOICE_KEY) === '1';
    function paintVoice() {
      voiceBtn.innerHTML = icon(voiceOn ? 'sound' : 'mute');
      voiceBtn.setAttribute('aria-pressed', String(voiceOn));
      voiceBtn.setAttribute('aria-label', voiceOn ? "Zandor's voice is on" : "Zandor's voice is off");
      voiceBtn.title = voiceOn ? 'Voice on' : 'Voice off';
    }
    paintVoice();
    function pickVoice() {
      const vs = (window.speechSynthesis.getVoices() || []).filter(v => /^en/i.test(v.lang));
      return vs.find(v => /daniel|arthur|fred|ralph|bruce|male|gordon|aaron|oliver|thomas|rishi|reed/i.test(v.name)) || vs[0] || null;
    }
    function say(text) {
      if (!voiceOn || !canSpeak) return;
      try {
        const u = new SpeechSynthesisUtterance(text), v = pickVoice();
        if (v) u.voice = v;
        u.rate = 0.78; u.pitch = 0.3; u.volume = 1;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
      } catch (e) {}
    }
    voiceBtn.addEventListener('click', () => {
      voiceOn = !voiceOn; lsSet(VOICE_KEY, voiceOn ? '1' : '0'); paintVoice(); haptic('light'); sfx('tap');
      if (Kit && Kit.toast) Kit.toast(voiceOn ? 'Zandor will read your card aloud' : "Zandor's voice is off");
      if (!voiceOn && canSpeak) window.speechSynthesis.cancel();
      else if (state === 'open' && cardData) say(cardData.text);
    });
    const INTROS = ['Ahh. Come closer.', 'The spirits are stirring.', 'Zandor sees all.', 'Hmm. Interesting.', 'Silence. Zandor is looking.', 'Your future is coming into focus.'];

    // ── The token ──
    let drag = null;
    function tokenHome() { token.style.transition = 'transform .35s cubic-bezier(.3,1.4,.5,1), opacity .4s'; token.style.transform = ''; }
    function slotCenter() { return { x: L.coin.cx, y: L.coin.cy - L.coin.h * 0.05 }; }
    token.addEventListener('pointerdown', e => {
      if (!(state === 'idle' || state === 'card') || token.classList.contains('gone')) return;
      e.preventDefault();
      token.classList.remove('hint');
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      try { token.setPointerCapture(e.pointerId); } catch (err) {}
      token.style.transition = 'none'; token.classList.add('lift');
      token.style.transform = 'scale(1.15)';
      haptic('light');
    });
    token.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) drag.moved = true;
      token.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.15)';
    });
    function endDrag(e, cancel) {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, moved = drag.moved;
      drag = null; token.classList.remove('lift');
      if (cancel) { tokenHome(); return; }
      const s = slotCenter(), tx = L.token.cx + dx, ty = L.token.cy + dy;
      const near = Math.abs(tx - s.x) < L.coin.w * 0.85 && Math.abs(ty - s.y) < L.coin.h * 0.7;
      if (!moved || near) insertToken([dx, dy]);
      else { tokenHome(); sfx('tap', 0.5); }
    }
    token.addEventListener('pointerup', e => endDrag(e, false));
    token.addEventListener('pointercancel', e => endDrag(e, true));
    coinHit.addEventListener('click', () => { if (state === 'idle' || state === 'card') insertToken([0, 0]); });
    caseHit.addEventListener('click', () => {
      if (state !== 'idle' && state !== 'card') return;
      sfx('tap', 0.4);
      if (Kit && Kit.toast) Kit.toast('Zandor needs a token. Drop one in the slot.');
      token.classList.remove('hint'); void token.offsetWidth; token.classList.add('hint');
    });

    // Fly the token from where it is into the slot, turn it edge-on, and drop it in
    function insertToken(from) {
      if (!(state === 'idle' || state === 'card') || token.classList.contains('gone')) return;
      if (state === 'card') dropOldCard();
      state = 'performing';
      token.classList.remove('hint');
      const s = slotCenter(), ex = s.x - L.token.cx, ey = s.y - L.token.cy;
      token.style.transition = 'none';
      const a = token.animate([
        { transform: 'translate(' + from[0] + 'px,' + from[1] + 'px) scale(1.15)' },
        { transform: 'translate(' + ex + 'px,' + (ey - L.coin.h * 0.06) + 'px) scale(1.05)', offset: 0.55 },
        { transform: 'translate(' + ex + 'px,' + (ey - L.coin.h * 0.06) + 'px) scale(.2, 1)', offset: 0.75, opacity: 1 },
        { transform: 'translate(' + ex + 'px,' + (ey + L.coin.h * 0.08) + 'px) scale(.12, .9)', opacity: 0 }
      ], { duration: 520, easing: 'cubic-bezier(.4,0,.3,1)' });
      later(() => { token.classList.add('gone'); token.style.transform = ''; token.style.transition = ''; }, 500);
      void a;
      later(perform, 420);
    }

    // ── The performance ──
    function perform() {
      if (dead) return;
      coinSound(); haptic('medium');
      bulbs(true);
      perf = { t0: performance.now() };
      startLoop();
      later(() => { humSound(T_CARD - T_WAKE + 0.6); say(INTROS[Math.floor(Math.random() * INTROS.length)]); }, T_WAKE * 1000);
      later(() => sfx('whoosh', 0.8), 1300);
      later(() => sfx('whoosh', 0.6), 2600);
      later(() => sfx('sparkle', 0.7), 3200);
      later(feedCard, T_CARD * 1000);
    }

    function newCardData() {
      const i = deal(FORTUNES.length);
      return { text: FORTUNES[i], no: i + 1, num: 1 + Math.floor(Math.random() * 99), day: DAYS[Math.floor(Math.random() * 7)] };
    }
    function cardPx() {
      const big = bigSize();
      return Math.round(Math.min(1100, Math.max(560, big.w * dpr * 1.1)));
    }
    function feedCard() {
      if (dead) return;
      cardData = newCardData();
      cardEl = document.createElement('canvas'); cardEl.className = 'zd-card';
      cardEl.setAttribute('role', 'button'); cardEl.setAttribute('aria-label', 'Your fortune card. Tap to read it.'); cardEl.tabIndex = 0;
      paintCard(cardEl, cardPx(), cardData, F);
      const cw = L.card.w, ch = cw * CARD_RATIO, hang = L.card.hang;
      cardEl.style.height = ch + 'px';
      clip.appendChild(cardEl);
      cardEl.addEventListener('click', openCard);
      cardEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); } });
      feedSound(FEED); haptic('light');
      sfx('deal', 0.7); later(() => sfx('deal', 0.6), FEED * 450); later(() => sfx('deal', 0.7), FEED * 950);
      const y = p => 'translateY(' + (-ch + (hang) * p) + 'px)';
      feedAnim = cardEl.animate([
        { transform: y(0) }, { transform: y(0.42), offset: 0.38 }, { transform: y(0.44), offset: 0.48 },
        { transform: y(0.95), offset: 0.88 }, { transform: y(1) + ' rotate(.6deg)', offset: 0.95 }, { transform: y(1) }
      ], { duration: FEED * 1000, easing: 'linear', fill: 'forwards' });
      later(() => {
        if (dead || !cardEl) return;
        feedAnim && feedAnim.cancel(); feedAnim = null;
        cardEl.style.transform = 'translateY(' + (L.card.hang - L.card.w * CARD_RATIO) + 'px)';
        state = 'card';
        clearInterval(bulbTimer); bulbTimer = 0; root.dataset.ph = 'all';
        later(() => { root.dataset.ph = String(ph); bulbs(false); }, 450);
        sfx('pop', 0.6); haptic('success');
        later(() => token.classList.remove('gone'), 600);
        try { api && api.onAnswer && api.onAnswer(cardData.text); } catch (e) {}
      }, FEED * 1000 + 20);
    }
    function dropOldCard() {
      const c = cardEl; cardEl = null;
      if (!c) return;
      if (feedAnim) { feedAnim.cancel(); feedAnim = null; }
      const a = c.animate([{ opacity: 1 }, { opacity: 0, transform: (c.style.transform || '') + ' translateY(40px)' }], { duration: 300, easing: 'ease-in' });
      a.onfinish = () => c.remove();
    }

    // ── Reading the card up close ──
    function bigSize() {
      const wide = W / H > 1.05;
      const maxW = wide ? Math.min(W * 0.5, 460) : Math.min(W - 40, 440);
      const maxH = wide ? H - 40 : H - 120;
      const w = Math.max(140, Math.min(maxW, maxH / CARD_RATIO));
      return { w, h: w * CARD_RATIO, wide };
    }
    function sizeOver() {
      const s = bigSize();
      over.classList.toggle('col', !s.wide);
      const big = over.querySelector('.zd-big');
      big.style.width = s.w + 'px'; big.style.height = s.h + 'px';
    }
    function openCard() {
      if (state !== 'card' || !cardEl) return;
      state = 'open';
      sfx('flip'); haptic('light');
      const from = cardEl.getBoundingClientRect();
      over = document.createElement('div'); over.className = 'zd-over';
      over.setAttribute('role', 'dialog'); over.setAttribute('aria-label', 'Your fortune');
      const big = document.createElement('div'); big.className = 'zd-big';
      const acts = document.createElement('div'); acts.className = 'zd-acts';
      const away = document.createElement('button'); away.type = 'button'; away.className = 'zd-btn plain'; away.textContent = 'Put it away';
      const again = document.createElement('button'); again.type = 'button'; again.className = 'zd-btn gold'; again.innerHTML = icon('sparkle') + '<span>Another token</span>';
      acts.append(again, away);
      over.append(big, acts);
      root.appendChild(over);
      sizeOver();
      cardEl.style.transform = ''; cardEl.style.height = '';
      big.appendChild(cardEl);
      cardEl.setAttribute('aria-label', 'Fortune: ' + cardData.text + ' Lucky number ' + cardData.num + '. Lucky day ' + cardData.day + '.');
      const to = cardEl.getBoundingClientRect();
      cardEl.style.transformOrigin = '0 0';
      cardEl.animate([
        { transform: 'rotate(1.4deg) translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ')' },
        { transform: 'none' }
      ], { duration: 560, easing: 'cubic-bezier(.2,.85,.25,1)' });
      requestAnimationFrame(() => over && over.classList.add('on'));
      away.addEventListener('click', () => closeCard(false));
      again.addEventListener('click', () => closeCard(true));
      later(() => say(cardData.text + ' Your lucky number is ' + cardData.num + '.'), 500);
    }
    function closeCard(another) {
      if (state !== 'open' || !over) return;
      sfx(another ? 'pop' : 'slide'); haptic('light');
      if (canSpeak) try { window.speechSynthesis.cancel(); } catch (e) {}
      const o = over, c = cardEl; over = null; cardEl = null; cardData = null;
      if (c) c.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(60%) rotate(7deg)', opacity: 0 }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
      o.classList.remove('on');
      later(() => o.remove(), 360);
      state = 'idle';
      token.classList.remove('gone');
      if (another) later(() => insertToken([0, 0]), 380);
    }

    // ── Lifecycle ──
    let rzRaf = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (!rzRaf) rzRaf = requestAnimationFrame(() => { rzRaf = 0; relayout(); }); }) : null;
    if (ro) ro.observe(stage);
    const onWinResize = () => { if (!ro && !rzRaf) rzRaf = requestAnimationFrame(() => { rzRaf = 0; relayout(); }); };
    window.addEventListener('resize', onWinResize);
    function onVis() {
      if (document.hidden) { clearInterval(bulbTimer); bulbTimer = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      else { bulbs(bulbFast); startLoop(); }
    }
    document.addEventListener('visibilitychange', onVis);

    relayout();
    bulbs(false);
    loadFonts().then(() => { if (!dead) relayout(); });

    // Test hook: window.__zandor.drop() drops a token as if tapped
    const hook = { drop: () => insertToken([0, 0]), open: () => openCard(), away: () => closeCard(false), state: () => state, card: () => cardData };
    window.__zandor = hook;

    return {
      unmount() {
        dead = true;
        timers.forEach(clearTimeout); timers.clear();
        clearInterval(bulbTimer); bulbTimer = 0;
        if (raf) cancelAnimationFrame(raf); raf = 0;
        if (rzRaf) cancelAnimationFrame(rzRaf); rzRaf = 0;
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onWinResize);
        document.removeEventListener('visibilitychange', onVis);
        if (feedAnim) { try { feedAnim.cancel(); } catch (e) {} feedAnim = null; }
        if (canSpeak) try { window.speechSynthesis.cancel(); } catch (e) {}
        if (ac) { try { ac.close(); } catch (e) {} ac = null; }
        perf = null;
        root.remove();
        if (window.__zandor === hook) delete window.__zandor;
        const s = document.getElementById('zd-style'); if (s && !document.querySelector('.zd')) s.remove();
        stage.textContent = '';
      }
    };
  }
};
