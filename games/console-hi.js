// ═══════════════════════════════════════════════════════════════════════════
// Console high scores: the console games that keep a score, where each keeps it in the console's memory, and
// when a game is really being played (not the attract demo, which plays itself and often scores).
//
// Each game in GAMES: key (its board is ArcadeHi 'console_<key>', synced as hi_console_<key>), name, sys, ids (the
// SHA-1 of the game files checked, the cartridge ids), re (a name the game goes by, for another copy of it),
// score(m) -> the score shown on screen (null when the memory doesn't hold a sensible one), play(m) -> a game is
// under way (not the title, the demo or game over), over(m) -> the game-over screen. m(address) reads a byte at
// the console's own address: NES $0000-$07FF, SNES $7E0000-$7FFFFF, Genesis $FF0000-$FFFFFF, Atari 2600 $80-$FF.
// Each one was checked by playing the game and reading the score off the screen against what's read here.
//
// Reading the memory: EmulatorJS has no way to read it, so once per game the console's work RAM is found inside
// the emulator's own memory (Module.HEAPU8): a save state holds a copy of the RAM; that copy is looked for in the
// heap, and the place that still matches a second save state a moment later is the live RAM. From then on a
// score is a few bytes read straight from there (about once a second).
//
// ConsoleHi.watch({...}) follows a game being played (console.js); ConsoleHi.boards() lists the boards the High
// Scores page shows (games on the shelf, on the home screen, with a score here).
// ═══════════════════════════════════════════════════════════════════════════
var ConsoleHi = (function () {
  'use strict';

  // ── Reading numbers out of memory ──
  // one decimal digit per byte, most significant first (null if a byte isn't a digit)
  function digits(m, a, n) { var v = 0; for (var i = 0; i < n; i++) { var d = m(a + i); if (d > 9) return null; v = v * 10 + d; } return v; }
  // packed BCD, most significant byte first (null on a nibble over 9)
  function bcd(m, a, n) { var v = 0; for (var i = 0; i < n; i++) { var b = m(a + i), hi = b >> 4, lo = b & 15; if (hi > 9 || lo > 9) return null; v = v * 100 + hi * 10 + lo; } return v; }
  function bcdLE(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) { var b = m(a + i), hi = b >> 4, lo = b & 15; if (hi > 9 || lo > 9) return null; v = v * 100 + hi * 10 + lo; } return v; }
  function be(m, a, n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + m(a + i); return v; }
  function le(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) v = v * 256 + m(a + i); return v; }
  // one digit a byte, least significant first
  function digitsLE(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) { var d = m(a + i); if (d > 9) return null; v = v * 10 + d; } return v; }
  function x10(v) { return v == null ? null : v * 10; }

  // Sonic games: game mode $FFF600 (bit 7 set while a stage loads): $00 Sega screen, $04 title, $08 the demo (which
  // scores), then levels ($0C), special stages, continue and ending screens are all a game under way
  function sonicPlay(m) { var md = m(0xFFF600) & 0x7F; return md !== 0 && md !== 0x04 && md !== 0x08; }

  // Options: down (the score can go down: the one at the end counts), reset (the score starts again within a game,
  // each fight: the best one counts), clock(m) (seconds played: going back means a new game; stopping means it's over),
  // rev (the board was reset when its reader was fixed: sync.js HI_RESET drops rows filed before).
  // Two players, each with their own score: scores(m) -> every player's score (all readable at once: each one's best is
  // offered to the board at the game over), or who(m) -> which player's score score(m) is showing (the screen shows
  // whoever is up: each player's best is kept while they're up, and offered when that player's game is over, the others
  // playing on); names: what to call them on the board's moment ('Mario', 'Luigi').
  // A score is filed only at the game's own game over, over(m), checked against the real game: once per game, with
  // the best score the game reached, while the game is paused. A game with no checked over() files nothing (no prompt,
  // no score) until one is worked out: a score that goes down or a trip back to the title is not taken as the end.
  // Without play(), any time counts (games with no demo that scores).
  var GAMES = [
    // ── NES ──
    // Mario's score: a digit a byte at $07DD-$07E2 (Luigi's at $07E3-$07E8), the screen adding a 0 (100 points reads
    // 0,0,0,0,1,0; the millions digit is drawn once reached). 2 players: both scores are kept, and each player's goes
    // to the board at the game over (both start at 0 every game, continue included). OperMode $0770: 0 title and demo (scores
    // nothing), 1 playing, 2 the castle after an axe, 3 game over. Over: the last game over (1 player, or the other
    // player's lives $0761 below 0: in 2 players the first one out shows GAME OVER and the other plays on), or World 8's
    // PUSH BUTTON B (OperMode 2, task $0772 4, world $075F 7), after which the game goes to the title without a game
    // over. (Checked 2026-11-01: the screen at 200, 1,500, 100,000 and 1,000,000; 1- and 2-player games; the ending.)
    { key: 'smb', short: 'MARIO', name: 'Super Mario Bros.', sys: 'nes', ids: ['ea343f4e445a9050d4b4fbac2c77d0693b1d0922'], re: /^super mario bros\.?$/,
      score: function (m) { var a = digits(m, 0x7DD, 6), b = digits(m, 0x7E3, 6); return a == null || b == null ? null : Math.max(a, b) * 10; },
      scores: function (m) { var a = digits(m, 0x7DD, 6), b = digits(m, 0x7E3, 6); return [a == null ? null : a * 10, b == null ? null : b * 10]; }, names: ['Mario', 'Luigi'],
      play: function (m) { return m(0x770) === 1 || m(0x770) === 2; },
      over: function (m) { var o = m(0x770); return (o === 3 && (m(0x77A) === 0 || m(0x761) > 0x7F)) || (o === 2 && m(0x772) === 4 && m(0x75F) === 7); } },
    // 3 bytes at $0715 (high first), the screen adding a 0: the score of whoever is up ($0726; 2 players: each keeps
    // their own, swapped in on the map, so each one's best is kept while they're up and filed at their own game over). No demo. Over: the player up has lives ($0736 + $0726) at $FF, from losing the last life
    // through the GAME OVER CONTINUE/END box (CONTINUE starts the score again at 0, so each game over files), or THE END
    // after the credits (its sprites at $0200 with CHR bank $071E $1B), which waits for Start. (Checked 2026-11-01
    // against the screen, 100 to 1,000,090; game over, continue, end, and the ending.)
    { key: 'smb3', short: 'MARIO 3', name: 'Super Mario Bros. 3', sys: 'nes', ids: ['6bd518e85eb46a4252af07910f61036e84b020d1'], re: /^super mario bros\.? 3$/,
      score: function (m) { return be(m, 0x715, 3) * 10; }, who: function (m) { return m(0x726) & 1; }, names: ['Mario', 'Luigi'],
      over: function (m) { return m(0x736 + (m(0x726) & 1)) === 0xFF || (m(0x200) === 0x60 && m(0x201) === 0xF1 && m(0x21D) === 0xFF && m(0x21F) === 0x98 && m(0x71E) === 0x1B); } },
    // The money: TOTAL MONEY (8 characters at $0334-$033B, $24 a blank: what's banked when a land is cleared, and what the
    // ending shows) plus this land's money (7 at $0324-$032A, the HUD's $, back to 0 each land), left out once the land is
    // over ($5D) or the final tally began ($AC bit 7: both add it into TOTAL without clearing it). Can go down (payments of
    // 300,000). No demo. Over: GAME OVER in the HUD (sprites at $0140: G A M ... V R), or the ending ($AC bit 7, $F6 9),
    // which stays on "End.". (Checked 2026-11-01 against the HUD, the LAND CLEAR tally and the ending's TOTAL MONEY. An
    // earlier reader took only this land's money: rev 2.)
    { key: 'ducktales', short: 'DUCKTALES', name: 'DuckTales', sys: 'nes', ids: ['4b5720bc6e0590c9372cfbd0c418f8efd4d0c96d'], re: /^duck ?tales$/, down: 1, rev: 2,
      score: function (m) { function f(a, n) { var v = 0; for (var i = 0; i < n; i++) { var d = m(a + i); if (d === 0x24) d = 0; else if (d > 9) return null; v = v * 10 + d; } return v; } var t = f(0x334, 8), c = f(0x324, 7); return t == null || c == null ? null : t + (m(0x5D) || (m(0xAC) & 0x80) ? 0 : c); },
      over: function (m) { return (m(0x141) === 0x10 && m(0x145) === 0x0A && m(0x149) === 0x16 && m(0x155) === 0x1F && m(0x15D) === 0x1B) || ((m(0xAC) & 0x80) && m(0xF6) === 9); } },
    // seven digits a byte at $0108-$010E
    { key: 'ikari', short: 'IKARI', name: 'Ikari Warriors', sys: 'nes', ids: ['6eadbbe4c2a1f7ede2978f149b63270c72db281f'], re: /^ikari warriors$/,
      score: function (m) { return digits(m, 0x108, 7); } },
    // seven digits a byte at $0072-$0078, the ones first
    { key: 'megaman', short: 'MEGA MAN', name: 'Mega Man', sys: 'nes', ids: ['2f88381557339a14c20428455f6991c1eb902c99'], re: /^mega ?man$/,
      score: function (m) { return digitsLE(m, 0x72, 7); } },
    // points: six digits a byte at $03E8, starting again each fight (the best fight counts); $0006 is 1 in a game
    { key: 'punchout', short: 'PUNCH-OUT', name: 'Mike Tyson’s Punch-Out!!', sys: 'nes', ids: ['0f0c2c2e294ff8ce255a618964728c935fd8963b'], re: /^(mike tysons )?punch-?out!*$/, reset: 1,
      score: function (m) { return digits(m, 0x3E8, 6); }, play: function (m) { return m(0x06) === 1; } },
    // ── Super Nintendo ──
    // Mario's score: 3 bytes at $7E0F34 (low first), the screen adding a 0. Game mode $7E0100: $07 the title, where
    // the demo plays (and scores); $0B on: the map, levels and the screens between
    { key: 'smw', short: 'MARIO WORLD', name: 'Super Mario World', sys: 'snes', ids: ['6b47bb75d16514b6a476aa0c73a683a2a4c18765'], re: /^super mario world$/,
      score: function (m) { return le(m, 0x7E0F34, 3) * 10; }, play: function (m) { return m(0x7E0100) >= 0x0B; } },
    // Player 1's score: packed decimal in hundreds, low byte first, at $7E0703-$7E0705 (10,300 is $03 $01 $00). The
    // screen shows it with one more digit after it, the number of continues (79,900 after two continues reads 79902).
    // The score carries on through a continue. $7E0030 is 0 in a game, 2 or 3 in the attract demo and on the title.
    // Game over: the routine word at $7E0072 is $7D74 on the continue / game over screen, and the score is cleared to 0
    // at the moment the game is really over (a continue keeps it), so the game's score is the best it reached.
    // (Checked 2026-11-01 by playing it in the emulator: score against the screen through rounds, a continue, and three
    // game overs. An earlier reader took $7E0700-$7E0703 the other way round and so read junk above 9,900 points.)
    { key: 'ssf2', short: 'SF II', name: 'Super Street Fighter II', sys: 'snes', ids: ['8e67787988024503c4adeadd5fe50a340aa860d7'], re: /^super street fighter ii/, rev: 2,
      score: function (m) { var v = bcdLE(m, 0x7E0703, 3); return v == null ? null : v * 100; }, play: function (m) { return m(0x7E0030) === 0; },
      over: function (m) { return (m(0x7E0072) | (m(0x7E0073) << 8)) === 0x7D74 && m(0x7E0703) === 0 && m(0x7E0704) === 0 && m(0x7E0705) === 0; } },
    // six digits a byte at $7E0B34, the ones first, the screen adding a 0; starting again each fight (the best counts)
    { key: 'superpunchout', short: 'SUPER PUNCH', name: 'Super Punch-Out!!', sys: 'snes', ids: ['3604c855790f37db567e9b425252625045f86697'], re: /^super punch-?out!*$/, reset: 1,
      score: function (m) { return x10(digitsLE(m, 0x7E0B34, 6)); } },
    // 4 bytes at $7E8949 (low first). $7E5F2E is 1 while the demo plays (it scores)
    { key: 'wolf3d', short: 'WOLF 3D', name: 'Wolfenstein 3D', sys: 'snes', ids: ['88fe872eb984af84f8ca7633ef5bd3904a2baeb4'], re: /^wolfenstein 3-?d$/,
      score: function (m) { return le(m, 0x7E8949, 4); }, play: function (m) { return m(0x7E5F2E) === 0; } },
    // ── Genesis ──
    // 4 bytes at $FFFE26, the screen adding a 0
    { key: 'sonic', short: 'SONIC', name: 'Sonic the Hedgehog', sys: 'genesis', ids: ['6ddb7de1e17e7f6cdb88927bd906352030daa194'], re: /^sonic the hedgehog$/,
      score: function (m) { return be(m, 0xFFFE26, 4) * 10; }, play: sonicPlay },
    { key: 'sonic2', short: 'SONIC 2', name: 'Sonic the Hedgehog 2', sys: 'genesis', ids: ['8bca5dcef1af3e00098666fd892dc1c2a76333f9'], re: /^sonic the hedgehog 2$/,
      score: function (m) { return be(m, 0xFFFE26, 4) * 10; }, play: sonicPlay },
    // 4 bytes at $FFF22C. $FFF283 is 1 while the demo plays (it starts with 50,000)
    { key: 'castleofillusion', short: 'MICKEY', name: 'Castle of Illusion', sys: 'genesis', ids: ['4ac3687634a5acc55ac7f156c6de9749158713e4'], re: /castle of illusion/,
      score: function (m) { return be(m, 0xFFF22C, 4); }, play: function (m) { return m(0xFFF283) === 0; } },
    // ── Atari 2600 ──
    // packed decimal at $D5-$D7, starting at 2,000 and going down as well as up: the score at the end counts. The
    // 20-minute clock ($D8 minutes, $D9 seconds) starts with the game. $9E is 0 only while Harry is in play (set on the
    // title, while he dies, at 0:00 and when all 32 treasures are taken, $F1 below 0); $80 is the spare-lives picture
    // ($A0, $80, 0: no Harry comes back after a death at 0). (Checked 2026-11-01 in the emulator: the score against the
    // screen, to 114,000; out of lives, the clock at 0:00 and the last treasure each end it; a death with lives left doesn't.)
    { key: 'pitfall', short: 'PITFALL', name: 'Pitfall!', sys: 'atari2600', ids: ['8d525480445d48cc48460dc666ebad78c8fb7b73'], re: /^pitfall!?$/, down: 1,
      score: function (m) { return bcd(m, 0xD5, 3); },
      clock: function (m) { var t = bcd(m, 0xD8, 2); return t == null ? null : 1200 - (Math.floor(t / 100) * 60 + t % 100); },
      play: function (m) { var t = bcd(m, 0xD8, 2); return t != null && t !== 2000; },
      over: function (m) { return m(0x9E) !== 0 && (m(0x80) === 0 || (m(0xD8) === 0 && m(0xD9) === 0) || m(0xF1) === 0xFF); } },
    // packed decimal at $83-$85, the low byte first (points are added at $83; a carry into $85 is the extra man at
    // 10,000); the screen's last digit is always 0. $98 bit 7: the title, the demo (which doesn't score) and after a
    // game. Game over: $98 bit 7 with a score still held (a new game clears it): out of men, the bonus timer run out,
    // or Game Select pressed in a game (the cartridge ends the game then too). (Checked 2026-11-01 in the emulator:
    // the screen against the read, 10,000 reached in play; out of men and the timer both end it; the demo and Reset
    // file nothing. An earlier reader took $83 as the high byte, so scores of 10,000 and up were wrong: rev 2.)
    { key: 'junglehunt', short: 'JUNGLE HUNT', name: 'Jungle Hunt', sys: 'atari2600', ids: ['83a32a2d686355438c915540cfe0bb13b76c1113'], re: /^jungle hunt$/, rev: 2,
      score: function (m) { var v = bcdLE(m, 0x83, 3); return v == null ? null : v - v % 10; },
      play: function (m) { return (m(0x98) & 0x80) === 0; },
      over: function (m) { return (m(0x98) & 0x80) !== 0 && (m(0x83) | m(0x84) | m(0x85)) !== 0; } },
    // packed decimal at $DF-$E1, low byte first; the screen shows it to the ten (its last digit always 0). $FF bit 6: the
    // title and a finished game. A game ends when the time ($DC) runs out, in qualifying or the race, or when the race's
    // laps are done; the time left and $E2 are then counted into the score ($EB is $FF once the counting has started),
    // so play runs on until it's done and the score at the end counts. After a full race the screen takes turns showing
    // the race time in the score's place ($FF bit 5; the score is then at $E8/$EC, one digit up). (Checked 2026-11-01 in
    // the emulator: the screen against the read; qualifying time-out, race finish and race time-out each filed once.)
    { key: 'poleposition', short: 'POLE POS.', name: 'Pole Position', sys: 'atari2600', ids: ['9d334da07352a9399cbbd9b41c6923232d0cdcd3'], re: /^pole position$/, down: 1,
      score: function (m) { var v = m(0xFF) & 0x20 ? bcd(m, 0xE8, 1) * 1000 + bcd(m, 0xEC, 1) * 10 : bcdLE(m, 0xDF, 3); return v == null ? null : v - v % 10; },
      play: function (m) { return !(m(0xFF) & 0x40) || m(0xDC) !== 0 || m(0xE2) !== 0 || m(0xEB) !== 0xFF; },
      over: function (m) { return (m(0xFF) & 0x40) !== 0 && m(0xDC) === 0 && m(0xE2) === 0 && m(0xEB) === 0xFF && (m(0xDF) | m(0xE0) | m(0xE1)) !== 0; } }
  ];

  // ── Which game a cartridge is ──
  function norm(s) { return String(s || '').toLowerCase().replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/[’']/g, '').replace(/\s+/g, ' ').trim(); }
  function mapFor(c) {
    if (!c) return null;
    var id = String(c.id || '').toLowerCase(), n = norm(c.name);
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].ids.indexOf(id) >= 0) return GAMES[i];
    for (i = 0; i < GAMES.length; i++) if (GAMES[i].sys === c.sys && GAMES[i].re && GAMES[i].re.test(n)) return GAMES[i];
    return null;
  }
  function keyOf(g) { return 'console_' + g.key; }
  // the boards read with the game's own name
  function label() { if (typeof ArcadeHi === 'undefined') return; GAMES.forEach(function (g) { ArcadeHi.config(keyOf(g), { title: g.name }); }); }

  // ── Finding the console's RAM in the emulator's memory ──
  // where the RAM sits in each core's save state, and how big it is
  var CORE = {
    nes: { at: function (s) { var i = find(s, [82, 65, 77, 0, 0, 8, 0, 0]); return i < 0 ? -1 : i + 8; }, n: 0x800, addr: function (a) { return a & 0x7FF; } },   // fceumm: 'RAM\0', size
    snes: { at: function (s) { var i = find(s, str('RAM:131072:')); return i < 0 ? -1 : i + 11; }, n: 0x20000, addr: function (a) { return a & 0x1FFFF; } },   // snes9x's RAM block
    genesis: { at: function (s) { var i = find(s, str('GENPLUS-GX')); return i < 0 ? -1 : i + 16; }, n: 0x10000, addr: function (a) { return (a & 0xFFFF) ^ 1; } },   // after the 16-byte header; kept as little-endian words
    atari2600: { at: function (s) { var i = find(s, str('M6532')); return i < 0 ? -1 : i + 5; }, n: 128, addr: function (a) { return a & 0x7F; } }   // the RIOT's 128 bytes
  };
  function str(t) { var a = []; for (var i = 0; i < t.length; i++) a.push(t.charCodeAt(i)); return a; }
  function find(s, p) {
    var first = p[0], i = -1, lim = s.length - p.length;
    while ((i = s.indexOf(first, i + 1)) >= 0 && i <= lim) { var ok = true; for (var j = 1; j < p.length; j++) if (s[i + j] !== p[j]) { ok = false; break; } if (ok) return i; }
    return -1;
  }
  // the save state's copy of the RAM: {ram, ptr, size} (ptr/size: where the state itself sits in the heap)
  function stateRam(E, sys) {
    var info = String(E.gameManager.functions.saveStateInfo()).split('|');
    if (info[2] !== '1') return null;
    var size = +info[0], ptr = +info[1], H = E.Module.HEAPU8, s = H.subarray(ptr, ptr + size), at = CORE[sys].at(s);
    if (at < 0) return null;
    return { ram: s.slice(at, at + CORE[sys].n), ptr: ptr, size: size };
  }
  function same(H, base, ram) { if (base < 0 || base + ram.length > H.length) return false; for (var j = 0; j < ram.length; j++) if (H[base + j] !== ram[j]) return false; return true; }
  function cacheGet(sys) { try { return (JSON.parse(localStorage.getItem('gn_con_ram') || '{}') || {})[sys]; } catch (e) { return null; } }
  function cacheSet(sys, v) { try { var o = JSON.parse(localStorage.getItem('gn_con_ram') || '{}') || {}; o[sys] = v; localStorage.setItem('gn_con_ram', JSON.stringify(o)); } catch (e) {} }
  // every place in the heap holding exactly this RAM (not the state's own copy): the low 32 MB first, where the
  // cores keep it, then the rest only if need be
  function scan(E, st) {
    var H = E.Module.HEAPU8, ram = st.ram, n = ram.length, best = -1, bw = 0, lim = Math.min(H.length, 32 << 20);
    // the search walks the heap from one byte value to the next, so it starts from a byte that's rare there (counted
    // on a sample), in a stretch of RAM varied enough to be found in one place only
    var freq = new Uint32Array(256); for (var f = 0; f < lim; f += 61) freq[H[f]]++;
    for (var w = 0; w + 16 <= n; w += 2) {
      var seen = {}, k = 0; for (var q = 0; q < 16; q++) if (!seen[ram[w + q]]) { seen[ram[w + q]] = 1; k++; }
      if (k < 8) continue;
      var sc = 1e9 - freq[ram[w]]; if (sc > best) { best = sc; bw = w; }
    }
    if (best < 0) return null;   // (the RAM is still nearly blank: try again in a moment)
    var out = [];
    function pass(from, to) {
      var b0 = ram[bw], V = H.subarray(0, Math.min(H.length, to + 16)), i = from - 1;   // (a view ending at 'to': indexOf stops there)
      while ((i = V.indexOf(b0, i + 1)) >= 0 && i < to) {
        if (i >= st.ptr && i < st.ptr + st.size) { i = st.ptr + st.size - 1; continue; }
        var ok = true; for (var j = 1; j < 16; j++) if (H[i + j] !== ram[bw + j]) { ok = false; break; }
        if (ok && same(H, i - bw, ram)) out.push(i - bw);
      }
    }
    pass(0, Math.min(H.length, 32 << 20));
    if (!out.length) pass(32 << 20, H.length);
    return out;
  }

  // ── Following a game being played ──
  // o: {cart, sys, emu() -> EmulatorJS or null, live() -> the game is running, skip() -> don't follow now (online),
  //     onEnd(key, score, game, why) -> a finished game's score to file (its initials are asked there)}
  function watch(o) {
    var g = mapFor(o.cart); if (!g || !CORE[o.sys] || !g.over) return null;   // (no checked game over: no high scores)
    var C = CORE[o.sys], base = -1, cand = null, live = null, tries = 0, bad = 0, t = 0, since = Date.now(), lastIn = 0, cached = cacheGet(o.sys);
    var run = null, offT = 0, passed = false, top = null, hold = null;
    try { top = typeof ArcadeHi !== 'undefined' ? ArcadeHi.top(keyOf(g)) : null; } catch (e) {}
    function heap() { var E = o.emu(); return E && E.Module && E.Module.HEAPU8; }
    function mem(H) { return function (a) { return H[base + C.addr(a)]; }; }
    // find the RAM: a cached place or a scan, then a second save state picks the live copy
    // (some cores keep copies of the RAM that every save state refreshes, so they match each state as well as the
    // live RAM does: the live one is the place that has moved on a second later, with no save state in between)
    function locate(E) {
      if (Date.now() - since < 2500) return;   // (the game sets its RAM up first)
      var H = E.Module.HEAPU8;
      if (live) {
        var moved = live.list.filter(function (b) { return !same(H, b, live.ram); });
        live = null;
        if (moved.length === 1) { base = moved[0]; cacheSet(o.sys, base); return; }
      }
      var st; try { st = stateRam(E, o.sys); } catch (e) { return; }
      if (!st) return;
      H = E.Module.HEAPU8;
      if (cand) {
        var ok = cand.filter(function (b) { return same(H, b, st.ram); });
        cand = null;
        if (ok.length) { live = { list: ok, ram: st.ram.slice() }; return; }
      }
      if (cached != null && same(H, cached, st.ram)) { cand = [cached]; cached = null; return; }   // (confirmed by the next state, like a scan)
      cached = null;
      if (++tries > 12) return;
      cand = scan(E, st);
      if (cand && !cand.length) cand = null;
    }
    function tick(force) {
      var E = o.emu();
      if (!E || !o.live() || (o.skip && o.skip()) || (E.paused && !force)) return;   // (paused: the menu is open)
      if (base < 0) { locate(E); return; }
      var H = heap(), m = mem(H), s, on, over, clk = null;
      try { s = g.score(m); on = g.play ? !!g.play(m) : true; over = !!(g.over && g.over(m)); if (g.clock) clk = g.clock(m); } catch (e) { s = null; }
      if (s == null || !isFinite(s)) { if (++bad > 8) { base = -1; bad = 0; since = Date.now(); } return; }   // (moved, or not this game: look again)
      bad = 0;
      if (!run) run = fresh(s, clk);
      var w = g.who ? g.who(m) : 0, all = g.scores ? g.scores(m) : null;
      // the game's own game over: the one moment a game's score is filed (once: the run starts again unearned)
      if (over) {
        // (the screen shows whoever is up: that player's game is over, and anyone else plays on)
        if (g.who) { if (run.earned && !run.pf[w]) { run.pf[w] = 1; var v = Math.max(run.pb[w] || 0, s); run.pb[w] = 0; if (v > 0) send(v, label(w)); } return; }
        if (run.earned) { if (g.down) run.last = s; hold = g.clock ? { s: scoreOf(run), clk: clk } : scoreOf(run); end('over'); }
        run = fresh(s, clk); return;
      }
      if (on) {
        offT = 0;
        // a new game without a game over (Reset, or a saved state loaded): start again, filing nothing (not when the
        // turn has just passed to the other player, whose score can be lower)
        if (g.clock ? clk != null && run.clk != null && clk < run.clk : !g.down && !g.reset && s < run.last && s === 0 && !(g.who && w !== run.w)) { run = fresh(s, clk); }
        if (g.who) { if (run.pf[w] && s === 0) run.pf[w] = 0; if (!run.pf[w] && s > (run.pb[w] || 0)) run.pb[w] = s; run.w = w; }   // (a continue: that player starts again)
        if (all) all.forEach(function (v, i) { if (v != null && v > (run.pb[i] || 0)) run.pb[i] = v; });
        if (hold != null && (s < hold || (g.clock && clk < hold.clk))) hold = null;
        // a score counts once it moves while the player is pressing buttons (the demo plays itself), and, after a
        // game was filed, only in a new game (its score starts again lower), so one game is never filed twice
        if (s !== run.last && hold == null && Date.now() - lastIn < 60000) run.earned = true;
        if (g.clock && clk != null) { if (clk === run.clk && run.earned) { if (++run.still >= 10) { hold = { s: scoreOf(run), clk: clk }; end('over'); run = fresh(s, clk); return; } } else run.still = 0; run.clk = clk; }   // (the clock stopped: out of lives)
        run.last = s; if (s > run.best) run.best = s;
        if (run.earned && !passed && top > 0 && s > top) { passed = true; if (o.onPass) o.onPass(s, top); }
      } else if (!run.earned) run = fresh(s, clk);   // (the title or the demo: a game that wasn't played; a game under way waits for its game over)
    }
    function fresh(s, clk) { return { best: s, last: s, earned: false, clk: clk, still: 0, pb: {}, pf: {}, w: -1 }; }
    // what to call a player on the board's moment: only when more than one has played (one player is just "High score")
    function label(i) { var n = Object.keys(run.pb).filter(function (k) { return run.pb[k] > 0 || +k === i; }).length; return g.names && (n > 1 || i > 0) ? g.names[i] || 'Player ' + (i + 1) : null; }
    function send(sc, who) { if (o.onEnd) o.onEnd(keyOf(g), sc, g, 'over', who); try { top = ArcadeHi.top(keyOf(g)); } catch (e) {} passed = false; }
    function scoreOf(r) { return r ? (g.down ? r.last : r.best) : 0; }
    function end(why) {
      if (!run || !run.earned) return;
      var sc = scoreOf(run); run.earned = false;
      // every player's score readable: each one with a score goes to the board
      if (g.scores) { var two = Object.keys(run.pb).filter(function (k) { return run.pb[k] > 0; }); if (two.length) { two.forEach(function (k) { if (o.onEnd) o.onEnd(keyOf(g), run.pb[k], g, why, two.length > 1 || +k > 0 ? g.names[+k] : null); }); try { top = ArcadeHi.top(keyOf(g)); } catch (e) {} passed = false; return; } }
      if (sc > 0 && o.onEnd) o.onEnd(keyOf(g), sc, g, why);
      try { top = ArcadeHi.top(keyOf(g)); } catch (e) {}
      passed = false;
    }
    var timer = setInterval(tick, 1000);
    return {
      game: g, key: keyOf(g),
      input: function () { lastIn = Date.now(); },
      // (a game left before its game over files nothing: only a game over files a score)
      pending: function () { return null; },
      // leaving, changing cartridge, loading a saved state: a game over just now still files; a game under way doesn't
      finish: function () { tick(true); run = null; },
      stop: function () { clearInterval(timer); },
      // (tests) where the RAM is, and what's read
      debug: function () { var H = heap(); if (base < 0 || !H) return { base: base }; var m = mem(H); return { base: base, score: g.score(m), play: g.play ? g.play(m) : true, over: !!(g.over && g.over(m)), clock: g.clock ? g.clock(m) : null, run: run, hold: hold }; }
    };
  }

  // ── The boards for the High Scores page: games on the shelf and on the home screen that keep a score ──
  // [{key, name, short, sys, art, id, game, logo}] (logo: the game's wide title logo, from games/), one per game (two copies of a game share its board), A to Z
  function boards() {
    var idx = [], vis = {};
    try { idx = JSON.parse(localStorage.getItem('gn_console_idx') || '[]') || []; } catch (e) {}
    try { vis = JSON.parse(localStorage.getItem('gn_console_vis') || '{}') || {}; } catch (e) {}
    var shown = function (id) { return window.ConsoleLib && ConsoleLib.shown ? ConsoleLib.shown(id) : vis[id] !== 0; };
    var by = {};
    idx.forEach(function (c) {
      if (!c || !c.id || !shown(c.id)) return;
      var g = mapFor(c); if (!g) return;
      var k = keyOf(g);
      if (!by[k] || (!by[k].art && c.art)) by[k] = { key: k, name: g.name, short: g.short || g.name.toUpperCase(), sys: g.sys, art: c.art || null, id: c.id, game: g.key, logo: '../img/consoles/logos/' + g.key + '.png' };
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'en', { numeric: true }); });
  }

  label();
  return { games: GAMES, mapFor: mapFor, key: keyOf, watch: watch, boards: boards, label: label,
    _: { digits: digits, digitsLE: digitsLE, bcd: bcd, bcdLE: bcdLE, be: be, le: le, stateRam: stateRam, scan: scan, CORE: CORE } };
})();
