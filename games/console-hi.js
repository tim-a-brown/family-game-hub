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
  // one digit every other byte, most significant first (two players' scores interleaved)
  function digits2(m, a) { var v = 0; for (var i = 0; i < 7; i++) { var d = m(a + 2 * i); if (d > 9) return null; v = v * 10 + d; } return v; }
  // one digit a byte, least significant first
  function digitsLE(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) { var d = m(a + i); if (d > 9) return null; v = v * 10 + d; } return v; }
  function x10(v) { return v == null ? null : v * 10; }

  // Sonic games: game mode $FFF600 (bit 7 set while a stage loads): $00 Sega screen, $04 title, $08 the demo (which
  // scores), then levels ($0C), special stages, continue and ending screens are all a game under way
  // (Checked 2026-11-01 with each game's level select against every zone's title card, Scrap Brain 3, Final Zone,
// Metropolis 3, Wing Fortress, Death Egg and Sky Chase included, and the special stages.)
// where you are (Keep playing's tile): Sonic's zone $FFFE10 and act $FFFE11, by the games' own zone numbers (Sonic 1:
// Scrap Brain 3 is Labyrinth's 4th act, the Final Zone Scrap Brain's 3rd; Sonic 2: Metropolis 3 is a zone of its own)
var MM_STAGE = ['Cut Man', 'Ice Man', 'Bomb Man', 'Fire Man', 'Elec Man', 'Guts Man', 'Wily 1', 'Wily 2', 'Wily 3', 'Wily 4'];
var PO_OPP = ['Glass Joe', 'Von Kaiser', 'Piston Honda', 'Don Flamenco', 'King Hippo', 'Great Tiger', 'Bald Bull', 'Piston Honda', 'Soda Popinski', 'Bald Bull', 'Don Flamenco', 'Mr. Sandman', 'Macho Man', 'Mike Tyson'];
var DT_LAND = ['Amazon', 'Transylvania', 'African Mines', 'Himalayas', 'The Moon'];
var JH_SCENE = ['Vines', 'Reptile River', 'Boulders', 'Cannibal Camp'], JH_SHORT = ['Vines', 'River', 'Boulders', 'Camp'];
var SSF2_P = ['Ryu', 'E.Honda', 'Blanka', 'Guile', 'Ken', 'Chun Li', 'Zangief', 'Dhalsim', 'M.Bison', 'Sagat', 'Balrog', 'Vega', 'Cammy', 'T.Hawk', 'Fei Long', 'Dee Jay'];
// Super Street Fighter II's players: player 2's block is $240 after player 1's (score $7E0703 / $7E0943; state $7E05C2 /
// $7E0802: 2 in a game, 4 once the continue countdown has run out (the score still there), 6 while it's cleared, 0 out).
// $7E18BF: the sides people are fighting on (1 left, 2 right, 3 both). (Checked 2026-11-01.)
function ssf2Score(m, i) { var v = bcdLE(m, 0x7E0703 + i * 0x240, 3); return v == null ? null : v * 100; }
function ssf2Out(m, i) { var s = m(0x7E05C2 + i * 0x240); return s === 4 || s === 6; }
function ssf2Who(m) {
  if (ssf2Out(m, 1)) return 1; if (ssf2Out(m, 0)) return 0;
  if ((m(0x7E0072) | (m(0x7E0073) << 8)) === 0x7D74) return m(0x7E18BF) === 2 ? 1 : 0;   // (the continue screen: whoever fought the computer)
  var a = m(0x7E05C2) === 2, b = m(0x7E0802) === 2;
  return b && (!a || ssf2Score(m, 1) === 0) ? 1 : 0;   // (both in: player 2 while their new game is at 0, so it starts again)
}
var SPO_O = ['Gabby Jay', 'Bear Hugger', 'Piston', 'Bald Bull', 'Bob Charlie', 'Dragon Chan', 'Masked Muscle', 'Mr. Sandman', 'Aran Ryan', 'Heike Kagero', 'Mad Clown', 'Macho Man', 'Narcis Prince', 'Hoy Quarlow', 'Rick Bruiser', 'Nick Bruiser'];
// Super Mario World: in a level (game mode $7E0100 $12-$14) the level entered, translevel $7E13BF; on the map ($0D-$10)
// the level the player stands on, from the map's level-number layer $7ED000 at the player's tile ($1F1F/$1F21 + $0DD6,
// submap $1F11 + $0DD6/4). Null while the map loads and on unnamed tiles. Names from the game's own table (ROM $04A0FC),
// shortened. (Checked 2026-11-01: Yoshi's House, Yoshi's Island 1 and 2, Donut Plains 1 and Iggy's Castle, map and level.)
var SMW_L = { 1: 'Vanilla Secret 2', 2: 'Vanilla Secret 3', 3: 'Top Secret Area', 4: 'Donut Ghost', 5: 'Donut Plains 3', 6: 'Donut Plains 4', 7: "Morton's Castle", 8: 'Green Switch', 9: 'Donut Plains 2', 10: 'Donut Secret 1', 11: 'Vanilla Fortress', 12: 'Butter Bridge 1', 13: 'Butter Bridge 2', 14: "Ludwig's Castle", 15: 'Cheese Bridge', 16: 'Cookie Mountain', 17: 'Soda Lake', 18: 'Star Road', 19: 'Secret House', 20: 'Yellow Switch', 21: 'Donut Plains 1', 22: 'Star Road', 24: 'Sunken Ship', 26: "Wendy's Castle", 27: 'Choco Fortress', 28: 'Choco Island 5', 29: 'Choco Island 4', 30: 'Star Road', 31: 'Forest Fortress', 32: "Roy's Castle", 33: 'Choco-Ghost', 34: 'Choco Island 1', 35: 'Choco Island 3', 36: 'Choco Island 2', 37: "Iggy's Castle", 38: "Yoshi's Island 4", 39: "Yoshi's Island 3", 40: "Yoshi's House", 41: "Yoshi's Island 1", 42: "Yoshi's Island 2", 43: 'Vanilla Ghost', 44: 'Star Road', 45: 'Vanilla Secret 1', 46: 'Vanilla Dome 3', 47: 'Donut Secret 2', 48: 'Star Road', 49: 'Front Door', 50: 'Back Door', 51: 'Valley 4', 52: "Larry's Castle", 53: 'Valley Fortress', 55: 'Valley 3', 56: 'Valley Ghost', 57: 'Valley 2', 58: 'Valley 1', 59: 'Choco Secret', 60: 'Vanilla Dome 2', 61: 'Vanilla Dome 4', 62: 'Vanilla Dome 1', 63: 'Red Switch', 64: "Lemmy's Castle", 65: 'Forest Ghost', 66: 'Forest 1', 67: 'Forest 4', 68: 'Forest 2', 69: 'Blue Switch', 70: 'Forest Secret', 71: 'Forest 3', 72: 'Star Road', 73: 'Funky', 74: 'Outrageous', 75: 'Mondo', 76: 'Groovy', 77: 'Star Road', 78: 'Gnarly', 79: 'Tubular', 80: 'Way Cool', 81: 'Awesome', 82: 'Star Road', 83: 'Star Road', 84: 'Star World 2', 85: 'Star Road', 86: 'Star World 3', 87: 'Star Road', 88: 'Star World 1', 89: 'Star World 4', 90: 'Star World 5', 91: 'Star Road', 92: 'Star Road' };
function smwWhere(m) {
  var g = m(0x7E0100), p = m(0x7E0DD6) & 4, x = m(0x7E1F1F + p), y = m(0x7E1F21 + p);
  if (g >= 0x12 && g <= 0x14) return SMW_L[m(0x7E13BF)] || null;
  if (g < 0x0D || g > 0x10) return null;
  return SMW_L[m(0x7ED000 + (x & 15) + ((x & 16) << 4) + ((y & 15) << 4) + ((y & 16) << 5) + (m(0x7E1F11 + (p >> 2)) ? 0x400 : 0))] || null;
}
var COI_R = ['Enchanted Forest', 'Toyland', 'The Storm', 'The Library', 'The Castle', 'The Castle'];
var SONIC_Z = ['Green Hill', 'Labyrinth', 'Marble', 'Star Light', 'Spring Yard', 'Scrap Brain'];
function sonicWhere(m) {
  var z = m(0xFFFE10), a = m(0xFFFE11);
  if ((m(0xFFF600) & 0x7F) === 0x10) return 'Special Stage';   // (game mode $10; the zone keeps the level's)
  if (z === 1 && a === 3) return 'Scrap Brain 3';
  if (z === 5 && a === 2) return 'Final Zone';
  return SONIC_Z[z] && a < 3 ? SONIC_Z[z] + ' ' + (a + 1) : null;
}
var SONIC2_Z = { 0: 'Emerald Hill', 4: 'Metropolis', 5: 'Metropolis', 6: 'Wing Fortress', 7: 'Hill Top', 10: 'Oil Ocean', 11: 'Mystic Cave', 12: 'Casino Night', 13: 'Chemical Plant', 14: 'Death Egg', 15: 'Aquatic Ruin', 16: 'Sky Chase' };
function sonic2Where(m) {
  var z = m(0xFFFE10), a = m(0xFFFE11), n = SONIC2_Z[z];
  if ((m(0xFFF600) & 0x7F) === 0x10) return 'Special Stage';
  if (!n || a > 1) return null;
  if (z === 5) return 'Metropolis 3';
  return z === 6 || z === 14 || z === 16 ? n : n + ' ' + (a + 1);
}
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
      where: function (m) { var w = m(0x75F), l = m(0x75C); return w < 8 && l < 4 ? 'World ' + (w + 1) + '-' + (l + 1) : null; },
      over: function (m) { var o = m(0x770); return (o === 3 && (m(0x77A) === 0 || m(0x761) > 0x7F)) || (o === 2 && m(0x772) === 4 && m(0x75F) === 7); } },
    // 3 bytes at $0715 (high first), the screen adding a 0: the score of whoever is up ($0726; 2 players: each keeps
    // their own, swapped in on the map, so each one's best is kept while they're up and filed at their own game over). No demo. Over: the player up has lives ($0736 + $0726) at $FF, from losing the last life
    // through the GAME OVER CONTINUE/END box (CONTINUE starts the score again at 0, so each game over files), or THE END
    // after the credits (its sprites at $0200 with CHR bank $071E $1B), which waits for Start. (Checked 2026-11-01
    // against the screen, 100 to 1,000,090; game over, continue, end, and the ending.)
    { key: 'smb3', short: 'MARIO 3', name: 'Super Mario Bros. 3', sys: 'nes', ids: ['6bd518e85eb46a4252af07910f61036e84b020d1'], re: /^super mario bros\.? 3$/,
      score: function (m) { return be(m, 0x715, 3) * 10; }, who: function (m) { return m(0x726) & 1; }, names: ['Mario', 'Luigi'],
      where: function (m) { var w = m(0x727); return w < 8 ? 'World ' + (w + 1) : w === 8 ? 'Warp Zone' : null; },
      over: function (m) { return m(0x736 + (m(0x726) & 1)) === 0xFF || (m(0x200) === 0x60 && m(0x201) === 0xF1 && m(0x21D) === 0xFF && m(0x21F) === 0x98 && m(0x71E) === 0x1B); } },
    // The money: TOTAL MONEY (8 characters at $0334-$033B, $24 a blank: what's banked when a land is cleared, and what the
    // ending shows) plus this land's money (7 at $0324-$032A, the HUD's $, back to 0 each land), left out once the land is
    // over ($5D) or the final tally began ($AC bit 7: both add it into TOTAL without clearing it). Can go down (payments of
    // 300,000). No demo. Over: GAME OVER in the HUD (sprites at $0140: G A M ... V R), or the ending ($AC bit 7, $F6 9),
    // which stays on "End.". (Checked 2026-11-01 against the HUD, the LAND CLEAR tally and the ending's TOTAL MONEY. An
    // earlier reader took only this land's money: rev 2.)
    { key: 'ducktales', short: 'DUCKTALES', name: 'DuckTales', sys: 'nes', ids: ['4b5720bc6e0590c9372cfbd0c418f8efd4d0c96d'], re: /^duck ?tales$/, down: 1, rev: 2,
      score: function (m) { function f(a, n) { var v = 0; for (var i = 0; i < n; i++) { var d = m(a + i); if (d === 0x24) d = 0; else if (d > 9) return null; v = v * 10 + d; } return v; } var t = f(0x334, 8), c = f(0x324, 7); return t == null || c == null ? null : t + (m(0x5D) || (m(0xAC) & 0x80) ? 0 : c); },
      // where: the land $F6, only while a land is loaded ($2B 8; 1 on LAND SELECT, where $F6 is the cursor, 0 on the title).
      // (Checked 2026-11-01: all five lands from LAND SELECT, the select screen, the title, pause.)
      where: function (m) { return m(0x2B) === 8 ? DT_LAND[m(0xF6)] || null : null; },
      over: function (m) { return (m(0x141) === 0x10 && m(0x145) === 0x0A && m(0x149) === 0x16 && m(0x155) === 0x1F && m(0x15D) === 0x1B) || ((m(0xAC) & 0x80) && m(0xF6) === 9); } },
    // Player 1's score: seven digits a byte on the even addresses $E6-$F2; player 2's on the odd ones $E7-$F3
    // ($0108-$010E is the HI-SCORE). Lives: $E4 player 1, $E5 player 2 (always 0 in a 1-player game). $5E is $FF while
    // the attract demo plays (it never scores); $2C is $0A on the playfield. A player's lives reach 0 at their last
    // death; A,B,B,A then brings them back with the score cleared to 0 (in 1 player within ~8 s, then GAME OVER, $06 =
    // $C0; in 2 players any time while the other plays on), so the game is over when both players' lives are 0. A player
    // who is out counts 0 in scores() (their best is already kept). (Checked 2026-11-01 in the emulator: both scores
    // against the screen, 1- and 2-player games to the end, continues, game over, demo. An earlier reader read the high
    // score: rev 2.)
    { key: 'ikari', short: 'IKARI', name: 'Ikari Warriors', sys: 'nes', ids: ['6eadbbe4c2a1f7ede2978f149b63270c72db281f'], re: /^ikari warriors$/, rev: 2,
      score: function (m) { var a = digits2(m, 0xE6), b = digits2(m, 0xE7); return a == null || b == null ? null : Math.max(a, b); },
      scores: function (m) { var a = digits2(m, 0xE6), b = digits2(m, 0xE7); return [a == null || m(0xE4) === 0 ? 0 : a, b == null || m(0xE5) === 0 ? 0 : b]; },
      names: ['Player 1', 'Player 2'],
      // where: the area $06FC (0-3), AREA 1-4 on the game's own card. (Checked 2026-11-01: areas 1-4 from the hidden area select.)
      where: function (m) { var a = m(0x6FC); return a < 4 ? 'Area ' + (a + 1) : null; },
      play: function (m) { return m(0x5E) === 0 && m(0x2C) === 0x0A; },
      over: function (m) { return m(0x5E) === 0 && m(0xE4) === 0 && m(0xE5) === 0 && (m(0x2C) === 0x0A || m(0x06) === 0xC0); } },
    // seven digits a byte at $0072-$0078, the ones first. No demo. Lives $A6 underflow to $FF at the last death and stay
    // there on the GAME OVER screen until CONTINUE or STAGE SELECT, both of which clear the score (each game over is a
    // game). (Checked 2026-11-01 in the emulator: the score to 20,000 against the screen, deaths, continue, stage select.)
    { key: 'megaman', short: 'MEGA MAN', name: 'Mega Man', sys: 'nes', ids: ['2f88381557339a14c20428455f6991c1eb902c99'], re: /^mega ?man$/,
      score: function (m) { return digitsLE(m, 0x72, 7); },
      // where: stage $31 (0 Cut, 1 Ice, 2 Bomb, 3 Fire, 4 Elec, 5 Guts, 6-9 Wily 1-4); on the stage select $31 is the cursor,
      // told apart by the select screen's palette pointer $35/$36 $BDAB ($BDDB once Guts Man is beaten). (Checked 2026-11-01:
      // all six stages and Wily 1 and 2 from the select screen, pause, deaths, game over.)
      where: function (m) { return m(0x36) === 0xBD && (m(0x35) === 0xAB || m(0x35) === 0xDB) ? null : MM_STAGE[m(0x31)] || null; },
      over: function (m) { return m(0xA6) === 0xFF; } },
    // points: six digits a byte at $03E8, starting again each fight (the best fight counts). $04 is $80 while the attract
    // demo fight plays (it scores). Three losses ($0173, career losses) end the career on the "GIVE UP? RETIRE? GAME
    // OVER" screen, the only one drawn with graphics bank $A9 = 7. (Checked 2026-11-01 in the emulator: points against
    // the screen, KO/TKO/decision losses, rematches, a win, the Tyson password, game over, demo. An earlier play() took
    // $06, which is 1 in the demo too.)
    { key: 'punchout', short: 'PUNCH-OUT', name: 'Mike Tyson’s Punch-Out!!', sys: 'nes', ids: ['0f0c2c2e294ff8ce255a618964728c935fd8963b'], re: /^(mike tysons )?punch-?out!*$/, reset: 1,
      score: function (m) { return digits(m, 0x3E8, 6); },
      play: function (m) { return m(0x04) !== 0x80; },
      // where: the opponent $01 in career order; $06 is 0 on a fresh title menu. (Checked 2026-11-01: a new career and the
      // three circuit passwords, and every id against its VS. screen.)
      where: function (m) { var n = PO_OPP[m(0x01)]; return m(0x06) && n ? 'vs ' + n : null; },
      over: function (m) { return m(0xA9) === 7 && m(0x173) >= 3; } },
    // ── Super Nintendo ──
    // Mario's score: 3 bytes at $7E0F34 (low first), Luigi's at $7E0F37, the screen adding a 0 (it stops at 9,999,990).
    // Game mode $7E0100: $07 the title, where the demo plays (and scores); $08-$0A the file and player menus; $0B on: the
    // map, levels and the screens between. Over: modes $15-$17 (GAME OVER, about 7 s) with the player's lives $7E0DBE at
    // $FF and, as the game itself checks, a stored lives byte ($0DB4 Mario, $0DB5 Luigi, $FF in 1 player) at $FF too: in
    // 2 players the first one out sees GAME OVER and the other plays on (TIME UP with lives left keeps lives >= 0); or
    // THE END ($29), where the game stays. CONTINUE starts both scores again at 0, so each game over files. (Checked
    // 2026-11-01: the screen at 200 to 1,234,560 and the cap; 1- and 2-player game overs, TIME UP, continue, the ending.)
    { key: 'smw', short: 'MARIO WORLD', name: 'Super Mario World', sys: 'snes', ids: ['6b47bb75d16514b6a476aa0c73a683a2a4c18765'], re: /^super mario world$/,
      score: function (m) { return Math.max(le(m, 0x7E0F34, 3), le(m, 0x7E0F37, 3)) * 10; },
      where: smwWhere,
      scores: function (m) { return [le(m, 0x7E0F34, 3) * 10, le(m, 0x7E0F37, 3) * 10]; }, names: ['Mario', 'Luigi'],
      play: function (m) { return m(0x7E0100) >= 0x0B; },
      over: function (m) { var g = m(0x7E0100); return (g >= 0x15 && g <= 0x17 && m(0x7E0DBE) === 0xFF && ((m(0x7E0DB4) | m(0x7E0DB5)) & 0x80) !== 0) || g === 0x29; } },
    // Each player's score: packed decimal in hundreds, low byte first, player 1 at $7E0703-$7E0705, player 2 at
    // $7E0943-$7E0945 (10,300 is $03 $01 $00); the screen adds one more digit, the continues. Scores carry on through a
    // continue. 2 players (Super Battle): the one who joins challenges, both scores count; the loser's continue countdown
    // runs while the winner fights on, and each player's game is over when their own countdown runs out (state 4 or 6,
    // the other playing on), or at the continue screen's end ($7E0072 $7D74, also passed for ~2 s on a continue) once
    // the player who lost to the computer isn't back in (state not 2). Versus Battle keeps no score. $7E0030 is 0 in a
    // game, 2 or 3 on the title and in the demo. (Checked 2026-11-01 by playing 1- and 2-player games: joins, human
    // fights, continues, game overs, rejoining, Versus Battle. An earlier reader took $7E0700-$7E0703 the other way round.)
    { key: 'ssf2', short: 'SF II', name: 'Super Street Fighter II', sys: 'snes', ids: ['8e67787988024503c4adeadd5fe50a340aa860d7'], re: /^super street fighter ii/, rev: 2,
      score: function (m) { return ssf2Score(m, ssf2Who(m)); }, who: ssf2Who,
      scores: function (m) { return [ssf2Score(m, 0), ssf2Score(m, 1)]; }, names: ['Player 1', 'Player 2'],
      play: function (m) { return m(0x7E0030) === 0; },
      // where: the fighters ($7E05D1 left, $7E0811 right, ids as on the select screen), from the VS screen to the KO
      // ($7E00C6 8-$C): "Ryu vs Ken" when both are people, else "vs" the computer's. (Checked 2026-11-01.)
      where: function (m) { var c = m(0x7E00C6), k = m(0x7E18BF), a = SSF2_P[m(0x7E05D1)], b = SSF2_P[m(0x7E0811)]; return c < 8 || c > 0x0C || !a || !b ? null : k === 3 ? a + ' vs ' + b : k === 1 ? 'vs ' + b : k === 2 ? 'vs ' + a : null; },
      over: function (m) { return ssf2Out(m, 0) || ssf2Out(m, 1) || ((m(0x7E0072) | (m(0x7E0073) << 8)) === 0x7D74 && m(0x7E05C2 + ssf2Who(m) * 0x240) !== 2); } },
    // The circuit's TOTAL SCORE: five digits a byte at $7E0611, the ones first, the screen adding a 0 (added at each
    // fight's tally, wins and losses; 0 when a circuit starts; $7E0616 becomes 9 once a circuit is won, so it's left out).
    // The SCORE shown in a fight ($7E0B34) is only that fight's points. $7E0B10 is 2 in a fight, its tally and game over
    // (4 on the title, the demo and the menus). Over: GAME OVER after a circuit's third loss (losses left $7E0606 at 0,
    // $7E0000 $80; it waits for a button), or the CIRCUIT CLEAR screen ($7E0765 2, the champion's rank $7E0602 0). Retire
    // goes back to the menu with no game over; Time Attack keeps no total. (Checked 2026-11-01 by playing: totals against
    // the tallies and the clear screen, 5,310 to 41,050; game overs and a Minor Circuit clear. An earlier reader took one
    // fight's points: rev 2.)
    { key: 'superpunchout', short: 'SUPER PUNCH', name: 'Super Punch-Out!!', sys: 'snes', ids: ['3604c855790f37db567e9b425252625045f86697'], re: /^super punch-?out!*$/, rev: 2,
      score: function (m) { var v = digitsLE(m, 0x7E0611, 5); return v == null ? null : v * 10; },
      // where: the opponent $7E0600 (circuit x 4 + bout, +1 after each win), as the intro card names him. (Checked 2026-11-01:
      // Gabby Jay, then Bear Hugger after a real win, and the first bout of each circuit.)
      where: function (m) { var o = SPO_O[m(0x7E0600)]; return o ? 'vs ' + o : null; },
      play: function (m) { return m(0x7E0B10) === 2; },
      over: function (m) { return m(0x7E0B10) === 2 && ((m(0x7E0000) === 0x80 && m(0x7E0606) === 0) || (m(0x7E0765) === 2 && m(0x7E0602) === 0)); } },
    // 4 bytes at $7E8949 (low first; the HUD shows six digits). $7E5F2E is 1 while the demo plays (it scores). $7E5F16 is
    // the game's state: 0 playing (and paused), 3 a floor's tally (6 a secret one), 4 dead, 1 the title and credits, 5 the
    // menu. Lives $7E8953 (the number by the face is one less): dying with the last leaves 0 and shows GAME OVER (state 4,
    // at least 6 s, then the title). A password starts its floor with 0 points, so each game over files. (Checked
    // 2026-11-01: the screen at 100 to 123,456, three deaths to a game over, the title, the demo and a floor's tally.)
    { key: 'wolf3d', short: 'WOLF 3D', name: 'Wolfenstein 3D', sys: 'snes', ids: ['88fe872eb984af84f8ca7633ef5bd3904a2baeb4'], re: /^wolfenstein 3-?d$/,
      score: function (m) { return le(m, 0x7E8949, 4); },
      // where: the map $7E8947 (0-29) as the HUD's FLOOR shows it: missions of 3, 4, 5, 5, 6 and 7 floors. (Checked
      // 2026-11-01: 1-1 and 1-2 in play, and every map reloaded by the game against its HUD.)
      where: function (m) { var f = m(0x7E8947), e = 0, S = [0, 3, 7, 12, 17, 23, 30]; if (m(0x7E8948) || f > 29) return null; while (f >= S[e + 1]) e++; return 'Floor ' + (e + 1) + '-' + (f - S[e] + 1); },
      play: function (m) { var s = m(0x7E5F16); return m(0x7E5F2E) === 0 && s !== 1 && s !== 5; },
      over: function (m) { return m(0x7E5F16) === 4 && m(0x7E8953) === 0 && m(0x7E5F2E) === 0; } },
    // ── Genesis ──
    // Score: 4 bytes at $FFFE26, the screen adding a 0. Game over: on the last life once Sonic is dying (routine $FFD024 =
    // 6), then lives $FFFE12 = 0 with the score kept through the GAME OVER card, the continue screen and the Sega/title
    // screens after it (pressing a button cuts the card to half a second); a continue starts the score again at 0, so each
    // game over files. The ending ($18) ends a finished game. (Checked 2026-11-01 in the emulator: the score against the
    // screen to 999,990, time over and deaths with lives left, game overs with and without buttons mashed, a continue, the demo.)
    { key: 'sonic', short: 'SONIC', name: 'Sonic the Hedgehog', sys: 'genesis', ids: ['6ddb7de1e17e7f6cdb88927bd906352030daa194'], re: /^sonic the hedgehog$/,
      score: function (m) { return be(m, 0xFFFE26, 4) * 10; }, play: sonicPlay, where: sonicWhere,
      over: function (m) { var md = m(0xFFF600) & 0x7F, L = m(0xFFFE12); if (md === 0x0C && L === 1 && m(0xFFD024) === 6) return true; if (md === 0x18) return true; return L === 0 && be(m, 0xFFFE26, 4) > 0 && (md === 0x0C || md === 0x14 || md === 0 || md === 4); } },
    // The same score as Sonic 1. Sonic 2's own modes: $0C level, $10 special stage, $14 continue, $20 ending are play;
    // $18/$1C (2-player results and zone select), $24 options, $28 level select are not. 2-player VS (word $FFFFD8 not 0)
    // files nothing. Game over as Sonic 1 (the main character's routine at $FFB024). (Checked 2026-11-01: the score against
    // the screen, deaths and time over, game over, continue, a 2-player match. The Sonic 1 play() counted the options
    // screen and 2-player VS as play.)
    { key: 'sonic2', short: 'SONIC 2', name: 'Sonic the Hedgehog 2', sys: 'genesis', ids: ['8bca5dcef1af3e00098666fd892dc1c2a76333f9'], re: /^sonic the hedgehog 2$/,
      score: function (m) { return be(m, 0xFFFE26, 4) * 10; }, where: sonic2Where,
      play: function (m) { var md = m(0xFFF600) & 0x7F; return (md === 0x0C || md === 0x10 || md === 0x14 || md === 0x20) && !m(0xFFFFD8) && !m(0xFFFFD9); },
      over: function (m) { if (m(0xFFFFD8) || m(0xFFFFD9)) return false; var md = m(0xFFF600) & 0x7F, L = m(0xFFFE12); if (md === 0x0C && L === 1 && m(0xFFB024) === 6) return true; if (md === 0x20) return true; return L === 0 && be(m, 0xFFFE26, 4) > 0 && (md === 0x0C || md === 0x14 || md === 0 || md === 4); } },
    // 4 bytes at $FFF22C (a plain number; the screen shows 8 digits). $FFF283 is 1 while the demo plays (it starts with
    // 50,000). Game over: the state byte $FFF301 is $18/$1A from the GAME OVER screen through the continue sign, and
    // $FFF449 is 1 during the death on the last try; the score is cleared to 0 as GAME OVER starts (so the game's score is
    // the best it reached), and a continue starts again at 0. (Checked 2026-11-01 in the emulator: the score against the
    // screen, deaths with tries left, game overs with and without buttons, continue and new game, the demo.)
    { key: 'castleofillusion', short: 'MICKEY', name: 'Castle of Illusion', sys: 'genesis', ids: ['4ac3687634a5acc55ac7f156c6de9749158713e4'], re: /castle of illusion/,
      score: function (m) { return be(m, 0xFFF22C, 4); }, play: function (m) { return m(0xFFF283) === 0; },
      // where you are: the stage $FFFF42 (word, 0-27) by the game's own round table (ROM $A008), named as the manual's
      // five levels (the game has no title cards); only in a level ($FFF301 $0C loading, $0E playing), null in the hall.
      // (Checked 2026-11-01: every stage loaded by the game from the hall.)
      where: function (m) { var st = m(0xFFF301), k = m(0xFFFF43); return (st === 0x0C || st === 0x0E) && !m(0xFFFF42) && k < 28 ? COI_R['0000011112222333333333344445'.charAt(k)] : null; },
      over: function (m) { var s = m(0xFFF301); return s === 0x18 || s === 0x1A || (s === 0x0E && m(0xFFF449) === 1); } },
    // ── Atari 2600 ──
    // packed decimal at $D5-$D7, starting at 2,000 and going down as well as up: the score at the end counts. The
    // 20-minute clock ($D8 minutes, $D9 seconds) starts with the game. $9E is 0 only while Harry is in play (set on the
    // title, while he dies, at 0:00 and when all 32 treasures are taken, $F1 below 0); $80 is the spare-lives picture
    // ($A0, $80, 0: no Harry comes back after a death at 0). (Checked 2026-11-01 in the emulator: the score against the
    // screen, to 114,000; out of lives, the clock at 0:00 and the last treasure each end it; a death with lives left doesn't.)
    { key: 'pitfall', short: 'PITFALL', name: 'Pitfall!', sys: 'atari2600', ids: ['8d525480445d48cc48460dc666ebad78c8fb7b73'], re: /^pitfall!?$/, down: 1,
      score: function (m) { return bcd(m, 0xD5, 3); },
      clock: function (m) { var t = bcd(m, 0xD8, 2); return t == null ? null : 1200 - (Math.floor(t / 100) * 60 + t % 100); },
      // where: no levels (255 unnamed screens), so the time left on the 20-minute clock ($D8 minutes, $D9 seconds) as the
      // screen shows it. (Checked 2026-11-01 against the clock on screen.)
      where: function (m) { var t = bcd(m, 0xD8, 2); return t == null || t > 2000 || t % 100 > 59 ? null : Math.floor(t / 100) + ':' + ('0' + t % 100).slice(-2) + ' left'; },
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
      // where: the part of the jungle ($89: 0 vines, 1 river, 2 boulders, 3 cannibal camp) and, after a rescue, the round
      // ($8B goes up at each rescue; Game 2 starts it at 1, $98 bit 0; the cartridge never shows a round number).
      // (Checked 2026-11-01: played through all four parts to the rescue and into round 2; Game 2's start.)
      where: function (m) { var s = m(0x89), r = m(0x8B) - (m(0x98) & 1) + 1; return s > 3 || r < 1 ? null : r === 1 ? JH_SCENE[s] : r < 10 ? 'Round ' + r + ' ' + JH_SHORT[s] : 'Round ' + r; },
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
      // where: the qualifying lap ($FF bit 7 clear) or the race lap, from the distance gone ($87:$86, $400 a lap: the
      // qualifying lap, then 4 race laps); null once it's over ($FF bit 6). (Checked 2026-11-01: a full qualifying lap and
      // race, each lap line against the screen.)
      where: function (m) { var f = m(0xFF), l = m(0x87) >> 2; return f & 0x40 ? null : !(f & 0x80) ? 'Qualifying' : l >= 1 && l <= 4 ? 'Lap ' + l + ' of 4' : null; },
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
        if (g.who) { if (run.pf[w] && s === 0) run.pf[w] = 0; if (!run.pf[w] && s > (run.pb[w] || 0)) run.pb[w] = s; run.w = w; if (w > 0) run.multi = 1; }   // (a continue: that player starts again)
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
    function label(i) { var n = Object.keys(run.pb).filter(function (k) { return run.pb[k] > 0 || +k === i; }).length; return g.names && (n > 1 || i > 0 || run.multi) ? g.names[i] || 'Player ' + (i + 1) : null; }
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
      // Keep playing's tile: where you are and the score, read now (nothing on the title or in a demo)
      status: function () { var H = heap(); if (base < 0 || !H) return null; var m = mem(H), on = g.play ? !!g.play(m) : true; if (!on) return null; var sc = g.score(m); return { score: sc > 0 ? sc : 0, where: g.where ? g.where(m) : null }; },
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
