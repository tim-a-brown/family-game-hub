// ═══════════════════════════════════════════════════════════════════════════
// Game Night Service Worker
// Strategy:
//   - HTML/CSS/JS/image assets: cache-first with stale-while-revalidate
//   - Firebase endpoints: network-only (never cache Firestore reads)
//   - On new CACHE_VERSION, old caches are purged on activate
//
// On install, every game HTML is precached in parallel (best-effort — failures
// don't block install) so the entire app is usable offline immediately after
// the first visit. Total cache size ~3-5MB.
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v562-2026-10-18-lorcana-carousel-picks';
// Preview channels (familygames-da3e5--name-xyz.web.app) and local testing: pages and code always from the network
const PREVIEW = self.location.hostname.includes('--') || /^(localhost|127\.0\.0\.1)$/.test(self.location.hostname);
const CACHE_NAME = 'game-night-' + CACHE_VERSION;

// Shell assets + every game HTML. Maintained manually; bump CACHE_VERSION
// when this list changes so users get the new precache pass.
const PRECACHE_URLS = [
  // Shell
  '/',
  '/index.html',
  '/gate.html',
  '/shared.css',
  '/kit.css',
  '/spotify.js',
  '/spotify.html',
  '/kit.js',
  '/spin.js',
  '/games.js',
  '/game-icons.js',
  '/diag.js',
  '/data/wordle-words.js',
  '/fonts/lilita-one.woff2',
  '/fonts/baloo2-700.woff2',
  '/fonts/fredoka-600.woff2',
  '/fonts/patrick-hand.woff2',
  '/fonts/great-vibes.woff2',
  '/fonts/cinzel-700.woff2',
  '/fonts/bungee.woff2',
  '/fonts/russo-one.woff2',
  '/fonts/sofia-sans-condensed.woff2',
  '/fonts/sofia-sans.woff2',
  '/fonts/rye.woff2',
  '/fonts/pagella-400.woff2',
  '/fonts/pagella-400italic.woff2',
  '/fonts/pagella-700.woff2',
  '/fonts/pagella-700italic.woff2',
  '/app.js',
  '/sync.js',
  '/qr.js',
  '/hist.js',
  '/players.js',
  '/casino.js', '/daily.js',
  '/coach.js',
  '/arcade-hi.js',
  '/arcade-music.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/favicon.png',
  '/icon.svg',
  // Game sounds (recorded, CC0)
  '/sounds/bad-1.mp3',
  '/sounds/bad-2.mp3',
  '/sounds/boom-1.mp3',
  '/sounds/boom-2.mp3',
  '/sounds/chip-1.mp3',
  '/sounds/chip-2.mp3',
  '/sounds/chip-3.mp3',
  '/sounds/chip-4.mp3',
  '/sounds/clash-1.mp3',
  '/sounds/clash-2.mp3',
  '/sounds/deal-1.mp3',
  '/sounds/deal-2.mp3',
  '/sounds/deal-3.mp3',
  '/sounds/flip-1.mp3',
  '/sounds/flip-2.mp3',
  '/sounds/flip-3.mp3',
  '/sounds/flip-4.mp3',
  '/sounds/good-1.mp3',
  '/sounds/good-2.mp3',
  '/sounds/lose-1.mp3',
  '/sounds/lose-2.mp3',
  '/sounds/pop-1.mp3',
  '/sounds/pop-2.mp3',
  '/sounds/roll-1.mp3',
  '/sounds/roll-2.mp3',
  '/sounds/roll-3.mp3',
  '/sounds/sparkle-1.mp3',
  '/sounds/sparkle-2.mp3',
  '/sounds/splash-1.mp3',
  '/sounds/splash-2.mp3',
  '/sounds/tap-1.mp3',
  '/sounds/tap-2.mp3',
  '/sounds/tap-3.mp3',
  '/sounds/tick-1.mp3',
  '/sounds/tick-2.mp3',
  '/sounds/whoosh-1.mp3',
  '/sounds/whoosh-2.mp3',
  '/sounds/whoosh-3.mp3',
  '/sounds/win-1.mp3',
  '/sounds/win-2.mp3',
  // Every game
  '/games/2048.html',
  '/games/asteroids.html',
  '/games/baccarat.html',
  '/games/backgammon.html',
  '/games/monopoly.html',
  '/games/monopoly/engine.js',
  '/games/monopoly/art.js',
  '/games/monopoly/music.js',
  '/img/monopoly-logo.webp',
  '/img/monopoly-man.webp',
  '/img/monopoly-jailfree.webp',
  '/img/monopoly-jailfree-cc.webp',
  '/games/battleship.html',
  '/games/bingo.html',
  '/games/blackjack.html',
  '/games/boggle.html',
  '/games/breakout.html',
  '/games/candymatch.html',
  '/games/checkers.html',
  '/games/scrabble.html',
  '/data/scrabble-words.js',
  '/games/chess.html',
  '/games/connectfour.html',
  '/games/conversation.html',
  '/games/craps.html',
  '/games/cribbage.html',
  '/games/crossword.html',
  '/games/crossyroad.html',
  '/games/crossyroad/world.js',
  '/games/crossyroad/scene.js',
  '/games/crossyroad/sfx.js',
  '/games/willycrash.html',
  '/games/willycrash/scene3d.js',
  '/games/crazytower.html',
  '/games/centipede.html',
  '/games/centipede-3d.js',
  '/games/centipede-audio.js',
  '/games/invaders.html',
  '/games/pressyourluck.html',
  '/games/pressyourluck/art.js',
  '/games/pressyourluck/sound.js',
  '/games/mazes.html',
  '/games/mazes/maze-core.js',
  '/online.js',
  '/turnnet.js',
  '/games/dealornodeal.html',
  '/games/dice-roller.html',
  '/games/dotsboxes.html',
  '/games/euchre-ai.html',
  '/games/euchre.html',
  '/games/five-crowns.html',
  '/games/fivecrownss-ai.html',
  '/games/flappybird.html',
  '/games/flip7-ai.html',
  '/games/flip7.html',
  '/games/freecell.html',
  '/games/gin-rummy-ai.html',
  '/games/gin-rummy.html',
  '/games/hangman.html',
  '/games/hearts-ai.html',
  '/games/hearts.html',
  '/games/lorcana.html',
  '/games/madlibs.html',
  '/games/mahjong.html',
  '/games/mahjong4.html',
  '/games/mancala.html',
  '/games/mathpuzzles.html',
  '/games/mysteries.html',
  '/data/mysteries-scene.js',
  '/data/mysteries-cases.js',
  '/data/mysteries-gen.js',
  '/games/logicgrid.html',
  '/games/truthlies.html',
  '/games/ciphers.html',
  '/data/ciphers-cases.js',
  '/games/riddles.html',
  '/games/memorymatch.html',
  '/games/minesweeper.html',
  '/games/minigolf.html',
  '/games/othello.html',
  '/games/chinesecheckers.html',
  '/data/words-en.js',
  '/data/riddles.js',
  '/data/riddles-pack-1.js',
  '/data/riddles-pack-2.js',
  '/data/riddles-pack-3.js',
  '/data/riddles-pack-4.js',
  '/games/marbles.html',
  '/games/codebreaker.html',
  '/games/slidepuzzle.html',
  '/games/horserace.html',
  '/games/dominoes.html',
  '/games/go.html',
  '/games/axisallies.html',
  '/games/lorcana-play.html',
  '/games/lorcana-stories.js',
  '/games/lorcana-inks.webp',
  '/games/sandlot.html',
  '/games/axisallies-score.html',
  '/games/marblesolitaire.html',
  '/games/farkle.html',
  '/games/lrc.html',
  '/games/fortune.html',
  '/games/fortune/cookie.js',
  '/games/fortune/cookie-fortunes.js',
  '/games/fortune/eightball.js',
  '/games/fortune/eightball/ball3d.js',
  '/games/fortune/oracle.js',
  '/games/fortune/oracle-fortunes.js',
  '/games/fortune/swami.js',
  '/games/fortune/swami-fortunes.js',
  '/games/fortune/swami/scene.js',
  '/games/fortune/swami/cabinet.js',
  '/games/fortune/swami/card.js',
  '/games/cubehopper.html',
  '/games/paddleball.html',
  '/games/jokerrun.html',
  '/games/jokerrun/engine.js',
  '/games/jokerrun/art.js',
  '/games/jokerrun/bg.js',
  '/games/jokerrun/ui.js',
  '/fonts/jersey-10.woff2',
  '/games/pacman.html',
  '/games/donkeykong.html',
  '/games/donkeykong-sounds.mp3',
  '/games/nes.html',
  '/games/snes.html',
  '/games/genesis.html',
  '/games/atari2600.html',
  '/img/consoles/nes.svg',
  '/img/consoles/snes.svg',
  '/img/consoles/genesis.svg',
  '/img/consoles/atari2600.svg',
  '/games/console.js',
  '/games/console-art.js',
  '/games/console-net.js',
  '/games/console-hi.js',
  '/console-lib.js',
  '/games/console.css',
  // the emulator (its cores are big; EmulatorJS keeps each one in its own storage after the first game)
  '/emu/loader.js',
  '/emu/emulator.min.js',
  '/emu/emulator.min.css',
  '/emu/compression/extract7z.js',
  '/emu/compression/extractzip.js',
  '/emu/cores/reports/fceumm.json',
  '/emu/cores/reports/snes9x.json',
  '/emu/cores/reports/genesis_plus_gx.json',
  '/emu/cores/reports/stella2014.json',
  '/games/paigow.html',
  '/games/peggle.html',
  '/games/pinball.html',
  '/games/pinball/engine.js',
  '/games/pinball/physics.js',
  '/games/pinball/components.js',
  '/games/pinball/gfx.js',
  '/games/pinball/audio.js',
  '/games/pinball/display.js',
  '/games/pinball/tables/stub.js',
  '/games/pinball/tables/haunted.js',
  '/games/pinball/tables/nebula.js',
  '/games/pinball/tables/pirate.js',
  '/games/pinball/tables/jungle.js',
  '/games/pinball/tables/neon.js',
  '/games/pinball/tables/midway.js',
  '/games/pinball/thumbs/haunted.webp',
  '/games/pinball/thumbs/nebula.webp',
  '/games/pinball/thumbs/pirate.webp',
  '/games/pinball/thumbs/jungle.webp',
  '/games/pinball/thumbs/neon.webp',
  '/games/pinball/thumbs/midway.webp',
  '/vendor/three/three.module.min.js',
  '/vendor/three/addons/postprocessing/EffectComposer.js',
  '/vendor/three/addons/postprocessing/RenderPass.js',
  '/vendor/three/addons/postprocessing/UnrealBloomPass.js',
  '/vendor/three/addons/postprocessing/OutputPass.js',
  '/vendor/three/addons/postprocessing/Pass.js',
  '/vendor/three/addons/postprocessing/ShaderPass.js',
  '/vendor/three/addons/postprocessing/MaskPass.js',
  '/vendor/three/addons/shaders/CopyShader.js',
  '/vendor/three/addons/shaders/LuminosityHighPassShader.js',
  '/vendor/three/addons/shaders/OutputShader.js',
  '/vendor/three/addons/utils/BufferGeometryUtils.js',
  '/games/phase10-ai.html',
  '/games/phase10.html',
  '/games/players.html',
  '/games/history.html',
  '/games/hiscores.html',
  '/hist-view.js',
  '/hist/board.js',
  '/hist/board2.js',
  '/hist/cards.js',
  '/hist/specialty.js',
  '/hist/dice.js',
  '/hist/party.js',
  '/hist/puzzle.js',
  '/hist/words.js',
  '/hist/casino.js',
  '/hist/arcade.js',
  '/hist/lorcana.js',
  '/fonts/press-start-2p.woff2',
  '/games/plinko.html',
  '/vendor/three/addons/postprocessing/AfterimagePass.js',
  '/vendor/three/addons/shaders/AfterimageShader.js',
  '/games/plinko/bigwheel3d.js',
  '/games/poker.html',
  '/games/pokersquares.html',
  '/games/pyramid.html',
  '/games/randomtools.html',
  '/games/ranker.html',
  '/games/riddlestories.html',
  '/games/rook-ai.html',
  '/games/rook.html',
  '/games/roulette.html',
  '/games/scorecard.html',
  '/games/shellgame.html',
  '/games/slots.html',
  '/games/slots/cabinet.js',
  '/games/slots/art.js',
  '/vendor/three/addons/geometries/RoundedBoxGeometry.js',
  '/vendor/three/addons/environments/RoomEnvironment.js',
  '/games/snake.html',
  '/games/solitaire.html',
  '/games/spades-ai.html',
  '/games/spades.html',
  '/games/spellingbee.html',
  '/games/sudoku.html',
  '/games/tetris.html',
  '/games/threecardpoker.html',
  '/games/tictactoe.html',
  '/games/trivia.html',
  '/data/trivia-questions.js',
  '/games/wheeloffortune.html',
  '/games/wizard-ai.html',
  '/games/wizard.html',
  '/games/wordle.html',
  '/games/wordscramble.html',
  '/games/wordsearch.html',
  '/games/wouldyourather.html',
  '/games/applestoapples.html',
  '/data/a2a-cards.js',
  '/data/cah-cards.js',
  '/games/yahtzee.html',
];

// Lorcana card art kept on the device for speed: the first pages of the card library and every card in a
// saved deck (the game sends the list), plus pictures as they're shown. Capped; past the limit the ones saved
// longest ago go first. Its own cache, so releases don't clear it. (Lorcast, or the copy on Google Cloud, serve the rest.)
const ART_CACHE = 'lorc-art-1';
const ART_MAX = 800;
let artPuts = 0;
function isArt(url) {
  return url.hostname === 'cards.lorcast.io' ||
    (url.hostname === 'firebasestorage.googleapis.com' && url.pathname.indexOf('/o/lorcana') >= 0);
}
function trimArt(cache, force) {
  // the worker is stopped when idle, so the count restarts often: trim on the first save after each start too
  if (!force && ++artPuts % 25 !== 1) return Promise.resolve();
  return cache.keys().then((keys) => Promise.all(keys.slice(0, Math.max(0, keys.length - ART_MAX)).map((k) => cache.delete(k))));
}
function artFetch(req) {
  return caches.open(ART_CACHE).then((cache) => cache.match(req.url).then((hit) => hit || fetch(req).then((resp) => {
    if (resp && (resp.ok || resp.type === 'opaque')) { const c = resp.clone(); cache.put(req.url, c).then(() => trimArt(cache)).catch(() => {}); }
    return resp;
  })));
}
// Fetch and keep a list of pictures, a few at a time (readable copies where the server allows, sealed ones otherwise)
function warmArt(urls) {
  return caches.open(ART_CACHE).then((cache) => {
    const q = urls.slice(0, ART_MAX);
    const one = () => {
      const u = q.shift(); if (!u) return Promise.resolve();
      return cache.match(u).then((hit) => hit ? null : fetch(u, { mode: 'cors', credentials: 'omit' })
        .catch(() => fetch(u, { mode: 'no-cors', credentials: 'omit' }))
        .then((resp) => { if (resp && (resp.ok || resp.type === 'opaque')) return cache.put(u, resp); }))
        .catch(() => {}).then(one);
    };
    return Promise.all([one(), one(), one(), one()]).then(() => trimArt(cache, true));
  });
}
// Console cartridge labels: kept on the device (each new label gets a new name, so a saved one never goes stale), so
// the shelves and home tiles show them offline. Its own cache, so releases don't clear it.
const CART_CACHE = 'cart-art-1';
function isCartArt(url) {
  if (url.hostname !== 'firebasestorage.googleapis.com') return false;
  let p = url.pathname; try { p = decodeURIComponent(p); } catch (e) {}
  return /\/o\/roms\/[0-9a-f]{32}\/label-[^/]+$/.test(p);
}
function cartArtFetch(req) {
  return caches.open(CART_CACHE).then((cache) => cache.match(req.url).then((hit) => hit || fetch(req).then((resp) => {
    if (resp && (resp.ok || resp.type === 'opaque')) { const c = resp.clone(); cache.put(req.url, c).catch(() => {}); }
    return resp;
  })));
}
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'lorc-warm' && Array.isArray(d.urls)) event.waitUntil(warmArt(d.urls.filter((u) => { try { return isArt(new URL(u)); } catch (e) { return false; } })));
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort parallel precache. A single 404 won't block install.
      // (cache: 'no-cache' checks each file with the server, a quick "not modified" when it hasn't changed, so this
      // release's cache holds this release's files without downloading everything again)
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'no-cache' })).catch((err) => {
            console.warn('[sw] precache failed for', url, err && err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          // (lorcana-art-*: card art used to be saved on the device; it's on Google Cloud now)
          .filter((n) => (n.startsWith('game-night-') && n !== CACHE_NAME) || n.startsWith('lorcana-art-'))
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // App icons and the manifest always come straight from the network (iOS reads them when adding to the
  // home screen; a cached or failed copy would leave a plain letter icon)
  if (url.origin === self.location.origin && /^\/(apple-touch-icon[^/]*|icon-\d+\.png|img\/home-icon-\d+\.png|favicon\.png|manifest\.json)$/.test(url.pathname)) return;

  // Background music: from the device once "Offline" in the menu has saved it (audio asks for byte ranges, so
  // those are cut from the saved file here), otherwise straight from the network
  if (url.origin === self.location.origin && url.pathname.startsWith('/music/')) {
    event.respondWith(caches.open(OFFLINE_CACHE).then((c) => c.match(url.pathname)).then((hit) => hit ? withRange(hit, req) : fetch(req)));
    return;
  }

  // Lorcana card art: from the device when we have it
  if (isArt(url)) { event.respondWith(artFetch(req)); return; }
  if (isCartArt(url)) { event.respondWith(cartArtFetch(req)); return; }

  // The Firebase code itself: a fixed version that never changes, so from the device once saved (sign-in
  // otherwise waits on downloading it again whenever the phone has cleared its browser cache)
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
      if (resp && (resp.status === 200 || resp.type === 'opaque')) { const c = resp.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, c).catch(() => {})); }
      return resp;
    })));
    return;
  }

  // Skip Firebase/Firestore/Google APIs — need fresh data
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('gstatic.com/firebasejs') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit')
  ) {
    return;
  }

  // Cross-origin fonts + cloudflare CDN are cacheable; other cross-origin
  // requests pass through to the network untouched.
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes('fonts.googleapis.com') &&
    !url.hostname.includes('fonts.gstatic.com') &&
    !url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  // Fonts and CDN files never change: cache first.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        if (resp && (resp.status === 200 || resp.type === 'opaque')) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone).catch(() => {}));
        }
        return resp;
      }))
    );
    return;
  }

  // Sounds, pictures, fonts and bundled libraries: from the device once saved. Each release starts a fresh cache,
  // so a changed file still arrives with the next release (no re-checking ~40 sound files on every page).
  if (url.origin === self.location.origin && (/^\/(sounds|img|vendor)\//.test(url.pathname) || /\.(mp3|ogg|wav|png|jpe?g|webp|gif|svg|woff2?|glb|gltf|ktx2|hdr)$/i.test(url.pathname))) {
    event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(req).then((hit) => hit || offlineHit(req)).then((hit) => hit || fetch(req).then((resp) => {
      if (resp && resp.status === 200) caches.open(CACHE_NAME).then((cache) => cache.put(req, resp.clone())).catch(() => {});
      return resp;
    }))));
    return;
  }

  // Our own pages and code: straight from this release's cache, saved when the release installed. Waiting on the
  // network first (up to 3.5 s on a slow connection) made going home or opening a game take seconds on the iPad.
  // A new release still arrives: it installs its own cache, takes over, and the home screen reloads onto it.
  // Files the release didn't save (or a cache that lost them) come from the network, falling back to any copy.
  // (preview channels and local testing change files without a new release number: they stay network first)
  if (PREVIEW) { event.respondWith(netFirst(req)); return; }
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(req, { ignoreSearch: true })).then((hit) => hit || netFirst(req))
  );
});

function netFirst(req) {
  return (
    new Promise((resolve) => {
      let settled = false;
      const fromCache = () => caches.match(req, { ignoreSearch: true }).then((c) => c);
      const timer = setTimeout(() => {
        fromCache().then((c) => { if (c && !settled) { settled = true; resolve(c); } });
      }, 3500);
      // no-cache: always ask the server (a quick "not modified" when nothing changed),
      // so the browser's own cache can't hold back a new release
      fetch(req, { cache: 'no-cache' })
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type !== 'opaqueredirect') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone).catch(() => {}));
          }
          clearTimeout(timer);
          if (!settled) { settled = true; resolve(resp); }
        })
        .catch(() => {
          clearTimeout(timer);
          fromCache().then((c) => { if (!settled) { settled = true; resolve(c || Response.error()); } });
        });
    })
  );
}

// ── Ready for offline ("Offline" in the menu, before a flight) ─────────────────────────────────────────
// Every release already saves the app itself. This also saves everything else the site serves that a game can use
// (offline-files.json: music, crossword puzzles, the Sandlot stats, the 3D library...) in its own cache, which
// stays through updates; running it again refreshes it. It reports progress back over the message port.
const OFFLINE_CACHE = 'gn-offline';
function offlineHit(req) { return caches.open(OFFLINE_CACHE).then((c) => c.match(req, { ignoreSearch: true })); }
async function withRange(resp, req) {
  const range = req.headers.get('range');
  if (!range) return resp;
  const buf = await resp.arrayBuffer(), len = buf.byteLength, m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : len - 1;
  if (!m[1] && m[2]) { start = Math.max(0, len - +m[2]); end = len - 1; }
  end = Math.min(end, len - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + len } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg', 'Content-Length': String(end - start + 1),
    'Content-Range': 'bytes ' + start + '-' + end + '/' + len, 'Accept-Ranges': 'bytes' } });
}
async function offlineStatus() {
  const c = await caches.open(OFFLINE_CACHE), m = await c.match('/__offline-meta');
  return { meta: m ? await m.json() : null, version: CACHE_VERSION };
}
async function offlinePrep(say) {
  const rel = await caches.open(CACHE_NAME), off = await caches.open(OFFLINE_CACHE);
  const lr = await fetch('/offline-files.json', { cache: 'no-cache' });
  if (!lr.ok) throw new Error('offline list ' + lr.status);
  const list = await lr.json(), jobs = [];
  // anything of this release's own that didn't save when it installed, then the rest
  for (const u of PRECACHE_URLS) if (!(await rel.match(u, { ignoreSearch: true }))) jobs.push({ u, c: rel, s: 0 });
  list.files.forEach((f) => jobs.push({ u: f[0], c: off, s: f[1] }));
  let i = 0, n = 0, bytes = 0, failed = 0;
  const all = jobs.reduce((t, j) => t + j.s, 0);
  async function worker() {
    while (i < jobs.length) {
      const j = jobs[i++];
      try {
        const r = await fetch(new Request(j.u, { cache: 'no-cache' }));
        if (!r.ok) throw new Error(r.status);
        await j.c.put(j.u, r); bytes += j.s;
      } catch (e) { failed++; }
      n++; say({ n, total: jobs.length, bytes, all });
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  // files the app no longer has
  const keep = new Set(list.files.map((f) => f[0]).concat(['/__offline-meta']));
  for (const k of await off.keys()) if (!keep.has(new URL(k.url).pathname)) await off.delete(k);
  const meta = { at: Date.now(), files: list.files.length, bytes, failed, version: CACHE_VERSION };
  await off.put('/__offline-meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  return { meta, version: CACHE_VERSION };
}
self.addEventListener('message', (event) => {
  const d = event.data || {}, port = event.ports && event.ports[0];
  if (!port) return;
  if (d.type === 'offline-status') event.waitUntil(offlineStatus().then((r) => port.postMessage(r)));
  if (d.type === 'offline-prep') event.waitUntil(offlinePrep((p) => port.postMessage(p)).then(
    (r) => port.postMessage(Object.assign({ done: true }, r)), (e) => port.postMessage({ error: String((e && e.message) || e) })));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((n) => {
        if (n.startsWith('game-night-')) caches.delete(n);
      });
    });
  }
});
