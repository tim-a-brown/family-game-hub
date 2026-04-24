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

const CACHE_VERSION = 'v6-2026-04-24-favs-timestamp';
const CACHE_NAME = 'game-night-' + CACHE_VERSION;

// Shell assets + every game HTML. Maintained manually; bump CACHE_VERSION
// when this list changes so users get the new precache pass.
const PRECACHE_URLS = [
  // Shell
  '/',
  '/index.html',
  '/gate.html',
  '/shared.css',
  '/sync.js',
  '/hist.js',
  '/players.js',
  '/casino.js',
  '/arcade-hi.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
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
  '/games/card-scoring.html',
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
          .filter((n) => n.startsWith('game-night-') && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

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

  event.respondWith(
    caches.match(req).then((cached) => {
      // Stale-while-revalidate: serve cached instantly, refresh in background.
      const networkFetch = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type !== 'opaqueredirect') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clone).catch(() => {});
            });
          }
          return resp;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
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
