// Galaga, the arcade game's logic in JavaScript.
// A port of Namco's 1981 program for its two game CPUs, written from Glenn A. Neidermeier's reconstructed
// and commented source (non-commercial use permitted), checked against the arcade ROMs (Namco rev. B) running in
// MAME. The reconstruction is of the first release; where rev. B differs (marked "rev B"), the code follows the ROM.
// The arcade's shared RAM is kept as one byte array (M) at the arcade's own addresses, so the code reads
// like the original: M[0x9820] is the active player's spare fighters, M[0x8000..0x87FF] the text screen,
// M[0x8B80..], M[0x9380..], M[0x9B80..] the sprite registers the screen is drawn from.
(function () {
  'use strict';
  var M = new Uint8Array(0x10000);
  var R1 = new Uint8Array(0x1000);        // the sub CPU's ROM: only its data tables (flight plans, home positions)
  var hooks = {};
  var starCtrl = 7, starClr = 0, rackTest = false;

  // ═══ CPU 1: flying enemies, rockets and hit detection (gg1-5) ═══════════
  // The enemies' flight plans are byte codes in the sub CPU's ROM (R1): a byte below $EF loads a segment
  // (speed nibbles, turn rate, frames); $EF..$FF are commands.

  // queue slot fields (ix = 0x9100 + n * 0x14)
  //  00/01 y and 02/03 x, 9.7 fixed point (01/03 = pixel bits 8:1)    04/05 heading, 10 bits
  //  06/07 where to stop (home or dive point)    08/09 flight plan pointer    0A/0B speed on odd/even frames
  //  0C turn per frame    0D frames left in this segment    0E/0F bomb countdown and bomb bits
  //  10 object    11/12 home offset added while flying home    13 flags: 0 busy, 5 dive point, 6 going home, 7 mirrored
  var IX = 0;
  function rx(o) { return M[IX + o]; }
  function wx(o, v) { M[IX + o] = v & 0xFF; }

  // The motion runner on the sub CPU races the main CPU's tasks within each frame: the main CPU adds
  // new fliers to the queue while the sub CPU is part way through it.  RUN_N is where they meet.
  var RUN_I = 12;
  function f_08D3() { f_08D3a(); f_08D3b(99); }
  function f_08D3a() {
    var prev = M[0x9286]; M[0x9286] = 0; M[0x9287] = prev;
    RUN_I = 0;
  }
  function f_08D3b(maxBusy) {
    var busy = 0;
    for (; RUN_I < 12; RUN_I++) {
      if (busy >= maxBusy) return;
      IX = 0x9100 + RUN_I * 0x14;
      if (!(rx(0x13) & 1)) continue;
      busy++;
      M[0x9286]++;
      var st = M[0x8800 + rx(0x10)];
      if (st === 3 || st === 9 || st === 7) flight();
      else inactive();
    }
  }
  function inactive() {           // case_0E49
    var L = rx(0x10);
    M[0x8800 + L] = 0x80; M[0x9300 + L] = 0; wx(0x13, 0);
  }

  function flight() {
    wx(0x0D, rx(0x0D) - 1);
    if (rx(0x0D) !== 0) { step(); return; }
    var hl = rx(8) | rx(9) << 8;
    for (;;) {                    // j_090E
      var a = R1[hl];
      if (a < 0xEF) {             // load a segment
        wx(0x0A, a & 0x0F); wx(0x0B, a >> 4);
        var t = R1[hl + 1]; if (rx(0x13) & 0x80) t = -t;
        wx(0x0C, t); wx(0x0D, R1[hl + 2]); hl += 3;
        savePtr(hl); step(); return;
      }
      switch ((~a) & 0xFF) {
        case 0: inactive(); return;
        case 1: {                 // $FE: pick the leg length from where the fighter is
          var fx = M[0x93E2] || 0x80;
          if (!(rx(0x13) & 0x80)) fx = (0xF2 - fx) & 0xFF;
          var v = (fx + 0x0E) & 0xFF, k = Math.floor(v / 30);
          wx(0x0D, R1[hl + k]); hl += 9; savePtr(hl); step(); return;
        }
        case 2: hl = R1[hl + 1] | R1[hl + 2] << 8; continue;       // $FD: jump
        case 3: wx(6, R1[hl + 1]); wx(7, 0); wx(0x13, rx(0x13) | 0x20); hl += 2; savePtr(hl); step(); return;   // $FC: dive to a row
        case 4: goHome(); hl++; continue;                          // $FB
        case 5: {                 // $FA
          var c5 = M[0x92AA], z = ((M[0x9000 + 0x1D] - 1) & c5 & 0xFF) === 0;
          if (z) { hl = R1[hl + 1] | R1[hl + 2] << 8; continue; }
          hl += 3; continue;
        }
        case 6: {                 // $F9: back over the top of the screen, lined up with home
          var col = R1[0x0100 + rx(0x10) + 1];
          wx(3, M[0x9800 + col] >> 1);
          if (M[0x92AA]) M[0x9AA0 + 0x13] = M[0x92AA];
          hl++; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return;
        }
        case 7: wx(1, 0x9C); hl++; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return;   // $F8: wrap to the top
        case 8:                   // $F7
          if ((rx(0x10) & 0x38) === 0x38) { hl = R1[hl + 1] | R1[hl + 2] << 8; continue; }
          hl += 3; continue;
        case 9: {                 // $F6: a heading
          hl++; var h = R1[hl];
          if (rx(0x13) & 0x80) h = (-(h + 0x80)) & 0xFF;
          wx(4, (h << 2) & 0xFF); wx(5, (h >> 6) & 3);
          wx(0x0E, 0x1E); wx(0x0F, M[0x92C0 + 8]);
          hl++; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return;
        }
        case 10: M[0x8800 + rx(0x10)] = 3; hl++; continue;          // $F5
        case 11: captureDive(); hl++; continue;                     // $F4
        case 12: {                // $F3: red alien picks its swing from the fighter's distance
          var sx = M[0x9362];
          if (sx < 0x1E) sx = 0x1E;
          if (sx >= 0xD1) sx = 0xD1;
          var d = (sx >> 1) - rx(3), dd = ((d & 0x1FF) >> 1) & 0xFF;   // 9-bit difference, halved
          if (rx(0x13) & 0x80) dd = (-dd) & 0xFF;
          var s = (dd + 0x18) & 0xFF;
          if (s & 0x80) s = 0;
          if (s >= 0x30) s = 0x2F;
          wx(0x0D, R1[hl + Math.floor(s / 6) + 1]);
          hl += 9; savePtr(hl); step(); return;
        }
        case 13: hl = splitBee(hl); continue;                      // $F2
        case 14: {                // $F1: everyone home: drop in from above the row
          var row = R1[0x0100 + rx(0x10)];
          wx(1, M[0x9900 + row + 1] + 0x20);
          hl++; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return;
        }
        case 15: case 16: {       // $F0 / $EF: branch from stage 8 on
          var on = M[0x99C0 + (a === 0xF0 ? 8 : 9)];
          if (on) { hl = R1[hl + 1] | R1[hl + 2] << 8; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return; }
          hl += 3; savePtr(hl); wx(0x0D, rx(0x0D) + 1); return;
        }
      }
    }
  }
  function savePtr(hl) { wx(8, hl & 0xFF); wx(9, hl >> 8); }

  // $FB: head for the home spot in the formation
  function goHome() {
    var L = rx(0x10);
    M[0x8800 + L] = 9;
    var row = R1[0x0100 + L], col = R1[0x0100 + L + 1];
    var b = M[0x9900 + col], e = M[0x9900 + col + 1], c = M[0x9900 + row], d = M[0x9900 + row + 1];
    e >>= 1;
    wx(0x11, b); wx(0x12, c);
    var y = (rx(1) << 8 | rx(0)) + (s8(c) << 7) & 0xFFFF;
    wx(0, y); wx(1, y >> 8);
    var x = (rx(3) << 8 | rx(2)) - (s8(b) << 7) & 0xFFFF;
    wx(2, x); wx(3, x >> 8);
    var ang = c_0E5B(d, e, y >> 8, x >> 8) >> 1;
    wx(4, ang); wx(5, ang >> 8);
    wx(6, d); wx(7, e);
    wx(0x13, rx(0x13) | 0x40);
  }
  // $F4: the capturing boss heads for the spot above the fighter
  function captureDive() {
    var a = ((M[0x9362] + 3) & 0xF8) + 1;
    if (a < 0x29) a = 0x29;
    if (a >= 0xCA) a = 0xC9;
    M[0x928A] = a;
    var ang = c_0E5B(0x48, a >> 1, rx(1), rx(3)) >> 1;
    wx(4, ang); wx(5, ang >> 8);
    M[0x928B] = 0;
    M[0x9000 + 0x19] = 1;
    M[0x9820 + 0x09] = IX & 0xFF;
  }
  // $F2: a bonus bee splits off a copy that follows its own plan
  function splitBee(hl) {
    var e = rx(0x10), l = -1;
    for (var k = 0; k < 4; k++) if (M[0x8838 + k * 2] & 0x80) { l = 0x38 + k * 2; break; }
    if (l < 0) return hl + 3;
    M[0x8B00 + l] = M[0x8B00 + e]; M[0x8B00 + l + 1] = M[0x8B00 + e + 1];
    var iy = -1;
    for (var j = 11; j >= 0; j--) if (!(M[0x9100 + j * 0x14 + 0x13] & 1)) { iy = 0x9100 + j * 0x14; break; }
    if (iy < 0) return hl + 3;
    for (var i = 0; i < 6; i++) M[iy + i] = M[IX + i];
    // (the arcade means to copy bytes $0C-$0F too, but its pointer arithmetic sends them nowhere)
    M[iy + 0x13] = M[IX + 0x13];
    M[iy + 8] = R1[hl + 1]; M[iy + 9] = R1[hl + 2];
    M[iy + 0x0A] = 1; M[iy + 0x0B] = 2; M[iy + 0x0D] = 1;
    M[iy + 0x10] = l;
    M[0x8800 + l] = 9; M[0x8800 + l + 1] = iy & 0xFF;
    return hl + 3;
  }

  // one frame of flight along the current segment
  function step() {
    var f13 = rx(0x13);
    if (f13 & 0x40) {             // home yet?
      if (near(rx(1), rx(6)) && near(rx(3), rx(7))) { imHome(); return; }
    }
    if (f13 & 0x20) {             // reached the dive point
      var dy = (rx(1) - rx(6)) & 0xFF;
      if (dy === 0 || dy === 0xFF) { wx(0x0D, 1); wx(0x13, rx(0x13) & ~0x20); }
    }
    var b = rx(0x0C), e = rx(4), d = rx(5);
    var sum = e + b;
    wx(4, sum);
    var cy = sum > 0xFF ? 1 : 0;
    if ((cy ^ (b >> 7)) & 1) wx(5, d + ((b & 0x80) ? -1 : 1));
    // sprite: 6 turning frames per quadrant, flips for the other three
    var a = e, c = d;
    if (c & 1) a = (~a) & 0xFF;
    a += 21;
    var code;
    if (a > 0xFF) code = 6;
    else code = (((a >> 1) + (a >> 2)) >> 5) & 7;
    var L = rx(0x10);
    M[0x8B00 + L] = (M[0x8B00 + L] & 0xF8) | code;
    var d0 = d & 1, d1 = (d >> 1) & 1;
    M[0x9B00 + L] = ((d0 ^ d1 ^ 1) << 1) | d1;
    // move: full speed along the main axis, a share of it along the other
    var spd = (M[0x92A0] & 1) ? rx(0x0A) : rx(0x0B);
    if (spd) {
      var q = d & 3, e7 = e >> 7, dd = (q << 1) | e7;
      var yMain = ((q ^ dd) & 1) === 1;
      var pm = yMain ? 0 : 2, ps = yMain ? 2 : 0;
      var m = ((dd + 1) & 4) ? (-spd) & 0xFF : spd;
      add16(pm, s8(m) << 7);
      var l = e & 0x7F; if (e7) l ^= 0x7F;
      var prod = l * spd;
      if (((dd ^ 2) - 1) & 4) prod = -prod;
      add16(ps, prod);
    }
    posnSet(L);
  }
  function near(a, b) { var d = (a - b) & 0xFF; return d === 0 || d === 1 || d === 0xFF; }
  function add16(o, v) { var w = (rx(o + 1) << 8 | rx(o)) + v & 0xFFFF; wx(o, w); wx(o + 1, w >> 8); }
  function s8(v) { v &= 0xFF; return v & 0x80 ? v - 256 : v; }

  // write the object's sprite position from its flight coordinates
  function posnSet(L) {
    var x = ((rx(3) << 1) | (rx(2) >> 7)) & 0xFF;
    if (rx(0x13) & 0x40) x = (x + rx(0x11)) & 0xFF;
    M[0x9300 + L] = x;
    var Y9 = (rx(1) << 1) | (rx(0) >> 7);
    var sy = (0x161 - Y9) & 0x1FF;
    if (rx(0x13) & 0x40) sy = (sy + s8(rx(0x12))) & 0x1FF;
    M[0x9300 + L + 1] = sy & 0xFF;
    M[0x9B00 + L + 1] = (M[0x9B00 + L + 1] & 0xFE) | (sy >> 8);
    bombs(L);
  }

  function imHome() {             // l_0E08
    wx(0x13, rx(0x13) & ~1);
    wx(0, 0); wx(2, 0);
    var L = rx(0x10);
    M[0x8800 + L] = 2;
    var col = M[0x8B00 + L + 1];
    if (((col + 1) & 7) >= 5) {   // a bonus bee goes back to being a bee
      var c = M[0x9820 + 0x0E];
      M[0x8B00 + L] = ((c & 0xF8) + 6) & 0xFF;
      M[0x8B00 + L + 1] = c & 7;
      M[0x9820 + 0x0D] = 1;
    }
    wx(1, rx(6)); wx(3, rx(7));
    posnSet(L);
  }

  // bombs: each flier counts down, then drops one if its bits allow
  function bombs(L) {
    wx(0x0E, rx(0x0E) - 1);
    if (rx(0x0E) !== 0) return;
    var bit = rx(0x0F) & 1; wx(0x0F, rx(0x0F) >> 1);
    if (!bit || rx(1) < 0x4C || !M[0x9000 + 0x15] || M[0x92AC + 1]) { wx(0x0E, M[0x92E2]); return; }
    var slot = -1;
    for (var k = 0; k < 8; k++) if (M[0x8868 + k * 2] === 0x80) { slot = 0x68 + k * 2; break; }
    if (slot < 0) { wx(0x0E, M[0x92E2]); return; }
    M[0x8800 + slot] = 6; M[0x9B00 + slot] = 1;   // rev B: bombs drawn mirrored
    var bx = M[0x9300 + L];
    M[0x9300 + slot] = bx;
    var by = M[0x9300 + L + 1];
    M[0x9300 + slot + 1] = by;
    var y8 = M[0x9B00 + L + 1] & 1;
    M[0x9B00 + slot + 1] = (M[0x9B00 + slot + 1] & 0xFE) | y8;
    var byh = (y8 << 7) | (by >> 1);
    var diff = M[0x9362] - bx, left = diff < 0;
    var dX = Math.abs(diff) & 0xFF;
    var dY = 0x95 - byh; if (dY < 0) dY = -dY; dY &= 0xFF;
    var q = c_0EAA((dX << 8) | (slot + 1), dY);
    q = (((q >> 2) + q) & 0xFFFF) >> 2;
    var r = (q > 0xFF || (q & 0xFF) >= 0x60) ? 0x60 : q & 0xFF;
    r = ((left ? 1 : 0) << 7) | (r >> 1);
    var i = (slot + 8) & 0x0F;
    M[0x92B0 + i] = r; M[0x92B0 + i + 1] = 0;
    wx(0x0E, M[0x92E2]);
  }

  // heading from (H=y, L=x) to (D=y, E=x), all in pixel bits 8:1; result is 10 bits << 1
  function c_0E5B(D, E, H, L) {
    var a = (E - L) & 0xFF, b = 0;
    if (E < L) { b = 1; a = (-a) & 0xFF; }
    var c = a;
    a = (D - H) & 0xFF;
    if (D < H) { b = (b ^ 1) | 2; a = (-a) & 0xFF; }
    var lt = a < c ? 1 : 0;               // cp c: carry
    var t = ((((a << 1) | lt) & 0xFF) ^ b) & 1;   // rla, xor b, rra -> carry = bit 0
    t ^= 1;                               // ccf
    b = ((b << 1) | t) & 0xFF;
    if (lt) { var tmp = c; c = a; a = tmp; }
    var hl = c_0EAA(c << 8, a);
    var h = (hl >> 8) & 0xFF, l = hl & 0xFF;
    if ((h ^ b) & 1) l = (~l) & 0xFF;
    return (b << 8) | l;
  }
  // 16 by 8 bit division, the arcade's way (17 rounds, quotient in HL)
  function c_0EAA(hl, c) {
    var a = 0, cy = 0;
    hl &= 0xFFFF;
    for (var b = 0; b < 17; b++) {
      var t = (a << 1) | cy;              // adc a,a
      a = t & 0xFF;
      if (t > 0xFF) { a = (a - c) & 0xFF; cy = 1; }
      else if (a < c) cy = 0;             // cp c sets carry, ccf clears it
      else { a = (a - c) & 0xFF; cy = 1; }
      var h2 = (hl << 1) | cy;            // adc hl,hl
      cy = h2 > 0xFFFF ? 1 : 0;
      hl = h2 & 0xFFFF;
    }
    return hl;
  }

  // ── sprite buffer to sprite registers, first 32 objects (the main CPU copies the rest) ──
  function f_05BF() {
    M[0x92D7] = 1;
    M.copyWithin(0x8B80, 0x8B00, 0x8B40);
    M.copyWithin(0x9380, 0x9300, 0x9340);
    M.copyWithin(0x9B80, 0x9B00, 0x9B40);
    M[0x92D7] = 0;
  }

  // ── the fighter running into enemies and bombs ──
  var IXL = 0, IXH = 0;
  function f_05EE() {
    if (!M[0x9000 + 0x14]) return;
    M[0x9217] = M[0x9000 + 0x14];
    if (M[0x9820 + 0x07] && M[0x9360]) {          // the second ship of a pair
      var e2 = fghtrNotif(0x60);
      if (M[0x99BF]) { fghtrHit(e2, M[0x93E0]); M[0x9820 + 0x0B] = 0; }
    }
    if (!M[0x9362]) return;
    var e1 = fghtrNotif(0x62);
    if (!M[0x99BF]) return;
    if (M[0x9820 + 0x07]) {                       // one of the pair is gone: the other slides into its place
      M[0x9820 + 0x0B] = 0;
      M[0x9362] = M[0x9360];
      fghtrBoom(0x60, M[0x93E2]);
      return;
    }
    M[0x9000 + 0x14] = 0; M[0x9000 + 0x15] = 0; M[0x9020 + 0x05] = 0; M[0x99B9] = 0; M[0x9217] = 0;
    fghtrHit(e1, M[0x9300 + e1 + 0x80]);
  }
  function fghtrHit(e, x) { fghtrBoom(e, x); }
  function fghtrBoom(l, x) {                      // l_064F: the fighter's explosion
    M[0x9300 + l] = (x - 8) & 0xFF;
    M[0x9300 + l + 1] = (M[0x9300 + l + 1] - 8) & 0xFF;
    M[0x8B00 + l + 1] = 0x0B; M[0x8B00 + l] = 0x20;
    M[0x8800 + l] = 8; M[0x8800 + l + 1] = 0x0F;
    M[0x9B00 + l] = 0x0C;
    M[0x9820 + 0x07] = 0;
    M[0x9AA0 + 0x19] = (M[0x9201] - 1) & 0xFF;
    if (M[0x9217]) return;
    M[0x9213] = 1;
  }
  function fghtrNotif(l) {
    M[0x99BF] = 0;
    if (M[0x8800 + l] === 8) return l;
    IXL = M[0x9300 + l];
    IXH = ((M[0x9B00 + l + 1] & 1) << 7) | (M[0x9300 + l + 1] >> 1);
    if (M[0x9000 + 0x08]) detFghtr(0x38, 4, l); else detFghtr(0x00, 0x30, l);
    detFghtr(0x68, 8, l);
    return l;
  }
  function detFghtr(L, B, E) {
    for (; B > 0; B--, L += 2) {
      if ((M[0x9200 + L] | M[0x8800 + L]) & 0x80) continue;
      if ((M[0x8800 + L] & 0xFE) === 4) continue;
      var x = M[0x9300 + L];
      if (!x) continue;
      if (((x - IXL - 7) & 0xFF) + 13 <= 0xFF) continue;
      var y = ((M[0x9B00 + L + 1] & 1) << 7) | (M[0x9300 + L + 1] >> 1);
      if (((y - IXH - 4) & 0xFF) + 7 <= 0xFF) continue;
      M[0x99BF] = 1;
      // the hit is handled as if by a rocket, and the search goes on in the rocket's loop
      var r = dspchr(L, E, true);
      if (r === 'ret') return;
      detRckt(L + 2, B - 1, E);
      return;
    }
  }

  // ── rockets ──
  function f_06F5() { rcktMan(0x92A4, 0x9364); rcktMan(0x92A5, 0x9366); }
  function rcktMan(de, hl) {
    if (!M[hl]) return;
    var b = M[de], dX = 6, dY = b & 7;
    if (b & 0x80) { dX = b & 7; dY = 6; }
    if (b & 0x40) dX = (-dX) & 0xFF;
    var x = (M[hl] + dX) & 0xFF;
    M[hl] = x;
    if (x >= 0xF0) { M[hl] = 0; M[hl + 0x800] = 0; return; }
    IXL = x;
    if (b & 0x20) dY = (-dY) & 0xFF;
    var s = M[hl + 1] + dY, y = s & 0xFF;
    M[hl + 1] = y;
    if (((s > 0xFF ? 1 : 0) ^ (dY >> 7)) & 1) M[hl + 0x801] ^= 1;
    IXH = ((M[hl + 0x801] & 1) << 7) | (y >> 1);
    if (IXH < 0x14 || IXH >= 0x9C) { M[hl] = 0; M[hl + 0x800] = 0; return; }
    var E = (hl & 0xFF) + 1;
    if (M[0x9000 + 0x1D]) detRckt(0x08, 0x2C, E); else detRckt(0x00, 0x30, E);
  }
  function detRckt(L, B, E) {
    for (; B > 0; B--, L += 2) {
      if ((M[0x9200 + L] | M[0x8800 + L]) & 0x80) continue;
      var c = M[0x8800 + L];
      if ((c & 0xFE) === 4) continue;
      var y = ((M[0x9B00 + L + 1] & 1) << 7) | (M[0x9300 + L + 1] >> 1);
      if (((y - IXH - 3) & 0xFF) + 6 <= 0xFF) continue;
      var flying = (((c - 1) & 0xFE) !== 0);
      var x = M[0x9300 + L], t;
      if (!M[0x9820 + 0x07]) {
        if (((x - IXL - 6) & 0xFF) + 11 <= 0xFF) continue;
      } else {
        t = ((x - IXL - 20) & 0xFF);
        if (t + 11 <= 0xFF) {
          t = (t + 11) & 0xFF;
          if (t + 4 > 0xFF) continue;
          t = (t + 4) & 0xFF;
          if (t + 11 <= 0xFF) continue;
        }
      }
      var hc = M[0x9820 + 0x24] | M[0x9820 + 0x25] << 8; hc = (hc + 1) & 0xFFFF;
      M[0x9820 + 0x24] = hc; M[0x9820 + 0x25] = hc >> 8;
      if (dspchr(L, E, flying) === 'ret') return;
    }
  }
  // what got hit, and what happens to it.  L = target, E = rocket (b1) or fighter (b0).
  function dspchr(L, E, flying) {
    M[0x9300 + E] = 0; M[0x9B00 + E] = 0;
    var c = M[0x8B00 + L + 1];
    if (c === 0) { M[0x8B00 + L + 1] = 1; M[0x9AA0 + 0x04] = 1; return; }   // green boss turns blue
    if (c === 0x0B) { M[0x9300 + L] = 0; M[0x8800 + L] = 0x80; return 'ret'; }   // a bomb
    if (flying) {
      var q = M[0x8800 + L + 1];
      M[0x9100 + ((q + 0x13) & 0xFF)] = 0;       // free its flight slot
      M[0x9288]++;
      M[0x92A8] = (M[0x92A8] - 1) & 0xFF;
      if (M[0x92A8] === 0) {                       // all eight of a challenging-stage group
        M[0x9200 + L] = M[0x9285];
        M[0x929F] = (M[0x929F] + M[0x9284]) & 0xFF;
        return scored(L, c, flying);
      }
      if (c === 7) { M[0x9200 + L] = 0xB8; return scored(L, c, flying); }   // the captured fighter
      if (M[0x9820 + 0x0D] === L || (L & 0x38) === 0x38) {                // bonus bees
        M[0x99B0] = (M[0x99B0] - 1) & 0xFF;
        if (M[0x99B0]) { M[0x9200 + L] = 0x81; return scored(L, c, flying); }
        M[0x929F] = (M[0x929F] + M[0x99B1]) & 0xFF;
        M[0x9200 + L] = M[0x99B2];
        return scored(L, c, flying);
      }
      if (c === 1) {                                // a diving boss, hit for the second time
        var cs = L & 7;
        if (M[0x8800 + cs] === 9) {                 // carrying a fighter: rescue it
          var cq = M[0x8800 + cs + 1];
          M[0x9100 + ((cq + 0x13) & 0xFF)] = 0;
          M[0x8B00 + cs + 1] = 9;
          M[0x9820 + 0x08] = cs;
          M[0x8800 + cs] = 0;
          M[0x928B] = 0;
          M[0x9000 + 0x1D] = 1; M[0x928D] = 1; M[0x9AA0 + 0x11] = 1;
        }
        M[0x92AD] = 6;
        var p = 0x9820 + 0x10 + (L & 7);
        M[0x929F] = (M[0x929F] + M[p]) & 0xFF;
        M[0x9200 + L] = M[p + 1];
        return scored(L, c, flying);
      }
    }
    M[0x9200 + L] = 0x81;
    return scored(L, c, flying);
  }
  function scored(L, c, flying) {                  // l_07DF
    if (M[0x9820 + 0x08] === L) { M[0x9820 + 0x0B] = 0; M[0x9820 + 0x08] = 1; }
    var i = c === 7 ? 6 : (c - 1) & 3;
    M[0x9AA1 + i] = 1;
    if (c === 7) M[0x9820 + 0x0B] = 0;
    M[0x9290 + c]++;                               // points: one count per colour, two if it was flying
    if (flying) M[0x9290 + c]++;
  }
  // ═══ CPU 0: game control (game_ctrl, task_man, gg1-2) ═══════════════════
  // The arcade's main program waits in loops while the 60 Hz tasks run; here those loops are generators
  // that yield once a frame.

  function memset(a, v, n) { M.fill(v, a, a + n); }
  function rd16(a) { return M[a] | M[a + 1] << 8; }
  function wr16(a, v) { M[a] = v & 0xFF; M[a + 1] = (v >> 8) & 0xFF; }

  // ── text ──
  // [position (tile RAM address, or 0 when the caller gives one), colour, text]
  function dea(r, c) { return 0x8000 + 0x40 + (0x1C - c - 1) * 0x20 + r; }
  var STR = [null,
    [dea(11, 6), 0, 'PUSH START BUTTON'],   [dea(16, 10), 0, 'GAME OVER'],   [dea(16, 10), 0, 'READY !'],
    [dea(16, 11), 0, 'PLAYER 1'],           [0, 0, 'PLAYER 2'],              [dea(16, 10), 0, 'STAGE '],
    [dea(16, 5), 0, 'CHALLENGING STAGE'],   [dea(16, 5), 0, 'NUMBER OF HITS'], [dea(19, 8), 0, 'BONUS  '],
    [dea(17, 6), 4, 'FIGHTER CAPTURED'],    [dea(13, 0), 0, '                           '],
    [dea(13, 10), 4, 'PERFECT c'],          [dea(19, 2), 5, 'SPECIAL BONUS 10000 PTS'],
    [dea(2, 11), 0, 'GALAGA'],              [dea(5, 8), 0, ']] SCORE ]]'],   [dea(8, 12), 0, '50    100'],
    [dea(10, 12), 0, '80    160'],          [dea(11, 12), 0, ''],            [dea(27, 6), 3, 'e 1981 NAMCO LTDa'],
    [dea(30, 11), 4, '\x66\x67\x68\x69\x6A\x6B\x6C'],
    [dea(15, 9), 4, ']RESULTS]'],           [dea(18, 4), 5, 'SHOTS FIRED          '], [0, 5, '  MISSILES'],
    [dea(21, 4), 5, 'NUMBER OF HITS       '], [dea(24, 4), 3, 'HIT]MISS RATIO       '], [0, 3, '$`'],
    [dea(15, 4), 5, '1ST BONUS FOR   '],    [dea(18, 4), 5, '2ND BONUS FOR   '], [dea(21, 4), 5, 'AND FOR EVERY   '],
    [0, 5, '0000 PTS']];
  function tileOf(ch) {
    var a = ch.charCodeAt(0) - 0x30;
    if (a < 0) return 0x24;
    return a >= 0x11 ? a - 7 : a;
  }
  // c_string_out: returns the tile RAM address just past the text
  function stringOut(i, at) {
    var s = STR[i], hl = at != null ? at : s[0];
    for (var k = 0; k < s[2].length; k++) {
      M[hl] = tileOf(s[2].charAt(k)); M[hl + 0x400] = s[1];
      hl = (hl - 0x20) & 0xFFFF;
    }
    return hl;
  }
  // c_text_out_i_to_d: a number, left to right from DE; returns DE past it
  function textOut(v, de) {
    var s = String(v & 0xFFFF);
    for (var k = 0; k < s.length; k++) { M[de] = s.charCodeAt(k) - 48; de = (de - 0x20) & 0xFFFF; }
    return de;
  }

  function* tdelay3() { M[0x92AF] = 3; while (M[0x92AF]) yield; }
  function spriteRamClr() { memset(0x9300, 0, 0x80); memset(0x9B00, 0, 0x80); memset(0x8800, 0x80, 0x80); }
  function playfldClr() {
    memset(0x8040, 0x24, 0x380); memset(0x8440, 0, 0x380);
    memset(0x87BF, 0x04, 0x20); memset(0x87DF, 0x4E, 0x20);   // (the LDIRs leave HL one short)
  }
  function motionClr() { memset(0x9100, 0, 0xF0); }
  var TASK_DEF = [0x1F, 1, 0, 0, 0, 1, 0, 0,  0, 0, 0, 0, 1, 1, 0, 1,  0, 0, 0, 0, 0, 0, 0, 1,  0, 0, 0, 0, 0, 0, 0, 0x0A];
  function initTaskman() {
    for (var i = 0; i < 32; i++) { M[0x9000 + i] = TASK_DEF[i]; M[0x98E0 + i] = TASK_DEF[i]; }
    M[0x9000] = 0;
  }

  // ── power on ──
  function gameInit() {
    memset(0x92AC, 0, 4); memset(0x9AA0, 0, 0x20);
    M[0x9215] = 0; M[0x99B9] = 0;
    memset(0x92CA, 0xFF, 0x10);
    memset(0x83C0, 0x24, 0x40); memset(0x8000, 0x24, 0x40); memset(0x8400, 0x03, 0x40);
    playfldClr();
    M[0x9201] = 1;
    starClr = 1;                          // the starfield chip restarts from its seed
    spriteRamClr();
    // "1UP    HIGH SCORE" and the high score
    var hs = [0x00, 0x00, 0x00, 0x00, 0x02, 0x24];
    for (var i = 0; i < 5; i++) M[0x83ED + i] = hs[i];
    var t = [0x0E, 0x1B, 0x18, 0x0C, 0x1C, 0x24, 0x11, 0x10, 0x12, 0x11, 0x24, 0x24, 0x24, 0x24, 0x19, 0x1E, 0x01];
    for (i = 0; i < 17; i++) M[0x83CB + i] = t[i];
    initTaskman();
    motionClr();
    M[0x99B8] = M[0x99B5];
  }

  // ── the main program ──
  function* mainline() {
    gameInit();
    for (;;) yield* gMain();
  }
  function* gMain() {
    M[0x9215] = 0; M[0x9012] = 0;
    memset(0x9200, 0, 0x80);
    M[0x99BE] = 6;
    motionClr(); spriteRamClr(); initTaskman();
    var st = M[0x99B8] ? 2 : 1;
    M[0x9201] = st;
    if (st === 1) {
      M[0x9203] = 0; M[0x9002] = 1;
      while (M[0x9201] === 1) yield;
      initTaskman(); playfldClr(); motionClr(); spriteRamClr();
    }
    // ready: PUSH START BUTTON and the bonus lines
    M[0x920B] = 0;
    stringOut(0x13); stringOut(1);
    attrTbl = ATTR_SHIPS; attrPtr = 0;
    var b0 = M[0x9980];
    if (b0 !== 0xFF) {
      bonusLine(0x1B, b0);
      var b1 = M[0x9981];
      if (b1 !== 0xFF) {
        bonusLine(0x1C, b1 & 0x7F);
        if (!(b1 & 0x80)) bonusLine(0x1D, b1 & 0x7F);
      }
    }
    while (M[0x9201] === 2) yield;
    // start
    M[0x9AB7] = M[0x9201];
    playfldClr(); spriteRamClr();
    starClr = 1;
    memset(0x9820, 0, 0xA0);
    M[0x9AB7] = 0; M[0x99B9] = 0;
    M[0x9AAB] = 1;                        // the start-of-game tune
    M[0x9012] = 1; M[0x98F2] = 1;
    gctlGameInit(); gameOrDemoInit();
    stringOut(4);
    M[0x92AF] = 8; while (M[0x92AF]) yield;
    memset(0x9290, 0, 0x10); memset(0x98B0, 0, 0x30);
    stringOut(0x0B, 0x83B0);
    M[0x9860 + 0x20] = 1;
    M[0x983E] = M[0x9980]; M[0x987E] = M[0x9980];
    if (hooks.newGame) hooks.newGame();   // (the app: carry on a saved game from its last stage)
    yield* gameRun();
  }
  function bonusLine(i, digit) {
    var hl = stringOut(i);
    var de = textOut(digit, (hl + 0x40) & 0xFFFF);
    stringOut(0x1E, de);
    spriteTilesDispl();
  }
  // the fighters beside the bonus lines
  var ATTR_SHIPS = [0x00, 0x81, 0x19, 0x56, 0x02, 0x81, 0x19, 0x62, 0x04, 0x81, 0x19, 0x6E], attrTbl = ATTR_SHIPS, attrPtr = 0;
  function spriteTilesDispl() {
    var l = attrTbl[attrPtr], c = attrTbl[attrPtr + 1];
    M[0x8B00 + l] = (c & 0x78) + 6;
    M[0x8B00 + l + 1] = (c & 7) | (c & 0x80 ? 8 : 0);
    M[0x8800 + l] = 1;
    M[0x9300 + l] = attrTbl[attrPtr + 2];
    var y = attrTbl[attrPtr + 3];
    M[0x9300 + l + 1] = (y << 1) & 0xFF;
    M[0x9B00 + l + 1] = y >> 7;
    attrPtr += 4;
  }

  function gctlGameInit() {
    M[0x9820] = M[0x9982]; M[0x9860] = M[0x9982];
    var src = [0x00, 0x00, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24];
    for (var i = 0; i < 7; i++) M[0x83F8 + i] = src[i];
    for (i = 0; i < 4; i++) M[0x83C3 + i] = src[2 + i];
    for (i = 0; i < 7; i++) M[0x83E3 + i] = src[2 + i];
  }
  // rockets and bombs: codes, colours (c_game_or_demo_init)
  function gameOrDemoInit() {
    var l = 0x64, c = 0, d = 9;
    for (var b = 10; b > 0; b--) {
      M[0x8B00 + l] = 0x30; M[0x9300 + l] = 0; M[0x9B00 + l] = c; M[0x8B00 + l + 1] = d;
      l += 2;
      if (b === 9) { c = 1; d = 0x0B; }
    }
  }

  // ── a game in progress ──
  function* gameRun() {
    var next = 'splsh';
    for (;;) {
      if (next === 'splsh') { yield* stgInitSplash(); next = 'plyrup'; }
      if (next === 'plyrup') { stringOut(4 + M[0x9840], 0x826E); next = 'wait'; }
      if (next === 'wait') {
        yield* playerRespawn();
        var t = (M[0x92AE] + 0x1E) & 0xFF;
        M[0x92AE] = t < 0x78 ? t : 0x78;
        yield* tdelay3();
        next = 'rdy';
      }
      if (next === 'rdy') {
        M[0x9015] = 1; M[0x9025] = 1; M[0x9842] = 1;
        stringOut(0x0B, 0x83B0); stringOut(0x0B, 0x83AE);
        next = yield* runner();
      }
      if (next === '1up') { if (!M[0x9843]) yield* stgInitSplash(); next = 'wait'; }
      if (next === 'brk') { yield* stgInitSplash(); next = 'rdy'; }
      if (next === 'over') return;
    }
  }
  function* runner() {
    for (;;) {
      supvScore();
      var r = supvStage();
      if (r) {
        var n = yield* restartHdlr();
        if (n !== 'runner') return n;
      }
      yield;
    }
  }
  function supvStage() {
    if (!(M[0x9008] | M[0x92A7])) { M[0x9AA0] = 0; return true; }
    if (!M[0x9213]) return false;
    M[0x9842] = 0;
    return true;
  }
  function* restartHdlr() {
    M[0x92AF] = 4;
    for (;;) {
      if (M[0x901D]) {                    // a rescued fighter is still landing
        M[0x9213] = 0; M[0x9025] = 1;
        if (M[0x92A7]) return 'runner';
        while (M[0x901D]) yield;
        return 'brk';
      }
      if (!M[0x92AF]) break;
      yield;
    }
    supvScore();
    M[0x9843] = M[0x92A7];
    if (M[0x9213] || M[0x92A7]) return yield* plyrTerminate();
    if (!M[0x9825]) return yield* chllngStgEnd();
    return 'brk';
  }
  function* plyrTerminate() {
    var a = M[0x9820]; M[0x9820] = (a - 1) & 0xFF;
    if (a) return '1up';
    // game over
    stringOut(2);
    yield* tdelay3(); yield* tdelay3();
    while (M[0x9018]) yield;
    motionClr(); spriteRamClr(); playfldClr();
    stringOut(0x15); stringOut(0x16);
    textOut(rd16(0x9846), 0x8132);
    stringOut(0x18);
    textOut(rd16(0x9844), 0x8135);
    stringOut(0x19);
    stringOut(0x1A, hitMissRatio());
    M[0x92AE] = 0x0E; while (M[0x92AE]) yield;
    playfldClr();
    if (hooks.gameOver) hooks.gameOver();
    M[0x9AB0] = 0;
    while (M[0x9AAC] || M[0x9AB6]) { if (M[0x9AAC]) M[0x9AAC] = 1; yield; }
    playfldClr();
    // g_halt
    yield;
    memset(0x9AA0, 0, 0x20);
    return 'over';
  }
  function* playerRespawn() {             // c_player_respawn
    M[0x9014] = 1;
    if (M[0x8270] === 0x24) stringOut(3);
    while (M[0x9287]) yield;
    drawResvShips();
    M[0x8B62] = 6; M[0x8B63] = 9;
    M[0x9362] = 0x7A; M[0x9363] = 0x29; M[0x9B63] = 1; M[0x9B62] = 0;
    M[0x9213] = 0; M[0x99B9] = 1;
  }
  function* chllngStgEnd() {
    var e = M[0x9288];
    M[0x9AA0 + (e === 40 ? 0x14 : 0x0E)] = 1;
    yield* tdelay3();
    stringOut(8);
    yield* tdelay3();
    textOut(e, 0x8110);
    yield* tdelay3();
    var a;
    if (M[0x9288] !== 40) {
      var de = stringOut(9);
      yield* tdelay3();
      a = M[0x9288];
      if (a) { de = textOut(a, de); M[de] = 0; de = (de - 0x20) & 0xFFFF; }
      M[de] = 0;
      a = M[0x9288];
    } else {
      for (var b = 7; b > 0; b--) {
        while (M[0x92A0] & 0x0F) yield;
        stringOut(b & 1 ? 0x0C : 0x0B);
        while (!(M[0x92A0] & 0x0F)) yield;
      }
      stringOut(0x0D);
      a = 100;
    }
    M[0x929F] = (M[0x929F] + a) & 0xFF;
    supvScore();
    yield* tdelay3(); yield* tdelay3();
    stringOut(0x0B, 0x83B0); stringOut(0x0B, 0x83B3); stringOut(0x0B);
    return 'brk';
  }

  // ── the score lives on the screen, as digit tiles ──
  var SCORE_LUT = [0x10, 0, 0, 0, 0, 0, 0, 0, 0x50, 0x08, 0x08, 0x08, 0x05, 0x08, 0x15, 0x00];
  function supvScore() {
    var ixl = M[0x9840] ? 0xE4 : 0xF9;
    for (var b = 16; b >= 1; b--) {
      var hp = 0x9290 + (16 - b), c = SCORE_LUT[b - 1];
      while (M[hp]) {
        M[hp]--;
        incrAdd(0x8300 + ixl, c & 0x0F);
        incrAdd(0x8300 + ixl + 1, c >> 4);
      }
    }
    // high score: copy the player's score over it if it is higher
    var e = 0x8300 + ixl + 4, hl = 0x83F2, k, copy = false;
    for (k = 6; k > 0; k--) {
      var d = M[e], h = M[hl];
      var a = (d - h + 9) & 0xFF;
      if (a >= 0xE5) { copy = true; break; }
      a = (a - 0x0A) & 0xFF;
      if (a < 9) { copy = true; break; }
      if (((a + 1) & 0xFF) !== 0) break;
      hl--; e--;
    }
    if (copy) for (; k > 0; k--) { M[hl] = M[e]; hl--; e--; }
    // extra fighters
    hl = 0x8300 + ixl + 4;
    var t = M[hl] === 0x24 ? 0 : M[hl];
    t = ((t & 0x3F) << 1) & 0xFF;
    var c2 = t; t = ((t << 2) + c2) & 0xFF;
    var u = M[hl - 1] === 0x24 ? 0 : M[hl - 1];
    t = (t + u) & 0xFF;
    if (t !== M[0x983E]) return;
    var b1 = M[0x9981], cc = b1 & 0x7F, v = M[0x983E];
    v = v >= cc ? (v + b1) & 0xFF : cc;
    M[0x983E] = v;
    M[0x9AAA] = v;
    M[0x9820]++;
    drawResvShips();
    if (hooks.extra) hooks.extra();
  }
  function incrAdd(hl, a) {
    if (!a) return;
    a = (a + M[hl]) & 0xFF;
    if (a >= 0x24) a = (a - 0x24) & 0xFF;
    if (a < 0x0A) { M[hl] = a; return; }
    a = (a - 0x0A) & 0xFF;
    for (;;) {
      M[hl] = a;
      hl++;
      a = M[hl];
      if (a === 0x24) a = 0;
      if (a !== 9) { M[hl] = a + 1; return; }
      a = 0;
    }
  }

  // hit-miss ratio, to one decimal, as the arcade works it out
  // the hit-miss ratio, worked out to two places and rounded in BCD at 99B0 as the arcade does (c_0A72)
  function divmod(hl, c) {                // c_divmod: HL / A, remainder back in A
    var a = 0, cy = 0;
    for (var b = 0; b < 17; b++) {
      var t = (a << 1) | cy;
      a = t & 0xFF;
      if (t > 0xFF) { a = (a - c) & 0xFF; cy = 1; }
      else if (a < c) cy = 0;
      else { a = (a - c) & 0xFF; cy = 1; }
      var h2 = (hl << 1) | cy;
      cy = h2 > 0xFFFF ? 1 : 0;
      hl = h2 & 0xFFFF;
    }
    return { hl: hl, a: a };
  }
  function bcdInc(v) {                    // add 1, daa
    var lo = (v & 0x0F) + 1, hi = v >> 4;
    if (lo > 9) { lo -= 10; hi++; }
    var c = 0;
    if (hi > 9) { hi -= 10; c = 1; }
    return { v: (hi << 4) | lo, c: c };
  }
  function hitMissRatio() {
    var hl = rd16(0x9844), de = rd16(0x9846), a = 0;
    if (!de) { M[0x99B0] = 0; M[0x99B1] = 0; }
    else {
      while (!(de & 0x8000) && !(hl & 0x8000)) { hl = (hl << 1) & 0xFFFF; de = (de << 1) & 0xFFFF; }
      var d = de >> 8;
      var r1 = divmod(hl, d), r2 = divmod(r1.a << 8, d);
      var p = 0x99B0, sp = r2.hl;
      a = r1.hl >> 8; hl = r1.hl & 0xFF;
      for (var b = 4; b > 0; b--) {
        var m = M[p], na = (a & 0xF0) | (m >> 4);          // rld (hl)
        M[p] = ((m << 4) | (a & 0x0F)) & 0xFF; a = na;
        if (b & 1) p++;
        var t1 = (hl * 10) & 0xFFFF, a1 = t1 >> 8; hl = t1 & 0xFF;
        var t2 = (sp * 10) & 0xFFFF, a2 = t2 >> 8; sp = t2 & 0xFF;
        hl += a2;
        a = (a1 + (hl >> 8)) & 0xFF; hl &= 0xFF;
      }
      if (a >= 5) {
        var lo = bcdInc(M[0x99B1]); M[0x99B1] = lo.v;
        if (lo.c) M[0x99B0] = bcdInc(M[0x99B0]).v;
      }
    }
    // XXX.X, leading zeros left off
    var at = 0x8138, flag = 0, q = 0x99B0;
    for (var n = 4; n > 0; n--) {
      if (n === 1) { M[at] = 0x2A; at = (at - 0x20) & 0xFFFF; }
      var v = M[q], dg = v >> 4; M[q] = (v << 4) & 0xFF;   // xor a; rld
      if (n & 1) q++;
      if (dg || flag) { flag = 1; M[at] = dg; at = (at - 0x20) & 0xFFFF; }
      if (n === 3) flag = 1;
    }
    return at;
  }

  function drawResvShips() {
    // rev B: eight places along the bottom row, sharing it with the stage badges (never drawn over)
    var e = ((~M[0x9820]) + 9) & 0xFF, d = 0x49;
    function tile(hl) {                 // once a slot is past the count it shows a space
      d++;
      var c = d;
      for (var b = 8; b > 0; b--) {
        if (b === e) c = 0x24;
        var t = M[hl];
        if (t < 0x36 || t >= 0x4A) M[hl] = c;
        hl -= 2;
      }
    }
    tile(0x801D); tile(0x801C); tile(0x803D); tile(0x803C);
  }

  // ── a new stage: STAGE n, the badges, the mob ──
  function* stgInitSplash() {
    M[0x9821] = (M[0x9821] + 1) & 0xFF;
    var a = (M[0x9821] + 1) & 3;
    M[0x9825] = a;
    if (a) { var de = stringOut(6); textOut(M[0x9821], de); a = 0; }
    else { stringOut(7); M[0x9AAD] = 1; a = 8; }
    M[0x92A8] = a;
    M[0x92AE] = 3; M[0x920B] = 3;
    yield* newLevelTokens(false, M[0x9825]);
    while (M[0x92AE]) yield;
    if (stgInitEnv()) { stringOut(0x0B, 0x83B0); yield* stgInitSplash(); }
  }
  function stgInitEnv() {
    M[0x92AE] = 120;
    c_2896(); c_25A2();
    M[0x92AC] = 2;
    c_12C3(0);
    for (var i = 0; i < 0x30; i++) M[0x9200 + i * 2] = 0;
    M[0x9009] = 0; M[0x9010] = 0; M[0x9004] = 0;
    M[0x9288] = 0;
    M[0x982C] = 0; M[0x9841] = 0; M[0x9842] = 0; M[0x9826] = 0;
    M[0x99B0] = 0; M[0x9824] = 0;
    M[0x982D] = 1; M[0x986D] = 1; M[0x9828] = 1;
    M[0x900B] = 1; M[0x9008] = 1; M[0x900A] = 1;
    c_2C00();
    for (var k = 0; k < 4; k++) { M[0x9830 + k * 2] = 0x01; M[0x9831 + k * 2] = 0xB5; }
    return rackTest;                    // the operator's rack-advance switch: on to the next stage
  }

  // the stage badges, bottom right: 50s, 30/20/10s, 5s and 1s
  function* newLevelTokens(quiet, snd) {
    // (rev B: the spare fighters share this row, so only badge tiles are wiped, and they're redrawn after)
    for (var w = 0; w < 0x12; w++) { if (M[0x8002 + w] < 0x4A) M[0x8002 + w] = 0x24; if (M[0x8022 + w] < 0x4A) M[0x8022 + w] = 0x24; }
    var a = M[0x9821], b = 0, hl = 0x8001;
    while (a >= 50) { a -= 50; b++; hl += 2; }
    var div = Math.floor(a / 10), mod = a % 10;
    var cols = mod >= 5 ? mod - 4 : mod;
    cols += (div & 1) ? 2 : div;
    hl += cols;
    var st = { hl: hl };
    for (var k = 0; k < b; k++) { yield* tok1(st, 0x36 + 16, quiet, snd); tok2(st, 0x36 + 16 + 2); }
    if (div) {
      if (div === 4) { yield* tok1(st, 0x36 + 12, quiet, snd); tok2(st, 0x36 + 14); yield* tok1(st, 0x36 + 4, quiet, snd); tok2(st, 0x36 + 6); }
      else { yield* tok1(st, 0x36 + div * 4, quiet, snd); tok2(st, 0x36 + div * 4 + 2); }
    }
    var ones = mod;
    if (mod >= 5) { yield* tok1(st, 0x38, quiet, snd); ones = mod - 5; }
    for (k = 0; k < ones; k++) yield* tok1(st, 0x36, quiet, snd);
    drawResvShips();
  }
  function* tok1(st, d, quiet, snd) {
    if (!quiet) {
      var e = (M[0x92A0] + 8) & 0xFF;
      while (M[0x92A0] !== e) yield;
      M[0x9AB5] = snd;
    }
    tok2(st, d);
  }
  function tok2(st, d) {
    var hl = st.hl;
    M[hl] = d; M[hl | 0x20] = d + 1;
    var col = ((d + 2) & 0x0C) === 8 ? 1 : 2;
    M[(hl | 0x20) + 0x400] = col; M[hl + 0x400] = col;
    st.hl = hl - 1;
  }

  // the formation's home positions (c_12C3)
  var FMTN_ORIG = [0x31, 0x41, 0x51, 0x61, 0x71, 0x81, 0x91, 0xA1, 0xB1, 0xC1, 0x92, 0x8A, 0x82, 0x7C, 0x76, 0x70];
  function c_12C3(off) {
    for (var i = 0; i < 16; i++) { M[0x9900 + i * 2] = 0; M[0x9901 + i * 2] = FMTN_ORIG[i]; }
    for (i = 0; i < 10; i++) M[0x9800 + i * 2] = FMTN_ORIG[i];
    for (i = 0; i < 6; i++) {
      var a = (FMTN_ORIG[10 + i] + off) & 0xFF;
      a = (~(a + 0x4F)) & 0xFF;
      M[0x9814 + i * 2] = (a << 1) & 0xFF;
      M[0x9815 + i * 2] = a >> 7;
    }
    M[0x920F] = M[0x9215];
  }
  // ═══ CPU 0: attract mode, bombers, fighter controls (gg1-2_fx) ══════════

  // ── the demo fighter, driven by a script ──
  var D_181F = [0x08, 0x18, 0x8A, 0x08, 0x88, 0x06, 0x81, 0x28, 0x81, 0x05, 0x54, 0x1A, 0x88, 0x12, 0x81, 0x0F,
    0xA2, 0x16, 0xAA, 0x14, 0x88, 0x18, 0x88, 0x10, 0x43, 0x82, 0x10, 0x88, 0x06, 0xA2, 0x20, 0x56, 0xC0];
  var D_1887 = [0x02, 0x8A, 0x04, 0x82, 0x07, 0xAA, 0x28, 0x88, 0x10, 0xAA, 0x38, 0x82, 0x12, 0xAA, 0x20, 0x88,
    0x14, 0xAA, 0x20, 0x82, 0x06, 0xA8, 0x0E, 0xA2, 0x17, 0x88, 0x12, 0xA2, 0x14, 0x18, 0x88, 0x1B,
    0x81, 0x2A, 0x5F, 0x4C, 0xC0];
  var D_1928 = [0x08, 0x1B, 0x81, 0x3D, 0x81, 0x0A, 0x42, 0x19, 0x81, 0x28, 0x81, 0x08,
    0x18, 0x81, 0x2E, 0x81, 0x03, 0x1A, 0x81, 0x11, 0x81, 0x05, 0x42, 0xC0];
  var demoVec = D_1928, demoI = 0;
  function f_1700() {
    var tok = demoVec[demoI], k = (tok >> 5) & 7;
    if (k === 2) {
      if (M[0x92A0] & 0x0F) return;
      M[0x9207] = (M[0x9207] - 1) & 0xFF;
      if (M[0x9207]) return;
      demoNext(); return;
    }
    if (k === 5) { c_1F0F(); k = 4; }
    if (k === 4) {
      var a;
      if (tok & 1) {
        var d = M[0x9362] - M[0x9300 + M[0x9209]];
        a = d === 0 ? 0x0A : d < 0 ? 0x08 : 0x02;
      } else a = tok & 0x0A;
      c_1F92(a, M[0x9827]);
      if (M[0x92A0] & 3) return;
      M[0x9207] = (M[0x9207] - 1) & 0xFF;
      if (M[0x9207]) return;
      c_1F0F();
    }
    demoNext();
  }
  function demoNext() {                   // case_1766
    var tok = demoVec[demoI];
    if ((tok & 0xC0) === 0x80) demoI++;
    demoI++;
    tok = demoVec[demoI];
    switch ((tok >> 5) & 7) {
      case 0: case 1: M[0x9209] = (tok << 1) & 0x7E; break;
      case 2: M[0x9207] = tok & 0x1F; break;
      case 3: stringOut(tok & 0x1F); break;
      case 4: case 5: M[0x9207] = demoVec[demoI + 1]; break;
      case 6: M[0x9003] = 0; break;
    }
  }

  // ── attract mode ──
  var ATTR_SPTILES = [0x08, 0x1B, 0x44, 0x3A, 0x0A, 0x12, 0x44, 0x42, 0x0C, 0x08, 0x7C, 0x50,
    0x34, 0x08, 0x34, 0x5C, 0x30, 0x08, 0x64, 0x5C, 0x32, 0x08, 0x94, 0x5C, 0x4A, 0x12, 0xA4, 0x64,
    0x36, 0x08, 0xC4, 0x5C, 0x58, 0x12, 0xB4, 0x64, 0x52, 0x12, 0xD4, 0x64];
  function attStep() { M[0x9203]++; if (M[0x9203] === 0x0F) M[0x9203] = 0; }
  function c_133A() {                     // the fighter appears (the caller has waited for fliers to land)
    drawResvShips();
    M[0x8B62] = 6; M[0x8B63] = 9;
    M[0x9362] = 0x7A; M[0x9363] = 0x29; M[0x9B63] = 1; M[0x9B62] = 0;
    M[0x9213] = 0; M[0x99B9] = 1;
  }
  function f_17B2() {
    if (M[0x9201] !== 1) return;
    switch (M[0x9203]) {
      case 0: case 6: case 0x0D: playfldClr(); spriteRamClr(); attStep(); break;
      case 1: attrTbl = ATTR_SPTILES; attrPtr = 0; M[0x9205] = 0; M[0x92A8] = 0; M[0x92AE] = 2; attStep(); break;
      case 2:
        if (M[0x92AE]) return;
        M[0x92AE] = 2;
        if (M[0x9205] === 5) { attStep(); return; }
        M[0x9205]++;
        stringOut(0x0D + M[0x9205]);
        if (M[0x9205] >= 3) spriteTilesDispl();
        break;
      case 3:
        for (var b = 0; b < 7; b++) spriteTilesDispl();
        M[0x9820] = 0; M[0x9005] = 0;
        c_133A();
        M[0x92C0] = 0x0D; M[0x92C1] = 0xFF; M[0x92C2] = 0xFF; M[0x92C4] = 0x0D; M[0x92C5] = 0xFF; M[0x92C6] = 0xFF;
        demoVec = D_1928; demoI = 0;
        memset(0x92CA, 0, 0x10);
        M[0x9827] = 0; M[0x920B] = 0;
        M[0x982B] = 1; M[0x9010] = 1; M[0x900B] = 1; M[0x9003] = 1;
        M[0x9AB7] = hooks.attractSound ? 0 : 1;
        gameOrDemoInit();
        attStep();
        break;
      case 4: case 9: case 0x0B: if (!M[0x9003]) attStep(); break;
      case 5: {
        var t = M[0x92AE];
        if (t === 0) { M[0x9234] = 0x34; M[0x92AE] = 9; }
        else if (t === 1) attStep();
        else if (t === 6) { M[0x9362] = 0; stringOut(0x13); stringOut(0x14); }
        break;
      }
      case 7:
        if ((M[0x92A0] & 0x1F) !== 0x1F) return;
        M[0x9005] = 1; stringOut(2); attStep();
        break;
      case 8:
        M[0x982B] = 0;
        M[0x9AB7] = 1; M[0x9821] = 1; M[0x9003] = 1; M[0x9015] = 1; M[0x9825] = 1;
        demoVec = D_1887; demoI = 0;
        stgInitEnv();
        c_133A();
        M[0x920B] = 1; M[0x9842] = 1; M[0x982C] = 1;
        M[0x99C4] = 2; M[0x99C5] = 2;
        attStep();
        break;
      case 0x0A:
        if (M[0x9287]) return;
        c_133A();
        demoVec = D_181F; demoI = 0;
        M[0x9003] = 1; M[0x9015] = 1; M[0x9025] = 1;
        attStep();
        break;
      case 0x0C:
        motionClr(); initTaskman();
        M[0x9010] = 0; M[0x920B] = 0; M[0x9002] = 1;
        attStep();
        break;
      case 0x0E: {
        var t3 = M[0x92AF];
        if (t3 === 0) { hiscoreShow(); M[0x92AF] = 0x0A; }
        else if (t3 === 1) attStep();
        break;
      }
    }
  }

  // ── the captured fighter: up with the boss, then into the formation above it ──
  function f_19B2() {
    // (rev B ROM order: the ship turns red now, and moves into the boss's slot when the text goes)
    if (M[0x928E]) {                      // just caught: FIGHTER CAPTURED
      stringOut(0x0A);
      M[0x92AD] = 6; M[0x8B63] = 7;
      M[0x928B] = 0; M[0x928E] = 0;
      return;
    }
    var t = M[0x92AD];
    if (t) {
      if (t === 4) { M[0x92AD] = 3; M[0x9AA9] = 3; }
      M[0x9100 + ((M[0x9829] + 0x0D) & 0xFF)] = 4;
      return;
    }
    if (M[0x82D1] !== 0x24) {
      var e = M[0x9828] & 7;
      M[0x9300 + e] = M[0x9362]; M[0x9362] = 0;
      M[0x9301 + e] = M[0x9363];
      M[0x9B01 + e] = M[0x9B63]; M[0x9B00 + e] = M[0x9B62];
      M[0x8B01 + e] = 7; M[0x8B00 + e] = 7;
      stringOut(0x0B, 0x83B1);
    }
    var l = M[0x9828], e2 = l & 7;
    if (M[0x8800 + l] === 9) {             // the boss is still flying: the fighter rides above it
      M[0x9300 + e2] = M[0x9300 + l];
      var b = 0x10, s = b + M[0x9301 + l], y = s & 0xFF;
      M[0x9301 + e2] = y;
      var cy = (s > 0xFF ? 1 : 0) ^ (b >> 7);
      M[0x9B01 + e2] = (cy & 1) ^ M[0x9B01 + l];
      return;
    }
    // the boss is home: the fighter rises 36 steps into its place
    if (!M[0x928B]) M[0x8B00 + e2] = 6;
    var c = M[0x928B]; M[0x928B] = (c + 1) & 0xFF;
    if (c === 0x24) {
      M[0x9011] = 0; M[0x9AA9] = 0;
      M[0x8800 + e2] = 1;
      M[0x9828] = 1; M[0x99B9] = 1;
      M[0x9213] = 2;
      return;
    }
    var yy = M[0x9301 + e2] - 1;
    M[0x9301 + e2] = yy & 0xFF;
    if (yy < 0) M[0x9B01 + e2] ^= 1;
  }

  // ── bonus bees (stage 4 on): a bee or moth flashes, then dives and splits ──
  var D_1B59 = [0x1E, 0xBD, 0x0A, 0xB8, 0x14, 0xBC];
  var D_1B5F = [0x04EA, 0x0473, 0x04AB];
  function f_1A80() {
    if (M[0x92A7] >= M[0x99CA]) return;
    var tmr = M[0x9841];
    if (!tmr) {
      var l = -1, i;
      for (i = 0; i < 20; i++) if (M[0x8808 + i * 2] === 1) { l = 0x08 + i * 2; break; }
      if (l < 0) for (i = 0; i < 16; i++) if (M[0x8840 + i * 2] === 1) { l = 0x40 + i * 2; break; }
      if (l < 0) return;
      M[0x9841] = 0xC0;
      var c = M[0x8B00 + l + 1];
      var a = (Math.floor((M[0x9821] >> 2) % 3)) + 4;
      M[0x982D] = l; M[0x982E] = c; M[0x982F] = a;
      M[0x9AB2] = a;
      return;
    }
    tmr = (tmr + 1) & 0xFF;
    if (tmr) {
      M[0x9841] = tmr;
      var o = M[0x982D];
      if (M[0x8800 + o] !== 1) { M[0x9004] = 0; return; }
      M[0x8B00 + o + 1] = (tmr & 0x10) ? M[0x982F] : M[0x982E];
      return;
    }
    if (!M[0x9015]) { M[0x9841] = 0xE0; return; }
    var ob = M[0x982D];
    if (M[0x8800 + ob] !== 1 || (M[0x9200 + ob] & 0x80)) { M[0x9004] = 0; return; }
    var k = (M[0x982F] - 4) & 0xFF;
    M[0x99B0] = 3; M[0x99B1] = D_1B59[k * 2]; M[0x99B2] = D_1B59[k * 2 + 1];
    var kk = k & 0x0F, de = D_1B5F[kk];
    var cc = M[0x8B00 + ob];
    M[0x8B00 + ob] = ((kk << 3) + 0x56) & 0xFF;
    M[0x982E] = (cc & 0xF8) | (M[0x982E] & 7);
    c_1083(ob, de);
    M[0x9004] = 0;
  }

  // ── launching dives: c_1079 (boss and escorts), c_1083 (others) ──
  function c_1079(l, de) { j_108A(l & 0x7F, de, (l & 0x80) | 1); }
  function c_1083(l, de) { j_108A(l, de, (((l >> 1) & 1) << 7) | 1); }
  function j_108A(l, de, flags) {
    var ix = -1;
    for (var n = 0; n < 12; n++) if (!(M[0x9100 + n * 0x14 + 0x13] & 1)) { ix = 0x9100 + n * 0x14; break; }
    if (ix < 0) return;
    M[ix + 8] = de & 0xFF; M[ix + 9] = de >> 8;
    M[ix + 0x0D] = 1; M[ix + 4] = 0x00; M[ix + 5] = 0x01;
    M[ix + 0x10] = l;
    M[0x8800 + l] = 9; M[0x8800 + l + 1] = ix & 0xFF;
    var x = M[0x9300 + l], yl = M[0x9301 + l], y8 = M[0x9B01 + l] & 1;
    var b = (y8 << 7) | (yl >> 1), y0 = yl & 1;
    b = (-((b + ((-0x0160 >> 1) & 0xFF)) & 0xFF)) & 0xFF;
    y0 ^= 1;
    M[ix + 1] = b; M[ix + 0] = y0 << 7;
    M[ix + 3] = x >> 1; M[ix + 2] = (x & 1) << 7;
    M[ix + 0x13] = flags;
    M[ix + 0x0E] = 0x1E;
    M[ix + 0x0F] = M[0x920B] ? M[0x92C8] : 0;
  }

  // ── when and who dives (f_1B65) ──
  var WINGMEN = [0x4A, 0x52, 0x5A, 0x58, 0x50, 0x48];
  var D_1CFD = [16 - 3, 0x80 + 0x3A, 8 - 3, 0x80 + 0x37, 4 - 3, 0x80 + 0x35];
  function f_1B65() {
    if (M[0x920B]) {
      if (!(M[0x9015] & ((~M[0x901D]) & 0xFF))) return;
    }
    for (var n = 0; n < 4; n++) {         // a boss mission's members leave one per call
      var p = 0x92CA + n * 3;
      if (M[p] !== 0xFF) {
        var a = M[p]; M[p] = 0xFF;
        if (M[0x8800 + (a & 0x7F)] !== 1) return;
        c_1079(a, M[p + 1] | M[p + 2] << 8);
        M[0x9AB3] = 1;
        return;
      }
    }
    if (M[0x92A0] & 0x0F) return;
    for (var b = 3; b > 0; b--) {
      var t = 0x92C0 + (3 - b);
      M[t] = (M[t] - 1) & 0xFF;
      if (M[t] !== 0) continue;
      if (M[0x9287] >= M[0x99C4]) { M[t]++; return; }
      M[t] = M[t + 4];
      if (b === 3) bossLaunch();              // timer 0: bosses, 1: moths, 2: bees
      else if (b === 2) launchOne(16, 0x40, 0x03A9);
      else launchOne(20, 0x08, 0x034F);
      return;
    }
  }
  function launchOne(count, l, de) {
    var bb = M[0x982D];
    for (var i = 0; i < count; i++, l += 2) {
      if (M[0x8800 + l] === 1 && bb !== l) { M[0x9AB3] = bb; c_1083(l, de); return; }
    }
  }
  var IXL0 = 0;
  function bossLaunch() {
    if (!M[0x982B]) {
      M[0x982C] = (M[0x982C] + 1) & 0xFF;
      if (!(M[0x982C] & 1)) {             // this one tries to capture the fighter
        for (var k = 0; k < 4; k++) {
          var e = 0x30 + k * 2;
          if (M[0x8800 + e] === 1) { M[0x982B] = 1; M[0x9828] = e; bossActivate(e, 2, 0, 0, 0x0454); return; }
        }
        return;
      }
    }
    // a boss with escorts: which wingmen are free
    var c = 0;
    for (var i = 0; i < 6; i++) {
      var w = WINGMEN[i], cy;
      if (M[0x982D] === w) cy = 0;
      else cy = M[0x8800 + w] === 1 ? 1 : 0;
      c = ((c << 1) | cy) & 0xFF;
    }
    var keep = c, b;
    for (b = 4; b > 0; b--) {             // two adjacent escorts
      var a = c & 7;
      if (a !== 4 && a >= 3) { if (tryBoss(b, c, 0)) return; }
      c = rrc8(c);
    }
    c = keep;
    for (b = 4; b > 0; b--) {             // one escort
      if (c & 7) { if (tryBoss(b, c, 1)) return; }
      c = rrc8(c);
    }
    for (b = 4; b > 0; b--) {             // any boss
      var e2 = 0x30 + (4 - b) * 2;
      if (M[0x8800 + e2] === 1) { bossActivate(e2, 2, b, c, M[0x920B] ? 0x0411 : 0x00F1); return; }
    }
    for (b = 0; b < 4; b++) if (M[0x8800 + b * 2] === 1) { c_1083(b * 2, 0x0444); return; }   // a rogue fighter
  }
  var RRC_C = 0;
  function rrc8(v) { RRC_C = v & 1; return ((v >> 1) | ((v & 1) << 7)) & 0xFF; }
  function tryBoss(b, c, ixl) {
    var a = b;
    if (a & 2) a ^= 1;
    var e = 0x30 + ((a & 3) << 1);
    if (M[0x8800 + e] !== 1) return false;
    bossActivate(e, ixl, b, c, M[0x920B] ? 0x0411 : 0x00F1);
    return true;
  }
  // set up a boss (and escorts) in the mission pool
  function bossActivate(e, ixl, b, c, iy) {
    var right = (e >> 1) & 1;
    var a = (((e << 1) | right) & 0xFF);
    a = ((a >> 1) | (right << 7)) & 0xFF;
    M[0x92CA] = a; M[0x92CB] = iy & 0xFF; M[0x92CC] = iy >> 8;
    var cy = right;
    b = (b + 1) & 0xFF;
    var sc = 0x9830 + (e & 7);
    M[sc] = D_1CFD[ixl * 2]; M[sc + 1] = D_1CFD[ixl * 2 + 1];
    var de = 0x92CD;
    if (ixl !== 2) {
      var r;
      if (ixl === 0) { r = c_1D03(b, c, de, iy, cy); b = r.b; c = r.c; de = r.de; }
      r = c_1D03(b, c, de, iy, cy); b = r.b; c = r.c; de = r.de;
    }
    var rog = M[0x92CA] & 7;
    if (M[0x8800 + rog] !== 1) return;
    var hl = 0x92CA;
    do hl += 3; while (M[hl] !== 0xFF);
    l_1D16(hl, rog, iy, cy);
  }
  function c_1D03(b, c, de, iy, cy) {
    c = rrc8(c);
    if (!RRC_C) {
      b--; c = rrc8(c);
      if (!RRC_C) b--;
    }
    var a = b; b--;
    l_1D16(de, WINGMEN[a], iy, cy);
    return { b: b, c: c, de: de + 3 };
  }
  function l_1D16(hl, obj, iy, cy) {
    M[hl] = ((obj & 0x7F) | (cy << 7)) & 0xFF;
    M[hl + 1] = iy & 0xFF; M[hl + 2] = iy >> 8;
  }

  // ── the formation breathes (f_1DE6) ──
  var BITMAPS = [
    [0xFF, 0x77, 0x55, 0x14, 0x10, 0x10, 0x14, 0x55, 0x77, 0xFF, 0x00, 0x10, 0x14, 0x55, 0x77, 0xFF],
    [0xFF, 0x77, 0x55, 0x51, 0x10, 0x10, 0x51, 0x55, 0x77, 0xFF, 0x00, 0x10, 0x51, 0x55, 0x77, 0xFF],
    [0xFF, 0x77, 0x57, 0x15, 0x10, 0x10, 0x15, 0x57, 0x77, 0xFF, 0x00, 0x10, 0x15, 0x57, 0x77, 0xFF],
    [0xFF, 0xF7, 0xD5, 0x91, 0x10, 0x10, 0x91, 0xD5, 0xF7, 0xFF, 0x00, 0x10, 0x91, 0xD5, 0xF7, 0xFF]];
  function f_1DE6() {
    if (M[0x92A0] & 3) return;
    var hl = 0x920F, a = M[hl], e = a, d;
    if (a & 0x80) { d = -1; M[hl] = (M[hl] - 1) & 0xFF; }
    else { d = 1; M[hl] = (M[hl] + 1) & 0xFF; }
    if (a === 0x1F) M[hl] |= 0x80;
    if (a === 0x81) M[hl] &= 0x7F;
    var c = M[hl];
    M[0x9211] = d & 0xFF;
    if ((e & 7) === 0) {
      var t = BITMAPS[(c & 0x18) >> 3];
      for (var i = 0; i < 16; i++) M[0x9920 + i] = t[i];
    }
    var neg = ((e >> 7) ^ M[0x9215]) & 1;
    var B = neg ? 1 : -1, C = neg ? -1 : 1;
    c_1E43(0, 5, B);
    c_1E43(5, 11, C);
  }
  function c_1E43(start, n, b) {
    for (var k = start; k < start + n; k++) {
      var bit = M[0x9920 + k] & 1;
      M[0x9920 + k] = ((M[0x9920 + k] >> 1) | (bit << 7)) & 0xFF;
      if (!bit) continue;
      var e = k * 2;
      M[0x9900 + e] = (M[0x9900 + e] + b) & 0xFF;
      var s = M[0x9800 + e] + (b & 0xFF), v = s & 0xFF;
      M[0x9800 + e] = v;
      if (((s > 0xFF ? 1 : 0) ^ ((b & 0xFF) >> 7)) & 1) M[0x9801 + e] ^= 1;
    }
  }

  // ── stars ──
  function f_1D76() {
    if (!M[0x99B9]) {
      M[0x99BA] = 0; M[0x99BC] = 0; M[0x99BD] = 0;
      M[0x99BE] = 7; return;
    }
    var a;
    if (M[0x99BA]) a = 0xFD;
    else {
      if (M[0x99BB] !== M[0x99BC]) M[0x99BC]++;
      var s = (M[0x99BC] + M[0x99BD]) & 0xFF;
      M[0x99BD] = s & 0x3F;
      a = (s >> 6) & 3;
    }
    if (!(M[0x9215] & 1)) a = (-a) & 0xFF;
    M[0x99BE] = (a - 1) & 7;
  }

  // ── shot enemies start to explode ──
  function f_1DB3() {
    for (var i = 0; i < 0x30; i++) {
      var l = i * 2;
      if (M[0x9200 + l] & 0x80) {
        M[0x9200 + l] &= 0x7F;
        M[0x8800 + l] = 4; M[0x8801 + l] = 0x40;
        M[0x8B01 + l] = 0x0A;
      }
    }
  }
  function f_1DD2() {
    if (M[0x92A2] & 1) return;
    for (var i = 0; i < 4; i++) if (M[0x92AC + i]) M[0x92AC + i]--;
  }

  // ── bombs fall at 2 and 3 pixels a frame, sideways at their own rate ──
  function f_1EA4() {
    var dy = (M[0x92A0] & 1) + 2;
    if (M[0x9215]) dy = (-dy) & 0xFF;
    for (var k = 0; k < 8; k++) {
      var l = 0x68 + k * 2, r = 0x92B0 + k * 2;
      if (M[0x8B00 + l] !== 0x30 || !M[0x9300 + l]) { M[0x8800 + l] = 0x80; continue; }   // rev B: free the slot
      var b = M[r];
      var a = ((b & 0x7E) + M[r + 1]) & 0xFF;
      M[r + 1] = a & 0x1F;
      var dx = (a >> 5) & 7;
      if (b & 0x80) dx = (-dx) & 0xFF;
      M[0x9300 + l] = (M[0x9300 + l] + dx) & 0xFF;
      var s = M[0x9301 + l] + dy;
      M[0x9301 + l] = s & 0xFF;
      if (((s > 0xFF ? 1 : 0) ^ (dy >> 7)) & 1) M[0x9B01 + l] ^= 1;
    }
  }

  // ── fire ──
  function f_1F04() {
    if (M[0x99B6 + M[0x9215]] & 0x10) return;
    c_1F0F();
  }
  function c_1F0F() {
    var hl = 0x9364, de = 0x92A4;
    if (M[hl]) { hl = 0x9366; de = 0x92A5; if (M[hl]) return; }
    if (M[0x9B63] & 4) return;
    M[hl + 0x801] = M[0x9B63];
    M[hl] = M[0x9362];
    M[hl + 1] = M[0x9363];
    var b = M[0x9B62];
    M[hl + 0x800] = ((M[0x9827] & 1) << 3) | b;
    var a = M[0x8B62] & 7, code = 0x30;
    if (a < 5) { code = 0x31; if (a < 2) code = 0x33; }
    M[hl - 0x800] = code;
    var dS = a;
    if (a >= 4) dS = ((~a) + 0x47) & 0xFF;
    var c = (dS << 1) & 0xFF;
    var f = ((b >> 3) | (b << 5)) & 0x60;
    if (!M[0x9215]) f ^= 0x60;
    M[de] = f | c;
    M[0x8800 + (hl & 0xFF)] = 6;
    M[0x9AAF] = 1;
    var sc = (rd16(0x9846) + 1) & 0xFFFF;
    wr16(0x9846, sc);
  }

  // ── the stick ──
  function f_1F85() {
    c_1F92(M[0x99B6 + M[0x9215]], M[0x9827]);
  }
  function c_1F92(a, e) {
    a &= 0x0A;
    if (a === 0x0A) { M[0x92A3] = 0; return; }
    if (M[0x9215] & 1) a ^= 0x0A;
    var c = 1;
    M[0x92A3] ^= 1;
    if (!M[0x92A3]) c = 2;
    var x = M[0x9362];
    if (!x) return;
    if (!(a & 2)) {                       // right
      if (x >= 0xD1 && (e & 1)) return;
      if (x >= 0xE1) return;
      x = (x + c) & 0xFF;
    } else {                              // left
      if (x < 0x12) return;
      x = (x - c) & 0xFF;
    }
    M[0x9362] = x;
    if (e & 1) M[0x9360] = (x + 0x0F) & 0xFF;
  }
  // ═══ CPU 0: the mob, the capture beam, the rescue (gg1-3, new_stage) ════

  var HPOS = null;                        // db_obj_home_posn_rc (row, column index pairs per object), same as R1[0x100..]
  function hpos(i) { return R1[0x0100 + i]; }

  // ── the rescued fighter spins, then drifts down beside yours (f_2000) ──
  function f_2000() {
    var l = M[0x9828];
    if (M[0x8800 + l]) { end2000(); return; }
    var s = M[0x928B];
    if (s === 0) { M[0x928B] = 1; M[0x92AD] = 2; return; }
    if (s === 1) {
      M[0x928D] = M[0x9287] | M[0x92AD];
      if (shipSpin(0x9B00 + l) !== 1) return;
      M[0x9014] = 0; M[0x9015] = 0; M[0x9025] = 0;
      M[0x928B] = 2;
      return;
    }
    var x = M[0x9300 + l];
    if (x !== 0x80) {
      if (x < 0x80) M[0x9300 + l]++; else M[0x9300 + l]--;
    } else {
      var y = M[0x9301 + l];
      if (y === 0x29 && M[0x9B01 + l] === 1) M[0x928B] = 3;
      else {
        y = (y + 1) & 0xFF; M[0x9301 + l] = y;
        if (!y) M[0x9B01 + l] ^= 1;
      }
    }
    var c = (M[0x8B62] - 6) & 0xFF;
    if (!c) {
      var mx = M[0x9362];
      if (mx !== 0x71) { if (mx < 0x71) M[0x9362]++; else M[0x9362]--; return; }
    }
    if (M[0x928B] !== 3) return;
    // the two fighters are together
    M[0x9300 + l] = 0;
    var de;
    if (c) { de = 0x63; M[0x982B] = 0; }
    else { M[0x9827] = 1; de = 0x61; }
    M[0x9300 + de] = M[0x9301 + l];
    M[0x9B00 + de] = M[0x9B01 + l];
    M[0x8800 + l] = 0x80;
    M[0x8B00 + de - 1] = 6; M[0x8B00 + de] = 9;
    M[0x9300 + de - 1] = 0x80;
    M[0x9014] = 1; M[0x9015] = 1; M[0x9025] = 1; M[0x99B9] = 1;
    end2000();
  }
  function end2000() { M[0x901D] = 0; M[0x9AB1] = 0; }

  // ── the beam lifts your fighter, spinning, up to the boss (f_20F2) ──
  function f_20F2() {
    var b = shipSpin(0x9B62);
    if (b & 1) {
      if (!M[0x9015]) { M[0x920D] = 1; fin20F2(); return; }
      return rel20F2(b);
    }
    if (M[0x928B] & 0x80) return rel20F2(b);
    if (!M[0x928D]) return;
    var bx = M[0x9300 + M[0x9828]], sx = M[0x9362];
    if (bx !== sx) { if (((bx - sx) & 0x80) === 0) M[0x9362]++; else M[0x9362]--; }
    var y = (M[0x9363] - 1) & 0xFF;
    M[0x9363] = y;
    if (y === 0xFF) M[0x9B63] ^= 1;
    if (y === 0xE6) { M[0x9015] = 0; return; }
    if (y !== 0xE0) return;
    M[0x928D] = 0; M[0x8B63] = 7;          // caught: the fighter turns red
  }
  function rel20F2(b) {                   // shot the boss: the fighter drops back down
    var y = M[0x9363];
    if (y === 0x29) { if (((b - 1) & 0xFF) !== 0) return; fin20F2(); return; }
    y = (y + 1) & 0xFF; M[0x9363] = y;
    if (!y) M[0x9B63] ^= 1;
  }
  function fin20F2() { M[0x901C] = 0; M[0x9025] = 1; }

  // spin a ship one step; returns 1 when it has come round upright and nothing is holding it
  function shipSpin(hl) {
    var ctrl = M[hl], c = ctrl ^ (ctrl >> 1), lo = hl & 0xFF, code = 0x8B00 + lo;
    var a = M[code] & 7;
    if (a === 6 && c === 0 && !M[0x928D]) return 1;
    for (;;) {
      if (c & 1) { if (a !== 0) { M[code]--; break; } }
      else { if (a !== 6) { M[code]++; break; } }
      c = (c - 1) & 0xFF;
      if (c & 0x80) c = 3;
    }
    a = c; if (a & 2) a ^= 1;
    M[0x9B00 + lo] = a;
    return 0;
  }

  // ── the capturing boss turns to face down, then beams (f_21CB) ──
  function f_21CB() {
    var e = M[0x9828];
    if (M[0x8800 + e] !== 9) { M[0x9019] = 0; M[0x982B] = 0; return; }
    var ix = 0x9100 + M[0x9829];
    if (M[ix + 0x0A]) return;
    var a = 0x0C; if (M[ix + 5] & 1) a = (-a) & 0xFF;
    M[ix + 0x0C] = a;
    a = ((M[ix + 5] & 1) << 7) | (M[ix + 4] >> 1);
    if (((a - 0x78) & 0xFF) >= 0x10) return;
    M[0x982A] = M[0x99C6];
    M[ix + 0x0C] = 0;
    M[0x9019] = 0; M[0x928B] = 0; M[0x920D] = 0;
    M[0x9018] = 1; M[0x928C] = 1; M[0x928D] = 1;
  }

  // ── the tractor beam (f_2222) ──
  var D_23A1 = [0x24, 0x4E, 0x4F, 0x50, 0x51, 0x24, 0x24, 0x52, 0x53, 0x54, 0x55, 0x24, 0x24, 0x56, 0x57, 0x58, 0x59, 0x24,
    0x24, 0x5A, 0x5B, 0x5C, 0x5D, 0x24, 0x24, 0x5E, 0x5F, 0x60, 0x61, 0x24, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
    0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F];
  function f_2222() {
    var fc = M[0x92A0];
    if (!(fc & 3)) {                      // cycle the beam's colours
      var a = ((-M[0x928A]) - 0x18) & 0xFF;
      var hl = 0x8400 + ((a & 0xF8) << 2) + 0x15;
      var col = (fc >> 2) & 3; if (!col) col = 1;
      col += 0x17;
      for (var c = 0; c < 6; c++) {
        for (var b = 0; b < 10; b++) M[(hl & 0xFF00) | ((hl + b) & 0xFF)] = col;
        hl = ((hl & 0xFF00) | ((hl + 10) & 0xFF)) + 0x16;
      }
    }
    if (!(M[0x928B] & 0x80)) {
      if (M[0x8800 + M[0x9828]] !== 9) {  // the boss was shot while beaming
        M[0x982A] = 3; M[0x928B] = 0x80; M[0x928D] = 0; M[0x99BA] = 0;
        M[0x928C] = 1; M[0x9014] = 1;
        return;
      }
    }
    M[0x928C] = (M[0x928C] - 1) & 0xFF;
    if (M[0x928C]) {
      if (M[0x928B] !== 0x40) return;
      var d = (M[0x928A] - M[0x9362] + 0x1B) & 0xFF;
      if (d >= 0x36) return;
      if (M[0x9201] !== 1) { if (!((M[0x9213] ^ 1) & M[0x9014])) return; }
      // caught in the beam
      M[0x9014] = 0; M[0x9AA5] = 0; M[0x9025] = 0; M[0x9213] = 0;
      M[0x901C] = 1; M[0x9AA6] = 1; M[0x99BA] = 1;
      M[0x982A] = 0x0A;
      return;
    }
    M[0x928C] = M[0x982A];
    var s = M[0x928B];
    if (s & 0x80) {
      s = (s + 1) & 0xFF; M[0x928B] = s;
      if ((s & 0x0F) !== 0x0B) { beamClear(s & 0x0F); return; }
      M[0x9018] = 0; M[0x9AA5] = 0; M[0x9AA6] = 0; M[0x982B] = 0;
      return;
    }
    M[0x9AA5] = M[0x982A];
    M[0x9100 + ((M[0x9829] + 0x0D) & 0xFF)] = 0xFF;
    s = (s + 1) & 0xFF; M[0x928B] = s;
    var n = s & 0x0F;
    if (n === 0x0B) {
      if (!(s & 0x40)) { M[0x928C] = 0x40; M[0x928B] = 0x40; return; }
      if (M[0x920D] && !(s & 0x20)) { M[0x928B] = 0x68; return; }
      M[0x9018] = 0; M[0x9AA5] = 0; M[0x9AA6] = 0;
      var slot = M[0x9829];
      if (!M[0x920D]) {
        M[0x982B] = 0; M[0x9828] = 1;
        M[0x9100 + ((slot + 0x0D) & 0xFF)] = 1;
        return;
      }
      M[0x9100 + ((slot + 8) & 0xFF)] = 0x6B; M[0x9100 + ((slot + 9) & 0xFF)] = 0x04;
      M[0x99BA] = 0; M[0x9011] = 1; M[0x928E] = 1;
      return;
    }
    if (s & 0x40) { beamClear((0x0B - n) & 0xFF); return; }
    var de = c_238A(n), t = (n * 6) - 6;
    for (var k = 0; k < 6; k++) { M[de] = D_23A1[t + k]; de = (de - 0x20) & 0xFFFF; }
  }
  function beamClear(n) {
    var de = c_238A(n);
    for (var k = 0; k < 6; k++) { M[de] = 0x24; de = (de - 0x20) & 0xFFFF; }
  }
  function c_238A(c) {
    var a = ((-M[0x928A]) + 0x10) & 0xFF;
    var hi = 0x80 | (a >> 6);
    var lo = ((((a << 2) & 0xE0) + 0x14) & 0xFF);
    lo = (lo + c) & 0xFF;
    return (hi << 8) | lo;
  }

  // ── every object, a quarter of the time each (f_23DD) ──
  function f_23DD() { c_23E0(M[0x92A0]); }
  function c_23E0(a) {
    if (!(a & 1)) {
      if (a & 2) { M[0x92A7] = M[0x92A6]; M[0x92A6] = 0; }
      return;
    }
    var e = a & 2, cnt = M[0x92A6];
    for (var b = 0; b < 32; b++, e += 4) {
      var st = M[0x8800 + e];
      if (st & 0x80) continue;
      switch (st) {
        case 1: {                         // in formation, wings flapping
          var fl = (M[0x92A2] >> 1) & 1;
          M[0x8B00 + e] = (M[0x8B00 + e] & 0xFE) | fl;
          if (!M[0x920B]) { cnt++; continue; }
          homePosn(e); cnt++; continue;
        }
        case 2: {                         // turning upright on arrival
          if (M[0x9B00 + e] & 1) {
            if (M[0x8B00 + e] & 7) M[0x8B00 + e]--;
            else M[0x9B00 + e] &= 0xFE;
          } else {
            if ((M[0x8B00 + e] & 7) === 6) M[0x8800 + e] = 1;
            else M[0x8B00 + e]++;
          }
          homePosn(e); cnt++; continue;
        }
        case 3: case 6: {                 // off the screen?
          var x = M[0x9380 + e], off = false;
          if (x >= 0xF4) off = true;
          else {
            var y = ((M[0x9B81 + e] & 1) << 7) | (M[0x9381 + e] >> 1);
            if (y < 0x0B || y >= 0xA5) off = true;
          }
          if (!off) { if (st !== 6) cnt++; continue; }
          if (st === 3) M[0x9100 + ((M[0x8801 + e] + 0x13) & 0xFF)] = 0;
          M[0x8800 + e] = 0x80; M[0x9300 + e] = 0;
          continue;
        }
        case 4: explode(e); continue;
        case 5:
          M[0x8801 + e] = (M[0x8801 + e] - 1) & 0xFF;
          if (M[0x8801 + e]) continue;
          M[0x8800 + e] = 0x80; M[0x9300 + e] = 0; M[0x9B00 + e] = 0;
          continue;
        case 7: M[0x8800 + e] = 3; cnt++; continue;
        case 8: {                         // the fighter exploding
          var k = (M[0x8801 + e] - 1) & 0xFF;
          if (!k) { M[0x9300 + e] = 0; M[0x9B00 + e] = 0; M[0x8800 + e] = 0x80; continue; }
          M[0x8801 + e] = k;
          if (!(k & 3)) M[0x8B00 + e] = (M[0x8B00 + e] + 4) & 0xFF;
          continue;
        }
        case 9: {                         // flying home: keep its target moving with the formation
          var row = hpos(e), col = hpos(e + 1), q = M[0x8801 + e];
          M[0x9100 + ((q + 0x11) & 0xFF)] = M[0x9900 + col];
          M[0x9100 + ((q + 0x12) & 0xFF)] = M[0x9900 + row];
          cnt++; continue;
        }
        default: continue;
      }
    }
    M[0x92A6] = cnt & 0xFF;
  }
  function homePosn(e) {
    var row = hpos(e), col = hpos(e + 1);
    M[0x9300 + e] = M[0x9800 + col];
    M[0x9301 + e] = M[0x9800 + row];
    M[0x9B01 + e] = M[0x9801 + row];
  }
  function explode(e) {
    var n = M[0x8801 + e];
    if (n === 0x45) {
      var a = M[0x9200 + e];
      if (a === 1) { M[0x9300 + e] = 0; M[0x9B00 + e] = 0; M[0x8800 + e] = 0x80; return; }
      // a points sprite
      M[0x8B00 + e] = a;
      if (a >= 0x37) M[0x8B01 + e] = a >= 0x3A ? 0x0E : 0x0D;
      var c = 8;
      if (a < 0x3B) { c = 0; M[0x9300 + e] = (M[0x9300 + e] + 8) & 0xFF; }
      var s = M[0x9301 + e] + 8;
      M[0x9301 + e] = s & 0xFF;
      if (s > 0xFF) M[0x9B01 + e] ^= 1;
      M[0x9B00 + e] = c;
      M[0x8800 + e] = 5; M[0x8801 + e] = 0x13;
      return;
    }
    n++; M[0x8801 + e] = n;
    var code = n === 0x45 ? 0x48 : n;
    if (code === 0x44) {
      M[0x9300 + e] = (M[0x9300 + e] - 8) & 0xFF;
      var y = M[0x9301 + e] - 8;
      M[0x9301 + e] = y & 0xFF;
      if (y < 0) M[0x9B01 + e] ^= 1;
      M[0x9B00 + e] = 0x0C;
    }
    M[0x8B00 + e] = code;
  }

  // ── a new stage's mob: codes, colours and which ones may bomb (c_2896) ──
  var D_2908 = [0xA5, 0x5A, 0xA9, 0x0F, 0x0A, 0x50], D_290E = [0x36, 0x24, 0xD4, 0xBA, 0xE4, 0xCC, 0xA8, 0xF4];
  var CHAL_ATTR = [10, 0x80 + 0x38, 15, 0x80 + 0x39, 20, 0x80 + 0x3C, 30, 0x80 + 0x3D];
  function c_2896() {
    wr16(0x9822, 0x8920);
    var d, e;
    if (!M[0x9825]) {
      var st = M[0x9821];
      var c = ((st >> 2) | (st << 6)) & 0xFF, b = ((st >> 3) | (st << 5)) & 0xFF;
      var i = (b & 0x1C) ? 3 : b & 3;
      M[0x9284] = CHAL_ATTR[i * 2]; M[0x9285] = CHAL_ATTR[i * 2 + 1];
      d = e = D_290E[c & 7];
    } else { d = (0x18 + 3) * 2; e = (0x10 + 2) * 2; }
    var st2 = { iy: 0, ixl: 1, c: 0, hl: 0x8B08 };
    c_28E9(st2, 20, d); c_28E9(st2, 8, 0x10); c_28E9(st2, 16, e);
  }
  function c_28E9(s, b, ixh) {
    for (; b > 0; b--) {
      if (--s.ixl === 0) { s.c = D_2908[s.iy++]; s.ixl = 8; }
      var cy = (s.c >> 7) & 1;
      s.c = ((s.c << 1) | cy) & 0xFF;
      M[s.hl] = ((ixh >> 1) | (cy << 7)) & 0xFF;
      s.hl += 2;
    }
  }

  // ── a stage's attack waves (c_25A2) ──
  var COMBAT_IDX = [
    [0x00, 0x12, 0x24, 0x36, 0x00, 0x48, 0x6C, 0x5A, 0x48, 0x6C, 0x00, 0x7E, 0xA2, 0x90, 0xB4, 0xD8, 0xC6],
    [0x00, 0x12, 0x48, 0x6C, 0x5A, 0x7E, 0xA2, 0x00, 0x7E, 0xD8, 0xC6, 0xB4, 0xD8, 0xC6, 0xB4, 0xD8, 0xC6],
    [0x00, 0x12, 0x7E, 0xA2, 0x90, 0x7E, 0xD8, 0xC6, 0xB4, 0xD8, 0xC6, 0xB4, 0xD8, 0xC6, 0xB4, 0xD8, 0xC6],
    [0x00, 0x12, 0x48, 0x36, 0x24, 0x48, 0x6C, 0x00, 0x7E, 0xA2, 0x90, 0xB4, 0xD8, 0x00, 0xB4, 0xD8, 0xC6]];
  var CHAL_IDX = [0x00, 0x12, 0x24, 0x36, 0x48, 0x5A, 0x6C, 0x7E];
  var COMBAT_DAT = [
    0x14, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x01, 0x01, 0x00, 0x41, 0x41, 0x00, 0x40, 0x40, 0x00, 0x00, 0x00, 0xFF,
    0x14, 0x01, 0x00, 0x42, 0x82, 0x00, 0x03, 0x85, 0x00, 0x43, 0xC5, 0x00, 0x42, 0xC4, 0x00, 0x02, 0x84, 0xFF,
    0x14, 0x01, 0x82, 0x00, 0xC0, 0x00, 0x01, 0x01, 0x00, 0x41, 0x41, 0x02, 0x40, 0x40, 0x02, 0x00, 0x00, 0xFF,
    0x14, 0x01, 0x82, 0x02, 0xC2, 0x00, 0x03, 0x85, 0x00, 0x43, 0xC5, 0x02, 0x42, 0xC4, 0x02, 0x02, 0x84, 0xFF,
    0x14, 0x01, 0x82, 0x00, 0xC0, 0x00, 0x01, 0xC1, 0x00, 0x41, 0x81, 0x02, 0x40, 0x80, 0x02, 0x40, 0x80, 0xFF,
    0x14, 0x01, 0x82, 0x00, 0xC0, 0x42, 0x01, 0x01, 0xF2, 0x41, 0x41, 0x02, 0x40, 0x40, 0x02, 0x00, 0x00, 0xFF,
    0x14, 0x01, 0xA4, 0x02, 0xC2, 0x52, 0x03, 0x85, 0xF2, 0x43, 0xC5, 0x02, 0x42, 0xC4, 0x02, 0x02, 0x84, 0xFF,
    0x14, 0x01, 0x82, 0x00, 0xC0, 0x52, 0x01, 0xC1, 0xF2, 0x41, 0x81, 0x02, 0x40, 0x80, 0x02, 0x40, 0x80, 0xFF,
    0x14, 0x01, 0xA4, 0x00, 0xC0, 0x42, 0x01, 0x01, 0xF4, 0x41, 0x41, 0x04, 0x40, 0x40, 0x04, 0x00, 0x00, 0xFF,
    0x14, 0x01, 0xA4, 0x02, 0xC2, 0x52, 0x03, 0x85, 0xF4, 0x43, 0xC5, 0x04, 0x42, 0xC4, 0x04, 0x02, 0x84, 0xFF,
    0x14, 0x03, 0xA4, 0x00, 0xC0, 0x54, 0x01, 0xC1, 0xF4, 0x41, 0x81, 0x04, 0x40, 0x80, 0x04, 0x40, 0x80, 0xFF,
    0x14, 0x03, 0xA4, 0x00, 0xC0, 0x54, 0x01, 0x01, 0xF4, 0x41, 0x41, 0x04, 0x40, 0x40, 0x04, 0x00, 0x00, 0xFF,
    0x14, 0x03, 0xA4, 0x02, 0xC2, 0x54, 0x03, 0x85, 0xF4, 0x43, 0xC5, 0x04, 0x42, 0xC4, 0x04, 0x02, 0x84, 0xFF];
  var CHAL_DAT = [
    0xFF, 0x00, 0x00, 0x06, 0xC6, 0x00, 0x07, 0x07, 0x00, 0x47, 0x47, 0x00, 0x46, 0x46, 0x00, 0x06, 0x06, 0xFF,
    0xFF, 0x00, 0x00, 0x08, 0xC8, 0x00, 0x09, 0xC9, 0x00, 0x09, 0xC9, 0x00, 0x48, 0x48, 0x00, 0x08, 0x08, 0xFF,
    0xFF, 0x00, 0x00, 0x0A, 0x4A, 0x00, 0x0B, 0xCB, 0x00, 0x0B, 0xCB, 0x00, 0x0A, 0x4A, 0x00, 0x16, 0x56, 0xFF,
    0xFF, 0x00, 0x00, 0x0C, 0xCC, 0x00, 0x0D, 0x0D, 0x00, 0x4D, 0x4D, 0x00, 0x0C, 0xCC, 0x00, 0x17, 0xD7, 0xFF,
    0xFF, 0x00, 0x00, 0x0E, 0x0E, 0x00, 0x0F, 0x0F, 0x00, 0x4F, 0x4F, 0x00, 0x0E, 0x0E, 0x00, 0x4E, 0x4E, 0xFF,
    0xFF, 0x00, 0x00, 0x10, 0x10, 0x00, 0x11, 0xD1, 0x00, 0x11, 0xD1, 0x00, 0x50, 0x50, 0x00, 0x10, 0x10, 0xFF,
    0xFF, 0x00, 0x00, 0x12, 0x12, 0x00, 0x13, 0x13, 0x00, 0x53, 0x53, 0x00, 0x52, 0x52, 0x00, 0x12, 0x12, 0xFF,
    0xFF, 0x00, 0x00, 0x14, 0xD4, 0x00, 0x15, 0x15, 0x00, 0x55, 0x55, 0x00, 0x14, 0xD4, 0x00, 0x14, 0xD4, 0xFF];
  var ATK_IDS = [0x58, 0x5A, 0x5C, 0x5E, 0x28, 0x2A, 0x2C, 0x2E, 0x30, 0x34, 0x36, 0x32, 0x50, 0x52, 0x54, 0x56,
    0x42, 0x46, 0x40, 0x44, 0x4A, 0x4E, 0x48, 0x4C, 0x1A, 0x1E, 0x20, 0x24, 0x22, 0x26, 0x18, 0x1C,
    0x08, 0x0C, 0x12, 0x16, 0x10, 0x14, 0x0A, 0x0E];
  function rnd8() { return (Math.random() * 256) | 0; }
  function c_25A2() {
    var ids = 0, st = M[0x9821], a = st;
    while (a >= 0x17) a -= 4;
    var b = a, tbl, p;
    if (((a + 1) & 3) !== 0) { tbl = COMBAT_DAT; p = COMBAT_IDX[M[0x9984] & 3][(b - (b >> 2) - 1) & 0xFF]; }
    else { tbl = CHAL_DAT; p = CHAL_IDX[(st >> 2) & 7]; }
    M[0x92E2] = tbl[p]; M[0x92E3] = tbl[p + 1]; p += 2;
    var out = 0x8920;
    M[out++] = 0x7E;
    while (tbl[p] !== 0xFF) {
      var c = tbl[p++];
      memset(0x9100, 0xFF, 0x10);
      if (c & 0x0F) {
        var n = c & 0x0F, e = (n >> 1) + 4;
        for (; n > 0; n--) {
          var slot;
          do { slot = rnd8() % e; if (n & 1) slot |= 8; } while (M[0x9100 + slot] !== 0xFF);
          var v = ((n << 1) | (n >> 7)) & 0xFF;
          var cy = (c >> 7) & 1; c = ((c << 1) | cy) & 0xFF;
          if (cy) v |= 0x40;
          M[0x9100 + slot] = v | 0x38;
        }
      }
      var hl = 0x9100;
      for (var k = 8; k > 0; k--) {
        while (M[hl] !== 0xFF) hl++;
        M[hl] = ATK_IDS[ids++]; hl++;
        if (k === 5) hl = 0x9108;
      }
      var bb = tbl[p], cc = tbl[p + 1]; p += 2;
      hl = 0x9100;
      for (;;) {
        M[out] = bb;
        var u = M[hl];
        if (u === 0xFF) break;
        out++;
        M[out++] = u; M[out++] = cc; M[out++] = M[hl + 8];
        hl++;
      }
      M[out++] = 0x7E;
    }
    out--;
    if (M[0x982B] & ((M[0x9827] - 1) & 0xFF) && M[0x9825]) {   // a captured fighter flies in with the mob, as a rogue
      M[out] = M[out - 4]; out++;
      M[out++] = 4;
      M[0x8B04] = 0x80 + 0x07;
    }
    M[out] = 0x7F;
  }

  // ── launching the attack waves (f_2916) ──
  var ATK_PTRS = [0x001D, 0x2067, 0x409F, 0x20D4, 0x017B, 0x61B0, 0x01E8, 0x21F5, 0x020B, 0x221B, 0x822B, 0x2241,
    0x825D, 0x2279, 0x029E, 0x22BA, 0x02D9, 0x22FB, 0x031D, 0x2333, 0x0FDA, 0x2FF0, 0xA22B, 0xA25D];
  var D_2A6C = [0x9B, 0x34, 0x03, 0x9B, 0x44, 0x03, 0x23, 0x00, 0x00, 0x23, 0x78, 0x02, 0x9B, 0x2C, 0x03, 0x9B, 0x4C, 0x03,
    0x2B, 0x00, 0x00, 0x2B, 0x78, 0x02, 0x9B, 0x34, 0x03, 0x9B, 0x34, 0x03, 0x9B, 0x44, 0x03, 0x9B, 0x44, 0x03];
  function f_2916() {
    var hl = rd16(0x9822), a = M[hl];
    if (a === 0x7F) {
      if (M[0x9287]) return;
      M[0x9008] = 0; M[0x9004] = 1; M[0x9010] = 1; M[0x9824] = 1;
      return;
    }
    if (a === 0x7E) {
      if (!M[0x9842]) return;
      if (M[0x9287]) { M[0x92AC] = 2; return; }
      if (!M[0x9825]) {
        var t = M[0x92AC];
        if (t === 1) { M[0x92A8] = 8; return; }
        if (t) return;
      }
      wr16(0x9822, hl + 1);
      M[0x9826]++;
      return;
    }
    var c = a;
    if (!(a & 0x80)) { if (M[0x92A0] & 7) return; }
    c = (c << 1) & 0xFF;
    var ix = -1;
    for (var n = 0; n < 12; n++) if (!(M[0x9100 + n * 0x14 + 0x13] & 1)) { ix = 0x9100 + n * 0x14; break; }
    if (ix < 0) return;
    hl++;
    var o = M[hl], b = o;
    if ((o & 0x78) === 0x78) o &= ~0x40;
    M[ix + 0x10] = o;
    hl++;
    wr16(0x9822, hl);
    M[0x8800 + o] = 7; M[0x8801 + o] = ix & 0xFF;
    if ((o & 0x38) === 0x38) {            // transients: fly through and away
      var d = 2, e = 0x10;
      if (!(b & 0x40)) { d = 3; e = 0x18; if (M[0x9826] === 2) { d = 0; e = 0x08; } }
      M[0x8B01 + o] = d; M[0x8B00 + o] = e;
      M[ix + 0x0F] = 0;
    } else {
      var dd = M[0x8B00 + o];
      M[0x8B00 + o] = dd & 0x78; M[0x8B01 + o] = dd & 7;
      M[ix + 0x0F] = (dd & 0x80) ? M[0x92E3] : 0;
    }
    var D = c; c &= 0x7F;
    M[ix + 0x0E] = (c & 2) ? 0x44 : 0x08;
    var w = ATK_PTRS[c >> 1];
    M[ix + 8] = w & 0xFF; M[ix + 9] = (w >> 8) & 0x1F;
    var k = ((w >> 12) & 0x0E) * 3;
    if (D & 0x80) k += 3;
    M[ix + 1] = D_2A6C[k]; M[ix + 3] = D_2A6C[k + 1]; M[ix + 5] = D_2A6C[k + 2];
    M[ix + 0] = 0; M[ix + 2] = 0; M[ix + 4] = 0;
    M[ix + 0x0D] = 1;
    M[ix + 0x13] = (1 | D) & 0x81;
  }

  // ── the formation slides side to side while the waves fly in (f_2A90) ──
  function f_2A90() {
    if (((M[0x92A0] - 1) & 3) !== 0) return;
    if (!(M[0x92A7] | M[0x9008])) { M[0x900A] = 0; return; }
    var c = M[0x920F] ? 0xFF : 1;
    for (var k = 0; k < 10; k++) {
      M[0x9900 + k * 2] = (M[0x9900 + k * 2] + c) & 0xFF;
      M[0x9800 + k * 2] = (M[0x9800 + k * 2] + c) & 0xFF;
    }
    var a = M[0x9900];
    if (M[0x9824] && a === 0) {
      M[0x920F] = 0; M[0x900A] = 0; M[0x9AA0] = 1; M[0x9009] = 1;
      return;
    }
    if (a === 32) { M[0x920F] = 1; return; }
    if (a === 0xE0) M[0x920F] = 0;
  }

  // ── stage parameters (c_2C00) ──
  var STG_CFG = [
    [0x00, 0x00, 0x22, 0xC6, 0x00, 0x00, 0x11, 0x23, 0xC7, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x11, 0x12, 0x23, 0x97, 0x00,
     0x11, 0x23, 0x23, 0x98, 0x00, 0x21, 0x24, 0x33, 0x98, 0x00, 0x00, 0x00, 0x00, 0x90, 0x00, 0x22, 0x25, 0x33, 0x99, 0x10,
     0x22, 0x36, 0x34, 0x69, 0x10, 0x10, 0x11, 0x23, 0x97, 0x00, 0x00, 0x00, 0x00, 0x60, 0x00, 0x32, 0x46, 0x34, 0x67, 0x11,
     0x32, 0x67, 0x44, 0x68, 0x11, 0x32, 0x67, 0x45, 0x68, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x42, 0x78, 0x45, 0x69, 0x11,
     0x42, 0x78, 0x45, 0x69, 0x11, 0x11, 0x22, 0x23, 0x97, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x52, 0x88, 0x46, 0x3A, 0x11,
     0x52, 0x88, 0x56, 0x3A, 0x11, 0x52, 0x88, 0x56, 0x3C, 0x11, 0x00, 0x00, 0x00, 0x30, 0x00, 0x62, 0x89, 0x57, 0x3C, 0x11,
     0x62, 0x99, 0x57, 0x3C, 0x11, 0x62, 0x99, 0x57, 0x3C, 0x11],
    [0x00, 0x00, 0x12, 0xC6, 0x00, 0x00, 0x11, 0x22, 0xC6, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x11, 0x12, 0x23, 0x97, 0x00,
     0x11, 0x12, 0x23, 0x97, 0x00, 0x00, 0x11, 0x23, 0xC7, 0x00, 0x00, 0x00, 0x00, 0x90, 0x00, 0x21, 0x23, 0x33, 0x98, 0x10,
     0x21, 0x24, 0x33, 0x98, 0x10, 0x21, 0x25, 0x34, 0x98, 0x10, 0x00, 0x00, 0x00, 0x60, 0x00, 0x22, 0x25, 0x34, 0x68, 0x11,
     0x32, 0x36, 0x44, 0x68, 0x11, 0x11, 0x11, 0x23, 0x67, 0x01, 0x00, 0x00, 0x00, 0x60, 0x00, 0x32, 0x36, 0x45, 0x68, 0x11,
     0x32, 0x46, 0x45, 0x69, 0x11, 0x32, 0x67, 0x45, 0x69, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x42, 0x67, 0x46, 0x3A, 0x11,
     0x42, 0x78, 0x56, 0x3A, 0x11, 0x52, 0x78, 0x56, 0x3A, 0x11, 0x00, 0x00, 0x00, 0x30, 0x00, 0x52, 0x88, 0x56, 0x3C, 0x11,
     0x62, 0x99, 0x57, 0x3C, 0x11, 0x62, 0x99, 0x57, 0x3C, 0x11],
    [0x00, 0x00, 0x23, 0xC6, 0x00, 0x10, 0x11, 0x23, 0x97, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x11, 0x12, 0x33, 0x98, 0x00,
     0x21, 0x23, 0x34, 0x68, 0x00, 0x21, 0x24, 0x34, 0x68, 0x00, 0x00, 0x00, 0x00, 0x90, 0x00, 0x32, 0x36, 0x34, 0x67, 0x10,
     0x32, 0x46, 0x44, 0x68, 0x10, 0x11, 0x11, 0x23, 0x97, 0x10, 0x00, 0x00, 0x00, 0x60, 0x00, 0x42, 0x67, 0x45, 0x68, 0x11,
     0x42, 0x67, 0x45, 0x69, 0x11, 0x42, 0x78, 0x46, 0x69, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x52, 0x78, 0x46, 0x3A, 0x11,
     0x52, 0x88, 0x56, 0x3A, 0x11, 0x52, 0x88, 0x56, 0x3A, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x62, 0x88, 0x56, 0x3C, 0x11,
     0x62, 0x89, 0x57, 0x3C, 0x11, 0x62, 0x89, 0x57, 0x3E, 0x11, 0x00, 0x00, 0x00, 0x30, 0x00, 0x72, 0x99, 0x57, 0x3E, 0x11,
     0x72, 0x99, 0x68, 0x3E, 0x11, 0x72, 0x99, 0x68, 0x3E, 0x11],
    [0x00, 0x00, 0x23, 0xC6, 0x00, 0x10, 0x11, 0x23, 0x97, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x11, 0x12, 0x34, 0x98, 0x00,
     0x21, 0x23, 0x34, 0x68, 0x00, 0x21, 0x24, 0x34, 0x68, 0x00, 0x00, 0x00, 0x00, 0x90, 0x00, 0x32, 0x36, 0x45, 0x67, 0x11,
     0x32, 0x46, 0x46, 0x68, 0x11, 0x32, 0x56, 0x46, 0x69, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x42, 0x67, 0x56, 0x6A, 0x11,
     0x42, 0x67, 0x56, 0x6A, 0x11, 0x42, 0x78, 0x57, 0x6A, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x52, 0x78, 0x57, 0x3A, 0x11,
     0x52, 0x88, 0x57, 0x3A, 0x11, 0x52, 0x88, 0x68, 0x3C, 0x11, 0x00, 0x00, 0x00, 0x60, 0x00, 0x62, 0x88, 0x68, 0x3C, 0x11,
     0x62, 0x89, 0x68, 0x3C, 0x11, 0x62, 0x89, 0x68, 0x3E, 0x11, 0x00, 0x00, 0x00, 0x30, 0x00, 0x72, 0x99, 0x68, 0x3E, 0x11,
     0x72, 0x99, 0x68, 0x3E, 0x11, 0x72, 0x99, 0x68, 0x3E, 0x11]];
  var RANK_TBL = [1, 2, 3, 0];
  function c_2C00() {
    var a = M[0x9821];
    while (a >= 0x1B) a -= 4;
    var e = ((a - 1) * 5) & 0xFF;
    var t = STG_CFG[RANK_TBL[M[0x9984] & 3]];
    for (var k = 0; k < 5; k++) {
      var v = t[e + k];
      M[0x99C0 + k * 2] = v >> 4; M[0x99C1 + k * 2] = v & 0x0F;
    }
    var st = M[0x9821], p;
    if (st < 3) p = 0;
    else p = (((st | 0xFC) + 1) & 0xFF) === 0 ? 0 : 0x0A;
    M[0x99CA] = p;
    M[0x92C1] = 0x16; M[0x92C2] = 0x02; M[0x92C0] = 0x16;
    M[0x92C1] = 0x02;
    var s = st < 0x10 ? st : 0x10;
    M[0x99BB] = ((((s << 2) | (s >> 6)) & 0x70) + 0x40) & 0xFF;
  }
  // ═══ CPU 0: odds and ends, and the 60 Hz runtime ═══════════════════════

  // bombing and bomber timers from the stage parameters (f_0857)
  var D_0909 = [0x03, 0x03, 0x01, 0x01, 0x03, 0x03, 0x03, 0x01, 0x07, 0x03, 0x03, 0x01, 0x07, 0x03, 0x03, 0x03,
    0x07, 0x07, 0x03, 0x03, 0x0F, 0x07, 0x03, 0x03, 0x0F, 0x07, 0x07, 0x03, 0x0F, 0x07, 0x07, 0x07,
    0x06, 0x0A, 0x0F, 0x0F, 0x04, 0x08, 0x0D, 0x0D, 0x04, 0x06, 0x0A, 0x0A];
  var D_08CD = [0x09, 0x07, 0x05, 0x08, 0x06, 0x04, 0x07, 0x05, 0x04, 0x06, 0x04, 0x03, 0x05, 0x03, 0x03,
    0x04, 0x03, 0x03, 0x04, 0x02, 0x02, 0x03, 0x03, 0x02, 0x03, 0x02, 0x02, 0x02, 0x02, 0x02];
  var D_08EB = [0x06, 0x05, 0x04, 0x05, 0x04, 0x03, 0x05, 0x03, 0x03, 0x04, 0x03, 0x02, 0x04, 0x02, 0x02,
    0x03, 0x03, 0x02, 0x03, 0x02, 0x01, 0x02, 0x02, 0x01, 0x02, 0x01, 0x01, 0x01, 0x01, 0x01];
  function c_08AD(a, tbl, b) { var i = a * 3; if (b < 0x28) i++; if (!b) i++; return tbl[i]; }
  function c_08BE(a, base, c) { return D_0909[base + a * 2 + Math.floor(c / 10)]; }
  function f_0857() {
    var b = M[0x92AE];
    if (b < 0x3C) M[0x99C4] = M[0x99C5];
    var c = M[0x92A7];
    M[0x92C8] = c_08BE(M[0x99C0], 0, c);
    if (M[0x92AA]) { M[0x92C4] = 2; M[0x92C5] = 2; M[0x92C6] = 2; M[0x9AA0] = 0; return; }
    M[0x92C4] = c_08BE(M[0x99C1], 32, c);
    M[0x92C5] = c_08AD(M[0x99C2], D_08CD, b);
    M[0x92C6] = c_08AD(M[0x99C3], D_08EB, b);
  }

  // 1UP blinks
  function f_0935() {
    var f = M[0x92A0], a = ((f >> 4) | (f << 4)) & 0xFF;
    if (M[0x9201] !== 3) return;
    var w = ((~M[0x9840]) & a) & 1;
    var s = w ? [0x24, 0x24, 0x24] : [0x19, 0x1E, 0x01];
    M[0x83D9] = s[0]; M[0x83DA] = s[1]; M[0x83DB] = s[2];
  }
  function f_0828() {
    M[0x92D6] = 1;
    M.copyWithin(0x8BC0, 0x8B40, 0x8B80);
    M.copyWithin(0x93C0, 0x9340, 0x9380);
    M.copyWithin(0x9BC0, 0x9B40, 0x9B80);
    M[0x92D6] = 0;
  }
  function f_1D32() { M[0x900E] = 0; }     // nest on/off between players (one player: never runs)

  // credits and game state (f_0977, simplified: no coin mechanics, no service switch)
  function f_0977() {
    if (M[0x9201] === 3) return;
    if (M[0x9201] !== 0 && M[0x9201] !== 3) {
      // CREDIT n, bottom left
      var de = 0x803C, s = [0x0C, 0x1B, 0x0E, 0x0D, 0x12, 0x1D];
      for (var i = 0; i < 6; i++) M[de - i] = s[i];
      var n = M[0x99B5];
      de = 0x803C - 7;
      if (n >> 4) { M[de] = n >> 4; de--; }
      M[de] = n & 0x0F; de--; M[de] = 0x24;
    }
    if (!M[0x9201]) return;
    if (M[0x9201] === 1 && M[0x99B5]) {
      M[0x9201] = 2;
      memset(0x9AA0, 0, 8); memset(0x9AA9, 0, 0x0F);
    }
    var hw = M[0x99B5], sw = M[0x99B8];
    if (hw === sw) return;
    if (hw > sw) { M[0x99B8] = hw; M[0x9A79] = (hw - sw) & 0xFF; return; }
    M[0x99B3] = 0;
    M[0x99B8] = hw;
    M[0x9201] = 3;
  }

  // THE GALACTIC HEROES: the best five, from the app's own high scores
  function hiscoreShow() {
    textCE(0x8325, 2, [0x1D, 0x11, 0x0E, 0x24, 0x10, 0x0A, 0x15, 0x0A, 0x0C, 0x1D, 0x12, 0x0C, 0x24, 0x11, 0x0E, 0x1B, 0x18, 0x0E, 0x1C]);
    textCE(0x82CC, 4, [0x26, 0x26, 0x24, 0x0B, 0x0E, 0x1C, 0x1D, 0x24, 0x05, 0x24, 0x26, 0x26]);
    var de = 0x8292, t = [0x1C, 0x0C, 0x18, 0x1B, 0x0E, 0x24, 0x24, 0x24, 0x24, 0x24, 0x17, 0x0A, 0x16, 0x0E];
    for (var i = 0; i < t.length; i++) { M[de] = t[i]; de -= 0x20; }
    var pl = [[0x1C, 0x1D], [0x17, 0x0D], [0x1B, 0x0D], [0x1D, 0x11], [0x1D, 0x11]];
    for (var r = 0; r < 5; r++) {
      de = 0x8354 + r * 2;
      M[de] = r + 1; de -= 0x20;
      M[de] = pl[r][0]; de -= 0x20; M[de] = pl[r][1]; de -= 0x20;
      de -= 0x20; de -= 0x20;
      var sc = 0x8A20 + r * 6 + 5;
      for (var k = 0; k < 6; k++) { M[de] = M[sc - k]; de -= 0x20; }
      de -= 0xC0;
      var nm = 0x8A3E + r * 3;
      for (k = 0; k < 3; k++) { M[de] = M[nm + k]; de -= 0x20; }
    }
  }
  function textCE(hl, col, s) {
    for (var i = 0; i < s.length; i++) {
      M[hl] = s[i]; M[hl + 0x400] = col;
      var l = (hl & 0xFF) - 0x21 + 1, h = hl >> 8;
      if (l < 0) { l += 256; h--; }
      hl = (h << 8) | l;
    }
  }
  // the best five, written where the arcade keeps them
  function setBest5(list) {
    list = list || [];
    for (var r = 0; r < 5; r++) {
      var e = list[r] || { score: 20000, ini: ['N.N', 'A.A', 'M.M', 'C.C', 'O.O'][r] };   // the arcade's own table
      var s = String(Math.min(999999, e.score | 0)), base = 0x8A20 + r * 6;
      for (var k = 0; k < 6; k++) {
        var ch = s.length - 1 - k;
        M[base + k] = ch >= 0 ? s.charCodeAt(ch) - 48 : 0x24;
      }
      var ini = String(e.ini || '...').toUpperCase();
      for (k = 0; k < 3; k++) {
        var cc = ini.charAt(k);
        M[0x8A3E + r * 3 + k] = cc >= 'A' && cc <= 'Z' ? cc.charCodeAt(0) - 55 : cc >= '0' && cc <= '9' ? cc.charCodeAt(0) - 48 : 0x2A;
      }
    }
  }
  // the HIGH SCORE at the top of the screen
  function setHighScore(v) {
    var s = String(Math.min(999999, v | 0));
    for (var k = 0; k < 6; k++) {
      var ch = s.length - 1 - k;
      M[0x83ED + k] = ch >= 0 ? s.charCodeAt(ch) - 48 : 0x24;
    }
  }

  // ── the task tables ──
  var TASKS0 = [null, null, f_17B2, f_1700, f_1A80, f_0857, null, null,
    f_2916, f_1DE6, f_2A90, f_1DB3, f_23DD, f_1EA4, f_1D32, f_0935,
    f_1B65, f_19B2, f_1D76, null, f_1F85, f_1F04, null, f_1DD2,
    f_2222, f_21CB, null, null, f_20F2, f_2000, null, f_0977];
  var TASKS1 = [null, null, f_08D3, null, f_06F5, f_05EE, null, null];

  function cpu0Tasks(from, to) {
    from = from || 0; to = to || 32;
    // the star control bits, from the frame counter and the speed setting
    var fc = M[0x92A0], c = fc & 0x1C;
    c = (((c >> 1) | (c << 7)) & 0xFF ^ c) & 0x18;
    starCtrl = (M[0x99BE] & 7) | c;
    var i = 0;
    while (i < 32) {
      var en = M[0x9000 + i];
      if (!en) { i++; continue; }
      var fn = TASKS0[i];
      if (fn && i >= from && i < to) fn();
      i += en;
    }
  }
  function cpu1Tasks(from, to) {
    from = from || 0; to = to || 8;
    var i = 0;
    while (i < 8) {
      var en = M[0x9020 + i];
      if (!en) { i++; continue; }
      var fn = TASKS1[i];
      if (fn && i >= from && i < to) fn();
      i += en;
    }
  }

  // ═══ The sound CPU (gg1-7, rev B) ═════════════════════════════════════════
  // Runs twice a frame (its NMI comes at lines 64 and 192). The main CPU asks for sounds by writing counts and flags
  // at 9AA0-9AB7; this program steps each sound's note list and fills the wave chip's registers (WSG) from its
  // tables (S, the sound ROM, read at its own addresses). Ported from the rev B ROM's code, with the
  // reconstructed source's names.
  var S = new Uint8Array(0x1000);         // the sound ROM: only its tables (from 06DA on) are filled in
  var WSG = new Uint8Array(0x20);         // the wave chip's registers, as the sound CPU last wrote them
  function sRd16(a) { return S[a] | S[a + 1] << 8; }
  var SN_IDX = 0x9A74, SN_PARM = 0x9A75;  // the sound being worked on; its [data index, count, voice]
  function sndParms() {                   // copy d_0734[sound] to 9A75..77; the challenge melody's count depends
    var i = M[SN_IDX], p = 0x0734 + i * 3;
    M[0x9A75] = S[p]; M[0x9A76] = S[p + 1]; M[0x9A77] = S[p + 2];
    if (i !== 0x0E) return;
    var a = M[0x9A4C];
    if (!a) { M[0x9A76] = 1; return; }
    if (a === 1 || !M[0x9A4D]) M[0x9A76] = 2;
  }
  function sndReset() {                   // start this sound's note lists from the top
    var n = M[0x9A76], d = M[0x9A75];
    for (var k = 0; k < n; k++) { M[0x9A30 + ((d + k) & 0xFF)] = 0; M[0x9A00 + ((d + k) & 0xFF)] = 0; }
  }
  function sndVoices() {                  // step every voice this sound uses; true when it has ended
    for (;;) {
      c_0581();
      M[0x9A76] = (M[0x9A76] - 1) & 0xFF;
      if (!M[0x9A76]) break;
      M[0x9A75]++; M[0x9A77]++;
    }
    if (!M[0x9A78]) return false;
    M[0x9A78] = 0;
    M[0x9AC0 + M[SN_IDX]] = 0;
    return true;
  }
  // a sound that plays while its flag is held (c_0384)
  function sndHeld() {
    sndParms();
    var f = 0x9AC0 + M[SN_IDX];
    if (!M[f]) { M[f]++; sndReset(); }
    sndVoices();
  }
  // a short effect: start it (c_0403) or keep it going (c_0459)
  function sndStart() { M[0x9AC0 + M[SN_IDX]]++; sndParms(); sndReset(); sndVoices(); }
  function sndCont() { sndParms(); sndVoices(); }
  // a tune played once through, its count register counted down (c_04B1)
  function sndOnce() {
    sndParms();
    var f = 0x9AC0 + M[SN_IDX];
    if (!M[f]) { M[f]++; sndReset(); }
    if (!sndVoices()) return;
    var i = M[SN_IDX], r = 0x9AA0 + i;
    if (i === 8) { M[r] = (M[r] - 1) & 0xFF; return; }
    if (i === 0x0C) {
      M[r] = (M[r] - 1) & 0xFF;
      if (M[r] && !(M[r] & 1)) return;
      M[0x9AB6] = 1; return;
    }
    if (i === 0x14) { M[r] = 0; M[0x9AB3] = 1; return; }
    if (i === 7) {                        // rev B: the fighter's explosion stops everything but the coin and extra-fighter sounds
      M[r] = 0;
      for (var k = 0; k < 8; k++) { M[0x9AA0 + k] = 0; M[0x9AC0 + k] = 0; }
      M[0x9AA9] = 0; M[0x9AC9] = 0;
      for (k = 0x0B; k < 0x17; k++) { M[0x9AA0 + k] = 0; M[0x9AC0 + k] = 0; }
      return;
    }
    M[r] = 0;
  }
  // one step of one voice's note list (c_0581)
  function c_0581() {
    var d = M[0x9A75], st = 0x9A00 + d;
    M[st] = (M[st] + 1) & 0xFF;
    var p = sRd16(0x0779 + d * 2);
    var h0 = S[p], h1 = S[p + 1], h2 = S[p + 2];
    M[0x9A88] = h0; M[0x9A89] = h1; M[0x9A8A] = h2;
    var q = (p + 3 + M[0x9A30 + d]) & 0xFFFF;
    var v = M[0x9A77], fr = [0x9A61, 0x9A66, 0x9A6B][v] || 0x9A6B, vo = [0x9A65, 0x9A6A, 0x9A6F][v] || 0x9A6F;
    var note = S[q];
    if (note === 0xFF) { M[vo] = 0; M[0x9A78] = 1; return; }   // the end: this voice goes quiet
    var bc = sRd16(0x06DA + (note & 0x0F) * 2) >> ((note >> 4) & 0x0F);
    var c = bc & 0xFF, b = (bc >> 8) & 0xFF;
    M[fr] = c; M[fr + 1] = ((c >> 4) | (c << 4)) & 0xFF; M[fr + 2] = b; M[fr + 3] = ((b >> 4) | (b << 4)) & 0xFF;
    // volume: a rest is silent; otherwise by the sound's envelope type
    var a, n = M[st];
    if (note === 0x0C) a = 0;
    else if (h0 >= 2 && n < 6) a = (~n) & 0xFF;          // fading in from the top
    else if (h0 === 1 && n < 6) a = (n << 1) & 0xFF;      // rising
    else if (!h1) a = 0x0A;
    else if (n < h1) a = 0x0A;
    else { a = n - h1 - 0x0A; a = a >= 0 ? 0 : (-a) & 0xFF; }   // dying away after h1 steps
    M[vo] = a;
    M[0x9A70 + v] = h2;                   // the waveform
    // how long this note lasts: its length times this sound's base rate
    var base = S[0x07D7 + M[SN_IDX]], e = S[q + 1], hl = 0;
    for (var k = 0; k < 8; k++) { if (base & 1) hl += e; base >>= 1; e <<= 1; }
    if ((hl & 0xFF) !== M[st]) return;
    M[0x9A30 + d] = (M[0x9A30 + d] + 2) & 0xFF;
    M[st] = 0;
  }
  function sndNmi() {
    if (M[0x9AB8]) { M.fill(0, 0x9A00, 0x9B00); return; }
    M.fill(0, 0x9A60, 0x9A70);
    if (M[0x9AB7]) {                      // sound manager reset
      M.fill(0, 0x9AA0, 0x9AB6); M.fill(0, 0x9AC0, 0x9AD7);
    } else sndProgram();
    for (var i = 0; i < 16; i++) WSG[0x10 + i] = M[0x9A60 + i];
    WSG[0x05] = M[0x9A70]; WSG[0x0A] = M[0x9A71]; WSG[0x0F] = M[0x9A72];
  }
  function sndProgram() {
    if (M[0x9A79]) { M[0x9AA8] = (M[0x9AA8] + M[0x9A79]) & 0xFF; M[0x9A79] = 0; }
    // the formation's breathing: a slow sweep up or down on voice 0
    if (M[0x9AA0]) {
      var sg = M[0x9211], reload = false;
      if (sg !== M[0x9A80]) {
        M[0x9A80] = sg;
        var tb = ((sg + 1) & 0xFF) ? 0x06F4 : 0x0704;
        M[0x9A82] = tb & 0xFF; M[0x9A83] = tb >> 8;
        M[0x9A00] = 0; M[0x9A81] = 0; reload = true;
      } else {
        M[0x9A00] = (M[0x9A00] + 1) & 0xFF;
        if (M[0x9A00] === 0x22) { M[0x9A00] = 0; M[0x9A81] = (M[0x9A81] + 1) & 0xFF; reload = true; }
      }
      if (reload) {
        var hl = (M[0x9A82] | M[0x9A83] << 8) + M[0x9A81] * 2;
        var de = sRd16(hl); M[0x9A84] = de & 0xFF; M[0x9A85] = de >> 8;
        de = sRd16(hl + 0x20); M[0x9A86] = de & 0xFF; M[0x9A87] = de >> 8;
      }
      var acc = ((M[0x9A86] | M[0x9A87] << 8) + (M[0x9A84] | M[0x9A85] << 8)) & 0xFFFF;
      M[0x9A86] = acc & 0xFF; M[0x9A87] = acc >> 8;
      var h = acc >> 8;
      M[0x9A61] = h; M[0x9A62] = ((h >> 4) | (h << 4)) & 0xFF;
      M[0x9A65] = 0x0A; M[0x9A70] = 0;
    }
    // effects that start fresh each time they're asked for: dive, shot, hits
    [0x13, 0x0F, 0x03, 0x02, 0x04, 0x01].forEach(function (i) {
      M[SN_IDX] = i;
      if (M[0x9AA0 + i]) { M[0x9AA0 + i] = 0; sndStart(); }
      else if (M[0x9AC0 + i]) sndCont();
    });
    if (M[0x9AB2]) { M[SN_IDX] = 0x12; sndOnce(); }        // bonus bees
    // the tractor beam: its two parts warble on voice 2
    if (M[0x9AA5]) {
      M[SN_IDX] = 5; sndHeld();
      if (++M[0x9A7E] >= 6) { M[0x9A7E] = 0; M[0x9A7C] = M[0x9A7C] < 4 ? 0x0C : M[0x9A7C] - 1; }
      M[0x9A6F] = M[0x9A7C];
    } else M[0x9AC5] = 0;
    if (M[0x9AA6]) {
      M[SN_IDX] = 6; sndHeld();
      if (++M[0x9A7F] === 0x1C) { M[0x9A7F] = 0; M[0x9A7D]++; }
      M[0x9A70] = M[0x9A7D];
    } else M[0x9AC6] = 0;
    if (M[0x9AA9]) { M[SN_IDX] = 9; sndHeld(); } else M[0x9AC9] = 0;        // fighter captured
    if (M[0x9AA7]) { M[SN_IDX] = 7; sndOnce(); }                          // the fighter explodes: nothing else but the coin
    else {
      if (M[0x9AB1]) { M[SN_IDX] = 0x11; sndHeld(); } else M[0x9AD1] = 0; // rescued fighter
      if (M[0x9AAD]) { M[SN_IDX] = 0x0D; sndOnce(); }                     // challenging stage intro
      if (M[0x9AAE]) { M[SN_IDX] = 0x0E; sndOnce(); M[0x9A6A] = 9; M[0x9A6F] = 6; }   // challenging stage results
      if (M[0x9AB4]) { M[SN_IDX] = 0x14; sndOnce(); }                     // perfect
      if (M[0x9AB5]) { M[SN_IDX] = 0x15; sndOnce(); }                     // stage badge clicks
      if (M[0x9AAA]) { M[SN_IDX] = 0x0A; sndOnce(); }                     // extra fighter
      if (M[0x9AAB]) { M[SN_IDX] = 0x0B; sndOnce(); }                     // start of game
      if (M[0x9AB0]) { M[SN_IDX] = 0x10; sndHeld(); } else M[0x9AD0] = 0; // high score entry
      if (M[0x9AAC]) { M[SN_IDX] = 0x0C; sndOnce(); }
      if (M[0x9AB6]) { M[SN_IDX] = 0x16; sndOnce(); }
    }
    if (M[0x9AA8]) { M[SN_IDX] = 8; sndOnce(); }                          // coin
  }

  // ═══ outside interface ══════════════════════════════════════════════════
  // how far the sub CPU gets through the flying objects before the main CPU's first tasks run (fitted to MAME)
  var RACE = 3;
  var WSG2 = [new Uint8Array(0x20), new Uint8Array(0x20)], bangs = 0;
  var gen = null, inp = { l: false, r: false, fire: false, firePrev: false };
  function reset(cfg) {
    cfg = cfg || {};
    M.fill(0);
    var d = window.GG_DATA, bin = atob(d.r1);
    for (var i = 0; i < bin.length; i++) R1[i] = bin.charCodeAt(i);
    bin = atob(d.snd); S.fill(0); for (i = 0; i < bin.length; i++) S[0x06DA + i] = bin.charCodeAt(i);
    WSG.fill(0); bangs = 0;
    M[0x9980] = 0x02; M[0x9981] = 0x07;   // extra fighters at 20,000 and 70,000, then every 70,000
    M[0x9982] = (cfg.lives || 3) - 1;
    M[0x9983] = 0; M[0x9984] = 3;         // upright cabinet, the factory difficulty
    M[0x99B5] = 0; M[0x99B6] = 0x3F; M[0x99B7] = 0x3F;
    var t1 = [0, 1, 1, 0, 1, 1, 0, 0x0A];  // the sub CPU's task switches, as its reset sets them
    for (i = 0; i < 8; i++) M[0x9020 + i] = t1[i];
    setBest5([]);
    gen = mainline();
    gen.next();
  }
  function setInput(l, r, fire) {
    var v = 0x3F;
    if (r) v &= ~0x02;
    if (l) v &= ~0x08;
    // the fire button reads as pressed for one frame per press, as the cabinet's I/O chip reports it
    if (fire && !inp.firePrev) v &= ~0x10;
    inp.firePrev = fire;
    M[0x99B6] = v; M[0x99B7] = v;
  }
  function frame() {
    // vertical blank: the sub CPU counts the frame, both CPUs copy their half of the sprites, then the tasks run
    var f = (M[0x92A0] + 1) & 0xFF;
    M[0x92A0] = f;
    var t1 = M[0x92A1], t2 = M[0x92A2];
    if ((f & 0x1F) === 1) t2 = (t2 + 1) & 0xFF;
    else if ((f & 0x1F) === 0) { t2 = ((t2 | 1) + 1) & 0xFF; t1 = (t1 + 1) & 0xFF; }
    M[0x92A1] = t1; M[0x92A2] = t2;
    M[0x92AA] = (M[0x9015] & (M[0x92A7] < M[0x99C7] ? 1 : 0)) & 1;
    if (M[0x9021]) f_05BF();
    if (M[0x9001]) f_0828();
    f_08D3a(); f_08D3b(RACE); cpu0Tasks(0, 12); f_08D3b(99); cpu1Tasks(3, 8); cpu0Tasks(12, 32);
    if (gen) gen.next();
    // the main CPU's NMI: the fighter's explosion goes to the 54xx noise chip
    if (M[0x9AB9]) { M[0x9AB9] = 0; bangs++; }
    // the sound CPU, twice a frame
    sndNmi(); WSG2[0].set(WSG);
    sndNmi(); WSG2[1].set(WSG);
  }
  window.GGCore = {
    M: M, R1: R1, hooks: hooks, reset: reset, frame: frame, setInput: setInput,
    starCtrl: function () { return starCtrl; },
    starClr: function () { var c = starClr; starClr = 0; return c; },
    coin: function () { M[0x99B5] = (M[0x99B5] + 1) & 0xFF; },
    start: function () { if (M[0x99B5]) M[0x99B5]--; },
    setBest5: setBest5, setHighScore: setHighScore,
    state: function () { return M[0x9201]; },
    rack: function (on) { rackTest = !!on; },
    wsg: WSG2,                            // the wave chip's registers after each of this frame's two sound updates
    bang: function () { var b = bangs; bangs = 0; return b; }
  };
})();

// ═══ Galaga's video hardware: 36 x 28 character tiles over 64 sprites over the 05xx starfield ═══════
// Draws the arcade's 288 x 224 frame from its RAM, turned upright (the monitor is mounted on its side), into a
// 224 x 288 array of RGBA pixels. Follows MAME's galaga video driver and its 05xx starfield chip model.
(function () {
  'use strict';
  function unpack(b64, n, size) {          // 2 bits a pixel, 4 pixels a byte
    var bin = atob(b64), out = new Uint8Array(n * size * size);
    for (var i = 0; i < bin.length; i++) {
      var v = bin.charCodeAt(i);
      out[i * 4] = v & 3; out[i * 4 + 1] = (v >> 2) & 3; out[i * 4 + 2] = (v >> 4) & 3; out[i * 4 + 3] = v >> 6;
    }
    return out;
  }
  var LE = new Uint8Array(new Uint32Array([0x0A0B0C0D]).buffer)[0] === 0x0D;
  function rgba(r, g, b) { return LE ? (0xFF000000 | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | 0xFF) >>> 0; }

  function create(d) {
    var CH = unpack(d.chars, 128, 8), SP = unpack(d.sprites, 128, 16);
    var PAL = [], i;
    for (i = 0; i < 32; i++) PAL.push(rgba(d.pal[i * 3], d.pal[i * 3 + 1], d.pal[i * 3 + 2]));
    var STAR = [], MAP = [0x00, 0x47, 0x97, 0xDE];
    for (i = 0; i < 64; i++) STAR.push(rgba(MAP[i & 3], MAP[(i >> 2) & 3], MAP[(i >> 4) & 3]));
    var SL = d.sprlut, CL = d.chrlut, BLACK = rgba(0, 0, 0);
    var W = 224, H = 288, px = new Uint32Array(W * H);
    // native (x across 288, y down 224) to upright: the picture turned a quarter clockwise
    function put(x, y, c) { if (x >= 0 && x < 288 && y >= 0 && y < 224) px[x * W + (223 - y)] = c; }

    // ── 05xx starfield: a 16-bit LFSR run over a 256 x 256 field, a star wherever its bits line up ──
    var lfsr = 0x7FFF, on = 0;
    var PRE = 22 * 256, POST = 10 * 256, XOFF = [0, 1, 2, 3, -4, -3, -2, -1];
    function step(l) { var b = (l ^ (l >> 3) ^ (l >> 5) ^ (l >> 10)) & 1; return (l >> 1) | (b << 15); }
    function stars(ctl, clr) {
      if (clr) { lfsr = 0x7FFF; on = 1; }
      if (!on) return;
      var setA = (ctl >> 3) & 1, setB = ((ctl >> 4) & 1) | 2;
      var n = PRE + XOFF[ctl & 7], l = lfsr;
      while (n--) l = step(l);
      for (var y = 0; y < 224; y++) {
        for (var x = 16; x < 272; x++) {
          if ((l & 0xFA14) === 0x7800) {
            var set = ((l >> 9) & 2) | ((l >> 8) & 1);
            if (set === setA || set === setB) {
              var c = ((l >> 5) & 7) | ((l << 3) & 0x18) | ((l << 2) & 0x20);
              put(x, y, STAR[(~c) & 0x3F]);
            }
          }
          l = step(l);
        }
      }
      n = POST; while (n--) l = step(l);
      lfsr = l;
    }

    function sprites(M) {
      for (var o = 0; o < 0x80; o += 2) {
        var code = M[0x8B80 + o] & 0x7F, col = M[0x8B81 + o] & 0x3F;
        var sx = M[0x9381 + o] - 40 + 0x100 * (M[0x9B81 + o] & 3);
        var a = M[0x9B80 + o], fx = a & 1, fy = (a >> 1) & 1, zx = (a >> 2) & 1, zy = (a >> 3) & 1;
        var sy = ((256 - M[0x9380 + o] + 1 - 16 * zy) & 0xFF) - 32;
        for (var ty = 0; ty <= zy; ty++) for (var tx = 0; tx <= zx; tx++) {
          var t = code + (((ty ^ (zy & fy)) << 1) | (tx ^ (zx & fx)));
          var base = (t & 0x7F) * 256, ox = sx + 16 * tx, oy = sy + 16 * ty;
          for (var y = 0; y < 16; y++) {
            var Y = oy + y; if (Y < 0 || Y >= 224) continue;
            var row = base + (fy ? 15 - y : y) * 16;
            for (var x = 0; x < 16; x++) {
              var pen = SL[col * 4 + SP[row + (fx ? 15 - x : x)]];
              if (pen !== 15) put(ox + x, Y, PAL[pen]);
            }
          }
        }
      }
    }

    function tiles(M) {
      for (var row = 0; row < 28; row++) for (var col = 0; col < 36; col++) {
        var r = row + 2, c = col - 2;
        var offs = (c & 0x20) ? r + ((c & 0x1F) << 5) : c + (r << 5);
        offs &= 0x3FF;
        var base = (M[0x8000 + offs] & 0x7F) * 64, color = M[0x8400 + offs] & 0x3F;
        for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
          var pen = CL[color * 4 + CH[base + y * 8 + x]];
          if (pen !== 0x1F) put(col * 8 + x, row * 8 + y, PAL[pen]);
        }
      }
    }

    return {
      W: W, H: H, px: px,
      // one frame: stars, then sprites, then the text layer over both
      draw: function (M, starCtl, starClr) {
        px.fill(BLACK);
        stars(starCtl, starClr);
        sprites(M);
        tiles(M);
        return px;
      }
    };
  }
  window.GGVideo = { create: create };
})();

// ═══ Galaga's sound: the Namco 3-voice wave chip, and the 54xx explosion ═══════════════════════════
// The sound CPU (in GGCore) writes the chip's registers twice a frame; here they play through Web Audio. The chip
// steps each voice's 20-bit phase by its frequency 96,000 times a second and reads a 4-bit sample from one of eight
// 32-step waveforms (the sound PROM), times the voice's 4-bit volume. Levels match MAME's mix.
(function () {
  'use strict';
  // the chip itself, written so it can run in the page or in an AudioWorklet (its source is copied there)
  function makeWSG(wave, sr) {
    var acc = [0, 0, 0], fr = [0, 0, 0], vo = [0, 0, 0], wv = [0, 0, 0];
    var step = 96000 / sr, pos = 0, GAIN = 0.00147;
    function set(r) {                     // r: the 32 registers
      fr[0] = (r[0x10] & 15) | (r[0x11] & 15) << 4 | (r[0x12] & 15) << 8 | (r[0x13] & 15) << 12 | (r[0x14] & 15) << 16;
      fr[1] = ((r[0x16] & 15) | (r[0x17] & 15) << 4 | (r[0x18] & 15) << 8 | (r[0x19] & 15) << 12) << 4;
      fr[2] = ((r[0x1B] & 15) | (r[0x1C] & 15) << 4 | (r[0x1D] & 15) << 8 | (r[0x1E] & 15) << 12) << 4;
      vo[0] = r[0x15] & 15; vo[1] = r[0x1A] & 15; vo[2] = r[0x1F] & 15;
      wv[0] = (r[0x05] & 7) * 32; wv[1] = (r[0x0A] & 7) * 32; wv[2] = (r[0x0F] & 7) * 32;
    }
    function tick() {                     // one 96 kHz step: the sum of the three voices
      var s = 0;
      for (var v = 0; v < 3; v++) {
        acc[v] = (acc[v] + fr[v]) & 0xFFFFF;
        if (vo[v]) s += (wave[wv[v] + (acc[v] >>> 15)] - 8) * vo[v];
      }
      return s;
    }
    function render(out, from, n) {       // n output samples, each the average of the chip steps it covers
      for (var i = 0; i < n; i++) {
        var end = pos + step, s = 0, k = 0;
        while (pos < end) { s += tick(); k++; pos += 1; }
        pos -= step;
        out[from + i] = k ? s / k * GAIN : 0;
      }
    }
    function quiet() { return !vo[0] && !vo[1] && !vo[2]; }
    return { set: set, render: render, quiet: quiet };
  }

  // the worklet: a queue of register sets, two a frame, each played for half a frame
  var WORKLET = 'var makeWSG = ' + makeWSG.toString() + ';\n' +
    'class GGWSG extends AudioWorkletProcessor {\n' +
    '  constructor(o) { super(); var p = o.processorOptions; this.w = makeWSG(p.wave, sampleRate); this.q = []; this.left = 0;\n' +
    '    this.per = sampleRate / 121.212; this.port.onmessage = (e) => { var d = e.data; if (d === "flush") { this.q.length = 0; this.w.set(new Uint8Array(32)); return; } this.q.push(d); if (this.q.length > 12) this.q.splice(0, this.q.length - 4); }; }\n' +
    '  process(ins, outs) { var o = outs[0][0], n = o.length, i = 0;\n' +
    '    while (i < n) { if (this.left <= 0) { if (this.q.length) this.w.set(this.q.shift()); this.left += this.per; }\n' +
    '      var k = Math.min(n - i, Math.ceil(this.left)); this.w.render(o, i, k); i += k; this.left -= k; }\n' +
    '    for (var c = 1; c < outs[0].length; c++) outs[0][c].set(o); return true; } }\n' +
    'registerProcessor("gg-wsg", GGWSG);\n';

  function create(opts) {
    var d = window.GG_DATA, bin = atob(d.wave), WAVE = new Uint8Array(256);
    for (var i = 0; i < 256; i++) WAVE[i] = bin.charCodeAt(i);
    var ac = null, node = null, master = null, ready = false, bangBuf = null, sp = null, spW = null, spQ = [], spLeft = 0;
    function on() { return !opts || !opts.on || opts.on(); }
    function ctx() {
      if (ac || !on()) return ac;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      if (ac.audioWorklet && window.Blob && window.URL) {
        var url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
        ac.audioWorklet.addModule(url).then(function () {
          node = new AudioWorkletNode(ac, 'gg-wsg', { numberOfInputs: 0, outputChannelCount: [1], processorOptions: { wave: WAVE } });
          node.connect(master); ready = true;
        }).catch(fallback);
      } else fallback();
      // the explosion, recorded from the 54xx chip's circuit in MAME
      fetch('galaga-bang.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); });
      }).then(function (buf) { bangBuf = buf; }).catch(function () {});
      return ac;
    }
    function fallback() {                 // older browsers: the same chip on the main thread
      if (node || sp) return;
      sp = ac.createScriptProcessor(1024, 0, 1); spW = makeWSG(WAVE, ac.sampleRate);
      var per = ac.sampleRate / 121.212;
      sp.onaudioprocess = function (e) {
        var o = e.outputBuffer.getChannelData(0), n = o.length, i = 0;
        while (i < n) {
          if (spLeft <= 0) { if (spQ.length) spW.set(spQ.shift()); spLeft += per; }
          var k = Math.min(n - i, Math.ceil(spLeft)); spW.render(o, i, k); i += k; spLeft -= k;
        }
      };
      sp.connect(master); ready = true;
    }
    function send(r) {
      var c = new Uint8Array(32); c.set(r);
      if (node) node.port.postMessage(c);
      else if (sp) { spQ.push(c); if (spQ.length > 12) spQ.splice(0, spQ.length - 4); }
    }
    return {
      unlock: function () { var a = ctx(); if (a && a.state !== 'running') try { a.resume(); } catch (e) {} },
      // after each arcade frame: its two register sets, and any explosion
      frame: function (core) {
        if (!ac || !ready || ac.state !== 'running') return;
        send(core.wsg[0]); send(core.wsg[1]);
        if (core.bang() && bangBuf) { var s = ac.createBufferSource(); s.buffer = bangBuf; s.connect(master); s.start(); }
      },
      out: function () { return master; },   // (for tests)
      stop: function () {
        if (node) node.port.postMessage('flush'); spQ.length = 0; if (spW) spW.set(new Uint8Array(32));
        if (ac && ac.state === 'running') try { ac.suspend(); } catch (e) {}
      }
    };
  }
  window.GGSound = { create: create, makeWSG: makeWSG };
})();
