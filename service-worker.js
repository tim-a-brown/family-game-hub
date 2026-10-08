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

const CACHE_VERSION = 'v354-2026-10-08-soft-swipe';
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
  '/kit.js',
  '/spin.js',
  '/games.js',
  '/game-icons.js',
  '/diag.js',
  '/data/wordle-words.js',
  '/fonts/lilita-one.woff2',
  '/fonts/patrick-hand.woff2',
  '/fonts/great-vibes.woff2',
  '/fonts/bungee.woff2',
  '/fonts/sofia-sans-condensed.woff2',
  '/fonts/sofia-sans.woff2',
  '/fonts/pagella-400.woff2',
  '/fonts/pagella-400italic.woff2',
  '/fonts/pagella-700.woff2',
  '/fonts/pagella-700italic.woff2',
  '/app.js',
  '/sync.js',
  '/hist.js',
  '/players.js',
  '/casino.js',
  '/arcade-hi.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
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
  '/games/battleship.html',
  '/games/bingo.html',
  '/games/blackjack.html',
  '/games/boggle.html',
  '/games/breakout.html',
  '/games/checkers.html',
  '/games/chess.html',
  '/games/connectfour.html',
  '/games/conversation.html',
  '/games/craps.html',
  '/games/cribbage.html',
  '/games/crossword.html',
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
  '/games/memorymatch.html',
  '/games/minesweeper.html',
  '/games/minigolf.html',
  '/games/othello.html',
  '/games/chinesecheckers.html',
  '/data/words-en.js',
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
  '/games/cubehopper.html',
  '/games/paddleball.html',
  '/games/jokerrun.html',
  '/games/pacman.html',
  '/games/paigow.html',
  '/games/peggle.html',
  '/games/phase10-ai.html',
  '/games/phase10.html',
  '/games/players.html',
  '/games/plinko.html',
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
  '/games/wheeloffortune.html',
  '/games/wizard-ai.html',
  '/games/wizard.html',
  '/games/wordle.html',
  '/games/wordscramble.html',
  '/games/wordsearch.html',
  '/games/wouldyourather.html',
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
  if (!force && ++artPuts % 25) return Promise.resolve();
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
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'lorc-warm' && Array.isArray(d.urls)) event.waitUntil(warmArt(d.urls.filter((u) => { try { return isArt(new URL(u)); } catch (e) { return false; } })));
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort parallel precache. A single 404 won't block install.
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
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

  // Lorcana card art: from the device when we have it
  if (isArt(url)) { event.respondWith(artFetch(req)); return; }

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

  // Our own pages and code: network first so releases show up immediately,
  // falling back to the cached copy when offline or the network is slow.
  event.respondWith(
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
