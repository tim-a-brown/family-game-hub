// ═══ Jungle Hunt (Atari 2600, 1983): the cartridge's own program, translated to JavaScript ═══════════════════
// Both 4K halves of the cartridge were disassembled and every instruction turned into the JavaScript that does the
// same thing (the bank0/bank1 functions below). The console around it is modelled here: the 128 bytes of RAM, the
// RIOT timer and ports, and the TIA chip that draws the picture as the program writes to it, line by line, at the
// cycle each write happens. Picture, sound and play match the real cartridge frame for frame.
(function () {
  'use strict';
  var D = window.JH_DATA, RB0, RB1;
  var R = new Uint8Array(128);            // the console's RAM ($80-$FF)
  var A = 0, X = 0, Y = 0, SP = 0xFF, fN = false, fZ = false, fC = false, fV = false, fD = false, fI = true;
  var t = 0, u = 0, BK = 1, PC = 0xF003, CY = 0, FE = false;
  var ORG = [0xD000, 0xF000];
  function rpc(a) { return ORG[BK] | (a & 0xFFF); }
  function getP() { return (fN ? 128 : 0) | (fV ? 64 : 0) | 32 | (fD ? 8 : 0) | (fI ? 4 : 0) | (fZ ? 2 : 0) | (fC ? 1 : 0); }
  function setP(p) { fN = (p & 128) !== 0; fV = (p & 64) !== 0; fD = (p & 8) !== 0; fI = (p & 4) !== 0; fZ = (p & 2) !== 0; fC = (p & 1) !== 0; }
  function push(v) { wr(0x100 | SP, v); SP = SP - 1 & 255; }
  function pull() { SP = SP + 1 & 255; return rd(0x100 | SP); }
  function jind(a) { return rpc(rd(a) | rd((a & 0xFF00) | (a + 1 & 0xFF)) << 8); }
  function adc(v) {
    var c = fC ? 1 : 0;
    if (!fD) { var r = A + v + c; fV = (~(A ^ v) & (A ^ r) & 0x80) !== 0; fC = r > 255; A = r & 255; fZ = A === 0; fN = A > 127; return; }
    var lo = (A & 15) + (v & 15) + c, hi = (A >> 4) + (v >> 4);
    if (lo > 9) { lo += 6; hi++; }
    fZ = ((A + v + c) & 255) === 0;
    fN = (hi & 8) !== 0; fV = (~(A ^ v) & (A ^ (hi << 4)) & 0x80) !== 0;
    if (hi > 9) hi += 6;
    fC = hi > 15; A = (hi << 4 | lo & 15) & 255;
  }
  function sbc(v) {
    var c = fC ? 0 : 1, r = A - v - c;
    fV = ((A ^ v) & (A ^ r) & 0x80) !== 0; fZ = (r & 255) === 0; fN = (r & 128) !== 0;
    if (!fD) { fC = r >= 0; A = r & 255; return; }
    var lo = (A & 15) - (v & 15) - c, hi = (A >> 4) - (v >> 4);
    if (lo < 0) { lo -= 6; hi--; }
    if (hi < 0) hi -= 6;
    fC = r >= 0; A = (hi << 4 | lo & 15) & 255;
  }

  // ── the console's inputs ──
  var IN = { swcha: 0xFF, fire: false, swchb: 0x3F, hook: null };

  // ── RIOT: timer and ports ──
  var timVal = 0, timShift = 10, timAt = 0, timInt = false;
  function intim() {
    var d = CY - timAt, n = d >> timShift;
    if (n <= timVal) return timVal - n & 255;
    timInt = true;
    return 0xFF - (d - ((timVal + 1) << timShift)) & 255;   // past 0 it counts down once a cycle
  }
  function riotRead(a) {
    switch (a & 0x287) {
      case 0x280: return IN.hook ? IN.hook(0, IN.swcha) : IN.swcha;
      case 0x282: return IN.hook ? IN.hook(2, IN.swchb) : IN.swchb;
      case 0x281: case 0x283: return 0;
      case 0x284: case 0x286: return intim();
      default: intim(); var f = timInt ? 0xC0 : 0; return f;
    }
  }
  function riotWrite(a, v) {
    if ((a & 0x294) === 0x294) { timVal = v; timShift = [0, 3, 6, 10][a & 3]; timAt = CY; timInt = false; }
  }

  // ── TIA: the picture, drawn a pixel at a time as the beam moves (160 pixels a line, 76 CPU cycles a line) ──
  var W = 160, H = 280, OH = 223, TOP = 22, BLACK = 128;
  // fb holds the whole frame from vertical sync on; out is the part a TV shows, 223 lines starting 22 lines after
  // vertical sync ends (where the real console's picture sits, matching MAME)
  var fb = new Uint8Array(W * H), out = new Uint8Array(W * OH), outLines = 0, vsOff = 3;
  var frameBase = 0, rLine = 0, rX = 0;
  var vsync = 0, vblank = 0, latch = false, latched = false;
  var colP = [0, 0], colPF = 0, colBK = 0, ctrlpf = 0, pf0 = 0, pf1 = 0, pf2 = 0;
  var nus = [0, 0], refp = [0, 0], grpN = [0, 0], grpO = [0, 0], vdelp = [0, 0], ppos = [0, 0];
  var enam = [0, 0], mpos = [0, 0], resmp = [0, 0], enblN = 0, enblO = 0, vdelbl = 0, bpos = 0;
  var hm = [0, 0, 0, 0, 0], cx = 0, barLine = -1;
  // horizontal motion, as the TIA does it: after HMOVE a counter steps every 4 colour clocks; each object gets one
  // extra clock (one pixel left) per step while it is in the blanking period, until the counter reaches its HMxx
  // value (xor 8). HMOVE in the blanking period also stretches it by 8 pixels (the black bar), which moves everything
  // 8 right. A game can change HMxx while the counter runs, and the object then stops at the new value.
  var mvOn = false, mvNext = 0, mvCount = 0, mvMoving = [false, false, false, false, false], mvExt = -1;
  function objPos(o) { return o === 0 ? ppos[0] : o === 1 ? ppos[1] : o === 2 ? mpos[0] : o === 3 ? mpos[1] : bpos; }
  function setPos(o, p) { p = (p + 160) % 160; dirty |= 1 << o; if (o === 0) ppos[0] = p; else if (o === 1) ppos[1] = p; else if (o === 2) mpos[0] = p; else if (o === 3) mpos[1] = p; else bpos = p; }
  function motion(clk) {                 // run the motion counter up to this colour clock of the frame
    while (mvOn && mvNext <= clk) {
      var line = Math.floor(mvNext / 228), hc = mvNext % 228, hb = hc < 68 + (line === mvExt ? 8 : 0);
      var ctr = mvCount > 15 ? 0 : mvCount, any = false;
      for (var o = 0; o < 5; o++) {
        if (ctr === (hm[o] ^ 8)) mvMoving[o] = false;
        if (mvMoving[o]) { any = true; if (hb) setPos(o, objPos(o) - 1); }
      }
      mvCount++; mvNext += 4;
      if (!any) mvOn = false;
    }
  }
  var aud = [];                          // this frame's sound register writes: [cycle in frame, register, value]
  // which object masks each register write can change
  var DIRTY = new Uint8Array(64);
  [[4, 5], [5, 10], [0xA, 48], [0xB, 1], [0xC, 2], [0xD, 32], [0xE, 32], [0xF, 32], [0x10, 1], [0x11, 2], [0x12, 4], [0x13, 8], [0x14, 16],
   [0x1B, 3], [0x1C, 19], [0x1D, 4], [0x1E, 8], [0x1F, 16], [0x25, 1], [0x26, 2], [0x27, 16], [0x28, 4], [0x29, 8], [0x2A, 31]].forEach(function (d) { DIRTY[d[0]] = d[1]; });
  var COPIES = [[0], [0, 16], [0, 32], [0, 16, 32], [0, 64], [0], [0, 32, 64], [0]];
  // calibration against the real console (MAME): where objects land after RESPx, and when writes show
  var T = { pHB: 3, pD: 5, mHB: 2, mD: 4, pStart: 0, wd: 1, pfwd: 2, bar: 8, mvd: 0, mvw: 0, cwd: 0 };

  // Each object's pixels on the line, kept as masks and rebuilt only when a register that shapes it changes
  // (dirty bits: 1 P0, 2 P1, 4 M0, 8 M1, 16 BL, 32 PF). A pixel then is a 6-bit code of which objects are there.
  var mk = [new Uint8Array(160), new Uint8Array(160), new Uint8Array(160), new Uint8Array(160), new Uint8Array(160)];
  var pfm = new Uint8Array(40), dirty = 63;
  function pfAt(i) {
    if (i >= 20) i = (ctrlpf & 1) ? 39 - i : i - 20;
    if (i < 4) return pf0 >> (4 + i) & 1;
    if (i < 12) return pf1 >> (11 - i) & 1;
    return pf2 >> (i - 12) & 1;
  }
  function rebuild() {
    var p, m, i, k, c, x;
    for (p = 0; p < 2; p++) if (dirty & (1 << p)) {
      var a = mk[p]; a.fill(0);
      var g = vdelp[p] ? grpO[p] : grpN[p];
      if (g) {
        var n = nus[p] & 7, sh = n === 5 ? 1 : n === 7 ? 2 : 0, w = 8 << sh, cs = COPIES[n], base = ppos[p] + T.pStart;
        for (i = 0; i < cs.length; i++) for (k = 0; k < w; k++) {
          var bit = k >> sh;
          if (refp[p] ? g >> bit & 1 : g >> (7 - bit) & 1) a[(base + cs[i] + k) % 160] = 1;
        }
      }
    }
    for (m = 0; m < 2; m++) if (dirty & (4 << m)) {
      var am = mk[2 + m]; am.fill(0);
      if (enam[m] && !resmp[m]) {
        var nm = nus[m] & 7, wm = 1 << (nus[m] >> 4 & 3), cm = COPIES[nm];
        for (i = 0; i < cm.length; i++) for (k = 0; k < wm; k++) am[(mpos[m] + cm[i] + k) % 160] = 1;
      }
    }
    if (dirty & 16) {
      var ab = mk[4]; ab.fill(0);
      if (vdelbl ? enblO : enblN) { var wb = 1 << (ctrlpf >> 4 & 3); for (k = 0; k < wb; k++) ab[(bpos + k) % 160] = 1; }
    }
    if (dirty & 32) for (i = 0; i < 40; i++) pfm[i] = pfAt(i);
    dirty = 0;
  }
  // per 6-bit code (P0 P1 M0 M1 BL PF): the collision bits it sets, and which colour shows (0 P0, 1 P1, 2 PF, 3 BK,
  // 4 playfield in score mode) for normal and playfield-first priority
  var COLL = new Uint16Array(64), PRI = [new Uint8Array(64), new Uint8Array(64)];
  (function () {
    for (var c = 0; c < 64; c++) {
      var p0 = c & 1, p1 = c >> 1 & 1, m0 = c >> 2 & 1, m1 = c >> 3 & 1, bl = c >> 4 & 1, pf = c >> 5 & 1, x = 0;
      if (m0) { if (p1) x |= 1 << 0; if (p0) x |= 1 << 1; if (pf) x |= 1 << 8; if (bl) x |= 1 << 9; if (m1) x |= 1 << 15; }
      if (m1) { if (p0) x |= 1 << 2; if (p1) x |= 1 << 3; if (pf) x |= 1 << 10; if (bl) x |= 1 << 11; }
      if (p0) { if (pf) x |= 1 << 4; if (bl) x |= 1 << 5; if (p1) x |= 1 << 14; }
      if (p1) { if (pf) x |= 1 << 6; if (bl) x |= 1 << 7; }
      if (bl && pf) x |= 1 << 12;
      COLL[c] = x;
      PRI[0][c] = (p0 || m0) ? 0 : (p1 || m1) ? 1 : pf ? 4 : bl ? 2 : 3;
      PRI[1][c] = pf ? 4 : bl ? 2 : (p0 || m0) ? 0 : (p1 || m1) ? 1 : 3;
    }
  })();
  var pfL = 0;
  function span(line, x0, x1) {         // draw pixels x0..x1-1 of a line with the registers as they are now
    if (dirty) rebuild();
    var m0 = mk[0], m1 = mk[1], m2 = mk[2], m3 = mk[3], m4 = mk[4], pr = PRI[ctrlpf & 4 ? 1 : 0], cxv = cx;
    var row = line < H ? line * W : -1, blank = (vblank & 2) !== 0, bar = line === barLine ? T.bar : 0;
    var score = (ctrlpf & 2) !== 0, cols = [colP[0], colP[1], colPF, colBK, colPF];
    for (var x = x0; x < x1; x++) {
      if ((x & 3) === 0) pfL = pfm[x >> 2];   // the playfield is read four pixels at a time
      var code = m0[x] | m1[x] << 1 | m2[x] << 2 | m3[x] << 3 | m4[x] << 4 | pfL << 5;
      cxv |= COLL[code];
      if (row < 0) continue;
      if (blank || x < bar) { fb[row + x] = BLACK; continue; }
      var s = pr[code];
      fb[row + x] = s === 4 ? (score ? colP[x < 80 ? 0 : 1] : colPF) : cols[s];
    }
    cx = cxv;
  }
  function catchUp(clk) {              // draw everything the beam has passed up to this colour clock of the frame
    var tl = Math.floor(clk / 228), tx = clk % 228 - 68;
    while (rLine < tl || (rLine === tl && rX < tx)) {
      if (mvOn && rX === 0) motion(Math.min(rLine * 228 + 75, clk));
      var end = rLine < tl ? 160 : Math.min(tx, 160);
      if (end > rX) span(rLine, rX, end);
      if (rLine < tl) { rLine++; rX = 0; } else { rX = end; break; }
    }
  }
  function clkNow() { return (CY - frameBase) * 3; }
  function lineClk() { return (CY - frameBase) % 76 * 3; }
  function tiaRead(r) {
    catchUp(clkNow());
    if (r < 8) {
      var b = cx >> (r * 2) & 3;
      return (b & 1 ? 0x80 : 0) | (b & 2 ? 0x40 : 0);
    }
    if (r === 0xC) { if (IN.hook) return IN.hook(4, IN.fire ? 0 : 0x80); var f = IN.fire || (latch && latched); if (latch && IN.fire) latched = true; return f ? 0 : 0x80; }
    if (r === 0xD) return 0x80;
    return 0;
  }
  function resPos(hc, c, hbPos, dly) {  // where RESPx puts an object: it starts dly clocks later, but not before
    var hbEnd = Math.floor(c / 228) === mvExt ? 76 : 68;  // the blanking period (stretched by HMOVE) ends + hbPos
    return (Math.max(hc + dly, hbEnd + hbPos) - 68) % 160;
  }
  function hmv(v) { return v >> 4 & 15; }
  function tiaWrite(r, v) {
    var c = clkNow();
    catchUp(c + (r >= 0x0D && r <= 0x0F ? T.pfwd : r >= 0x06 && r <= 0x09 ? T.cwd : T.wd));
    motion(c + T.mvw);
    var hc = c % 228;
    dirty |= DIRTY[r];
    if (T.log) T.log.push(Math.floor(c / 228), hc - 68, r, v);
    switch (r) {
      case 0x00:
        if ((v & 2) && !(vsync & 2)) {          // the program starts a new frame
          var lines = rLine, top = (vsOff + TOP) * W;
          out.set(fb.subarray(top, top + W * OH)); outLines = lines;
          frameBase = CY - (CY - frameBase) % 76;
          rLine = 0; rX = 0; fb.fill(BLACK); barLine = -1;
          FE = true;
        }
        if (!(v & 2) && (vsync & 2)) vsOff = Math.floor(c / 228);
        vsync = v; break;
      case 0x01: vblank = v; latch = (v & 0x40) !== 0; if (!latch) latched = false; break;
      case 0x02: var rel = (CY - frameBase) % 76; if (rel) CY += 76 - rel; break;
      case 0x04: nus[0] = v; break;
      case 0x05: nus[1] = v; break;
      case 0x06: colP[0] = v >> 1; break;
      case 0x07: colP[1] = v >> 1; break;
      case 0x08: colPF = v >> 1; break;
      case 0x09: colBK = v >> 1; break;
      case 0x0A: ctrlpf = v; break;
      case 0x0B: refp[0] = v & 8; break;
      case 0x0C: refp[1] = v & 8; break;
      case 0x0D: pf0 = v; break;
      case 0x0E: pf1 = v; break;
      case 0x0F: pf2 = v; break;
      case 0x10: ppos[0] = resPos(hc, c, T.pHB, T.pD); break;
      case 0x11: ppos[1] = resPos(hc, c, T.pHB, T.pD); break;
      case 0x12: mpos[0] = resPos(hc, c, T.mHB, T.mD); break;
      case 0x13: mpos[1] = resPos(hc, c, T.mHB, T.mD); break;
      case 0x14: bpos = resPos(hc, c, T.mHB, T.mD); break;
      case 0x15: case 0x16: case 0x17: case 0x18: case 0x19: case 0x1A: aud.push(CY - frameBase, r, v); break;
      case 0x1B: grpN[0] = v; grpO[1] = grpN[1]; break;
      case 0x1C: grpN[1] = v; grpO[0] = grpN[0]; enblO = enblN; break;
      case 0x1D: enam[0] = v & 2; break;
      case 0x1E: enam[1] = v & 2; break;
      case 0x1F: enblN = v & 2; break;
      case 0x20: hm[0] = hmv(v); break;
      case 0x21: hm[1] = hmv(v); break;
      case 0x22: hm[2] = hmv(v); break;
      case 0x23: hm[3] = hmv(v); break;
      case 0x24: hm[4] = hmv(v); break;
      case 0x25: vdelp[0] = v & 1; break;
      case 0x26: vdelp[1] = v & 1; break;
      case 0x27: vdelbl = v & 1; break;
      case 0x28: if (resmp[0] && !(v & 2)) mpos[0] = (ppos[0] + 3) % 160; resmp[0] = v & 2; break;
      case 0x29: if (resmp[1] && !(v & 2)) mpos[1] = (ppos[1] + 3) % 160; resmp[1] = v & 2; break;
      case 0x2A:
        if (hc < 68) { mvExt = Math.floor(c / 228); barLine = mvExt; for (var o = 0; o < 5; o++) setPos(o, objPos(o) + 8); }
        mvOn = true; mvCount = 0; mvNext = c + T.mvd + ((4 - (c + T.mvd) % 228 % 4) % 4); mvMoving = [true, true, true, true, true];
        break;
      case 0x2B: hm[0] = hm[1] = hm[2] = hm[3] = hm[4] = 0; break;
      case 0x2C: cx = 0; break;
    }
  }
  function rd(a) {
    a &= 0x1FFF;
    if (a & 0x1000) { if (a === 0x1FF8 || a === 0x1FF9) BK = a - 0x1FF8; return (BK ? RB1 : RB0)[a & 0xFFF]; }
    if (!(a & 0x80)) return tiaRead(a & 15);
    if (!(a & 0x200)) return R[a & 0x7F];
    return riotRead(a);
  }
  function wr(a, v) {
    a &= 0x1FFF;
    if (a & 0x1000) { if (a === 0x1FF8 || a === 0x1FF9) BK = a - 0x1FF8; return; }
    if (!(a & 0x80)) { tiaWrite(a & 0x3F, v); return; }
    if (!(a & 0x200)) { R[a & 0x7F] = v; return; }
    riotWrite(a, v);
  }
  function bank0(pc){for(;;){switch(pc){
  case 0xD000:CY+=4;BK=1;if(BK!==0)return 0xF003; // D000 STA
  case 0xD052:CY+=4;if((0xAB&255)+Y>255) CY++;A=rd((0xAB+Y));fZ=(A)===0;fN=(A)>127; // D052 LDA
  CY+=2;fC=true; // D055 SEC
  CY+=3;sbc(R[0x1F]); // D056 SBC
  CY+=2;t=0xFD;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D058 CMP
  CY+=2;if(fC){CY+=1;pc=0xD063;continue;} // D05A BCS
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D05C CMP
  CY+=2;if(!fC){CY+=1;pc=0xD063;continue;} // D05E BCC
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D060 LDA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // D062 RTS
  case 0xD063:CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // D063 LDA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // D065 RTS
  case 0xD066:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D066 LDA
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D068 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD0DF;continue;} // D06A BNE
  CY+=3;A=R[0x68];fZ=(A)===0;fN=(A)>127; // D06C LDA
  CY+=2;if(fZ){CY+=1;pc=0xD0DF;continue;} // D06E BEQ
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D070 DEY
  CY+=2;if(fN){CY+=1;pc=0xD07C;continue;} // D071 BMI
  CY+=6;push(0xD0);push(0x75);pc=0xD052;continue; // D073 JSR
  case 0xD076:CY+=2;if(fZ){CY+=1;pc=0xD07C;continue;} // D076 BEQ
  CY+=2;A=0x10;fZ=(A)===0;fN=(A)>127; // D078 LDA
  CY+=3;R[0x79]=A; // D07A STA
  case 0xD07C:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D07C INY
  CY+=3;t=R[0x68];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D07D CPY
  CY+=2;if(fC){CY+=1;pc=0xD089;continue;} // D07F BCS
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D081 INY
  CY+=6;push(0xD0);push(0x84);pc=0xD052;continue; // D082 JSR
  case 0xD085:CY+=2;if(fZ){CY+=1;pc=0xD089;continue;} // D085 BEQ
  CY+=5;t=R[0x79];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x79]=t; // D087 INC
  case 0xD089:CY+=3;Y=R[0x14];fZ=(Y)===0;fN=(Y)>127; // D089 LDY
  CY+=3;A=R[0x79];fZ=(A)===0;fN=(A)>127; // D08B LDA
  CY+=2;if(fZ){CY+=1;pc=0xD0DF;continue;} // D08D BEQ
  CY+=2;t=0x10;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D08F CMP
  CY+=2;if(fZ){CY+=1;pc=0xD0A1;continue;} // D091 BEQ
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D093 CMP
  CY+=2;if(fZ){CY+=1;pc=0xD0A9;continue;} // D095 BEQ
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // D097 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D099 LSR
  CY+=2;if(fC){CY+=1;pc=0xD09E;continue;} // D09A BCS
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // D09C INX
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D09D INY
  case 0xD09E:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D09E INY
  CY+=2;if(!fN){CY+=1;pc=0xD0C3;continue;} // D09F BPL
  case 0xD0A1:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // D0A1 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D0A3 LSR
  CY+=2;if(!fC){CY+=1;pc=0xD09E;continue;} // D0A4 BCC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D0A6 DEX
  CY+=2;if(!fN){CY+=1;pc=0xD0C3;continue;} // D0A7 BPL
  case 0xD0A9:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // D0A9 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D0AB LSR
  CY+=2;if(fC){CY+=1;pc=0xD09E;continue;} // D0AC BCS
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D0AE DEX
  CY+=5;t=R[0x69];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x69]=t; // D0AF DEC
  CY+=3;A=R[0x14];fZ=(A)===0;fN=(A)>127; // D0B1 LDA
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D0B3 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD0C3;continue;} // D0B5 BNE
  CY+=3;A=R[0x2E];fZ=(A)===0;fN=(A)>127; // D0B7 LDA
  CY+=3;R[0x2D]=A; // D0B9 STA
  CY+=3;A=R[0x32];fZ=(A)===0;fN=(A)>127; // D0BB LDA
  CY+=3;R[0x31]=A; // D0BD STA
  CY+=3;A=R[0x36];fZ=(A)===0;fN=(A)>127; // D0BF LDA
  CY+=3;R[0x35]=A; // D0C1 STA
  case 0xD0C3:CY+=3;t=R[0x68];fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // D0C3 CPX
  CY+=2;if(fC){CY+=1;pc=0xD0DD;continue;} // D0C5 BCS
  CY+=4;if((0xAB&255)+Y>255) CY++;A=rd((0xAB+Y));fZ=(A)===0;fN=(A)>127; // D0C7 LDA
  CY+=4;R[0x2B+X&127]=A; // D0CA STA
  CY+=4;if((0xAF&255)+Y>255) CY++;A=rd((0xAF+Y));fZ=(A)===0;fN=(A)>127; // D0CC LDA
  CY+=4;R[0x2F+X&127]=A; // D0CF STA
  CY+=4;if((0xB3&255)+Y>255) CY++;A=rd((0xB3+Y));fZ=(A)===0;fN=(A)>127; // D0D1 LDA
  CY+=4;R[0x33+X&127]=A; // D0D4 STA
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // D0D6 INX
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D0D7 INY
  CY+=2;if(!fZ){CY+=1;pc=0xD0C3;continue;} // D0D8 BNE
  case 0xD0DA:CY+=3;pc=0xD1CC;continue; // D0DA JMP
  case 0xD0DD:CY+=5;t=R[0x69];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x69]=t; // D0DD DEC
  case 0xD0DF:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D0DF LDA
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D0E1 CMP
  CY+=2;if(!fC){CY+=1;pc=0xD0DA;continue;} // D0E3 BCC
  CY+=2;if(fZ){CY+=1;pc=0xD0EB;continue;} // D0E5 BEQ
  CY+=3;A=R[0x4A];fZ=(A)===0;fN=(A)>127; // D0E7 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD0DA;continue;} // D0E9 BEQ
  case 0xD0EB:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // D0EB LDA
  CY+=2;t=0x6;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D0ED CMP
  CY+=2;if(!fZ){CY+=2;pc=0xD101;continue;} // D0EF BNE
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D0F1 LDA
  CY+=3;R[0x45]=A; // D0F3 STA
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // D0F5 LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D0F7 AND
  CY+=2;if(!fZ){CY+=2;pc=0xD101;continue;} // D0F9 BNE
  CY+=3;A=R[0x43];fZ=(A)===0;fN=(A)>127; // D0FB LDA
  CY+=2;A^=0x8;fZ=(A)===0;fN=(A)>127; // D0FD EOR
  CY+=3;R[0x43]=A; // D0FF STA
  case 0xD101:CY+=3;t=R[0x40];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D101 BIT
  CY+=2;if(fN){CY+=2;pc=0xD0DA;continue;} // D103 BMI
  CY+=3;A=R[0x37];fZ=(A)===0;fN=(A)>127; // D105 LDA
  CY+=3;sbc(R[0x5D]); // D107 SBC
  CY+=2;t=0xFC;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D109 CMP
  CY+=2;if(fC){CY+=1;pc=0xD111;continue;} // D10B BCS
  CY+=2;t=0x3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D10D CMP
  CY+=2;if(fC){CY+=1;pc=0xD16D;continue;} // D10F BCS
  case 0xD111:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D111 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D113 LSR
  CY+=2;if(!fC){CY+=1;pc=0xD11C;continue;} // D114 BCC
  CY+=2;Y=0xEC;fZ=(Y)===0;fN=(Y)>127; // D116 LDY
  CY+=2;A=0x16;fZ=(A)===0;fN=(A)>127; // D118 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD12A;continue;} // D11A BNE
  case 0xD11C:CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D11C BIT
  CY+=2;if(fV){CY+=1;pc=0xD126;continue;} // D11E BVS
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // D120 LDA
  CY+=2;Y=0xF1;fZ=(Y)===0;fN=(Y)>127; // D122 LDY
  CY+=2;if(!fZ){CY+=1;pc=0xD12A;continue;} // D124 BNE
  case 0xD126:CY+=2;A=0x8;fZ=(A)===0;fN=(A)>127; // D126 LDA
  CY+=2;Y=0xEE;fZ=(Y)===0;fN=(Y)>127; // D128 LDY
  case 0xD12A:CY+=3;R[0xE]=A; // D12A STA
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // D12C LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD132;continue;} // D12E BNE
  CY+=2;Y=0xF9;fZ=(Y)===0;fN=(Y)>127; // D130 LDY
  case 0xD132:CY+=3;R[0xC]=Y; // D132 STY
  CY+=3;A=R[0x3A];fZ=(A)===0;fN=(A)>127; // D134 LDA
  CY+=2;fC=true; // D136 SEC
  CY+=3;sbc(R[0x38]); // D137 SBC
  CY+=2;if(!fC){CY+=1;pc=0xD141;continue;} // D139 BCC
  CY+=3;t=R[0xE];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D13B CMP
  CY+=2;if(fC){CY+=1;pc=0xD15E;continue;} // D13D BCS
  CY+=2;if(!fC){CY+=1;pc=0xD152;continue;} // D13F BCC
  case 0xD141:CY+=3;t=R[0xC];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D141 CMP
  CY+=2;if(fC){CY+=1;pc=0xD152;continue;} // D143 BCS
  CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D145 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D147 LSR
  CY+=2;if(fC){CY+=1;pc=0xD14E;continue;} // D148 BCS
  CY+=3;t=R[0x44];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D14A BIT
  CY+=2;if(fN){CY+=1;pc=0xD152;continue;} // D14C BMI
  case 0xD14E:CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // D14E LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD16B;continue;} // D150 BNE
  case 0xD152:CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D152 BIT
  CY+=2;if(fN){CY+=1;pc=0xD158;continue;} // D154 BMI
  CY+=5;t=R[0x8];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // D156 DEC
  case 0xD158:CY+=2;A=0x60;fZ=(A)===0;fN=(A)>127; // D158 LDA
  CY+=3;R[0x72]=A; // D15A STA
  CY+=2;if(!fZ){CY+=1;pc=0xD1C6;continue;} // D15C BNE
  case 0xD15E:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D15E LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D160 LSR
  CY+=2;if(fC){CY+=1;pc=0xD152;continue;} // D161 BCS
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // D163 LDX
  CY+=3;t=R[0x44];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D165 BIT
  CY+=2;if(!fN){CY+=1;pc=0xD16A;continue;} // D167 BPL
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // D169 INX
  case 0xD16A:CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // D16A TXA
  case 0xD16B:CY+=3;R[0x42]=A; // D16B STA
  case 0xD16D:CY+=3;A=R[0x37];fZ=(A)===0;fN=(A)>127; // D16D LDA
  CY+=2;fC=true; // D16F SEC
  CY+=3;sbc(R[0x5D]); // D170 SBC
  CY+=3;Y=R[0x9];fZ=(Y)===0;fN=(Y)>127; // D172 LDY
  CY+=2;t=0x2;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D174 CPY
  CY+=2;if(fZ){CY+=1;pc=0xD192;continue;} // D176 BEQ
  CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D178 BIT
  CY+=2;if(!fN){CY+=1;pc=0xD1CC;continue;} // D17A BPL
  CY+=3;X=R[0x46];fZ=(X)===0;fN=(X)>127; // D17C LDX
  CY+=2;if(!fN){CY+=1;pc=0xD189;continue;} // D17E BPL
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D180 TAY
  CY+=2;if(fN){CY+=1;pc=0xD1CC;continue;} // D181 BMI
  CY+=2;t=0x8;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D183 CMP
  CY+=2;if(!fC){CY+=1;pc=0xD1CC;continue;} // D185 BCC
  CY+=2;if(fC){CY+=1;pc=0xD199;continue;} // D187 BCS
  case 0xD189:CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D189 TAY
  CY+=2;if(!fN){CY+=1;pc=0xD1CC;continue;} // D18A BPL
  CY+=2;t=0xF8;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D18C CMP
  CY+=2;if(fC){CY+=1;pc=0xD1CC;continue;} // D18E BCS
  CY+=2;if(!fC){CY+=1;pc=0xD199;continue;} // D190 BCC
  case 0xD192:CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D192 TAY
  CY+=2;if(fN){CY+=1;pc=0xD1CC;continue;} // D193 BMI
  CY+=2;t=0x8;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D195 CMP
  CY+=2;if(!fC){CY+=1;pc=0xD1CC;continue;} // D197 BCC
  case 0xD199:CY+=3;Y=R[0x42];fZ=(Y)===0;fN=(Y)>127; // D199 LDY
  CY+=2;if(fN){CY+=1;pc=0xD1CC;continue;} // D19B BMI
  CY+=2;if(fZ){CY+=1;pc=0xD1A9;continue;} // D19D BEQ
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D19F LDA
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // D1A1 LDX
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D1A3 DEY
  CY+=2;if(!fZ){CY+=1;pc=0xD1AC;continue;} // D1A4 BNE
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D1A6 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xD1AC;continue;} // D1A7 BNE
  case 0xD1A9:CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D1A9 TAX
  CY+=2;A=0x50;fZ=(A)===0;fN=(A)>127; // D1AA LDA
  case 0xD1AC:CY+=2;fD=true; // D1AC SED
  CY+=2;fC=false; // D1AD CLC
  CY+=3;adc(R[0x3]); // D1AE ADC
  CY+=3;R[0x3]=A; // D1B0 STA
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // D1B2 TXA
  CY+=3;adc(R[0x4]); // D1B3 ADC
  CY+=3;R[0x4]=A; // D1B5 STA
  CY+=2;if(!fC){CY+=1;pc=0xD1BF;continue;} // D1B7 BCC
  CY+=3;A=R[0x5];fZ=(A)===0;fN=(A)>127; // D1B9 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD1BF;continue;} // D1BB BNE
  CY+=5;t=R[0x8];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // D1BD INC
  case 0xD1BF:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D1BF LDA
  CY+=3;adc(R[0x5]); // D1C1 ADC
  CY+=3;R[0x5]=A; // D1C3 STA
  CY+=2;fD=false; // D1C5 CLD
  case 0xD1C6:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // D1C6 LDA
  CY+=3;R[0x40]=A; // D1C8 STA
  CY+=3;R[0x42]=A; // D1CA STA
  case 0xD1CC:CY+=2;A=0xA2;fZ=(A)===0;fN=(A)>127; // D1CC LDA
  CY+=3;wr(0x9,A);if(FE)return 0xD1D0; // D1CE STA
  case 0xD1D0:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // D1D0 LDX
  CY+=3;wr(0xD,X);if(FE)return 0xD1D4; // D1D2 STX
  case 0xD1D4:CY+=3;wr(0xE,X);if(FE)return 0xD1D6; // D1D4 STX
  case 0xD1D6:CY+=3;wr(0xF,X);if(FE)return 0xD1D8; // D1D6 STX
  case 0xD1D8:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // D1D8 INX
  CY+=3;wr(0xB,X);if(FE)return 0xD1DB; // D1D9 STX
  case 0xD1DB:CY+=3;wr(0xC,X);if(FE)return 0xD1DD; // D1DB STX
  case 0xD1DD:CY+=3;X=R[0x9];fZ=(X)===0;fN=(X)>127; // D1DD LDX
  CY+=4;if((0xDB92&255)+X>255) CY++;A=RB0[0xB92+X];fZ=(A)===0;fN=(A)>127; // D1DF LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD1E4; // D1E2 STA
  case 0xD1E4:CY+=2;A=0x3;fZ=(A)===0;fN=(A)>127; // D1E4 LDA
  CY+=3;wr(0x4,A);if(FE)return 0xD1E8; // D1E6 STA
  case 0xD1E8:CY+=3;wr(0x5,A);if(FE)return 0xD1EA; // D1E8 STA
  case 0xD1EA:CY+=3;wr(0x25,A);if(FE)return 0xD1EC; // D1EA STA
  case 0xD1EC:CY+=3;wr(0x26,A);if(FE)return 0xD1EE; // D1EC STA
  case 0xD1EE:CY+=3;wr(0x2,A);if(FE)return 0xD1F0; // D1EE STA
  case 0xD1F0:CY+=2;A=0x35;fZ=(A)===0;fN=(A)>127; // D1F0 LDA
  CY+=2;fC=true; // D1F2 SEC
  case 0xD1F3:CY+=2;sbc(0xF); // D1F3 SBC
  CY+=2;if(fC){CY+=1;pc=0xD1F3;continue;} // D1F5 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D1F7 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D1F9 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D1FA ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D1FB ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D1FC ASL
  CY+=4;wr(0x120,A);if(FE)return 0xD200; // D1FD STA
  case 0xD200:CY+=2;adc(0xF); // D200 ADC
  CY+=3;wr(0x10,A);if(FE)return 0xD204; // D202 STA
  case 0xD204:CY+=3;wr(0x11,A);if(FE)return 0xD206; // D204 STA
  case 0xD206:CY+=3;wr(0x21,A);if(FE)return 0xD208; // D206 STA
  case 0xD208:CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D208 BIT
  CY+=2;if(!fV){CY+=1;pc=0xD210;continue;} // D20A BVC
  CY+=2;A=0xDE;fZ=(A)===0;fN=(A)>127; // D20C LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD212;continue;} // D20E BNE
  case 0xD210:CY+=2;A=0xDF;fZ=(A)===0;fN=(A)>127; // D210 LDA
  case 0xD212:CY+=2;X=0xA;fZ=(X)===0;fN=(X)>127; // D212 LDX
  case 0xD214:CY+=4;R[0xD+X&127]=A; // D214 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D216 DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D217 DEX
  CY+=2;if(!fN){CY+=1;pc=0xD214;continue;} // D218 BPL
  CY+=2;t=0xDE;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D21A CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD22E;continue;} // D21C BNE
  CY+=2;X=0xA;fZ=(X)===0;fN=(X)>127; // D21E LDX
  CY+=2;Y=0x5;fZ=(Y)===0;fN=(Y)>127; // D220 LDY
  case 0xD222:CY+=4;if((0xDDF7&255)+Y>255) CY++;A=RB0[0xDF7+Y];fZ=(A)===0;fN=(A)>127; // D222 LDA
  CY+=4;R[0xC+X&127]=A; // D225 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D227 DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D228 DEX
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D229 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD222;continue;} // D22A BPL
  CY+=2;if(fN){CY+=1;pc=0xD282;continue;} // D22C BMI
  case 0xD22E:CY+=2;Y=0x50;fZ=(Y)===0;fN=(Y)>127; // D22E LDY
  CY+=2;fC=true; // D230 SEC
  CY+=3;A=R[0x5];fZ=(A)===0;fN=(A)>127; // D231 LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D233 AND
  CY+=2;if(!fZ){CY+=1;pc=0xD23B;continue;} // D235 BNE
  CY+=3;R[0x16]=Y; // D237 STY
  CY+=2;if(fZ){CY+=1;pc=0xD23E;continue;} // D239 BEQ
  case 0xD23B:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D23B LSR
  CY+=3;R[0x16]=A; // D23C STA
  case 0xD23E:CY+=3;A=R[0x5];fZ=(A)===0;fN=(A)>127; // D23E LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D240 AND
  CY+=2;if(!fC){CY+=1;pc=0xD24A;continue;} // D242 BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD24A;continue;} // D244 BNE
  CY+=3;R[0x14]=Y; // D246 STY
  CY+=2;if(fZ){CY+=1;pc=0xD24F;continue;} // D248 BEQ
  case 0xD24A:CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D24A ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D24B ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D24C ASL
  CY+=3;R[0x14]=A; // D24D STA
  case 0xD24F:CY+=3;A=R[0x4];fZ=(A)===0;fN=(A)>127; // D24F LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D251 AND
  CY+=2;if(!fC){CY+=1;pc=0xD25B;continue;} // D253 BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD25B;continue;} // D255 BNE
  CY+=3;R[0x12]=Y; // D257 STY
  CY+=2;if(fZ){CY+=1;pc=0xD25E;continue;} // D259 BEQ
  case 0xD25B:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D25B LSR
  CY+=3;R[0x12]=A; // D25C STA
  case 0xD25E:CY+=3;A=R[0x4];fZ=(A)===0;fN=(A)>127; // D25E LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D260 AND
  CY+=2;if(!fC){CY+=1;pc=0xD26A;continue;} // D262 BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD26A;continue;} // D264 BNE
  CY+=3;R[0x10]=Y; // D266 STY
  CY+=2;if(fZ){CY+=1;pc=0xD26F;continue;} // D268 BEQ
  case 0xD26A:CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D26A ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D26B ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D26C ASL
  CY+=3;R[0x10]=A; // D26D STA
  case 0xD26F:CY+=3;A=R[0x3];fZ=(A)===0;fN=(A)>127; // D26F LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D271 AND
  CY+=2;if(!fC){CY+=1;pc=0xD27B;continue;} // D273 BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD27B;continue;} // D275 BNE
  CY+=3;R[0xE]=Y; // D277 STY
  CY+=2;if(fZ){CY+=1;pc=0xD27E;continue;} // D279 BEQ
  case 0xD27B:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D27B LSR
  CY+=3;R[0xE]=A; // D27C STA
  case 0xD27E:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D27E LDA
  CY+=3;R[0xC]=A; // D280 STA
  case 0xD282:CY+=4;A=rd(0x284);fZ=(A)===0;fN=(A)>127; // D282 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD282;continue;} // D285 BNE
  CY+=3;wr(0x2,A);if(FE)return 0xD289; // D287 STA
  case 0xD289:CY+=3;wr(0x2A,A);if(FE)return 0xD28B; // D289 STA
  case 0xD28B:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D28B LDA
  CY+=3;wr(0x1,A);if(FE)return 0xD28F; // D28D STA
  case 0xD28F:CY+=3;wr(0xA,A);if(FE)return 0xD291; // D28F STA
  case 0xD291:CY+=2;A=0x4A;fZ=(A)===0;fN=(A)>127; // D291 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD295; // D293 STA
  case 0xD295:CY+=3;wr(0x7,A);if(FE)return 0xD297; // D295 STA
  case 0xD297:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D297 LDA
  CY+=3;wr(0x2B,A);if(FE)return 0xD29B; // D299 STA
  case 0xD29B:CY+=2;if(!fZ){CY+=1;pc=0xD2EA;continue;} // D29B BNE
  CY+=3;A=R[0x64];fZ=(A)===0;fN=(A)>127; // D29D LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D29F CMP
  CY+=2;if(fC){CY+=1;pc=0xD2A9;continue;} // D2A1 BCS
  CY+=2;sbc(0x4); // D2A3 SBC
  CY+=2;if(fC){CY+=1;pc=0xD2A9;continue;} // D2A5 BCS
  CY+=2;adc(0xA5); // D2A7 ADC
  case 0xD2A9:CY+=2;fC=true; // D2A9 SEC
  CY+=3;wr(0x2,A);if(FE)return 0xD2AC; // D2AA STA
  case 0xD2AC:CY+=3;wr(0x2A,A);if(FE)return 0xD2AE; // D2AC STA
  case 0xD2AE:CY+=2;sbc(0xF); // D2AE SBC
  CY+=2;if(fC){CY+=1;pc=0xD2AE;continue;} // D2B0 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D2B2 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2B4 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2B5 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2B6 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2B7 ASL
  CY+=3;wr(0x22,A);if(FE)return 0xD2BA; // D2B8 STA
  case 0xD2BA:CY+=3;wr(0x12,A);if(FE)return 0xD2BC; // D2BA STA
  case 0xD2BC:CY+=3;wr(0x2,A);if(FE)return 0xD2BE; // D2BC STA
  case 0xD2BE:CY+=3;wr(0x2A,A);if(FE)return 0xD2C0; // D2BE STA
  case 0xD2C0:CY+=3;A=R[0x65];fZ=(A)===0;fN=(A)>127; // D2C0 LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D2C2 CMP
  CY+=2;if(fC){CY+=1;pc=0xD2CC;continue;} // D2C4 BCS
  CY+=2;sbc(0x4); // D2C6 SBC
  CY+=2;if(fC){CY+=1;pc=0xD2CC;continue;} // D2C8 BCS
  CY+=2;adc(0xA5); // D2CA ADC
  case 0xD2CC:CY+=3;push(A);if(FE)return 0xD2CD; // D2CC PHA
  case 0xD2CD:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D2CD PLA
  CY+=2; // D2CE NOP
  CY+=2;fC=true; // D2CF SEC
  CY+=3;wr(0x2B,A);if(FE)return 0xD2D2; // D2D0 STA
  case 0xD2D2:CY+=3;wr(0x2,A);if(FE)return 0xD2D4; // D2D2 STA
  case 0xD2D4:CY+=3;wr(0x2A,A);if(FE)return 0xD2D6; // D2D4 STA
  case 0xD2D6:CY+=2;sbc(0xF); // D2D6 SBC
  CY+=2;if(fC){CY+=1;pc=0xD2D6;continue;} // D2D8 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D2DA EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2DC ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2DD ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2DE ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D2DF ASL
  CY+=3;wr(0x23,A);if(FE)return 0xD2E2; // D2E0 STA
  case 0xD2E2:CY+=3;wr(0x13,A);if(FE)return 0xD2E4; // D2E2 STA
  case 0xD2E4:CY+=3;wr(0x2,A);if(FE)return 0xD2E6; // D2E4 STA
  case 0xD2E6:CY+=3;wr(0x2A,A);if(FE)return 0xD2E8; // D2E6 STA
  case 0xD2E8:CY+=2;if(fC){CY+=1;pc=0xD2FC;continue;} // D2E8 BCS
  case 0xD2EA:CY+=3;wr(0x2,A);if(FE)return 0xD2EC; // D2EA STA
  case 0xD2EC:CY+=3;wr(0x2A,A);if(FE)return 0xD2EE; // D2EC STA
  case 0xD2EE:CY+=3;wr(0x2,A);if(FE)return 0xD2F0; // D2EE STA
  case 0xD2F0:CY+=3;wr(0x2A,A);if(FE)return 0xD2F2; // D2F0 STA
  case 0xD2F2:CY+=3;wr(0x2,A);if(FE)return 0xD2F4; // D2F2 STA
  case 0xD2F4:CY+=3;wr(0x2A,A);if(FE)return 0xD2F6; // D2F4 STA
  case 0xD2F6:CY+=3;wr(0x2,A);if(FE)return 0xD2F8; // D2F6 STA
  case 0xD2F8:CY+=4;wr(0x12A,A);if(FE)return 0xD2FB; // D2F8 STA
  case 0xD2FB:CY+=2; // D2FB NOP
  case 0xD2FC:CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D2FC BIT
  CY+=2;if(!fV){CY+=1;pc=0xD30E;continue;} // D2FE BVC
  CY+=2;Y=0x16;fZ=(Y)===0;fN=(Y)>127; // D300 LDY
  CY+=3;R[0x7B]=Y; // D302 STY
  CY+=2;A=0x28;fZ=(A)===0;fN=(A)>127; // D304 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD308; // D306 STA
  case 0xD308:CY+=3;wr(0x7,A);if(FE)return 0xD30A; // D308 STA
  case 0xD30A:CY+=3;wr(0x2B,A);if(FE)return 0xD30C; // D30A STA
  case 0xD30C:CY+=2;if(!fZ){CY+=1;pc=0xD325;continue;} // D30C BNE
  case 0xD30E:CY+=2;Y=0x6;fZ=(Y)===0;fN=(Y)>127; // D30E LDY
  CY+=3;R[0x7B]=Y; // D310 STY
  CY+=2;X=0x8;fZ=(X)===0;fN=(X)>127; // D312 LDX
  CY+=2; // D314 NOP
  CY+=3;wr(0x2B,A);if(FE)return 0xD317; // D315 STA
  case 0xD317:CY+=3;wr(0x2,A);if(FE)return 0xD319; // D317 STA
  case 0xD319:CY+=3;wr(0x2A,A);if(FE)return 0xD31B; // D319 STA
  case 0xD31B:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D31B DEX
  CY+=2;if(!fN){CY+=1;pc=0xD317;continue;} // D31C BPL
  CY+=3;push(A);if(FE)return 0xD31F; // D31E PHA
  case 0xD31F:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D31F PLA
  CY+=3;push(A);if(FE)return 0xD321; // D320 PHA
  case 0xD321:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D321 PLA
  CY+=3;push(A);if(FE)return 0xD323; // D322 PHA
  case 0xD323:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D323 PLA
  CY+=2; // D324 NOP
  case 0xD325:CY+=3;wr(0x2B,A);if(FE)return 0xD327; // D325 STA
  case 0xD327:CY+=3;push(A);if(FE)return 0xD328; // D327 PHA
  case 0xD328:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D328 PLA
  CY+=3;push(A);if(FE)return 0xD32A; // D329 PHA
  case 0xD32A:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D32A PLA
  CY+=3;push(A);if(FE)return 0xD32C; // D32B PHA
  case 0xD32C:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D32C PLA
  CY+=3;push(A);if(FE)return 0xD32E; // D32D PHA
  case 0xD32E:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D32E PLA
  CY+=3;wr(0x2B,A);if(FE)return 0xD331; // D32F STA
  case 0xD331:CY+=3;Y=R[0x7B];fZ=(Y)===0;fN=(Y)>127; // D331 LDY
  CY+=5;if(R[0x16]+Y>255) CY++;A=rd(((R[0x17]<<8|R[0x16])+Y));fZ=(A)===0;fN=(A)>127; // D333 LDA
  CY+=4;wr(0x11B,A);if(FE)return 0xD338; // D335 STA
  case 0xD338:CY+=3;wr(0x2A,A);if(FE)return 0xD33A; // D338 STA
  case 0xD33A:CY+=5;if(R[0x14]+Y>255) CY++;A=rd(((R[0x15]<<8|R[0x14])+Y));fZ=(A)===0;fN=(A)>127; // D33A LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD33E; // D33C STA
  case 0xD33E:CY+=5;if(R[0x12]+Y>255) CY++;A=rd(((R[0x13]<<8|R[0x12])+Y));fZ=(A)===0;fN=(A)>127; // D33E LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD342; // D340 STA
  case 0xD342:CY+=5;if(R[0x10]+Y>255) CY++;A=rd(((R[0x11]<<8|R[0x10])+Y));fZ=(A)===0;fN=(A)>127; // D342 LDA
  CY+=3;R[0x7A]=A; // D344 STA
  CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D346 LDA
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D348 TAX
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D349 LDA
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D34B TAY
  CY+=3;A=R[0x7A];fZ=(A)===0;fN=(A)>127; // D34C LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD350; // D34E STA
  case 0xD350:CY+=3;wr(0x1B,X);if(FE)return 0xD352; // D350 STX
  case 0xD352:CY+=3;wr(0x1C,Y);if(FE)return 0xD354; // D352 STY
  case 0xD354:CY+=3;wr(0x1B,A);if(FE)return 0xD356; // D354 STA
  case 0xD356:CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D356 DEC
  CY+=2;if(!fN){CY+=1;pc=0xD331;continue;} // D358 BPL
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // D35A LDX
  CY+=3;wr(0x1B,X);if(FE)return 0xD35E; // D35C STX
  case 0xD35E:CY+=3;wr(0x1C,X);if(FE)return 0xD360; // D35E STX
  case 0xD360:CY+=3;wr(0x2,A);if(FE)return 0xD362; // D360 STA
  case 0xD362:CY+=3;wr(0x2A,A);if(FE)return 0xD364; // D362 STA
  case 0xD364:CY+=3;wr(0x1B,X);if(FE)return 0xD366; // D364 STX
  case 0xD366:CY+=2;if(!fV){CY+=1;pc=0xD37E;continue;} // D366 BVC
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // D368 LDY
  CY+=3;wr(0x25,Y);if(FE)return 0xD36C; // D36A STY
  case 0xD36C:CY+=3;wr(0x26,Y);if(FE)return 0xD36E; // D36C STY
  case 0xD36E:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D36E INY
  CY+=3;wr(0x4,Y);if(FE)return 0xD371; // D36F STY
  case 0xD371:CY+=3;wr(0x5,Y);if(FE)return 0xD373; // D371 STY
  case 0xD373:CY+=2;A=0xDF;fZ=(A)===0;fN=(A)>127; // D373 LDA
  CY+=3;R[0xD]=A; // D375 STA
  CY+=3;R[0xF]=A; // D377 STA
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // D379 LDY
  CY+=3;pc=0xD415;continue; // D37B JMP
  case 0xD37E:CY+=4;Y=0x4F;fZ=(Y)===0;fN=(Y)>127; // D37E LDY
  CY+=2;fC=true; // D381 SEC
  CY+=3;A=R[0x7];fZ=(A)===0;fN=(A)>127; // D382 LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D384 AND
  CY+=2;if(!fZ){CY+=1;pc=0xD38C;continue;} // D386 BNE
  CY+=3;R[0x12]=Y; // D388 STY
  CY+=2;if(fZ){CY+=1;pc=0xD396;continue;} // D38A BEQ
  case 0xD38C:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D38C LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D38D LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D38E LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D38F LSR
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D390 TAX
  CY+=4;if((0xDB87&255)+X>255) CY++;A=RB0[0xB87+X];fZ=(A)===0;fN=(A)>127; // D391 LDA
  CY+=3;R[0x12]=A; // D394 STA
  case 0xD396:CY+=3;A=R[0x7];fZ=(A)===0;fN=(A)>127; // D396 LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D398 AND
  CY+=2;if(!fC){CY+=1;pc=0xD3A2;continue;} // D39A BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD3A2;continue;} // D39C BNE
  CY+=3;R[0x10]=Y; // D39E STY
  CY+=2;if(fZ){CY+=1;pc=0xD3A9;continue;} // D3A0 BEQ
  case 0xD3A2:CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D3A2 TAX
  CY+=2;fC=false; // D3A3 CLC
  CY+=4;if((0xDB87&255)+X>255) CY++;A=RB0[0xB87+X];fZ=(A)===0;fN=(A)>127; // D3A4 LDA
  CY+=3;R[0x10]=A; // D3A7 STA
  case 0xD3A9:CY+=3;wr(0x2,A);if(FE)return 0xD3AB; // D3A9 STA
  case 0xD3AB:CY+=3;wr(0x2A,A);if(FE)return 0xD3AD; // D3AB STA
  case 0xD3AD:CY+=3;A=R[0x6];fZ=(A)===0;fN=(A)>127; // D3AD LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D3AF AND
  CY+=2;if(!fC){CY+=1;pc=0xD3B9;continue;} // D3B1 BCC
  CY+=2;if(!fZ){CY+=1;pc=0xD3B9;continue;} // D3B3 BNE
  CY+=3;R[0xE]=Y; // D3B5 STY
  CY+=2;if(fZ){CY+=1;pc=0xD3C3;continue;} // D3B7 BEQ
  case 0xD3B9:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D3B9 LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D3BA LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D3BB LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D3BC LSR
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D3BD TAX
  CY+=4;if((0xDB87&255)+X>255) CY++;A=RB0[0xB87+X];fZ=(A)===0;fN=(A)>127; // D3BE LDA
  CY+=3;R[0xE]=A; // D3C1 STA
  case 0xD3C3:CY+=4;A=0x57;fZ=(A)===0;fN=(A)>127; // D3C3 LDA
  CY+=3;R[0xC]=A; // D3C6 STA
  CY+=2;A=0x90;fZ=(A)===0;fN=(A)>127; // D3C8 LDA
  CY+=3;wr(0x20,A);if(FE)return 0xD3CC; // D3CA STA
  case 0xD3CC:CY+=2;A=0xA0;fZ=(A)===0;fN=(A)>127; // D3CC LDA
  CY+=3;wr(0x21,A);if(FE)return 0xD3D0; // D3CE STA
  case 0xD3D0:CY+=2;X=0xB;fZ=(X)===0;fN=(X)>127; // D3D0 LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // D3D2 LDY
  CY+=3;wr(0x25,Y);if(FE)return 0xD3D6; // D3D4 STY
  case 0xD3D6:CY+=3;wr(0x26,Y);if(FE)return 0xD3D8; // D3D6 STY
  case 0xD3D8:CY+=3;wr(0x4,Y);if(FE)return 0xD3DA; // D3D8 STY
  case 0xD3DA:CY+=3;wr(0x5,Y);if(FE)return 0xD3DC; // D3DA STY
  case 0xD3DC:CY+=3;wr(0x2,A);if(FE)return 0xD3DE; // D3DC STA
  case 0xD3DE:CY+=3;wr(0x2A,A);if(FE)return 0xD3E0; // D3DE STA
  case 0xD3E0:CY+=2;Y=0x4;fZ=(Y)===0;fN=(Y)>127; // D3E0 LDY
  case 0xD3E2:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D3E2 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xD3E2;continue;} // D3E3 BNE
  CY+=3;wr(0x10,A);if(FE)return 0xD3E7; // D3E5 STA
  case 0xD3E7:CY+=3;wr(0x11,A);if(FE)return 0xD3E9; // D3E7 STA
  case 0xD3E9:CY+=3;wr(0x2,A);if(FE)return 0xD3EB; // D3E9 STA
  case 0xD3EB:CY+=3;wr(0x2A,A);if(FE)return 0xD3ED; // D3EB STA
  case 0xD3ED:CY+=2;A=0xFA;fZ=(A)===0;fN=(A)>127; // D3ED LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD3F1; // D3EF STA
  case 0xD3F1:CY+=3;wr(0x7,A);if(FE)return 0xD3F3; // D3F1 STA
  case 0xD3F3:CY+=5;if(R[0x12]+Y>255) CY++;A=rd(((R[0x13]<<8|R[0x12])+Y));fZ=(A)===0;fN=(A)>127; // D3F3 LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D3F5 AND
  CY+=3;R[0x14]=A; // D3F7 STA
  CY+=5;if(R[0x10]+Y>255) CY++;A=rd(((R[0x11]<<8|R[0x10])+Y));fZ=(A)===0;fN=(A)>127; // D3F9 LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D3FB AND
  CY+=3;A|=R[0x14];fZ=(A)===0;fN=(A)>127; // D3FD ORA
  CY+=3;wr(0x1B,A);if(FE)return 0xD401; // D3FF STA
  case 0xD401:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D401 LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D403 AND
  CY+=3;R[0x14]=A; // D405 STA
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D407 LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D409 AND
  CY+=3;A|=R[0x14];fZ=(A)===0;fN=(A)>127; // D40B ORA
  CY+=3;wr(0x1C,A);if(FE)return 0xD40F; // D40D STA
  case 0xD40F:CY+=3;wr(0x2B,A);if(FE)return 0xD411; // D40F STA
  case 0xD411:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D411 DEY
  CY+=2;if(!fN){CY+=2;pc=0xD3E9;continue;} // D412 BPL
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D414 INY
  case 0xD415:CY+=3;wr(0x2,A);if(FE)return 0xD417; // D415 STA
  case 0xD417:CY+=3;wr(0x2A,A);if(FE)return 0xD419; // D417 STA
  case 0xD419:CY+=3;wr(0x1B,Y);if(FE)return 0xD41B; // D419 STY
  case 0xD41B:CY+=3;wr(0x1C,Y);if(FE)return 0xD41D; // D41B STY
  case 0xD41D:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D41D INY
  CY+=3;wr(0x4,Y);if(FE)return 0xD420; // D41E STY
  case 0xD420:CY+=3;wr(0x5,Y);if(FE)return 0xD422; // D420 STY
  case 0xD422:CY+=2;A=0x4A;fZ=(A)===0;fN=(A)>127; // D422 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD426; // D424 STA
  case 0xD426:CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // D426 BIT
  CY+=3;wr(0x10,A);if(FE)return 0xD42A; // D428 STA
  case 0xD42A:CY+=2;if(!fV){CY+=1;pc=0xD433;continue;} // D42A BVC
  CY+=3;X=R[0x9];fZ=(X)===0;fN=(X)>127; // D42C LDX
  CY+=4;if((0xDB92&255)+X>255) CY++;A=RB0[0xB92+X];fZ=(A)===0;fN=(A)>127; // D42E LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD433; // D431 STA
  case 0xD433:CY+=3;X=R[0x8];fZ=(X)===0;fN=(X)>127; // D433 LDX
  CY+=2;if(!fN){CY+=1;pc=0xD439;continue;} // D435 BPL
  CY+=2;X=0xA;fZ=(X)===0;fN=(X)>127; // D437 LDX
  case 0xD439:CY+=4;if((0xDB87&255)+X>255) CY++;A=RB0[0xB87+X];fZ=(A)===0;fN=(A)>127; // D439 LDA
  CY+=3;R[0xC]=A; // D43C STA
  CY+=2;Y=0x5;fZ=(Y)===0;fN=(Y)>127; // D43E LDY
  case 0xD440:CY+=3;wr(0x2,A);if(FE)return 0xD442; // D440 STA
  case 0xD442:CY+=3;wr(0x2A,A);if(FE)return 0xD444; // D442 STA
  case 0xD444:CY+=4;if((0xDFE6&255)+Y>255) CY++;A=rd((0xDFE6+Y));fZ=(A)===0;fN=(A)>127; // D444 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD449; // D447 STA
  case 0xD449:CY+=3;wr(0x2B,A);if(FE)return 0xD44B; // D449 STA
  case 0xD44B:CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D44B LDA
  CY+=2;A&=0xF0;fZ=(A)===0;fN=(A)>127; // D44D AND
  CY+=3;push(A);if(FE)return 0xD450; // D44F PHA
  case 0xD450:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D450 PLA
  CY+=2; // D451 NOP
  CY+=3;wr(0x1B,A);if(FE)return 0xD454; // D452 STA
  case 0xD454:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D454 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD440;continue;} // D455 BPL
  CY+=3;wr(0x2,A);if(FE)return 0xD459; // D457 STA
  case 0xD459:CY+=3;wr(0x2A,A);if(FE)return 0xD45B; // D459 STA
  case 0xD45B:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D45B INY
  CY+=3;wr(0x1B,Y);if(FE)return 0xD45E; // D45C STY
  case 0xD45E:CY+=3;wr(0x1C,Y);if(FE)return 0xD460; // D45E STY
  case 0xD460:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D460 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD473;continue;} // D462 BEQ
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D464 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD48D;continue;} // D466 BNE
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // D468 LDY
  CY+=3;wr(0xD,Y);if(FE)return 0xD46C; // D46A STY
  case 0xD46C:CY+=3;wr(0xE,Y);if(FE)return 0xD46E; // D46C STY
  case 0xD46E:CY+=3;wr(0xF,Y);if(FE)return 0xD470; // D46E STY
  case 0xD470:CY+=3;pc=0xD741;continue; // D470 JMP
  case 0xD473:CY+=3;X=R[0x60];fZ=(X)===0;fN=(X)>127; // D473 LDX
  CY+=2;A=0xDF;fZ=(A)===0;fN=(A)>127; // D475 LDA
  CY+=3;R[0xD]=A; // D477 STA
  CY+=3;R[0xF]=A; // D479 STA
  CY+=4;if((0xDF9F&255)+X>255) CY++;A=rd((0xDF9F+X));fZ=(A)===0;fN=(A)>127; // D47B LDA
  CY+=3;R[0xC]=A; // D47E STA
  CY+=3;X=R[0x61];fZ=(X)===0;fN=(X)>127; // D480 LDX
  CY+=4;if((0xDF9F&255)+X>255) CY++;A=rd((0xDF9F+X));fZ=(A)===0;fN=(A)>127; // D482 LDA
  CY+=3;R[0xE]=A; // D485 STA
  CY+=2;A=0xDE;fZ=(A)===0;fN=(A)>127; // D487 LDA
  CY+=3;R[0x11]=A; // D489 STA
  CY+=3;R[0x15]=A; // D48B STA
  case 0xD48D:CY+=3;A=R[0x5E];fZ=(A)===0;fN=(A)>127; // D48D LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D48F CMP
  CY+=2;if(fC){CY+=1;pc=0xD499;continue;} // D491 BCS
  CY+=2;sbc(0x4); // D493 SBC
  CY+=2;if(fC){CY+=1;pc=0xD499;continue;} // D495 BCS
  CY+=2;adc(0xA5); // D497 ADC
  case 0xD499:CY+=2;fC=true; // D499 SEC
  CY+=3;wr(0x2,A);if(FE)return 0xD49C; // D49A STA
  case 0xD49C:CY+=3;wr(0x2A,A);if(FE)return 0xD49E; // D49C STA
  case 0xD49E:CY+=2;sbc(0xF); // D49E SBC
  CY+=2;if(fC){CY+=1;pc=0xD49E;continue;} // D4A0 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D4A2 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4A4 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4A5 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4A6 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4A7 ASL
  CY+=3;wr(0x20,A);if(FE)return 0xD4AA; // D4A8 STA
  case 0xD4AA:CY+=3;wr(0x10,A);if(FE)return 0xD4AC; // D4AA STA
  case 0xD4AC:CY+=3;wr(0x2,A);if(FE)return 0xD4AE; // D4AC STA
  case 0xD4AE:CY+=3;wr(0x2A,A);if(FE)return 0xD4B0; // D4AE STA
  case 0xD4B0:CY+=3;Y=R[0x6A];fZ=(Y)===0;fN=(Y)>127; // D4B0 LDY
  CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D4B2 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD4CC;continue;} // D4B4 BNE
  CY+=4;if((0xDCFD&255)+Y>255) CY++;A=RB0[0xCFD+Y];fZ=(A)===0;fN=(A)>127; // D4B6 LDA
  CY+=3;R[0x14]=A; // D4B9 STA
  CY+=3;sbc(R[0x75]); // D4BB SBC
  CY+=2;adc(0x55); // D4BD ADC
  CY+=3;R[0x10]=A; // D4BF STA
  CY+=2;A=0xE4;fZ=(A)===0;fN=(A)>127; // D4C1 LDA
  CY+=3;R[0x16]=A; // D4C3 STA
  CY+=2;fC=true; // D4C5 SEC
  CY+=3;sbc(R[0x75]); // D4C6 SBC
  CY+=2;adc(0x55); // D4C8 ADC
  CY+=3;R[0x12]=A; // D4CA STA
  case 0xD4CC:CY+=3;A=R[0x5F];fZ=(A)===0;fN=(A)>127; // D4CC LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D4CE CMP
  CY+=2;if(fC){CY+=1;pc=0xD4D8;continue;} // D4D0 BCS
  CY+=2;sbc(0x4); // D4D2 SBC
  CY+=2;if(fC){CY+=1;pc=0xD4D8;continue;} // D4D4 BCS
  CY+=2;adc(0xA5); // D4D6 ADC
  case 0xD4D8:CY+=2;fC=true; // D4D8 SEC
  CY+=3;wr(0x2B,A);if(FE)return 0xD4DB; // D4D9 STA
  case 0xD4DB:CY+=3;wr(0x2,A);if(FE)return 0xD4DD; // D4DB STA
  case 0xD4DD:CY+=3;wr(0x2A,A);if(FE)return 0xD4DF; // D4DD STA
  case 0xD4DF:CY+=2;sbc(0xF); // D4DF SBC
  CY+=2;if(fC){CY+=1;pc=0xD4DF;continue;} // D4E1 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D4E3 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4E5 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4E6 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4E7 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D4E8 ASL
  CY+=3;wr(0x21,A);if(FE)return 0xD4EB; // D4E9 STA
  case 0xD4EB:CY+=3;wr(0x11,A);if(FE)return 0xD4ED; // D4EB STA
  case 0xD4ED:CY+=3;wr(0x2,A);if(FE)return 0xD4EF; // D4ED STA
  case 0xD4EF:CY+=3;wr(0x2A,A);if(FE)return 0xD4F1; // D4EF STA
  case 0xD4F1:CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // D4F1 LDA
  CY+=3;wr(0x4,A);if(FE)return 0xD4F5; // D4F3 STA
  case 0xD4F5:CY+=3;wr(0x5,A);if(FE)return 0xD4F7; // D4F5 STA
  case 0xD4F7:CY+=2;A=0x28;fZ=(A)===0;fN=(A)>127; // D4F7 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD4FB; // D4F9 STA
  case 0xD4FB:CY+=3;wr(0x7,A);if(FE)return 0xD4FD; // D4FB STA
  case 0xD4FD:CY+=2;Y=0x7C;fZ=(Y)===0;fN=(Y)>127; // D4FD LDY
  CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // D4FF LDA
  CY+=3;wr(0xA,A);if(FE)return 0xD503; // D501 STA
  case 0xD503:CY+=3;wr(0x2B,A);if(FE)return 0xD505; // D503 STA
  case 0xD505:CY+=3;R[0x7B]=Y; // D505 STY
  CY+=2;X=0x9E;fZ=(X)===0;fN=(X)>127; // D507 LDX
  CY+=2;SP=X; // D509 TXS
  CY+=3;wr(0x2,A);if(FE)return 0xD50C; // D50A STA
  case 0xD50C:CY+=3;wr(0x2A,A);if(FE)return 0xD50E; // D50C STA
  case 0xD50E:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D50E LDA
  CY+=2;if(!fZ){CY+=1;pc=0xD518;continue;} // D510 BNE
  CY+=2;A=0xDC;fZ=(A)===0;fN=(A)>127; // D512 LDA
  CY+=3;R[0x17]=A; // D514 STA
  CY+=3;R[0x13]=A; // D516 STA
  case 0xD518:CY+=3;wr(0x2,A);if(FE)return 0xD51A; // D518 STA
  case 0xD51A:CY+=3;wr(0x2A,A);if(FE)return 0xD51C; // D51A STA
  case 0xD51C:CY+=2;Y=0xF;fZ=(Y)===0;fN=(Y)>127; // D51C LDY
  CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D51E PLA
  case 0xD51F:CY+=3;wr(0x2,A);if(FE)return 0xD521; // D51F STA
  case 0xD521:CY+=3;wr(0x2A,A);if(FE)return 0xD523; // D521 STA
  case 0xD523:CY+=3;wr(0xD,A);if(FE)return 0xD525; // D523 STA
  case 0xD525:CY+=4;if((0xDB77&255)+Y>255) CY++;A=RB0[0xB77+Y];fZ=(A)===0;fN=(A)>127; // D525 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD52A; // D528 STA
  case 0xD52A:CY+=4;if((0xDB63&255)+Y>255) CY++;A=RB0[0xB63+Y];fZ=(A)===0;fN=(A)>127; // D52A LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD52F; // D52D STA
  case 0xD52F:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D52F PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD532; // D530 STA
  case 0xD532:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D532 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD535; // D533 STA
  case 0xD535:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D535 PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD538; // D536 STA
  case 0xD538:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D538 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD53B; // D539 STA
  case 0xD53B:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D53B PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD53E; // D53C STA
  case 0xD53E:CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // D53E TYA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // D53F AND
  CY+=2;if(!fZ){CY+=1;pc=0xD55F;continue;} // D541 BNE
  CY+=2;X=SP;fZ=(X)===0;fN=(X)>127; // D543 TSX
  CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D544 PLA
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D545 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD51F;continue;} // D546 BPL
  CY+=3;wr(0x2,A);if(FE)return 0xD54A; // D548 STA
  case 0xD54A:CY+=3;wr(0x2A,A);if(FE)return 0xD54C; // D54A STA
  case 0xD54C:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D54C INY
  CY+=3;wr(0xD,Y);if(FE)return 0xD54F; // D54D STY
  case 0xD54F:CY+=4;A=0x84;fZ=(A)===0;fN=(A)>127; // D54F LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD554; // D552 STA
  case 0xD554:CY+=4;A=0xB1;fZ=(A)===0;fN=(A)>127; // D554 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD559; // D557 STA
  case 0xD559:CY+=3;wr(0xE,Y);if(FE)return 0xD55B; // D559 STY
  case 0xD55B:CY+=3;wr(0xF,Y);if(FE)return 0xD55D; // D55B STY
  case 0xD55D:CY+=2;if(!fZ){CY+=1;pc=0xD564;continue;} // D55D BNE
  case 0xD55F:CY+=2;SP=X; // D55F TXS
  CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D560 PLA
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D561 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD51F;continue;} // D562 BPL
  case 0xD564:CY+=2;A=0xE4;fZ=(A)===0;fN=(A)>127; // D564 LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD568; // D566 STA
  case 0xD568:CY+=3;wr(0xA,Y);if(FE)return 0xD56A; // D568 STY
  case 0xD56A:CY+=2;Y=0x2;fZ=(Y)===0;fN=(Y)>127; // D56A LDY
  case 0xD56C:CY+=3;wr(0x2,A);if(FE)return 0xD56E; // D56C STA
  case 0xD56E:CY+=3;wr(0x2A,A);if(FE)return 0xD570; // D56E STA
  case 0xD570:CY+=4;if((0xDB73&255)+Y>255) CY++;A=RB0[0xB73+Y];fZ=(A)===0;fN=(A)>127; // D570 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD575; // D573 STA
  case 0xD575:CY+=4;if((0xDB5F&255)+Y>255) CY++;A=RB0[0xB5F+Y];fZ=(A)===0;fN=(A)>127; // D575 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD57A; // D578 STA
  case 0xD57A:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D57A DEY
  CY+=2;if(!fN){CY+=1;pc=0xD56C;continue;} // D57B BPL
  CY+=3;wr(0x2,A);if(FE)return 0xD57F; // D57D STA
  case 0xD57F:CY+=3;wr(0x2A,A);if(FE)return 0xD581; // D57F STA
  case 0xD581:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D581 INY
  CY+=3;wr(0x1B,Y);if(FE)return 0xD584; // D582 STY
  case 0xD584:CY+=3;wr(0x1C,Y);if(FE)return 0xD586; // D584 STY
  case 0xD586:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // D586 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD58D;continue;} // D588 BEQ
  CY+=3;pc=0xDA10;continue; // D58A JMP
  case 0xD58D:CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // D58D LDX
  CY+=3;wr(0x4,Y);if(FE)return 0xD591; // D58F STY
  case 0xD591:CY+=3;wr(0x1D,X);if(FE)return 0xD593; // D591 STX
  case 0xD593:CY+=3;wr(0x5,Y);if(FE)return 0xD595; // D593 STY
  case 0xD595:CY+=3;wr(0x1E,X);if(FE)return 0xD597; // D595 STX
  case 0xD597:CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // D597 LDA
  CY+=3;wr(0x2,A);if(FE)return 0xD59B; // D599 STA
  case 0xD59B:CY+=3;wr(0x2A,A);if(FE)return 0xD59D; // D59B STA
  case 0xD59D:CY+=2;fC=true; // D59D SEC
  case 0xD59E:CY+=2;sbc(0xF); // D59E SBC
  CY+=2;if(fC){CY+=1;pc=0xD59E;continue;} // D5A0 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D5A2 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D5A4 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D5A5 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D5A6 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D5A7 ASL
  CY+=3;wr(0x20,A);if(FE)return 0xD5AA; // D5A8 STA
  case 0xD5AA:CY+=4;wr(0x110,A);if(FE)return 0xD5AD; // D5AA STA
  case 0xD5AD:CY+=3;wr(0x2,A);if(FE)return 0xD5AF; // D5AD STA
  case 0xD5AF:CY+=3;wr(0x2A,A);if(FE)return 0xD5B1; // D5AF STA
  case 0xD5B1:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // D5B1 LDX
  CY+=2;SP=X; // D5B3 TXS
  CY+=3;push(A);if(FE)return 0xD5B5; // D5B4 PHA
  case 0xD5B5:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D5B5 PLA
  CY+=3;push(A);if(FE)return 0xD5B7; // D5B6 PHA
  case 0xD5B7:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D5B7 PLA
  CY+=3;wr(0x2B,A);if(FE)return 0xD5BA; // D5B8 STA
  case 0xD5BA:CY+=3;wr(0x2,A);if(FE)return 0xD5BC; // D5BA STA
  case 0xD5BC:CY+=3;wr(0x2A,A);if(FE)return 0xD5BE; // D5BC STA
  case 0xD5BE:CY+=3;wr(0x2,A);if(FE)return 0xD5C0; // D5BE STA
  case 0xD5C0:CY+=3;wr(0x2A,A);if(FE)return 0xD5C2; // D5C0 STA
  case 0xD5C2:CY+=2;Y=0x1D;fZ=(Y)===0;fN=(Y)>127; // D5C2 LDY
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D5C4 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD5CA;continue;} // D5C6 BEQ
  CY+=3;A=R[0x62];fZ=(A)===0;fN=(A)>127; // D5C8 LDA
  case 0xD5CA:CY+=3;wr(0x22,A);if(FE)return 0xD5CC; // D5CA STA
  case 0xD5CC:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D5CC LDA
  CY+=2;if(fZ){CY+=1;pc=0xD5D2;continue;} // D5CE BEQ
  CY+=3;A=R[0x63];fZ=(A)===0;fN=(A)>127; // D5D0 LDA
  case 0xD5D2:CY+=3;wr(0x23,A);if(FE)return 0xD5D4; // D5D2 STA
  case 0xD5D4:CY+=3;wr(0x2,A);if(FE)return 0xD5D6; // D5D4 STA
  case 0xD5D6:CY+=3;wr(0x2A,A);if(FE)return 0xD5D8; // D5D6 STA
  case 0xD5D8:CY+=2;Y=0x3A;fZ=(Y)===0;fN=(Y)>127; // D5D8 LDY
  case 0xD5DA:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D5DA LDA
  CY+=3;t=R[0x77];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D5DC CPY
  CY+=2;if(fC){CY+=1;pc=0xD5E2;continue;} // D5DE BCS
  CY+=3;wr(0x1D,A);if(FE)return 0xD5E2; // D5E0 STA
  case 0xD5E2:CY+=3;t=R[0x78];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D5E2 CPY
  CY+=2;if(fC){CY+=1;pc=0xD5E8;continue;} // D5E4 BCS
  CY+=3;wr(0x1E,A);if(FE)return 0xD5E8; // D5E6 STA
  case 0xD5E8:CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D5E8 DEC
  CY+=3;wr(0x2B,A);if(FE)return 0xD5EC; // D5EA STA
  case 0xD5EC:CY+=3;X=R[0x7B];fZ=(X)===0;fN=(X)>127; // D5EC LDX
  CY+=3;t=R[0x75];fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // D5EE CPX
  CY+=2;if(fZ){CY+=2;pc=0xD651;continue;} // D5F0 BEQ
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D5F2 DEY
  CY+=2;if(fN){CY+=2;pc=0xD618;continue;} // D5F3 BMI
  CY+=3;wr(0x2,A);if(FE)return 0xD5F7; // D5F5 STA
  case 0xD5F7:CY+=3;wr(0x2A,A);if(FE)return 0xD5F9; // D5F7 STA
  case 0xD5F9:CY+=3;R[0x79]=Y; // D5F9 STY
  CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // D5FB TYA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D5FC LSR
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D5FD TAY
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D5FE LDA
  CY+=2;if(fZ){CY+=1;pc=0xD604;continue;} // D600 BEQ
  CY+=3;A=R[0x62];fZ=(A)===0;fN=(A)>127; // D602 LDA
  case 0xD604:CY+=3;wr(0x22,A);if(FE)return 0xD606; // D604 STA
  case 0xD606:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D606 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD60C;continue;} // D608 BEQ
  CY+=3;A=R[0x63];fZ=(A)===0;fN=(A)>127; // D60A LDA
  case 0xD60C:CY+=3;wr(0x23,A);if(FE)return 0xD60E; // D60C STA
  case 0xD60E:CY+=3;Y=R[0x79];fZ=(Y)===0;fN=(Y)>127; // D60E LDY
  CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D610 DEC
  CY+=3;X=R[0x7B];fZ=(X)===0;fN=(X)>127; // D612 LDX
  CY+=3;t=R[0x75];fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // D614 CPX
  CY+=2;if(fZ){CY+=1;pc=0xD622;continue;} // D616 BEQ
  case 0xD618:CY+=3;wr(0x2,A);if(FE)return 0xD61A; // D618 STA
  case 0xD61A:CY+=3;wr(0x2A,A);if(FE)return 0xD61C; // D61A STA
  case 0xD61C:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D61C DEY
  CY+=2;if(!fN){CY+=2;pc=0xD5DA;continue;} // D61D BPL
  CY+=3;pc=0xD69D;continue; // D61F JMP
  case 0xD622:CY+=2;X=0x14;fZ=(X)===0;fN=(X)>127; // D622 LDX
  case 0xD624:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D624 DEY
  CY+=3;wr(0x2,A);if(FE)return 0xD627; // D625 STA
  case 0xD627:CY+=3;wr(0x2A,A);if(FE)return 0xD629; // D627 STA
  case 0xD629:CY+=2;if(fN){CY+=1;pc=0xD684;continue;} // D629 BMI
  CY+=5;if(R[0x10]+Y>255) CY++;A=rd(((R[0x11]<<8|R[0x10])+Y));fZ=(A)===0;fN=(A)>127; // D62B LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD62F; // D62D STA
  case 0xD62F:CY+=5;if(R[0x12]+Y>255) CY++;A=rd(((R[0x13]<<8|R[0x12])+Y));fZ=(A)===0;fN=(A)>127; // D62F LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD633; // D631 STA
  case 0xD633:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D633 LDA
  CY+=3;t=R[0x77];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D635 CPY
  CY+=2;if(fC){CY+=1;pc=0xD63B;continue;} // D637 BCS
  CY+=3;wr(0x1D,A);if(FE)return 0xD63B; // D639 STA
  case 0xD63B:CY+=3;t=R[0x78];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D63B CPY
  CY+=2;if(fC){CY+=1;pc=0xD641;continue;} // D63D BCS
  CY+=3;wr(0x1E,A);if(FE)return 0xD641; // D63F STA
  case 0xD641:CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D641 DEC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D643 DEX
  CY+=3;wr(0x2B,A);if(FE)return 0xD646; // D644 STA
  case 0xD646:CY+=2;if(fN){CY+=1;pc=0xD618;continue;} // D646 BMI
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D648 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD656;continue;} // D649 BPL
  case 0xD64B:CY+=3;wr(0x2,A);if(FE)return 0xD64D; // D64B STA
  case 0xD64D:CY+=3;wr(0x2A,A);if(FE)return 0xD64F; // D64D STA
  case 0xD64F:CY+=2;if(fN){CY+=1;pc=0xD684;continue;} // D64F BMI
  case 0xD651:CY+=2;X=0x14;fZ=(X)===0;fN=(X)>127; // D651 LDX
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D653 DEY
  CY+=2;if(fN){CY+=1;pc=0xD64B;continue;} // D654 BMI
  case 0xD656:CY+=3;wr(0x2,A);if(FE)return 0xD658; // D656 STA
  case 0xD658:CY+=3;wr(0x2A,A);if(FE)return 0xD65A; // D658 STA
  case 0xD65A:CY+=5;if(R[0x10]+Y>255) CY++;A=rd(((R[0x11]<<8|R[0x10])+Y));fZ=(A)===0;fN=(A)>127; // D65A LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD65E; // D65C STA
  case 0xD65E:CY+=5;if(R[0x12]+Y>255) CY++;A=rd(((R[0x13]<<8|R[0x12])+Y));fZ=(A)===0;fN=(A)>127; // D65E LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD662; // D660 STA
  case 0xD662:CY+=3;R[0x79]=Y; // D662 STY
  CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // D664 TYA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // D665 LSR
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D666 TAY
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D667 LDA
  CY+=2;if(fZ){CY+=1;pc=0xD66D;continue;} // D669 BEQ
  CY+=3;A=R[0x62];fZ=(A)===0;fN=(A)>127; // D66B LDA
  case 0xD66D:CY+=3;wr(0x22,A);if(FE)return 0xD66F; // D66D STA
  case 0xD66F:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D66F LDA
  CY+=2;if(fZ){CY+=1;pc=0xD675;continue;} // D671 BEQ
  CY+=3;A=R[0x63];fZ=(A)===0;fN=(A)>127; // D673 LDA
  case 0xD675:CY+=3;wr(0x23,A);if(FE)return 0xD677; // D675 STA
  case 0xD677:CY+=3;Y=R[0x79];fZ=(Y)===0;fN=(Y)>127; // D677 LDY
  CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D679 DEC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D67B DEX
  CY+=2;if(!fN){CY+=1;pc=0xD624;continue;} // D67C BPL
  CY+=2;if(fN){CY+=1;pc=0xD618;continue;} // D67E BMI
  case 0xD680:CY+=3;wr(0x2,A);if(FE)return 0xD682; // D680 STA
  case 0xD682:CY+=3;wr(0x2A,A);if(FE)return 0xD684; // D682 STA
  case 0xD684:CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // D684 TXA
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // D685 TAY
  case 0xD686:CY+=5;if(R[0x14]+Y>255) CY++;A=rd(((R[0x15]<<8|R[0x14])+Y));fZ=(A)===0;fN=(A)>127; // D686 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD68A; // D688 STA
  case 0xD68A:CY+=5;if(R[0x16]+Y>255) CY++;A=rd(((R[0x17]<<8|R[0x16])+Y));fZ=(A)===0;fN=(A)>127; // D68A LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD68E; // D68C STA
  case 0xD68E:CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D68E DEC
  CY+=3;A=R[0x7B];fZ=(A)===0;fN=(A)>127; // D690 LDA
  CY+=2;t=0x1C;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D692 CMP
  CY+=2;if(fZ){CY+=1;pc=0xD6B3;continue;} // D694 BEQ
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D696 DEY
  CY+=3;wr(0x2,A);if(FE)return 0xD699; // D697 STA
  case 0xD699:CY+=3;wr(0x2A,A);if(FE)return 0xD69B; // D699 STA
  case 0xD69B:CY+=2;if(!fN){CY+=1;pc=0xD686;continue;} // D69B BPL
  case 0xD69D:CY+=5;t=R[0x7B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7B]=t; // D69D DEC
  CY+=3;A=R[0x7B];fZ=(A)===0;fN=(A)>127; // D69F LDA
  CY+=2;t=0x1C;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D6A1 CMP
  CY+=2;if(fZ){CY+=1;pc=0xD6B3;continue;} // D6A3 BEQ
  CY+=3;t=R[0x75];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D6A5 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD6AD;continue;} // D6A7 BNE
  CY+=2;X=0x14;fZ=(X)===0;fN=(X)>127; // D6A9 LDX
  CY+=2;if(!fZ){CY+=1;pc=0xD680;continue;} // D6AB BNE
  case 0xD6AD:CY+=3;wr(0x2,A);if(FE)return 0xD6AF; // D6AD STA
  case 0xD6AF:CY+=3;wr(0x2A,A);if(FE)return 0xD6B1; // D6AF STA
  case 0xD6B1:CY+=2;if(!fZ){CY+=1;pc=0xD69D;continue;} // D6B1 BNE
  case 0xD6B3:CY+=2;X=0xB6;fZ=(X)===0;fN=(X)>127; // D6B3 LDX
  CY+=2;SP=X; // D6B5 TXS
  CY+=2;Y=0x4;fZ=(Y)===0;fN=(Y)>127; // D6B6 LDY
  CY+=3;R[0x7A]=Y; // D6B8 STY
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D6BA DEY
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D6BB LDA
  CY+=3;wr(0x2,A);if(FE)return 0xD6BF; // D6BD STA
  case 0xD6BF:CY+=3;wr(0x2A,A);if(FE)return 0xD6C1; // D6BF STA
  case 0xD6C1:CY+=3;wr(0x1B,A);if(FE)return 0xD6C3; // D6C1 STA
  case 0xD6C3:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6C3 PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD6C6; // D6C4 STA
  case 0xD6C6:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6C6 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD6C9; // D6C7 STA
  case 0xD6C9:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6C9 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD6CC; // D6CA STA
  case 0xD6CC:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6CC PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD6CF; // D6CD STA
  case 0xD6CF:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6CF PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD6D2; // D6D0 STA
  case 0xD6D2:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D6D2 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD6D5; // D6D3 STA
  case 0xD6D5:CY+=5;t=R[0x7A];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7A]=t; // D6D5 DEC
  CY+=2;if(!fZ){CY+=1;pc=0xD6E7;continue;} // D6D7 BNE
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D6D9 DEY
  CY+=2;if(fZ){CY+=1;pc=0xD6EA;continue;} // D6DA BEQ
  CY+=2;X=SP;fZ=(X)===0;fN=(X)>127; // D6DC TSX
  CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // D6DD LDA
  CY+=3;R[0x7A]=A; // D6DF STA
  case 0xD6E1:CY+=3;wr(0x2,A);if(FE)return 0xD6E3; // D6E1 STA
  case 0xD6E3:CY+=3;wr(0x2A,A);if(FE)return 0xD6E5; // D6E3 STA
  case 0xD6E5:CY+=2;if(!fZ){CY+=1;pc=0xD6C3;continue;} // D6E5 BNE
  case 0xD6E7:CY+=2;SP=X; // D6E7 TXS
  CY+=2;if(!fZ){CY+=1;pc=0xD6E1;continue;} // D6E8 BNE
  case 0xD6EA:CY+=2;X=SP;fZ=(X)===0;fN=(X)>127; // D6EA TSX
  CY+=2;t=0xDA;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // D6EB CPX
  CY+=2;if(fZ){CY+=2;pc=0xD70B;continue;} // D6ED BEQ
  CY+=2;X=0xC8;fZ=(X)===0;fN=(X)>127; // D6EF LDX
  CY+=2;SP=X; // D6F1 TXS
  CY+=3;wr(0x2,A);if(FE)return 0xD6F4; // D6F2 STA
  case 0xD6F4:CY+=3;wr(0x2A,A);if(FE)return 0xD6F6; // D6F4 STA
  case 0xD6F6:CY+=3;wr(0xD,Y);if(FE)return 0xD6F8; // D6F6 STY
  case 0xD6F8:CY+=3;wr(0xE,Y);if(FE)return 0xD6FA; // D6F8 STY
  case 0xD6FA:CY+=3;wr(0xF,Y);if(FE)return 0xD6FC; // D6FA STY
  case 0xD6FC:CY+=2;A=0xE4;fZ=(A)===0;fN=(A)>127; // D6FC LDA
  CY+=3;wr(0x9,A);if(FE)return 0xD700; // D6FE STA
  case 0xD700:CY+=2;A=0xF2;fZ=(A)===0;fN=(A)>127; // D700 LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD704; // D702 STA
  case 0xD704:CY+=2;Y=0x4;fZ=(Y)===0;fN=(Y)>127; // D704 LDY
  CY+=3;R[0x7A]=Y; // D706 STY
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D708 DEY
  CY+=2;if(!fZ){CY+=2;pc=0xD6E1;continue;} // D709 BNE
  case 0xD70B:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // D70B LDX
  CY+=2;SP=X; // D70D TXS
  CY+=3;wr(0x2,A);if(FE)return 0xD710; // D70E STA
  case 0xD710:CY+=3;wr(0x2A,A);if(FE)return 0xD712; // D710 STA
  case 0xD712:CY+=2;A=0xF2;fZ=(A)===0;fN=(A)>127; // D712 LDA
  CY+=3;wr(0x9,A);if(FE)return 0xD716; // D714 STA
  case 0xD716:CY+=2;Y=0x3;fZ=(Y)===0;fN=(Y)>127; // D716 LDY
  case 0xD718:CY+=3;wr(0x2,A);if(FE)return 0xD71A; // D718 STA
  case 0xD71A:CY+=3;wr(0x2A,A);if(FE)return 0xD71C; // D71A STA
  case 0xD71C:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D71C DEY
  CY+=2;if(!fZ){CY+=1;pc=0xD718;continue;} // D71D BNE
  CY+=3;wr(0x9,Y);if(FE)return 0xD721; // D71F STY
  case 0xD721:CY+=3;wr(0xD,Y);if(FE)return 0xD723; // D721 STY
  case 0xD723:CY+=3;wr(0xE,Y);if(FE)return 0xD725; // D723 STY
  case 0xD725:CY+=3;wr(0xF,Y);if(FE)return 0xD727; // D725 STY
  case 0xD727:CY+=3;wr(0x1B,Y);if(FE)return 0xD729; // D727 STY
  case 0xD729:CY+=3;wr(0x1C,Y);if(FE)return 0xD72B; // D729 STY
  case 0xD72B:CY+=2;A=0x23;fZ=(A)===0;fN=(A)>127; // D72B LDA
  CY+=4;wr(0x296,A);if(FE)return 0xD730; // D72D STA
  case 0xD730:CY+=5;t=R[0x0];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x0]=t; // D730 INC
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // D732 LDA
  CY+=3;adc(R[0x1]); // D734 ADC
  CY+=3;adc(R[0x2]); // D736 ADC
  CY+=3;Y=R[0x1];fZ=(Y)===0;fN=(Y)>127; // D738 LDY
  CY+=3;R[0x1]=A; // D73A STA
  CY+=3;R[0x2]=Y; // D73C STY
  CY+=3;pc=0xDFF2;continue; // D73E JMP
  case 0xD741:CY+=3;wr(0x5,Y);if(FE)return 0xD743; // D741 STY
  case 0xD743:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D743 INY
  CY+=3;wr(0x4,Y);if(FE)return 0xD746; // D744 STY
  case 0xD746:CY+=2;A=0xDC;fZ=(A)===0;fN=(A)>127; // D746 LDA
  CY+=3;R[0xD]=A; // D748 STA
  CY+=3;R[0xF]=A; // D74A STA
  CY+=2;Y=0x9F;fZ=(Y)===0;fN=(Y)>127; // D74C LDY
  CY+=2;A=0x23;fZ=(A)===0;fN=(A)>127; // D74E LDA
  CY+=3;R[0x16]=A; // D750 STA
  case 0xD752:CY+=2;t=0x88;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D752 CPY
  CY+=2;if(fZ){CY+=1;pc=0xD75D;continue;} // D754 BEQ
  CY+=3;wr(0x2,A);if(FE)return 0xD758; // D756 STA
  case 0xD758:CY+=3;wr(0x2A,A);if(FE)return 0xD75A; // D758 STA
  case 0xD75A:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D75A DEY
  CY+=2;if(!fZ){CY+=1;pc=0xD752;continue;} // D75B BNE
  case 0xD75D:CY+=2;A=0x50;fZ=(A)===0;fN=(A)>127; // D75D LDA
  CY+=3;wr(0x20,A);if(FE)return 0xD761; // D75F STA
  case 0xD761:CY+=2;A=0x60;fZ=(A)===0;fN=(A)>127; // D761 LDA
  CY+=3;wr(0x21,A);if(FE)return 0xD765; // D763 STA
  case 0xD765:CY+=2;X=0xD;fZ=(X)===0;fN=(X)>127; // D765 LDX
  CY+=2;A=0xA;fZ=(A)===0;fN=(A)>127; // D767 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD76B; // D769 STA
  case 0xD76B:CY+=3;wr(0x7,A);if(FE)return 0xD76D; // D76B STA
  case 0xD76D:CY+=3;wr(0x2,A);if(FE)return 0xD76F; // D76D STA
  case 0xD76F:CY+=3;wr(0x2A,A);if(FE)return 0xD771; // D76F STA
  case 0xD771:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D771 DEX
  case 0xD772:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D772 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xD772;continue;} // D773 BNE
  CY+=4;wr(0x110,A);if(FE)return 0xD778; // D775 STA
  case 0xD778:CY+=3;wr(0x11,A);if(FE)return 0xD77A; // D778 STA
  case 0xD77A:CY+=3;wr(0x2,A);if(FE)return 0xD77C; // D77A STA
  case 0xD77C:CY+=4;wr(0x12A,A);if(FE)return 0xD77F; // D77C STA
  case 0xD77F:CY+=2;X=0x4;fZ=(X)===0;fN=(X)>127; // D77F LDX
  CY+=2; // D781 NOP
  case 0xD782:CY+=2; // D782 NOP
  CY+=4;if((0xDF94&255)+X>255) CY++;A=rd((0xDF94+X));fZ=(A)===0;fN=(A)>127; // D783 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD788; // D786 STA
  case 0xD788:CY+=4;if((0xDF8A&255)+X>255) CY++;A=rd((0xDF8A+X));fZ=(A)===0;fN=(A)>127; // D788 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD78D; // D78B STA
  case 0xD78D:CY+=4;if((0xDF80&255)+X>255) CY++;A=rd((0xDF80+X));fZ=(A)===0;fN=(A)>127; // D78D LDA
  CY+=4;wr(0x12B,A);if(FE)return 0xD793; // D790 STA
  case 0xD793:CY+=3;push(A);if(FE)return 0xD794; // D793 PHA
  case 0xD794:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D794 PLA
  CY+=3;push(A);if(FE)return 0xD796; // D795 PHA
  case 0xD796:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D796 PLA
  CY+=3;push(A);if(FE)return 0xD798; // D797 PHA
  case 0xD798:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D798 PLA
  CY+=3;push(A);if(FE)return 0xD79A; // D799 PHA
  case 0xD79A:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D79A PLA
  CY+=3;push(A);if(FE)return 0xD79C; // D79B PHA
  case 0xD79C:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D79C PLA
  CY+=2; // D79D NOP
  CY+=3;wr(0x1B,A);if(FE)return 0xD7A0; // D79E STA
  case 0xD7A0:CY+=3;wr(0x2,A);if(FE)return 0xD7A2; // D7A0 STA
  case 0xD7A2:CY+=3;wr(0x2A,A);if(FE)return 0xD7A4; // D7A2 STA
  case 0xD7A4:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D7A4 DEX
  CY+=2;if(!fN){CY+=1;pc=0xD782;continue;} // D7A5 BPL
  CY+=2;A=0x44;fZ=(A)===0;fN=(A)>127; // D7A7 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD7AB; // D7A9 STA
  case 0xD7AB:CY+=3;wr(0x7,A);if(FE)return 0xD7AD; // D7AB STA
  case 0xD7AD:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D7AD LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD7B1; // D7AF STA
  case 0xD7B1:CY+=3;wr(0x4,A);if(FE)return 0xD7B3; // D7B1 STA
  case 0xD7B3:CY+=2;Y=0x3;fZ=(Y)===0;fN=(Y)>127; // D7B3 LDY
  CY+=3;wr(0x2,A);if(FE)return 0xD7B7; // D7B5 STA
  case 0xD7B7:CY+=3;wr(0x2A,A);if(FE)return 0xD7B9; // D7B7 STA
  case 0xD7B9:CY+=2;A=0xF0;fZ=(A)===0;fN=(A)>127; // D7B9 LDA
  CY+=3;wr(0x20,A);if(FE)return 0xD7BD; // D7BB STA
  case 0xD7BD:CY+=3;wr(0x21,A);if(FE)return 0xD7BF; // D7BD STA
  case 0xD7BF:CY+=3;wr(0x2,A);if(FE)return 0xD7C1; // D7BF STA
  case 0xD7C1:CY+=3;wr(0x2A,A);if(FE)return 0xD7C3; // D7C1 STA
  case 0xD7C3:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D7C3 LDA
  CY+=3;wr(0xF,A);if(FE)return 0xD7C7; // D7C5 STA
  case 0xD7C7:CY+=3;X=R[0x63];fZ=(X)===0;fN=(X)>127; // D7C7 LDX
  CY+=4;if((0xDDEC&255)+Y>255) CY++;A=RB0[0xDEC+Y];fZ=(A)===0;fN=(A)>127; // D7C9 LDA
  CY+=4;if((0xDED4&255)+X>255) CY++;A&=RB0[0xED4+X];fZ=(A)===0;fN=(A)>127; // D7CC AND
  CY+=3;wr(0x1B,A);if(FE)return 0xD7D1; // D7CF STA
  case 0xD7D1:CY+=4;if((0xDCF9&255)+Y>255) CY++;A=RB0[0xCF9+Y];fZ=(A)===0;fN=(A)>127; // D7D1 LDA
  CY+=4;if((0xDED0&255)+X>255) CY++;A&=RB0[0xED0+X];fZ=(A)===0;fN=(A)>127; // D7D4 AND
  CY+=3;wr(0x1C,A);if(FE)return 0xD7D9; // D7D7 STA
  case 0xD7D9:CY+=3;wr(0x2B,A);if(FE)return 0xD7DB; // D7D9 STA
  case 0xD7DB:CY+=3;push(A);if(FE)return 0xD7DC; // D7DB PHA
  case 0xD7DC:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D7DC PLA
  CY+=2;A=0x7C;fZ=(A)===0;fN=(A)>127; // D7DD LDA
  CY+=3;wr(0xF,A);if(FE)return 0xD7E1; // D7DF STA
  case 0xD7E1:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D7E1 DEY
  CY+=2;if(!fN){CY+=1;pc=0xD7BF;continue;} // D7E2 BPL
  CY+=3;wr(0x2,A);if(FE)return 0xD7E6; // D7E4 STA
  case 0xD7E6:CY+=3;wr(0x2A,A);if(FE)return 0xD7E8; // D7E6 STA
  case 0xD7E8:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D7E8 INY
  CY+=3;wr(0x1B,Y);if(FE)return 0xD7EB; // D7E9 STY
  case 0xD7EB:CY+=3;wr(0x1C,Y);if(FE)return 0xD7ED; // D7EB STY
  case 0xD7ED:CY+=3;wr(0xF,Y);if(FE)return 0xD7EF; // D7ED STY
  case 0xD7EF:CY+=3;wr(0x4,Y);if(FE)return 0xD7F1; // D7EF STY
  case 0xD7F1:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // D7F1 INY
  CY+=3;wr(0x25,Y);if(FE)return 0xD7F4; // D7F2 STY
  case 0xD7F4:CY+=2;Y=0x7C;fZ=(Y)===0;fN=(Y)>127; // D7F4 LDY
  CY+=2;A=0xA0;fZ=(A)===0;fN=(A)>127; // D7F6 LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD7FA; // D7F8 STA
  case 0xD7FA:CY+=2;X=0xD1;fZ=(X)===0;fN=(X)>127; // D7FA LDX
  CY+=2;SP=X; // D7FC TXS
  CY+=2;X=0x3;fZ=(X)===0;fN=(X)>127; // D7FD LDX
  case 0xD7FF:CY+=2;t=0x74;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D7FF CPY
  CY+=2;if(fZ){CY+=1;pc=0xD80A;continue;} // D801 BEQ
  CY+=3;wr(0x2,A);if(FE)return 0xD805; // D803 STA
  case 0xD805:CY+=3;wr(0x2A,A);if(FE)return 0xD807; // D805 STA
  case 0xD807:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D807 DEY
  CY+=2;if(!fZ){CY+=2;pc=0xD7FF;continue;} // D808 BNE
  case 0xD80A:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D80A PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD80D; // D80B STA
  case 0xD80D:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D80D PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD810; // D80E STA
  case 0xD810:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D810 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD813; // D811 STA
  case 0xD813:CY+=3;R[0x7A]=X; // D813 STX
  CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // D815 LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D817 AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D819 TAX
  CY+=4;A=R[0x2B+X&127];fZ=(A)===0;fN=(A)>127; // D81A LDA
  CY+=2;t=0x25;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D81C CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD823;continue;} // D81E BNE
  CY+=3;pc=0xD8B7;continue; // D820 JMP
  case 0xD823:CY+=2;t=0x24;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D823 CMP
  CY+=2;if(fZ){CY+=1;pc=0xD848;continue;} // D825 BEQ
  CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // D827 LDX
  CY+=3;wr(0x2,A);if(FE)return 0xD82B; // D829 STA
  case 0xD82B:CY+=3;wr(0x2A,A);if(FE)return 0xD82D; // D82B STA
  case 0xD82D:CY+=3;wr(0x2,A);if(FE)return 0xD82F; // D82D STA
  case 0xD82F:CY+=3;wr(0x2A,A);if(FE)return 0xD831; // D82F STA
  case 0xD831:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D831 DEX
  CY+=2;if(!fN){CY+=1;pc=0xD80A;continue;} // D832 BPL
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // D834 INX
  CY+=3;wr(0xD,X);if(FE)return 0xD837; // D835 STX
  case 0xD837:CY+=3;wr(0xE,X);if(FE)return 0xD839; // D837 STX
  case 0xD839:CY+=2;A=0x44;fZ=(A)===0;fN=(A)>127; // D839 LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD83D; // D83B STA
  case 0xD83D:CY+=2;A=0xA0;fZ=(A)===0;fN=(A)>127; // D83D LDA
  CY+=3;wr(0x9,A);if(FE)return 0xD841; // D83F STA
  case 0xD841:CY+=3;wr(0xF,X);if(FE)return 0xD843; // D841 STX
  case 0xD843:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D843 DEX
  CY+=2;SP=X; // D844 TXS
  CY+=3;pc=0xD96C;continue; // D845 JMP
  case 0xD848:CY+=3;wr(0x2,A);if(FE)return 0xD84A; // D848 STA
  case 0xD84A:CY+=3;wr(0x2A,A);if(FE)return 0xD84C; // D84A STA
  case 0xD84C:CY+=5;t=R[0x16];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x16]=t; // D84C INC
  CY+=3;wr(0x2,A);if(FE)return 0xD850; // D84E STA
  case 0xD850:CY+=3;wr(0x2A,A);if(FE)return 0xD852; // D850 STA
  case 0xD852:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D852 PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD855; // D853 STA
  case 0xD855:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D855 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD858; // D856 STA
  case 0xD858:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D858 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD85B; // D859 STA
  case 0xD85B:CY+=4;Y=R[0x33+X&127];fZ=(Y)===0;fN=(Y)>127; // D85B LDY
  CY+=4;if((0xDDA2&255)+Y>255) CY++;A=RB0[0xDA2+Y];fZ=(A)===0;fN=(A)>127; // D85D LDA
  CY+=3;R[0xC]=A; // D860 STA
  CY+=4;if((0xDDB2&255)+Y>255) CY++;A=RB0[0xDB2+Y];fZ=(A)===0;fN=(A)>127; // D862 LDA
  CY+=3;R[0xE]=A; // D865 STA
  CY+=4;if((0xDEE0&255)+Y>255) CY++;A=RB0[0xEE0+Y];fZ=(A)===0;fN=(A)>127; // D867 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD86C; // D86A STA
  case 0xD86C:CY+=4;if((0xDEF0&255)+Y>255) CY++;A=RB0[0xEF0+Y];fZ=(A)===0;fN=(A)>127; // D86C LDA
  CY+=3;wr(0x7,A);if(FE)return 0xD871; // D86F STA
  case 0xD871:CY+=2;Y=0x9;fZ=(Y)===0;fN=(Y)>127; // D871 LDY
  CY+=3;wr(0x2,A);if(FE)return 0xD875; // D873 STA
  case 0xD875:CY+=3;wr(0x2A,A);if(FE)return 0xD877; // D875 STA
  case 0xD877:CY+=3;wr(0x2,A);if(FE)return 0xD879; // D877 STA
  case 0xD879:CY+=3;wr(0x2A,A);if(FE)return 0xD87B; // D879 STA
  case 0xD87B:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D87B PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD87E; // D87C STA
  case 0xD87E:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D87E PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD881; // D87F STA
  case 0xD881:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D881 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD884; // D882 STA
  case 0xD884:CY+=4;A=R[0x2F+X&127];fZ=(A)===0;fN=(A)>127; // D884 LDA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D886 DEX
  CY+=3;R[0x7A]=X; // D887 STX
  CY+=3;wr(0x2,A);if(FE)return 0xD88B; // D889 STA
  case 0xD88B:CY+=3;wr(0x2A,A);if(FE)return 0xD88D; // D88B STA
  case 0xD88D:CY+=2;sbc(0xF); // D88D SBC
  CY+=2;if(fC){CY+=1;pc=0xD88D;continue;} // D88F BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D891 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D893 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D894 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D895 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D896 ASL
  CY+=3;wr(0x20,A);if(FE)return 0xD899; // D897 STA
  case 0xD899:CY+=2;adc(0xF); // D899 ADC
  CY+=3;wr(0x10,A);if(FE)return 0xD89D; // D89B STA
  case 0xD89D:CY+=3;wr(0x11,A);if(FE)return 0xD89F; // D89D STA
  case 0xD89F:CY+=3;wr(0x21,A);if(FE)return 0xD8A1; // D89F STA
  case 0xD8A1:CY+=3;wr(0x2,A);if(FE)return 0xD8A3; // D8A1 STA
  case 0xD8A3:CY+=3;wr(0x2A,A);if(FE)return 0xD8A5; // D8A3 STA
  case 0xD8A5:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8A5 PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD8A8; // D8A6 STA
  case 0xD8A8:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8A8 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD8AB; // D8A9 STA
  case 0xD8AB:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8AB PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD8AE; // D8AC STA
  case 0xD8AE:CY+=3;wr(0x2B,A);if(FE)return 0xD8B0; // D8AE STA
  case 0xD8B0:CY+=3;wr(0x2,A);if(FE)return 0xD8B2; // D8B0 STA
  case 0xD8B2:CY+=3;wr(0x2A,A);if(FE)return 0xD8B4; // D8B2 STA
  case 0xD8B4:CY+=3;pc=0xD939;continue; // D8B4 JMP
  case 0xD8B7:CY+=4;Y=R[0x33+X&127];fZ=(Y)===0;fN=(Y)>127; // D8B7 LDY
  CY+=3;wr(0x2,A);if(FE)return 0xD8BB; // D8B9 STA
  case 0xD8BB:CY+=3;wr(0x2A,A);if(FE)return 0xD8BD; // D8BB STA
  case 0xD8BD:CY+=4;if((0xDDA2&255)+Y>255) CY++;A=RB0[0xDA2+Y];fZ=(A)===0;fN=(A)>127; // D8BD LDA
  CY+=3;R[0xC]=A; // D8C0 STA
  CY+=4;if((0xDDB2&255)+Y>255) CY++;A=RB0[0xDB2+Y];fZ=(A)===0;fN=(A)>127; // D8C2 LDA
  CY+=3;R[0xE]=A; // D8C5 STA
  CY+=4;if((0xDEE0&255)+Y>255) CY++;A=RB0[0xEE0+Y];fZ=(A)===0;fN=(A)>127; // D8C7 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD8CC; // D8CA STA
  case 0xD8CC:CY+=4;if((0xDEF0&255)+Y>255) CY++;A=RB0[0xEF0+Y];fZ=(A)===0;fN=(A)>127; // D8CC LDA
  CY+=3;wr(0x7,A);if(FE)return 0xD8D1; // D8CF STA
  case 0xD8D1:CY+=2;Y=0x9;fZ=(Y)===0;fN=(Y)>127; // D8D1 LDY
  CY+=5;t=R[0x16];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x16]=t; // D8D3 INC
  CY+=5;t=R[0x16];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x16]=t; // D8D5 INC
  CY+=3;wr(0x2,A);if(FE)return 0xD8D9; // D8D7 STA
  case 0xD8D9:CY+=3;wr(0x2A,A);if(FE)return 0xD8DB; // D8D9 STA
  case 0xD8DB:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8DB PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD8DE; // D8DC STA
  case 0xD8DE:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8DE PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD8E1; // D8DF STA
  case 0xD8E1:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D8E1 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD8E4; // D8E2 STA
  case 0xD8E4:CY+=4;A=R[0x2F+X&127];fZ=(A)===0;fN=(A)>127; // D8E4 LDA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D8E6 DEX
  CY+=3;R[0x7A]=X; // D8E7 STX
  CY+=3;wr(0x2,A);if(FE)return 0xD8EB; // D8E9 STA
  case 0xD8EB:CY+=3;wr(0x2A,A);if(FE)return 0xD8ED; // D8EB STA
  case 0xD8ED:CY+=2;sbc(0xF); // D8ED SBC
  CY+=2;if(fC){CY+=1;pc=0xD8ED;continue;} // D8EF BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D8F1 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D8F3 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D8F4 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D8F5 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D8F6 ASL
  CY+=3;wr(0x20,A);if(FE)return 0xD8F9; // D8F7 STA
  case 0xD8F9:CY+=2;adc(0xF); // D8F9 ADC
  CY+=3;wr(0x10,A);if(FE)return 0xD8FD; // D8FB STA
  case 0xD8FD:CY+=3;wr(0x11,A);if(FE)return 0xD8FF; // D8FD STA
  case 0xD8FF:CY+=3;wr(0x21,A);if(FE)return 0xD901; // D8FF STA
  case 0xD901:CY+=3;wr(0x2,A);if(FE)return 0xD903; // D901 STA
  case 0xD903:CY+=3;wr(0x2A,A);if(FE)return 0xD905; // D903 STA
  case 0xD905:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D905 PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD908; // D906 STA
  case 0xD908:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D908 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD90B; // D909 STA
  case 0xD90B:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D90B PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD90E; // D90C STA
  case 0xD90E:CY+=3;wr(0x2B,A);if(FE)return 0xD910; // D90E STA
  case 0xD910:CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D910 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD914; // D912 STA
  case 0xD914:CY+=3;wr(0x2,A);if(FE)return 0xD916; // D914 STA
  case 0xD916:CY+=3;wr(0x2A,A);if(FE)return 0xD918; // D916 STA
  case 0xD918:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D918 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD91C; // D91A STA
  case 0xD91C:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D91C DEY
  CY+=2;t=0x6;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D91D CPY
  CY+=2;if(fZ){CY+=1;pc=0xD939;continue;} // D91F BEQ
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D921 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD925; // D923 STA
  case 0xD925:CY+=3;wr(0x2,A);if(FE)return 0xD927; // D925 STA
  case 0xD927:CY+=3;wr(0x2A,A);if(FE)return 0xD929; // D927 STA
  case 0xD929:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D929 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD92D; // D92B STA
  case 0xD92D:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D92D PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD930; // D92E STA
  case 0xD930:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D930 PLA
  CY+=3;wr(0xE,A);if(FE)return 0xD933; // D931 STA
  case 0xD933:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D933 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xD936; // D934 STA
  case 0xD936:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D936 DEY
  CY+=2;if(!fZ){CY+=1;pc=0xD910;continue;} // D937 BNE
  case 0xD939:CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D939 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD93D; // D93B STA
  case 0xD93D:CY+=3;wr(0x2,A);if(FE)return 0xD93F; // D93D STA
  case 0xD93F:CY+=3;wr(0x2A,A);if(FE)return 0xD941; // D93F STA
  case 0xD941:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D941 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD945; // D943 STA
  case 0xD945:CY+=2;A=0xA0;fZ=(A)===0;fN=(A)>127; // D945 LDA
  CY+=3;wr(0x9,A);if(FE)return 0xD949; // D947 STA
  case 0xD949:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D949 LDA
  CY+=3;wr(0xD,A);if(FE)return 0xD94D; // D94B STA
  case 0xD94D:CY+=3;wr(0xE,A);if(FE)return 0xD94F; // D94D STA
  case 0xD94F:CY+=3;wr(0xF,A);if(FE)return 0xD951; // D94F STA
  case 0xD951:CY+=2;A=0x44;fZ=(A)===0;fN=(A)>127; // D951 LDA
  CY+=3;wr(0x8,A);if(FE)return 0xD955; // D953 STA
  case 0xD955:CY+=2;if(!fZ){CY+=1;pc=0xD9C8;continue;} // D955 BNE
  case 0xD957:CY+=5;t=R[0x16];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x16]=t; // D957 DEC
  CY+=3;wr(0x2,A);if(FE)return 0xD95B; // D959 STA
  case 0xD95B:CY+=3;wr(0x2A,A);if(FE)return 0xD95D; // D95B STA
  case 0xD95D:CY+=3;wr(0x2,A);if(FE)return 0xD95F; // D95D STA
  case 0xD95F:CY+=3;wr(0x2A,A);if(FE)return 0xD961; // D95F STA
  case 0xD961:CY+=3;Y=R[0x16];fZ=(Y)===0;fN=(Y)>127; // D961 LDY
  CY+=2;t=0xB;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // D963 CPY
  CY+=2;if(fC){CY+=1;pc=0xD973;continue;} // D965 BCS
  CY+=2;X=0xB6;fZ=(X)===0;fN=(X)>127; // D967 LDX
  CY+=2;SP=X; // D969 TXS
  CY+=2;if(!fZ){CY+=1;pc=0xD9E6;continue;} // D96A BNE
  case 0xD96C:CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // D96C LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // D96E AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // D970 TAX
  CY+=3;wr(0x2B,A);if(FE)return 0xD973; // D971 STA
  case 0xD973:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D973 LDA
  CY+=2;t=0x0;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // D975 CPX
  CY+=3;wr(0x1B,A);if(FE)return 0xD979; // D977 STA
  case 0xD979:CY+=3;wr(0x2,A);if(FE)return 0xD97B; // D979 STA
  case 0xD97B:CY+=3;wr(0x2A,A);if(FE)return 0xD97D; // D97B STA
  case 0xD97D:CY+=3;wr(0x1C,A);if(FE)return 0xD97F; // D97D STA
  case 0xD97F:CY+=2;if(fN){CY+=1;pc=0xD957;continue;} // D97F BMI
  CY+=4;A=R[0x2B+X&127];fZ=(A)===0;fN=(A)>127; // D981 LDA
  CY+=3;t=R[0x16];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D983 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xD957;continue;} // D985 BNE
  CY+=4;Y=R[0x33+X&127];fZ=(Y)===0;fN=(Y)>127; // D987 LDY
  CY+=4;if((0xDDA2&255)+Y>255) CY++;A=RB0[0xDA2+Y];fZ=(A)===0;fN=(A)>127; // D989 LDA
  CY+=3;R[0xC]=A; // D98C STA
  CY+=4;if((0xDDB2&255)+Y>255) CY++;A=RB0[0xDB2+Y];fZ=(A)===0;fN=(A)>127; // D98E LDA
  CY+=3;R[0xE]=A; // D991 STA
  CY+=4;if((0xDEE0&255)+Y>255) CY++;A=RB0[0xEE0+Y];fZ=(A)===0;fN=(A)>127; // D993 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xD998; // D996 STA
  case 0xD998:CY+=4;if((0xDEF0&255)+Y>255) CY++;A=RB0[0xEF0+Y];fZ=(A)===0;fN=(A)>127; // D998 LDA
  CY+=3;wr(0x7,A);if(FE)return 0xD99D; // D99B STA
  case 0xD99D:CY+=2;Y=0x9;fZ=(Y)===0;fN=(Y)>127; // D99D LDY
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D99F LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD9A3; // D9A1 STA
  case 0xD9A3:CY+=4;A=R[0x2F+X&127];fZ=(A)===0;fN=(A)>127; // D9A3 LDA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // D9A5 DEX
  CY+=3;R[0x7A]=X; // D9A6 STX
  CY+=3;wr(0x2,A);if(FE)return 0xD9AA; // D9A8 STA
  case 0xD9AA:CY+=3;wr(0x2A,A);if(FE)return 0xD9AC; // D9AA STA
  case 0xD9AC:CY+=2;sbc(0xF); // D9AC SBC
  CY+=2;if(fC){CY+=1;pc=0xD9AC;continue;} // D9AE BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // D9B0 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D9B2 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D9B3 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D9B4 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // D9B5 ASL
  CY+=3;wr(0x20,A);if(FE)return 0xD9B8; // D9B6 STA
  case 0xD9B8:CY+=2;adc(0xF); // D9B8 ADC
  CY+=3;wr(0x10,A);if(FE)return 0xD9BC; // D9BA STA
  case 0xD9BC:CY+=3;wr(0x11,A);if(FE)return 0xD9BE; // D9BC STA
  case 0xD9BE:CY+=3;wr(0x21,A);if(FE)return 0xD9C0; // D9BE STA
  case 0xD9C0:CY+=3;wr(0x2,A);if(FE)return 0xD9C2; // D9C0 STA
  case 0xD9C2:CY+=3;wr(0x2A,A);if(FE)return 0xD9C4; // D9C2 STA
  case 0xD9C4:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // D9C4 LDA
  CY+=3;wr(0x1C,A);if(FE)return 0xD9C8; // D9C6 STA
  case 0xD9C8:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // D9C8 DEY
  CY+=2;if(fN){CY+=1;pc=0xD9D4;continue;} // D9C9 BMI
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // D9CB LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD9CF; // D9CD STA
  case 0xD9CF:CY+=2;X=SP;fZ=(X)===0;fN=(X)>127; // D9CF TSX
  CY+=3;wr(0x2B,A);if(FE)return 0xD9D2; // D9D0 STA
  case 0xD9D2:CY+=2;if(!fZ){CY+=1;pc=0xD9C0;continue;} // D9D2 BNE
  case 0xD9D4:CY+=3;A=R[0x16];fZ=(A)===0;fN=(A)>127; // D9D4 LDA
  CY+=2;fC=true; // D9D6 SEC
  CY+=2;sbc(0x4); // D9D7 SBC
  CY+=3;R[0x16]=A; // D9D9 STA
  CY+=3;wr(0x2B,Y);if(FE)return 0xD9DD; // D9DB STY
  case 0xD9DD:CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // D9DD LDX
  CY+=2;t=0xB;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // D9DF CMP
  CY+=2;if(fC){CY+=1;pc=0xD973;continue;} // D9E1 BCS
  CY+=2;X=0xB6;fZ=(X)===0;fN=(X)>127; // D9E3 LDX
  CY+=2;SP=X; // D9E5 TXS
  case 0xD9E6:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // D9E6 LDA
  CY+=3;wr(0x1B,A);if(FE)return 0xD9EA; // D9E8 STA
  case 0xD9EA:CY+=3;wr(0x2,A);if(FE)return 0xD9EC; // D9EA STA
  case 0xD9EC:CY+=3;wr(0x2A,A);if(FE)return 0xD9EE; // D9EC STA
  case 0xD9EE:CY+=3;wr(0x1C,A);if(FE)return 0xD9F0; // D9EE STA
  case 0xD9F0:CY+=5;t=R[0x16];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x16]=t; // D9F0 DEC
  CY+=2;if(fZ){CY+=2;pc=0xDA08;continue;} // D9F2 BEQ
  CY+=3;wr(0x2,A);if(FE)return 0xD9F6; // D9F4 STA
  case 0xD9F6:CY+=3;wr(0x2A,A);if(FE)return 0xD9F8; // D9F6 STA
  case 0xD9F8:CY+=3;wr(0x2,A);if(FE)return 0xD9FA; // D9F8 STA
  case 0xD9FA:CY+=3;wr(0x2A,A);if(FE)return 0xD9FC; // D9FA STA
  case 0xD9FC:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D9FC PLA
  CY+=3;wr(0xD,A);if(FE)return 0xD9FF; // D9FD STA
  case 0xD9FF:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // D9FF PLA
  CY+=3;wr(0xE,A);if(FE)return 0xDA02; // DA00 STA
  case 0xDA02:CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // DA02 PLA
  CY+=3;wr(0xF,A);if(FE)return 0xDA05; // DA03 STA
  case 0xDA05:CY+=3;pc=0xD9E6;continue; // DA05 JMP
  case 0xDA08:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // DA08 LDX
  CY+=2;SP=X; // DA0A TXS
  CY+=2;Y=0x1;fZ=(Y)===0;fN=(Y)>127; // DA0B LDY
  CY+=3;pc=0xD718;continue; // DA0D JMP
  case 0xDA10:CY+=3;wr(0x4,Y);if(FE)return 0xDA12; // DA10 STY
  case 0xDA12:CY+=3;wr(0x5,Y);if(FE)return 0xDA14; // DA12 STY
  case 0xDA14:CY+=3;wr(0x1B,Y);if(FE)return 0xDA16; // DA14 STY
  case 0xDA16:CY+=3;wr(0x1C,Y);if(FE)return 0xDA18; // DA16 STY
  case 0xDA18:CY+=3;wr(0x25,Y);if(FE)return 0xDA1A; // DA18 STY
  case 0xDA1A:CY+=3;wr(0x26,Y);if(FE)return 0xDA1C; // DA1A STY
  case 0xDA1C:CY+=2;fC=true; // DA1C SEC
  CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // DA1D LDA
  CY+=3;wr(0x2,A);if(FE)return 0xDA21; // DA1F STA
  case 0xDA21:CY+=3;wr(0x2A,A);if(FE)return 0xDA23; // DA21 STA
  case 0xDA23:CY+=2;sbc(0xF); // DA23 SBC
  CY+=2;if(fC){CY+=1;pc=0xDA23;continue;} // DA25 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // DA27 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DA29 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DA2A ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DA2B ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DA2C ASL
  CY+=3;wr(0x20,A);if(FE)return 0xDA2F; // DA2D STA
  case 0xDA2F:CY+=3;wr(0x10,A);if(FE)return 0xDA31; // DA2F STA
  case 0xDA31:CY+=3;wr(0x2,A);if(FE)return 0xDA33; // DA31 STA
  case 0xDA33:CY+=3;wr(0x2A,A);if(FE)return 0xDA35; // DA33 STA
  case 0xDA35:CY+=3;X=R[0x6A];fZ=(X)===0;fN=(X)>127; // DA35 LDX
  CY+=4;if((0xDEC9&255)+X>255) CY++;A=RB0[0xEC9+X];fZ=(A)===0;fN=(A)>127; // DA37 LDA
  CY+=3;sbc(R[0x39]); // DA3A SBC
  CY+=3;R[0xE]=A; // DA3C STA
  CY+=2;A=0xDD;fZ=(A)===0;fN=(A)>127; // DA3E LDA
  CY+=2;sbc(0x0); // DA40 SBC
  CY+=3;R[0xF]=A; // DA42 STA
  CY+=4;if((0xDFDF&255)+X>255) CY++;A=rd((0xDFDF+X));fZ=(A)===0;fN=(A)>127; // DA44 LDA
  CY+=3;sbc(R[0x39]); // DA47 SBC
  CY+=3;R[0x16]=A; // DA49 STA
  CY+=2;A=0xD0;fZ=(A)===0;fN=(A)>127; // DA4B LDA
  CY+=2;sbc(0x0); // DA4D SBC
  CY+=3;R[0x17]=A; // DA4F STA
  CY+=3;wr(0x2B,A);if(FE)return 0xDA53; // DA51 STA
  case 0xDA53:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // DA53 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // DA55 LSR
  CY+=2;if(!fC){CY+=1;pc=0xDA65;continue;} // DA56 BCC
  CY+=3;Y=R[0x4A];fZ=(Y)===0;fN=(Y)>127; // DA58 LDY
  CY+=4;if((0xDEDD&255)+Y>255) CY++;A=RB0[0xEDD+Y];fZ=(A)===0;fN=(A)>127; // DA5A LDA
  CY+=3;wr(0x2,A);if(FE)return 0xDA5F; // DA5D STA
  case 0xDA5F:CY+=3;wr(0x2A,A);if(FE)return 0xDA61; // DA5F STA
  case 0xDA61:CY+=2;Y=0xD0;fZ=(Y)===0;fN=(Y)>127; // DA61 LDY
  CY+=2;if(!fZ){CY+=1;pc=0xDA77;continue;} // DA63 BNE
  case 0xDA65:CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // DA65 BIT
  CY+=3;wr(0x2,A);if(FE)return 0xDA69; // DA67 STA
  case 0xDA69:CY+=3;wr(0x2A,A);if(FE)return 0xDA6B; // DA69 STA
  case 0xDA6B:CY+=2;if(fV){CY+=1;pc=0xDA73;continue;} // DA6B BVS
  CY+=2;A=0x8B;fZ=(A)===0;fN=(A)>127; // DA6D LDA
  CY+=2;Y=0xDD;fZ=(Y)===0;fN=(Y)>127; // DA6F LDY
  CY+=2;if(!fZ){CY+=1;pc=0xDA77;continue;} // DA71 BNE
  case 0xDA73:CY+=2;A=0x95;fZ=(A)===0;fN=(A)>127; // DA73 LDA
  CY+=2;Y=0xDD;fZ=(Y)===0;fN=(Y)>127; // DA75 LDY
  case 0xDA77:CY+=2;fC=true; // DA77 SEC
  CY+=3;sbc(R[0x3B]); // DA78 SBC
  CY+=3;R[0xC]=A; // DA7A STA
  CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // DA7C TYA
  CY+=2;sbc(0x0); // DA7D SBC
  CY+=3;R[0xD]=A; // DA7F STA
  CY+=3;A=R[0x43];fZ=(A)===0;fN=(A)>127; // DA81 LDA
  CY+=3;wr(0xB,A);if(FE)return 0xDA85; // DA83 STA
  case 0xDA85:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // DA85 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // DA87 LSR
  CY+=2;if(!fC){CY+=1;pc=0xDA8E;continue;} // DA88 BCC
  CY+=3;A=R[0x44];fZ=(A)===0;fN=(A)>127; // DA8A LDA
  CY+=3;wr(0xC,A);if(FE)return 0xDA8E; // DA8C STA
  case 0xDA8E:CY+=3;wr(0x2,A);if(FE)return 0xDA90; // DA8E STA
  case 0xDA90:CY+=3;wr(0x2A,A);if(FE)return 0xDA92; // DA90 STA
  case 0xDA92:CY+=3;A=R[0x37];fZ=(A)===0;fN=(A)>127; // DA92 LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // DA94 CMP
  CY+=2;if(fC){CY+=1;pc=0xDA9E;continue;} // DA96 BCS
  CY+=2;sbc(0x4); // DA98 SBC
  CY+=2;if(fC){CY+=1;pc=0xDA9E;continue;} // DA9A BCS
  CY+=2;adc(0xA5); // DA9C ADC
  case 0xDA9E:CY+=2;fC=true; // DA9E SEC
  CY+=3;wr(0x2,A);if(FE)return 0xDAA1; // DA9F STA
  case 0xDAA1:CY+=3;wr(0x2A,A);if(FE)return 0xDAA3; // DAA1 STA
  case 0xDAA3:CY+=2;sbc(0xF); // DAA3 SBC
  CY+=2;if(fC){CY+=1;pc=0xDAA3;continue;} // DAA5 BCS
  CY+=2;A^=0x7;fZ=(A)===0;fN=(A)>127; // DAA7 EOR
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DAA9 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DAAA ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DAAB ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // DAAC ASL
  CY+=3;wr(0x21,A);if(FE)return 0xDAAF; // DAAD STA
  case 0xDAAF:CY+=3;wr(0x11,A);if(FE)return 0xDAB1; // DAAF STA
  case 0xDAB1:CY+=3;wr(0x2,A);if(FE)return 0xDAB3; // DAB1 STA
  case 0xDAB3:CY+=3;wr(0x2A,A);if(FE)return 0xDAB5; // DAB3 STA
  case 0xDAB5:CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // DAB5 LDA
  CY+=3;wr(0x26,A);if(FE)return 0xDAB9; // DAB7 STA
  case 0xDAB9:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // DAB9 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // DABB LSR
  CY+=2;if(!fC){CY+=1;pc=0xDAC7;continue;} // DABC BCC
  CY+=3;Y=R[0x4A];fZ=(Y)===0;fN=(Y)>127; // DABE LDY
  CY+=4;if((0xDDFD&255)+Y>255) CY++;A=RB0[0xDFD+Y];fZ=(A)===0;fN=(A)>127; // DAC0 LDA
  CY+=2;X=0xDD;fZ=(X)===0;fN=(X)>127; // DAC3 LDX
  CY+=2;if(!fZ){CY+=1;pc=0xDACB;continue;} // DAC5 BNE
  case 0xDAC7:CY+=2;A=0xC2;fZ=(A)===0;fN=(A)>127; // DAC7 LDA
  CY+=2;X=0xDD;fZ=(X)===0;fN=(X)>127; // DAC9 LDX
  case 0xDACB:CY+=2;fC=true; // DACB SEC
  CY+=3;sbc(R[0x3B]); // DACC SBC
  CY+=3;R[0x14]=A; // DACE STA
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // DAD0 TXA
  CY+=2;sbc(0x0); // DAD1 SBC
  CY+=3;R[0x15]=A; // DAD3 STA
  CY+=3;wr(0x2B,A);if(FE)return 0xDAD7; // DAD5 STA
  case 0xDAD7:CY+=2;Y=0x79;fZ=(Y)===0;fN=(Y)>127; // DAD7 LDY
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DAD9 LDA
  case 0xDADB:CY+=3;R[0x79]=A; // DADB STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DADD LDA
  CY+=3;t=R[0x79];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // DADF BIT
  CY+=2;if(!fN){CY+=1;pc=0xDAE5;continue;} // DAE1 BPL
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // DAE3 LDA
  case 0xDAE5:CY+=3;wr(0x1C,A);if(FE)return 0xDAE7; // DAE5 STA
  case 0xDAE7:CY+=3;wr(0x2,A);if(FE)return 0xDAE9; // DAE7 STA
  case 0xDAE9:CY+=3;wr(0x2A,A);if(FE)return 0xDAEB; // DAE9 STA
  case 0xDAEB:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DAEB LDA
  CY+=2;if(!fV){CY+=1;pc=0xDAF1;continue;} // DAED BVC
  CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // DAEF LDA
  case 0xDAF1:CY+=3;wr(0x1B,A);if(FE)return 0xDAF3; // DAF1 STA
  case 0xDAF3:CY+=5;if(R[0x14]+Y>255) CY++;A=rd(((R[0x15]<<8|R[0x14])+Y));fZ=(A)===0;fN=(A)>127; // DAF3 LDA
  CY+=3;wr(0x7,A);if(FE)return 0xDAF7; // DAF5 STA
  case 0xDAF7:CY+=5;if(R[0x16]+Y>255) CY++;A=rd(((R[0x17]<<8|R[0x16])+Y));fZ=(A)===0;fN=(A)>127; // DAF7 LDA
  CY+=3;wr(0x6,A);if(FE)return 0xDAFB; // DAF9 STA
  case 0xDAFB:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // DAFB DEY
  CY+=3;t=R[0x3E];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DAFC CPY
  CY+=2;if(fZ){CY+=1;pc=0xDB45;continue;} // DAFE BEQ
  CY+=3;A=R[0x79];fZ=(A)===0;fN=(A)>127; // DB00 LDA
  CY+=2;if(fV){CY+=1;pc=0xDB0C;continue;} // DB02 BVS
  CY+=3;t=R[0x38];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DB04 CPY
  CY+=2;if(!fZ){CY+=1;pc=0xDB12;continue;} // DB06 BNE
  CY+=2;A|=0x40;fZ=(A)===0;fN=(A)>127; // DB08 ORA
  CY+=2;if(!fZ){CY+=1;pc=0xDB12;continue;} // DB0A BNE
  case 0xDB0C:CY+=3;t=R[0x39];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DB0C CPY
  CY+=2;if(!fZ){CY+=1;pc=0xDB12;continue;} // DB0E BNE
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // DB10 AND
  case 0xDB12:CY+=3;R[0x79]=A; // DB12 STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DB14 LDA
  CY+=3;t=R[0x79];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // DB16 BIT
  CY+=2;if(!fN){CY+=1;pc=0xDB1C;continue;} // DB18 BPL
  CY+=5;if(R[0xC]+Y>255) CY++;A=rd(((R[0xD]<<8|R[0xC])+Y));fZ=(A)===0;fN=(A)>127; // DB1A LDA
  case 0xDB1C:CY+=3;wr(0x1C,A);if(FE)return 0xDB1E; // DB1C STA
  case 0xDB1E:CY+=3;wr(0x2,A);if(FE)return 0xDB20; // DB1E STA
  case 0xDB20:CY+=3;wr(0x2A,A);if(FE)return 0xDB22; // DB20 STA
  case 0xDB22:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DB22 LDA
  CY+=2;if(!fV){CY+=1;pc=0xDB28;continue;} // DB24 BVC
  CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // DB26 LDA
  case 0xDB28:CY+=3;wr(0x1B,A);if(FE)return 0xDB2A; // DB28 STA
  case 0xDB2A:CY+=5;if(R[0x16]+Y>255) CY++;A=rd(((R[0x17]<<8|R[0x16])+Y));fZ=(A)===0;fN=(A)>127; // DB2A LDA
  CY+=3;wr(0x6,A);if(FE)return 0xDB2E; // DB2C STA
  case 0xDB2E:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // DB2E DEY
  CY+=3;t=R[0x3E];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DB2F CPY
  CY+=2;if(fZ){CY+=1;pc=0xDB45;continue;} // DB31 BEQ
  CY+=3;A=R[0x79];fZ=(A)===0;fN=(A)>127; // DB33 LDA
  CY+=3;t=R[0x3A];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DB35 CPY
  CY+=2;if(!fZ){CY+=1;pc=0xDB3D;continue;} // DB37 BNE
  CY+=2;A|=0x80;fZ=(A)===0;fN=(A)>127; // DB39 ORA
  CY+=2;if(fN){CY+=2;pc=0xDADB;continue;} // DB3B BMI
  case 0xDB3D:CY+=3;t=R[0x3B];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DB3D CPY
  CY+=2;if(!fZ){CY+=2;pc=0xDADB;continue;} // DB3F BNE
  CY+=2;A&=0x7F;fZ=(A)===0;fN=(A)>127; // DB41 AND
  CY+=2;if(!fN){CY+=2;pc=0xDADB;continue;} // DB43 BPL
  case 0xDB45:CY+=2;A=0xE4;fZ=(A)===0;fN=(A)>127; // DB45 LDA
  CY+=3;wr(0x2,A);if(FE)return 0xDB49; // DB47 STA
  case 0xDB49:CY+=3;wr(0x2A,A);if(FE)return 0xDB4B; // DB49 STA
  case 0xDB4B:CY+=3;wr(0x9,A);if(FE)return 0xDB4D; // DB4B STA
  case 0xDB4D:CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // DB4D LDX
  CY+=3;wr(0x1C,X);if(FE)return 0xDB51; // DB4F STX
  case 0xDB51:CY+=3;wr(0x1B,X);if(FE)return 0xDB53; // DB51 STX
  case 0xDB53:CY+=3;wr(0x26,X);if(FE)return 0xDB55; // DB53 STX
  case 0xDB55:CY+=3;wr(0x2,A);if(FE)return 0xDB57; // DB55 STA
  case 0xDB57:CY+=3;wr(0x2A,A);if(FE)return 0xDB59; // DB57 STA
  case 0xDB59:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // DB59 DEY
  CY+=2;if(!fZ){CY+=1;pc=0xDB55;continue;} // DB5A BNE
  CY+=3;pc=0xDA08;continue; // DB5C JMP
  case 0xDB96:CY+=4;if((0xDF9F&255)+Y>255) CY++;A=rd((0xDF9F+Y));fZ=(A)===0;fN=(A)>127; // DB96 LDA
  CY+=3;R[0xE]=A; // DB99 STA
  CY+=3;R[0x7A]=X; // DB9B STX
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // DB9D LDX
  CY+=2;Y=0x1D;fZ=(Y)===0;fN=(Y)>127; // DB9F LDY
  case 0xDBA1:CY+=5;if(R[0xE]+Y>255) CY++;A=rd(((R[0xF]<<8|R[0xE])+Y));fZ=(A)===0;fN=(A)>127; // DBA1 LDA
  CY+=2;if(fZ){CY+=1;pc=0xDBA6;continue;} // DBA3 BEQ
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // DBA5 INX
  case 0xDBA6:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // DBA6 DEY
  CY+=3;t=R[0xC];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DBA7 CPY
  CY+=2;if(fZ){CY+=1;pc=0xDBAF;continue;} // DBA9 BEQ
  CY+=3;t=R[0x7A];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DBAB CPY
  CY+=2;if(!fZ){CY+=1;pc=0xDBA1;continue;} // DBAD BNE
  case 0xDBAF:CY+=3;R[0xD]=X; // DBAF STX
  CY+=3;X=R[0x7B];fZ=(X)===0;fN=(X)>127; // DBB1 LDX
  CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // DBB3 BIT
  CY+=2;if(fN){CY+=1;pc=0xDBD9;continue;} // DBB5 BMI
  CY+=4;A=R[0x60+X&127];fZ=(A)===0;fN=(A)>127; // DBB7 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xDBD9;continue;} // DBB9 BNE
  CY+=4;A=R[0x6C+X&127];fZ=(A)===0;fN=(A)>127; // DBBB LDA
  CY+=2;if(!fZ){CY+=1;pc=0xDBD9;continue;} // DBBD BNE
  CY+=5;t=R[0x73];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x73]=t; // DBBF INC
  CY+=3;A=R[0x73];fZ=(A)===0;fN=(A)>127; // DBC1 LDA
  CY+=2;t=0x20;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // DBC3 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xDBD9;continue;} // DBC5 BNE
  CY+=2;A=0xC0;fZ=(A)===0;fN=(A)>127; // DBC7 LDA
  CY+=3;R[0x67]=A; // DBC9 STA
  CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // DBCB LDA
  CY+=3;R[0x6A]=A; // DBCD STA
  CY+=2;A=0x9;fZ=(A)===0;fN=(A)>127; // DBCF LDA
  CY+=3;R[0x68]=A; // DBD1 STA
  CY+=2;A=0x7;fZ=(A)===0;fN=(A)>127; // DBD3 LDA
  CY+=3;R[0x70]=A; // DBD5 STA
  CY+=2;if(!fN){CY+=2;pc=0xDC02;continue;} // DBD7 BPL
  case 0xDBD9:CY+=4;A=R[0x62+X&127];fZ=(A)===0;fN=(A)>127; // DBD9 LDA
  CY+=2;if(fN){CY+=1;pc=0xDBE4;continue;} // DBDB BMI
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // DBDD LDA
  CY+=2;fC=true; // DBDF SEC
  CY+=3;sbc(R[0xD]); // DBE0 SBC
  CY+=3;R[0xD]=A; // DBE2 STA
  case 0xDBE4:CY+=2;fC=false; // DBE4 CLC
  CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // DBE5 LDA
  CY+=3;adc(R[0xD]); // DBE7 ADC
  CY+=3;R[0x5D]=A; // DBE9 STA
  CY+=3;A=R[0x66];fZ=(A)===0;fN=(A)>127; // DBEB LDA
  CY+=2;t=0x71;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // DBED CMP
  CY+=2;if(fC){CY+=2;pc=0xDC02;continue;} // DBEF BCS
  CY+=4;Y=R[0x60+X&127];fZ=(Y)===0;fN=(Y)>127; // DBF1 LDY
  CY+=4;if((0xDDF0&255)+Y>255) CY++;A=RB0[0xDF0+Y];fZ=(A)===0;fN=(A)>127; // DBF3 LDA
  CY+=3;Y=R[0x66];fZ=(Y)===0;fN=(Y)>127; // DBF6 LDY
  CY+=2;t=0x58;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // DBF8 CPY
  CY+=2;if(!fC){CY+=1;pc=0xDBFD;continue;} // DBFA BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // DBFC LSR
  case 0xDBFD:CY+=2;fC=false; // DBFD CLC
  CY+=3;adc(R[0x66]); // DBFE ADC
  CY+=3;R[0x75]=A; // DC00 STA
  case 0xDC02:CY+=3;pc=0xDFEC;continue; // DC02 JMP
  case 0xDFEC:CY+=4;BK=1;if(BK!==0)return 0xFFEF; // DFEC STA
  case 0xDFEF:CY+=3;pc=0xDB96;continue; // DFEF JMP
  case 0xDFF2:CY+=4;BK=1;if(BK!==0)return 0xFFF5; // DFF2 STA
  case 0xDFF5:CY+=3;pc=0xD066;continue; // DFF5 JMP
  default:throw new Error("no entry "+pc.toString(16)+" in bank 0");}}}
  function bank1(pc){for(;;){switch(pc){
  case 0xF003:CY+=2;fI=true; // F003 SEI
  CY+=2;fD=false; // F004 CLD
  CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // F005 LDX
  CY+=2;SP=X; // F007 TXS
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F008 LDA
  case 0xF00A:CY+=4;wr((0x2+X&255),A);if(FE)return 0xF00C; // F00A STA
  case 0xF00C:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F00C DEX
  CY+=2;if(!fZ){CY+=1;pc=0xF00A;continue;} // F00D BNE
  CY+=6;push(0xF0);push(0x11);pc=0xFD9A;continue; // F00F JSR
  case 0xF012:CY+=3;X=R[0x1E];fZ=(X)===0;fN=(X)>127; // F012 LDX
  CY+=2;if(fN){CY+=1;pc=0xF02E;continue;} // F014 BMI
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F016 LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F018 INY
  CY+=2;if(fZ){CY+=1;pc=0xF023;continue;} // F019 BEQ
  CY+=3;A=R[0x1B];fZ=(A)===0;fN=(A)>127; // F01B LDA
  CY+=2;if(fZ){CY+=1;pc=0xF02E;continue;} // F01D BEQ
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F01F CMP
  CY+=2;if(fZ){CY+=1;pc=0xF02E;continue;} // F021 BEQ
  case 0xF023:CY+=3;R[0x1B]=X; // F023 STX
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F025 LDA
  CY+=3;R[0x1A]=A; // F027 STA
  CY+=4;if((0xFF73&255)+X>255) CY++;A=rd((0xFF73+X));fZ=(A)===0;fN=(A)>127; // F029 LDA
  CY+=3;R[0x19]=A; // F02C STA
  case 0xF02E:CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // F02E LDA
  CY+=2;if(fN){CY+=1;pc=0xF086;continue;} // F030 BMI
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F032 LDY
  CY+=2;if(!fN){CY+=1;pc=0xF03D;continue;} // F034 BPL
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F036 INY
  CY+=3;wr(0x19,Y);if(FE)return 0xF039; // F037 STY
  case 0xF039:CY+=3;wr(0x1A,Y);if(FE)return 0xF03B; // F039 STY
  case 0xF03B:CY+=2;if(!fN){CY+=1;pc=0xF086;continue;} // F03B BPL
  case 0xF03D:CY+=5;t=R[0x1A];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x1A]=t; // F03D DEC
  CY+=2;if(!fN){CY+=1;pc=0xF086;continue;} // F03F BPL
  CY+=3;X=R[0x1B];fZ=(X)===0;fN=(X)>127; // F041 LDX
  CY+=4;if((0xFF86&255)+X>255) CY++;A=rd((0xFF86+X));fZ=(A)===0;fN=(A)>127; // F043 LDA
  CY+=3;R[0x1A]=A; // F046 STA
  CY+=4;if((0xFF90&255)+X>255) CY++;A=rd((0xFF90+X));fZ=(A)===0;fN=(A)>127; // F048 LDA
  CY+=3;wr(0x15,A);if(FE)return 0xF04D; // F04B STA
  case 0xF04D:CY+=2;t=0x8;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F04D CPX
  CY+=2;if(fC){CY+=1;pc=0xF076;continue;} // F04F BCS
  CY+=4;if((0xFF7C&255)+X>255) CY++;A=rd((0xFF7C+X));fZ=(A)===0;fN=(A)>127; // F051 LDA
  CY+=3;wr(0x19,A);if(FE)return 0xF056; // F054 STA
  case 0xF056:CY+=5;t=R[0x19];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x19]=t; // F056 DEC
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F058 LDY
  CY+=2;if(!fN){CY+=1;pc=0xF063;continue;} // F05A BPL
  CY+=3;R[0x1B]=Y; // F05C STY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F05E INY
  CY+=3;wr(0x19,Y);if(FE)return 0xF061; // F05F STY
  case 0xF061:CY+=2;if(!fN){CY+=1;pc=0xF086;continue;} // F061 BPL
  case 0xF063:CY+=4;if((0xFF9A&255)+X>255) CY++;A=rd((0xFF9A+X));fZ=(A)===0;fN=(A)>127; // F063 LDA
  CY+=3;R[0x16]=A; // F066 STA
  CY+=2;A=0xFF;fZ=(A)===0;fN=(A)>127; // F068 LDA
  CY+=3;R[0x17]=A; // F06A STA
  CY+=5;if(R[0x16]+Y>255) CY++;A=rd(((R[0x17]<<8|R[0x16])+Y));fZ=(A)===0;fN=(A)>127; // F06C LDA
  CY+=3;wr(0x17,A);if(FE)return 0xF070; // F06E STA
  case 0xF070:CY+=2;if(!fZ){CY+=1;pc=0xF086;continue;} // F070 BNE
  CY+=3;wr(0x19,A);if(FE)return 0xF074; // F072 STA
  case 0xF074:CY+=2;if(fZ){CY+=1;pc=0xF086;continue;} // F074 BEQ
  case 0xF076:CY+=5;t=R[0x1C];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x1C]=t; // F076 DEC
  CY+=3;A=R[0x1C];fZ=(A)===0;fN=(A)>127; // F078 LDA
  CY+=3;wr(0x19,A);if(FE)return 0xF07C; // F07A STA
  case 0xF07C:CY+=2;t=0x9;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F07C CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF056;continue;} // F07E BNE
  CY+=5;t=R[0x19];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x19]=t; // F080 DEC
  CY+=2;A=0x1B;fZ=(A)===0;fN=(A)>127; // F082 LDA
  CY+=3;wr(0x17,A);if(FE)return 0xF086; // F084 STA
  case 0xF086:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // F086 LDX
  CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // F088 LDA
  CY+=2;if(fN){CY+=1;pc=0xF08F;continue;} // F08A BMI
  CY+=4;X=rd(0x280);fZ=(X)===0;fN=(X)>127; // F08C LDX
  case 0xF08F:CY+=3;R[0x1D]=X; // F08F STX
  CY+=4;A=rd(0x282);fZ=(A)===0;fN=(A)>127; // F091 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F094 LSR
  CY+=2;if(!fC){CY+=1;pc=0xF0B7;continue;} // F095 BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F097 LSR
  CY+=2;if(fC){CY+=1;pc=0xF0BA;continue;} // F098 BCS
  CY+=6;push(0xF0);push(0x9C);pc=0xFD9A;continue; // F09A JSR
  case 0xF09D:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F09D LDA
  CY+=2;A&=0x7F;fZ=(A)===0;fN=(A)>127; // F09F AND
  CY+=3;R[0x0]=A; // F0A1 STA
  CY+=2;A&=0x1F;fZ=(A)===0;fN=(A)>127; // F0A3 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF0BA;continue;} // F0A5 BNE
  CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // F0A7 LDA
  CY+=2;A^=0x1;fZ=(A)===0;fN=(A)>127; // F0A9 EOR
  CY+=3;R[0x18]=A; // F0AB STA
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F0AD LDX
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F0AF LSR
  CY+=2;if(!fC){CY+=1;pc=0xF0B3;continue;} // F0B0 BCC
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F0B2 INX
  case 0xF0B3:CY+=3;R[0x8]=X; // F0B3 STX
  CY+=2;if(!fZ){CY+=1;pc=0xF0BA;continue;} // F0B5 BNE
  case 0xF0B7:CY+=6;push(0xF0);push(0xB9);pc=0xFD86;continue; // F0B7 JSR
  case 0xF0BA:CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F0BA BIT
  CY+=2;if(!fN){CY+=1;pc=0xF0DF;continue;} // F0BC BPL
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F0BE BIT
  CY+=2;if(!fN){CY+=1;pc=0xF0B7;continue;} // F0C0 BPL
  CY+=3;X=R[0x0];fZ=(X)===0;fN=(X)>127; // F0C2 LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F0C4 INX
  CY+=2;if(!fZ){CY+=1;pc=0xF0D3;continue;} // F0C5 BNE
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F0C7 LDA
  CY+=3;R[0xA]=A; // F0C9 STA
  CY+=3;X=R[0x9];fZ=(X)===0;fN=(X)>127; // F0CB LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F0CD INX
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // F0CE TXA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F0CF AND
  CY+=3;R[0x9]=A; // F0D1 STA
  case 0xF0D3:CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // F0D3 LDA
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // F0D5 AND
  CY+=3;t=R[0x0];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F0D7 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF0DD;continue;} // F0D9 BPL
  CY+=2;A|=0x40;fZ=(A)===0;fN=(A)>127; // F0DB ORA
  case 0xF0DD:CY+=3;R[0x18]=A; // F0DD STA
  case 0xF0DF:CY+=2;X=0xFF;fZ=(X)===0;fN=(X)>127; // F0DF LDX
  CY+=3;R[0x1E]=X; // F0E1 STX
  CY+=3;X=R[0x9];fZ=(X)===0;fN=(X)>127; // F0E3 LDX
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F0E5 LDA
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F0E7 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF0F3;continue;} // F0E9 BNE
  CY+=3;t=R[0x4B];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F0EB BIT
  CY+=2;if(fN){CY+=2;pc=0xF120;continue;} // F0ED BMI
  CY+=2;A&=0x1F;fZ=(A)===0;fN=(A)>127; // F0EF AND
  CY+=2;if(!fN){CY+=1;pc=0xF0F5;continue;} // F0F1 BPL
  case 0xF0F3:CY+=2;A&=0x3F;fZ=(A)===0;fN=(A)>127; // F0F3 AND
  case 0xF0F5:CY+=2;if(!fZ){CY+=2;pc=0xF120;continue;} // F0F5 BNE
  CY+=6;push(0xF0);push(0xF9);pc=0xFBD6;continue; // F0F7 JSR
  case 0xF0FA:CY+=3;A=R[0x6];fZ=(A)===0;fN=(A)>127; // F0FA LDA
  CY+=2;if(!fZ){CY+=2;pc=0xF105;continue;} // F0FC BNE
  CY+=3;A=R[0x7];fZ=(A)===0;fN=(A)>127; // F0FE LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF105;continue;} // F100 BNE
  CY+=6;push(0xF1);push(0x4);pc=0xFD9A;continue; // F102 JSR
  case 0xF105:CY+=3;X=R[0x9];fZ=(X)===0;fN=(X)>127; // F105 LDX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F107 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xF120;continue;} // F108 BNE
  CY+=3;A=R[0xB];fZ=(A)===0;fN=(A)>127; // F10A LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF112;continue;} // F10C BNE
  CY+=3;t=R[0x0];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F10E BIT
  CY+=2;if(fV){CY+=1;pc=0xF120;continue;} // F110 BVS
  case 0xF112:CY+=5;t=R[0x63];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x63]=t; // F112 DEC
  CY+=2;if(!fZ){CY+=1;pc=0xF120;continue;} // F114 BNE
  CY+=5;t=R[0x8];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // F116 DEC
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F118 LDX
  CY+=3;R[0x6A]=X; // F11A STX
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // F11C LDA
  CY+=3;R[0x6B]=A; // F11E STA
  case 0xF120:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // F120 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF170;continue;} // F122 BNE
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F124 LDX
  case 0xF126:CY+=6;t=R[0x6C+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x6C+X&127]=t; // F126 INC
  CY+=4;A=R[0x6C+X&127];fZ=(A)===0;fN=(A)>127; // F128 LDA
  CY+=4;t=R[0x5B+X&127];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F12A CMP
  CY+=2;if(!fC){CY+=1;pc=0xF166;continue;} // F12C BCC
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F12E LDA
  CY+=4;R[0x6C+X&127]=A; // F130 STA
  CY+=4;Y=R[0x60+X&127];fZ=(Y)===0;fN=(Y)>127; // F132 LDY
  CY+=2;if(fN){CY+=1;pc=0xF13A;continue;} // F134 BMI
  CY+=2;t=0x7;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // F136 CPY
  CY+=2;if(fN){CY+=1;pc=0xF13C;continue;} // F138 BMI
  case 0xF13A:CY+=2;Y=0x1;fZ=(Y)===0;fN=(Y)>127; // F13A LDY
  case 0xF13C:CY+=3;A=R[0x6E];fZ=(A)===0;fN=(A)>127; // F13C LDA
  CY+=4;if((0xFFFA&255)+X>255) CY++;A&=rd((0xFFFA+X));fZ=(A)===0;fN=(A)>127; // F13E AND
  CY+=3;push(A);if(FE)return 0xF142; // F141 PHA
  case 0xF142:CY+=4;A=R[0x62+X&127];fZ=(A)===0;fN=(A)>127; // F142 LDA
  CY+=3;R[0x7A]=X; // F144 STX
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // F146 TAX
  CY+=4;A=pull();fZ=(A)===0;fN=(A)>127; // F147 PLA
  CY+=6;push(0xF1);push(0x4A);pc=0xFDBC;continue; // F148 JSR
  case 0xF14B:CY+=3;R[0x7B]=X; // F14B STX
  CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // F14D LDX
  CY+=4;R[0x60+X&127]=Y; // F14F STY
  CY+=3;Y=R[0x7B];fZ=(Y)===0;fN=(Y)>127; // F151 LDY
  CY+=4;R[0x62+X&127]=Y; // F153 STY
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // F155 TAY
  CY+=2;if(fZ){CY+=1;pc=0xF15F;continue;} // F156 BEQ
  CY+=3;A=R[0x6E];fZ=(A)===0;fN=(A)>127; // F158 LDA
  CY+=4;if((0xFFFA&255)+X>255) CY++;A|=rd((0xFFFA+X));fZ=(A)===0;fN=(A)>127; // F15A ORA
  CY+=2;if(!fZ){CY+=1;pc=0xF164;continue;} // F15D BNE
  case 0xF15F:CY+=3;A=R[0x6E];fZ=(A)===0;fN=(A)>127; // F15F LDA
  CY+=4;if((0xFED6&255)+X>255) CY++;A&=RB1[0xED6+X];fZ=(A)===0;fN=(A)>127; // F161 AND
  case 0xF164:CY+=3;R[0x6E]=A; // F164 STA
  case 0xF166:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F166 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF126;continue;} // F167 BPL
  CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // F169 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF1C0;continue;} // F16B BEQ
  CY+=3;pc=0xF674;continue; // F16D JMP
  case 0xF170:CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F170 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF177;continue;} // F172 BNE
  CY+=3;pc=0xF4DB;continue; // F174 JMP
  case 0xF177:CY+=2;t=0x3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F177 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF17E;continue;} // F179 BNE
  CY+=3;pc=0xF3A4;continue; // F17B JMP
  case 0xF17E:CY+=3;t=R[0x44];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F17E BIT
  CY+=2;if(fN){CY+=1;pc=0xF1B5;continue;} // F180 BMI
  CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F182 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF1B5;continue;} // F184 BNE
  CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F186 LDX
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F188 LDA
  CY+=3;Y=R[0xB];fZ=(Y)===0;fN=(Y)>127; // F18A LDY
  CY+=2;if(fZ){CY+=1;pc=0xF198;continue;} // F18C BEQ
  CY+=2;t=0x60;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F18E CPX
  CY+=2;if(fC){CY+=1;pc=0xF198;continue;} // F190 BCS
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F192 AND
  CY+=2;if(fZ){CY+=1;pc=0xF1B5;continue;} // F194 BEQ
  CY+=2;if(!fZ){CY+=1;pc=0xF1A2;continue;} // F196 BNE
  case 0xF198:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F198 LSR
  CY+=2;if(fC){CY+=1;pc=0xF1B5;continue;} // F199 BCS
  CY+=2;t=0x78;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F19B CPX
  CY+=2;if(!fC){CY+=1;pc=0xF1A2;continue;} // F19D BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F19F LSR
  CY+=2;if(fC){CY+=1;pc=0xF1B5;continue;} // F1A0 BCS
  case 0xF1A2:CY+=6;push(0xF1);push(0xA4);pc=0xFE3A;continue; // F1A2 JSR
  case 0xF1A5:CY+=2;t=0xFE;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F1A5 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF1B2;continue;} // F1A7 BNE
  CY+=2;A=0x1F;fZ=(A)===0;fN=(A)>127; // F1A9 LDA
  CY+=2;X=0x12;fZ=(X)===0;fN=(X)>127; // F1AB LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F1AD LDY
  CY+=3;R[0x79]=Y; // F1AF STY
  CY+=7;push(0xF1);push(0xB3);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F1B1 BRK
  case 0xF1B2:CY+=6;push(0xF1);push(0xB4);pc=0xFE44;continue; // F1B2 JSR
  case 0xF1B5:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F1B5 LDA
  CY+=2;if(!fZ){CY+=2;pc=0xF21F;continue;} // F1B7 BNE
  CY+=3;A=R[0x8];fZ=(A)===0;fN=(A)>127; // F1B9 LDA
  CY+=2;if(!fN){CY+=1;pc=0xF1C3;continue;} // F1BB BPL
  CY+=6;push(0xF1);push(0xBF);pc=0xFD9A;continue; // F1BD JSR
  case 0xF1C0:CY+=3;pc=0xF6F6;continue; // F1C0 JMP
  case 0xF1C3:CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F1C3 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF1CA;continue;} // F1C5 BPL
  CY+=3;pc=0xF250;continue; // F1C7 JMP
  case 0xF1CA:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F1CA LDA
  CY+=2;A&=0x1;fZ=(A)===0;fN=(A)>127; // F1CC AND
  CY+=2;if(!fZ){CY+=2;pc=0xF209;continue;} // F1CE BNE
  CY+=3;R[0x44]=A; // F1D0 STA
  CY+=3;A=R[0x39];fZ=(A)===0;fN=(A)>127; // F1D2 LDA
  CY+=2;adc(0x16); // F1D4 ADC
  CY+=3;R[0x38]=A; // F1D6 STA
  CY+=3;A=R[0x1D];fZ=(A)===0;fN=(A)>127; // F1D8 LDA
  CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F1DA LDX
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F1DC ASL
  CY+=2;if(!fC){CY+=1;pc=0xF1FB;continue;} // F1DD BCC
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F1DF ASL
  CY+=2;if(!fC){CY+=2;pc=0xF202;continue;} // F1E0 BCC
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F1E2 ASL
  CY+=2;if(fC){CY+=1;pc=0xF1F5;continue;} // F1E3 BCS
  CY+=3;A=R[0x39];fZ=(A)===0;fN=(A)>127; // F1E5 LDA
  CY+=2;adc(0xE); // F1E7 ADC
  CY+=3;R[0x38]=A; // F1E9 STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F1EB LDA
  CY+=3;R[0x6A]=A; // F1ED STA
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F1EF LDA
  CY+=3;R[0x44]=A; // F1F1 STA
  CY+=2;if(fN){CY+=2;pc=0xF209;continue;} // F1F3 BMI
  case 0xF1F5:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F1F5 LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F1F7 AND
  CY+=2;if(!fZ){CY+=2;pc=0xF209;continue;} // F1F9 BNE
  case 0xF1FB:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F1FB INX
  CY+=2;t=0x98;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F1FC CPX
  CY+=2;if(fC){CY+=1;pc=0xF209;continue;} // F1FE BCS
  CY+=2;if(!fC){CY+=1;pc=0xF207;continue;} // F200 BCC
  case 0xF202:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F202 DEX
  CY+=2;t=0x50;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F203 CPX
  CY+=2;if(!fC){CY+=1;pc=0xF209;continue;} // F205 BCC
  case 0xF207:CY+=3;R[0x5D]=X; // F207 STX
  case 0xF209:CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F209 BIT
  CY+=2;if(fN){CY+=1;pc=0xF25C;continue;} // F20B BMI
  CY+=3;t=R[0x44];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F20D BIT
  CY+=2;if(fN){CY+=1;pc=0xF25C;continue;} // F20F BMI
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F211 LDA
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F213 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF21D;continue;} // F215 BPL
  CY+=2;A&=0xFD;fZ=(A)===0;fN=(A)>127; // F217 AND
  CY+=3;R[0x3D]=A; // F219 STA
  CY+=2;if(!fN){CY+=1;pc=0xF25C;continue;} // F21B BPL
  case 0xF21D:CY+=2;A&=0x2;fZ=(A)===0;fN=(A)>127; // F21D AND
  case 0xF21F:CY+=2;if(!fZ){CY+=1;pc=0xF25C;continue;} // F21F BNE
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // F221 LDX
  CY+=3;R[0x3D]=X; // F223 STX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F225 INX
  CY+=3;R[0x1E]=X; // F226 STX
  CY+=3;A=R[0x1D];fZ=(A)===0;fN=(A)>127; // F228 LDA
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F22A ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F22B ASL
  CY+=2;if(!fC){CY+=1;pc=0xF244;continue;} // F22C BCC
  case 0xF22E:CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F22E ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F22F ASL
  CY+=3;A=R[0x38];fZ=(A)===0;fN=(A)>127; // F230 LDA
  CY+=2;if(!fC){CY+=1;pc=0xF240;continue;} // F232 BCC
  CY+=2;adc(0xE); // F234 ADC
  case 0xF236:CY+=3;R[0x3C]=A; // F236 STA
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F238 LDA
  CY+=2;A|=0xC0;fZ=(A)===0;fN=(A)>127; // F23A ORA
  CY+=3;R[0x3D]=A; // F23C STA
  CY+=2;if(fN){CY+=1;pc=0xF25C;continue;} // F23E BMI
  case 0xF240:CY+=2;adc(0x14); // F240 ADC
  CY+=2;if(!fZ){CY+=1;pc=0xF236;continue;} // F242 BNE
  case 0xF244:CY+=2;Y=0x3;fZ=(Y)===0;fN=(Y)>127; // F244 LDY
  CY+=3;R[0x3D]=Y; // F246 STY
  CY+=2;if(!fC){CY+=1;pc=0xF22E;continue;} // F248 BCC
  case 0xF24A:CY+=6;push(0xF2);push(0x4C);pc=0xFCA9;continue; // F24A JSR
  case 0xF24D:CY+=3;pc=0xF25C;continue; // F24D JMP
  case 0xF250:CY+=2;if(fV){CY+=1;pc=0xF24A;continue;} // F250 BVS
  CY+=3;A=R[0x3E];fZ=(A)===0;fN=(A)>127; // F252 LDA
  CY+=2;fC=false; // F254 CLC
  CY+=2;adc(0x16); // F255 ADC
  CY+=3;R[0x3C]=A; // F257 STA
  CY+=6;push(0xF2);push(0x5B);pc=0xFC42;continue; // F259 JSR
  case 0xF25C:CY+=3;A=R[0xB];fZ=(A)===0;fN=(A)>127; // F25C LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF266;continue;} // F25E BNE
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F260 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F262 AND
  CY+=2;if(fZ){CY+=1;pc=0xF2AD;continue;} // F264 BEQ
  case 0xF266:CY+=3;X=R[0x37];fZ=(X)===0;fN=(X)>127; // F266 LDX
  CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // F268 LDA
  CY+=2;t=0x60;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F26A CMP
  CY+=2;if(fC){CY+=1;pc=0xF274;continue;} // F26C BCS
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F26E LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F270 LSR
  CY+=2;if(fC){CY+=1;pc=0xF274;continue;} // F271 BCS
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F273 INX
  case 0xF274:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F274 INX
  CY+=2;t=0xA2;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F275 CPX
  CY+=2;if(!fC){CY+=1;pc=0xF2AB;continue;} // F277 BCC
  CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F279 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF2AD;continue;} // F27B BNE
  CY+=5;t=R[0x46];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x46]=t; // F27D INC
  CY+=3;A=R[0x46];fZ=(A)===0;fN=(A)>127; // F27F LDA
  CY+=2;t=0x11;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F281 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF295;continue;} // F283 BNE
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F285 LDA
  CY+=2;X=0x5;fZ=(X)===0;fN=(X)>127; // F287 LDX
  CY+=6;push(0xF2);push(0x8B);pc=0xFDEA;continue; // F289 JSR
  case 0xF28C:CY+=5;t=R[0x9];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x9]=t; // F28C INC
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F28E LDA
  CY+=3;R[0xA]=A; // F290 STA
  CY+=3;pc=0xF365;continue; // F292 JMP
  case 0xF295:CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // F295 LDX
  CY+=3;R[0x40]=X; // F297 STX
  CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F299 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F29B AND
  CY+=2;if(!fZ){CY+=1;pc=0xF2A5;continue;} // F29D BNE
  CY+=3;A=R[0x3F];fZ=(A)===0;fN=(A)>127; // F29F LDA
  CY+=2;A|=0x40;fZ=(A)===0;fN=(A)>127; // F2A1 ORA
  CY+=2;if(!fZ){CY+=1;pc=0xF2A9;continue;} // F2A3 BNE
  case 0xF2A5:CY+=3;A=R[0x3F];fZ=(A)===0;fN=(A)>127; // F2A5 LDA
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // F2A7 AND
  case 0xF2A9:CY+=3;R[0x3F]=A; // F2A9 STA
  case 0xF2AB:CY+=3;R[0x37]=X; // F2AB STX
  case 0xF2AD:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F2AD LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F2AF LSR
  CY+=2;if(fC){CY+=1;pc=0xF2FC;continue;} // F2B0 BCS
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F2B2 LSR
  CY+=2;if(fC){CY+=1;pc=0xF2FC;continue;} // F2B3 BCS
  CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F2B5 BIT
  CY+=2;if(!fN){CY+=2;pc=0xF306;continue;} // F2B7 BPL
  CY+=3;X=R[0xB];fZ=(X)===0;fN=(X)>127; // F2B9 LDX
  CY+=2;if(fZ){CY+=1;pc=0xF2CA;continue;} // F2BB BEQ
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F2BD CPX
  CY+=2;if(fC){CY+=1;pc=0xF2C3;continue;} // F2BF BCS
  CY+=2;if(!fV){CY+=1;pc=0xF2CA;continue;} // F2C1 BVC
  case 0xF2C3:CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F2C3 LSR
  CY+=2;if(fC){CY+=1;pc=0xF2CA;continue;} // F2C4 BCS
  CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // F2C6 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF2CC;continue;} // F2C8 BNE
  case 0xF2CA:CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // F2CA LDA
  case 0xF2CC:CY+=6;push(0xF2);push(0xCE);pc=0xFD77;continue; // F2CC JSR
  case 0xF2CF:CY+=3;A=R[0x3A];fZ=(A)===0;fN=(A)>127; // F2CF LDA
  CY+=2;fC=true; // F2D1 SEC
  CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F2D2 BIT
  CY+=2;if(!fV){CY+=1;pc=0xF2EA;continue;} // F2D4 BVC
  CY+=3;sbc(R[0x3E]); // F2D6 SBC
  CY+=3;X=R[0xB];fZ=(X)===0;fN=(X)>127; // F2D8 LDX
  CY+=2;if(fZ){CY+=1;pc=0xF2E4;continue;} // F2DA BEQ
  CY+=3;t=R[0x2];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F2DC BIT
  CY+=2;if(!fV){CY+=1;pc=0xF2E4;continue;} // F2DE BVC
  CY+=2;t=0x1A;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F2E0 CMP
  CY+=2;if(fV){CY+=1;pc=0xF2E6;continue;} // F2E2 BVS
  case 0xF2E4:CY+=2;t=0x20;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F2E4 CMP
  case 0xF2E6:CY+=2;if(!fC){CY+=2;pc=0xF327;continue;} // F2E6 BCC
  CY+=2;if(fC){CY+=1;pc=0xF2FE;continue;} // F2E8 BCS
  case 0xF2EA:CY+=3;sbc(R[0x3E]); // F2EA SBC
  CY+=3;X=R[0xB];fZ=(X)===0;fN=(X)>127; // F2EC LDX
  CY+=2;if(!fZ){CY+=1;pc=0xF2F4;continue;} // F2EE BNE
  CY+=2;t=0x10;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F2F0 CMP
  CY+=2;if(fC){CY+=1;pc=0xF2FE;continue;} // F2F2 BCS
  case 0xF2F4:CY+=2;t=0x14;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F2F4 CMP
  CY+=2;if(fC){CY+=1;pc=0xF2FE;continue;} // F2F6 BCS
  CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F2F8 LDA
  CY+=2;A&=0xE0;fZ=(A)===0;fN=(A)>127; // F2FA AND
  case 0xF2FC:CY+=2;if(!fZ){CY+=2;pc=0xF327;continue;} // F2FC BNE
  case 0xF2FE:CY+=3;A=R[0x3F];fZ=(A)===0;fN=(A)>127; // F2FE LDA
  CY+=2;A&=0x7F;fZ=(A)===0;fN=(A)>127; // F300 AND
  CY+=3;R[0x3F]=A; // F302 STA
  CY+=2;if(!fN){CY+=1;pc=0xF327;continue;} // F304 BPL
  case 0xF306:CY+=3;X=R[0xB];fZ=(X)===0;fN=(X)>127; // F306 LDX
  CY+=2;if(fZ){CY+=1;pc=0xF31A;continue;} // F308 BEQ
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F30A CPX
  CY+=2;if(fC){CY+=1;pc=0xF310;continue;} // F30C BCS
  CY+=2;if(!fV){CY+=1;pc=0xF31A;continue;} // F30E BVC
  case 0xF310:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F310 LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F312 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF31A;continue;} // F314 BNE
  CY+=2;A=0xFC;fZ=(A)===0;fN=(A)>127; // F316 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF31C;continue;} // F318 BNE
  case 0xF31A:CY+=2;A=0xFE;fZ=(A)===0;fN=(A)>127; // F31A LDA
  case 0xF31C:CY+=6;push(0xF3);push(0x1E);pc=0xFD77;continue; // F31C JSR
  case 0xF31F:CY+=3;A=R[0x3B];fZ=(A)===0;fN=(A)>127; // F31F LDA
  CY+=2;if(!fN){CY+=1;pc=0xF327;continue;} // F321 BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F323 LDA
  CY+=3;R[0x3B]=A; // F325 STA
  case 0xF327:CY+=3;A=R[0x3E];fZ=(A)===0;fN=(A)>127; // F327 LDA
  CY+=3;t=R[0x3B];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F329 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF358;continue;} // F32B BCC
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // F32D TAX
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F32E LSR
  CY+=2;if(fC){CY+=1;pc=0xF332;continue;} // F32F BCS
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F331 INX
  case 0xF332:CY+=3;R[0x3B]=X; // F332 STX
  CY+=3;A=R[0x3F];fZ=(A)===0;fN=(A)>127; // F334 LDA
  CY+=2;A|=0x80;fZ=(A)===0;fN=(A)>127; // F336 ORA
  CY+=3;R[0x3F]=A; // F338 STA
  CY+=3;X=R[0x45];fZ=(X)===0;fN=(X)>127; // F33A LDX
  CY+=2;if(!fZ){CY+=1;pc=0xF358;continue;} // F33C BNE
  CY+=2;X=0x4;fZ=(X)===0;fN=(X)>127; // F33E LDX
  CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F340 BIT
  CY+=2;if(!fV){CY+=1;pc=0xF346;continue;} // F342 BVC
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F344 INX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F345 INX
  case 0xF346:CY+=3;R[0x45]=X; // F346 STX
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F348 LDY
  CY+=2;if(!fN){CY+=1;pc=0xF358;continue;} // F34A BPL
  CY+=3;t=R[0x1E];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F34C BIT
  CY+=2;if(!fN){CY+=1;pc=0xF358;continue;} // F34E BPL
  CY+=2;X=0x9;fZ=(X)===0;fN=(X)>127; // F350 LDX
  CY+=3;R[0x1E]=X; // F352 STX
  CY+=2;A=0xD;fZ=(A)===0;fN=(A)>127; // F354 LDA
  CY+=3;R[0x1C]=A; // F356 STA
  case 0xF358:CY+=3;t=R[0x3F];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F358 BIT
  CY+=3;A=R[0x3B];fZ=(A)===0;fN=(A)>127; // F35A LDA
  CY+=2;fC=false; // F35C CLC
  CY+=2;if(!fV){CY+=1;pc=0xF363;continue;} // F35D BVC
  CY+=2;adc(0xC); // F35F ADC
  CY+=2;if(!fZ){CY+=1;pc=0xF365;continue;} // F361 BNE
  case 0xF363:CY+=2;adc(0xA); // F363 ADC
  case 0xF365:CY+=3;R[0x3A]=A; // F365 STA
  CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F367 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF37A;continue;} // F369 BEQ
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // F36B LDA
  CY+=3;R[0x6A]=A; // F36D STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F36F LDA
  CY+=3;R[0x3D]=A; // F371 STA
  CY+=3;R[0x44]=A; // F373 STA
  CY+=6;push(0xF3);push(0x77);pc=0xFBE6;continue; // F375 JSR
  case 0xF378:CY+=2;if(!fZ){CY+=1;pc=0xF388;continue;} // F378 BNE
  case 0xF37A:CY+=3;t=R[0x44];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F37A BIT
  CY+=2;if(fN){CY+=1;pc=0xF388;continue;} // F37C BMI
  CY+=3;A=R[0x39];fZ=(A)===0;fN=(A)>127; // F37E LDA
  CY+=2;fC=false; // F380 CLC
  CY+=2;adc(0x16); // F381 ADC
  CY+=3;R[0x38]=A; // F383 STA
  CY+=6;push(0xF3);push(0x87);pc=0xFBF6;continue; // F385 JSR
  case 0xF388:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F388 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF38E;continue;} // F38A BEQ
  CY+=5;t=R[0x72];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x72]=t; // F38C DEC
  case 0xF38E:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F38E LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F390 LSR
  CY+=2;if(!fC){CY+=1;pc=0xF3A1;continue;} // F391 BCC
  CY+=3;X=R[0x45];fZ=(X)===0;fN=(X)>127; // F393 LDX
  CY+=2;if(fZ){CY+=1;pc=0xF399;continue;} // F395 BEQ
  CY+=5;t=R[0x45];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x45]=t; // F397 DEC
  case 0xF399:CY+=4;if((0xFEC4&255)+X>255) CY++;A=RB1[0xEC4+X];fZ=(A)===0;fN=(A)>127; // F399 LDA
  CY+=2;fC=false; // F39C CLC
  CY+=3;adc(R[0x3E]); // F39D ADC
  CY+=3;R[0x3E]=A; // F39F STA
  case 0xF3A1:CY+=3;pc=0xF6F6;continue; // F3A1 JMP
  case 0xF3A4:CY+=3;A=R[0x4A];fZ=(A)===0;fN=(A)>127; // F3A4 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF3B1;continue;} // F3A6 BEQ
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F3A8 LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F3AA INY
  CY+=2;if(!fZ){CY+=1;pc=0xF3B1;continue;} // F3AB BNE
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F3AD LDX
  CY+=3;R[0x1E]=X; // F3AF STX
  case 0xF3B1:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F3B1 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF3B8;continue;} // F3B3 BEQ
  CY+=3;pc=0xF43B;continue; // F3B5 JMP
  case 0xF3B8:CY+=3;A=R[0x8];fZ=(A)===0;fN=(A)>127; // F3B8 LDA
  CY+=2;if(!fN){CY+=1;pc=0xF3C1;continue;} // F3BA BPL
  CY+=6;push(0xF3);push(0xBE);pc=0xFD9A;continue; // F3BC JSR
  case 0xF3BF:CY+=2;if(!fZ){CY+=1;pc=0xF3A1;continue;} // F3BF BNE
  case 0xF3C1:CY+=3;t=R[0x4B];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F3C1 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF3EF;continue;} // F3C3 BPL
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F3C5 LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F3C7 INY
  CY+=2;if(!fZ){CY+=1;pc=0xF3CE;continue;} // F3C8 BNE
  CY+=2;X=0x7;fZ=(X)===0;fN=(X)>127; // F3CA LDX
  CY+=3;R[0x1E]=X; // F3CC STX
  case 0xF3CE:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F3CE LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F3D0 LSR
  CY+=2;if(fC){CY+=1;pc=0xF3EF;continue;} // F3D1 BCS
  CY+=6;push(0xF3);push(0xD5);pc=0xFBD6;continue; // F3D3 JSR
  case 0xF3D6:CY+=2;A=0x30;fZ=(A)===0;fN=(A)>127; // F3D6 LDA
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // F3D8 LDX
  CY+=6;push(0xF3);push(0xDC);pc=0xFDEA;continue; // F3DA JSR
  case 0xF3DD:CY+=3;A=R[0x6];fZ=(A)===0;fN=(A)>127; // F3DD LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF3EF;continue;} // F3DF BNE
  CY+=3;A=R[0x7];fZ=(A)===0;fN=(A)>127; // F3E1 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF3EF;continue;} // F3E3 BNE
  CY+=3;R[0x9]=A; // F3E5 STA
  CY+=5;t=R[0xB];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0xB]=t; // F3E7 INC
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F3E9 LDA
  CY+=3;R[0xA]=A; // F3EB STA
  CY+=2;if(fN){CY+=1;pc=0xF3A1;continue;} // F3ED BMI
  case 0xF3EF:CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F3EF BIT
  CY+=2;if(!fN){CY+=1;pc=0xF3F6;continue;} // F3F1 BPL
  CY+=3;pc=0xF4CC;continue; // F3F3 JMP
  case 0xF3F6:CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F3F6 LDX
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F3F8 LDA
  CY+=3;R[0x40]=A; // F3FA STA
  CY+=3;t=R[0x4B];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F3FC BIT
  CY+=2;if(fN){CY+=1;pc=0xF43B;continue;} // F3FE BMI
  CY+=3;t=R[0x47];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F400 BIT
  CY+=2;if(fN){CY+=1;pc=0xF437;continue;} // F402 BMI
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F404 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F406 LSR
  CY+=2;if(fC){CY+=1;pc=0xF431;continue;} // F407 BCS
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F409 LDA
  CY+=3;R[0x45]=A; // F40B STA
  CY+=3;t=R[0x1D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F40D BIT
  CY+=2;if(!fN){CY+=1;pc=0xF422;continue;} // F40F BPL
  CY+=2;if(fV){CY+=1;pc=0xF431;continue;} // F411 BVS
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F413 LDA
  CY+=3;R[0x45]=A; // F415 STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F417 LDA
  CY+=3;R[0x43]=A; // F419 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F41B DEX
  CY+=2;t=0x20;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F41C CPX
  CY+=2;if(fC){CY+=1;pc=0xF42F;continue;} // F41E BCS
  CY+=2;if(!fC){CY+=1;pc=0xF431;continue;} // F420 BCC
  case 0xF422:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F422 LDA
  CY+=3;R[0x45]=A; // F424 STA
  CY+=2;A=0x8;fZ=(A)===0;fN=(A)>127; // F426 LDA
  CY+=3;R[0x43]=A; // F428 STA
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F42A INX
  CY+=2;t=0x98;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F42B CPX
  CY+=2;if(fC){CY+=1;pc=0xF431;continue;} // F42D BCS
  case 0xF42F:CY+=3;R[0x5D]=X; // F42F STX
  case 0xF431:CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F431 LDA
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F433 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF48F;continue;} // F435 BPL
  case 0xF437:CY+=2;A&=0xFD;fZ=(A)===0;fN=(A)>127; // F437 AND
  CY+=3;R[0x3D]=A; // F439 STA
  case 0xF43B:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F43B LDA
  CY+=2;if(fZ){CY+=1;pc=0xF44C;continue;} // F43D BEQ
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // F43F LDA
  CY+=3;R[0x6A]=A; // F441 STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F443 LDA
  CY+=3;R[0x3D]=A; // F445 STA
  CY+=6;push(0xF4);push(0x49);pc=0xFBE6;continue; // F447 JSR
  case 0xF44A:CY+=2;if(!fZ){CY+=1;pc=0xF46D;continue;} // F44A BNE
  case 0xF44C:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F44C LDA
  CY+=2;t=0x6;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F44E CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF45C;continue;} // F450 BNE
  CY+=2;A=0x97;fZ=(A)===0;fN=(A)>127; // F452 LDA
  CY+=3;R[0x5D]=A; // F454 STA
  CY+=3;A=R[0x39];fZ=(A)===0;fN=(A)>127; // F456 LDA
  CY+=2;adc(0x15); // F458 ADC
  CY+=3;R[0x38]=A; // F45A STA
  case 0xF45C:CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F45C BIT
  CY+=2;if(fN){CY+=1;pc=0xF46A;continue;} // F45E BMI
  CY+=3;t=R[0x45];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F460 BIT
  CY+=2;if(fN){CY+=1;pc=0xF46A;continue;} // F462 BMI
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // F464 LDX
  CY+=3;R[0x6A]=X; // F466 STX
  CY+=2;if(!fZ){CY+=1;pc=0xF46D;continue;} // F468 BNE
  case 0xF46A:CY+=6;push(0xF4);push(0x6C);pc=0xFBF6;continue; // F46A JSR
  case 0xF46D:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F46D LDA
  CY+=3;X=R[0x4A];fZ=(X)===0;fN=(X)>127; // F46F LDX
  CY+=4;if((0xFE56&255)+X>255) CY++;A&=RB1[0xE56+X];fZ=(A)===0;fN=(A)>127; // F471 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF486;continue;} // F474 BNE
  CY+=3;A=R[0x44];fZ=(A)===0;fN=(A)>127; // F476 LDA
  CY+=2;A^=0x8;fZ=(A)===0;fN=(A)>127; // F478 EOR
  CY+=3;R[0x44]=A; // F47A STA
  CY+=3;t=R[0x4B];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F47C BIT
  CY+=2;if(!fN){CY+=1;pc=0xF486;continue;} // F47E BPL
  CY+=3;A=R[0x43];fZ=(A)===0;fN=(A)>127; // F480 LDA
  CY+=2;A^=0x8;fZ=(A)===0;fN=(A)>127; // F482 EOR
  CY+=3;R[0x43]=A; // F484 STA
  case 0xF486:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F486 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF48C;continue;} // F488 BEQ
  CY+=5;t=R[0x72];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x72]=t; // F48A DEC
  case 0xF48C:CY+=3;pc=0xF6F6;continue; // F48C JMP
  case 0xF48F:CY+=2;A&=0x2;fZ=(A)===0;fN=(A)>127; // F48F AND
  CY+=2;if(!fZ){CY+=1;pc=0xF43B;continue;} // F491 BNE
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F493 LDA
  CY+=2;A|=0x2;fZ=(A)===0;fN=(A)>127; // F495 ORA
  CY+=3;R[0x3D]=A; // F497 STA
  CY+=2;X=0x3;fZ=(X)===0;fN=(X)>127; // F499 LDX
  CY+=3;R[0x1E]=X; // F49B STX
  CY+=3;A=R[0x1D];fZ=(A)===0;fN=(A)>127; // F49D LDA
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F49F ASL
  CY+=2;if(!fC){CY+=1;pc=0xF4B8;continue;} // F4A0 BCC
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F4A2 ASL
  CY+=2;if(!fC){CY+=1;pc=0xF4B3;continue;} // F4A3 BCC
  case 0xF4A5:CY+=3;A=R[0x38];fZ=(A)===0;fN=(A)>127; // F4A5 LDA
  CY+=2;adc(0x20); // F4A7 ADC
  CY+=3;R[0x3C]=A; // F4A9 STA
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F4AB LDA
  CY+=2;A|=0xC0;fZ=(A)===0;fN=(A)>127; // F4AD ORA
  CY+=3;R[0x3D]=A; // F4AF STA
  CY+=2;if(fN){CY+=1;pc=0xF43B;continue;} // F4B1 BMI
  case 0xF4B3:CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // F4B3 TAY
  CY+=2;A=0xFF;fZ=(A)===0;fN=(A)>127; // F4B4 LDA
  CY+=2;if(fN){CY+=1;pc=0xF4BB;continue;} // F4B6 BMI
  case 0xF4B8:CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // F4B8 TAY
  CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // F4B9 LDA
  case 0xF4BB:CY+=3;R[0x46]=A; // F4BB STA
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // F4BD LDA
  CY+=2;A|=0x1;fZ=(A)===0;fN=(A)>127; // F4BF ORA
  CY+=3;R[0x3D]=A; // F4C1 STA
  CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // F4C3 TYA
  CY+=2;if(!fC){CY+=1;pc=0xF4A5;continue;} // F4C4 BCC
  case 0xF4C6:CY+=6;push(0xF4);push(0xC8);pc=0xFCA9;continue; // F4C6 JSR
  case 0xF4C9:CY+=3;pc=0xF43B;continue; // F4C9 JMP
  case 0xF4CC:CY+=2;if(fV){CY+=1;pc=0xF4C6;continue;} // F4CC BVS
  CY+=3;A=R[0x3E];fZ=(A)===0;fN=(A)>127; // F4CE LDA
  CY+=2;fC=false; // F4D0 CLC
  CY+=2;adc(0x16); // F4D1 ADC
  CY+=3;R[0x3C]=A; // F4D3 STA
  CY+=6;push(0xF4);push(0xD7);pc=0xFC42;continue; // F4D5 JSR
  case 0xF4D8:CY+=3;pc=0xF43B;continue; // F4D8 JMP
  case 0xF4DB:CY+=3;A=R[0x1F];fZ=(A)===0;fN=(A)>127; // F4DB LDA
  CY+=2;t=0x25;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F4DD CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF4F5;continue;} // F4DF BNE
  CY+=2;A=0x8;fZ=(A)===0;fN=(A)>127; // F4E1 LDA
  CY+=3;R[0x63]=A; // F4E3 STA
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F4E5 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F4E7 LSR
  CY+=2;if(fC){CY+=1;pc=0xF4FE;continue;} // F4E8 BCS
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F4EA LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F4EC INY
  CY+=2;if(!fZ){CY+=1;pc=0xF4FE;continue;} // F4ED BNE
  CY+=2;X=0x5;fZ=(X)===0;fN=(X)>127; // F4EF LDX
  CY+=3;R[0x1E]=X; // F4F1 STX
  CY+=2;if(!fN){CY+=1;pc=0xF4FE;continue;} // F4F3 BPL
  case 0xF4F5:CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F4F5 LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F4F7 INY
  CY+=2;if(!fZ){CY+=1;pc=0xF4FE;continue;} // F4F8 BNE
  CY+=2;X=0x6;fZ=(X)===0;fN=(X)>127; // F4FA LDX
  CY+=3;R[0x1E]=X; // F4FC STX
  case 0xF4FE:CY+=3;A=R[0x63];fZ=(A)===0;fN=(A)>127; // F4FE LDA
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F500 CMP
  CY+=2;if(fC){CY+=1;pc=0xF516;continue;} // F502 BCS
  CY+=3;X=R[0x6A];fZ=(X)===0;fN=(X)>127; // F504 LDX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F506 DEX
  CY+=2;if(fZ){CY+=1;pc=0xF516;continue;} // F507 BEQ
  CY+=3;Y=R[0x19];fZ=(Y)===0;fN=(Y)>127; // F509 LDY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F50B INY
  CY+=2;if(!fZ){CY+=1;pc=0xF516;continue;} // F50C BNE
  CY+=2;X=0x8;fZ=(X)===0;fN=(X)>127; // F50E LDX
  CY+=3;R[0x1E]=X; // F510 STX
  CY+=2;A=0x10;fZ=(A)===0;fN=(A)>127; // F512 LDA
  CY+=3;R[0x1C]=A; // F514 STA
  case 0xF516:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F516 LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F518 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF52E;continue;} // F51A BNE
  CY+=2;Y=0x2;fZ=(Y)===0;fN=(Y)>127; // F51C LDY
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F51E LDA
  CY+=3;R[0x79]=A; // F520 STA
  CY+=2;A=0x52;fZ=(A)===0;fN=(A)>127; // F522 LDA
  CY+=2;X=0x9;fZ=(X)===0;fN=(X)>127; // F524 LDX
  CY+=7;push(0xF5);push(0x28);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F526 BRK
  case 0xF527:CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F527 LDY
  CY+=2;A=0x37;fZ=(A)===0;fN=(A)>127; // F529 LDA
  CY+=2;X=0x18;fZ=(X)===0;fN=(X)>127; // F52B LDX
  CY+=7;push(0xF5);push(0x2F);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F52D BRK
  case 0xF52E:CY+=5;t=R[0x5E];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x5E]=t; // F52E DEC
  CY+=2;if(fZ){CY+=1;pc=0xF534;continue;} // F530 BEQ
  CY+=2;if(!fN){CY+=1;pc=0xF539;continue;} // F532 BPL
  case 0xF534:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F534 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F536 LSR
  CY+=2;if(!fC){CY+=1;pc=0xF53C;continue;} // F537 BCC
  case 0xF539:CY+=3;pc=0xF5A3;continue; // F539 JMP
  case 0xF53C:CY+=2;A=0x3;fZ=(A)===0;fN=(A)>127; // F53C LDA
  CY+=3;R[0x5E]=A; // F53E STA
  CY+=3;t=R[0x1D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F540 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF54B;continue;} // F542 BPL
  CY+=2;if(!fV){CY+=1;pc=0xF554;continue;} // F544 BVC
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F546 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F548 LSR
  CY+=2;if(fC){CY+=1;pc=0xF55D;continue;} // F549 BCS
  case 0xF54B:CY+=3;X=R[0x23];fZ=(X)===0;fN=(X)>127; // F54B LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F54D INX
  CY+=2;t=0x87;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F54E CPX
  CY+=2;if(fC){CY+=1;pc=0xF55D;continue;} // F550 BCS
  CY+=2;if(!fC){CY+=1;pc=0xF55B;continue;} // F552 BCC
  case 0xF554:CY+=3;X=R[0x23];fZ=(X)===0;fN=(X)>127; // F554 LDX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F556 DEX
  CY+=2;t=0x53;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F557 CPX
  CY+=2;if(!fC){CY+=1;pc=0xF55D;continue;} // F559 BCC
  case 0xF55B:CY+=3;R[0x23]=X; // F55B STX
  case 0xF55D:CY+=3;A=R[0x1D];fZ=(A)===0;fN=(A)>127; // F55D LDA
  CY+=3;X=R[0x1F];fZ=(X)===0;fN=(X)>127; // F55F LDX
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F561 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F562 ASL
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F563 ASL
  CY+=2;if(!fC){CY+=1;pc=0xF570;continue;} // F564 BCC
  CY+=2;fC=A>127;A=A<<1&255;fZ=(A)===0;fN=(A)>127; // F566 ASL
  CY+=2;if(fC){CY+=1;pc=0xF577;continue;} // F567 BCS
  CY+=2;t=0x25;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F569 CPX
  CY+=2;if(fC){CY+=1;pc=0xF577;continue;} // F56B BCS
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F56D INX
  CY+=2;if(!fC){CY+=1;pc=0xF575;continue;} // F56E BCC
  case 0xF570:CY+=2;t=0xF;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F570 CPX
  CY+=2;if(!fC){CY+=1;pc=0xF577;continue;} // F572 BCC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F574 DEX
  case 0xF575:CY+=3;R[0x1F]=X; // F575 STX
  case 0xF577:CY+=3;A=R[0x6B];fZ=(A)===0;fN=(A)>127; // F577 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF599;continue;} // F579 BNE
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F57B BIT
  CY+=2;if(!fN){CY+=1;pc=0xF587;continue;} // F57D BPL
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F57F LDA
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // F581 AND
  CY+=3;R[0x6A]=A; // F583 STA
  CY+=2;if(!fV){CY+=1;pc=0xF5A3;continue;} // F585 BVC
  case 0xF587:CY+=3;t=R[0x6A];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F587 BIT
  CY+=2;if(fV){CY+=1;pc=0xF5A3;continue;} // F589 BVS
  CY+=2;A=0xE;fZ=(A)===0;fN=(A)>127; // F58B LDA
  CY+=3;R[0x6B]=A; // F58D STA
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F58F LDA
  CY+=2;A|=0xC0;fZ=(A)===0;fN=(A)>127; // F591 ORA
  CY+=3;R[0x6A]=A; // F593 STA
  CY+=2;X=0x4;fZ=(X)===0;fN=(X)>127; // F595 LDX
  CY+=3;R[0x1E]=X; // F597 STX
  case 0xF599:CY+=5;t=R[0x6B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x6B]=t; // F599 DEC
  CY+=2;if(!fZ){CY+=1;pc=0xF5A3;continue;} // F59B BNE
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F59D LDA
  CY+=2;A&=0x7F;fZ=(A)===0;fN=(A)>127; // F59F AND
  CY+=3;R[0x6A]=A; // F5A1 STA
  case 0xF5A3:CY+=3;A=R[0x68];fZ=(A)===0;fN=(A)>127; // F5A3 LDA
  CY+=2;t=0x3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F5A5 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF5AC;continue;} // F5A7 BCC
  case 0xF5A9:CY+=3;pc=0xF626;continue; // F5A9 JMP
  case 0xF5AC:CY+=5;t=R[0x64];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x64]=t; // F5AC DEC
  CY+=2;if(!fN){CY+=1;pc=0xF5A9;continue;} // F5AE BPL
  CY+=6;push(0xF5);push(0xB2);pc=0xFCE1;continue; // F5B0 JSR
  case 0xF5B3:CY+=4;if((0xF000&255)+X>255) CY++;A=RB1[0x0+X];fZ=(A)===0;fN=(A)>127; // F5B3 LDA
  CY+=3;R[0x64]=A; // F5B6 STA
  CY+=3;A=R[0x70];fZ=(A)===0;fN=(A)>127; // F5B8 LDA
  CY+=2;t=0xE;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F5BA CMP
  CY+=2;if(!fC){CY+=1;pc=0xF5D0;continue;} // F5BC BCC
  CY+=3;A=R[0x68];fZ=(A)===0;fN=(A)>127; // F5BE LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF5A9;continue;} // F5C0 BNE
  CY+=2;X=0x5;fZ=(X)===0;fN=(X)>127; // F5C2 LDX
  CY+=6;push(0xF5);push(0xC6);pc=0xFDEA;continue; // F5C4 JSR
  case 0xF5C7:CY+=5;t=R[0x9];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x9]=t; // F5C7 INC
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F5C9 LDA
  CY+=3;R[0xA]=A; // F5CB STA
  CY+=3;pc=0xF6F6;continue; // F5CD JMP
  case 0xF5D0:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F5D0 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F5D2 LSR
  CY+=2;if(fC){CY+=2;pc=0xF626;continue;} // F5D3 BCS
  CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // F5D5 LDA
  CY+=2;if(!fZ){CY+=2;pc=0xF626;continue;} // F5D7 BNE
  CY+=3;A=R[0x70];fZ=(A)===0;fN=(A)>127; // F5D9 LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F5DB AND
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F5DD CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF5F0;continue;} // F5DF BNE
  CY+=3;A=R[0x68];fZ=(A)===0;fN=(A)>127; // F5E1 LDA
  CY+=2;if(!fZ){CY+=2;pc=0xF626;continue;} // F5E3 BNE
  CY+=2;A=0x3;fZ=(A)===0;fN=(A)>127; // F5E5 LDA
  CY+=3;R[0x10]=A; // F5E7 STA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F5E9 LSR
  CY+=3;R[0x6C]=A; // F5EA STA
  CY+=2;A=0x19;fZ=(A)===0;fN=(A)>127; // F5EC LDA
  CY+=2;if(!fZ){CY+=2;pc=0xF616;continue;} // F5EE BNE
  case 0xF5F0:CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F5F0 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F5F2 AND
  CY+=2;t=0x3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F5F4 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF5FA;continue;} // F5F6 BNE
  case 0xF5F8:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F5F8 LDA
  case 0xF5FA:CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // F5FA TAX
  case 0xF5FB:CY+=3;R[0x10]=X; // F5FB STX
  CY+=4;A=R[0x6D+X&127];fZ=(A)===0;fN=(A)>127; // F5FD LDA
  CY+=2;if(fZ){CY+=1;pc=0xF608;continue;} // F5FF BEQ
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F601 INX
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F602 CPX
  CY+=2;if(!fZ){CY+=2;pc=0xF5FB;continue;} // F604 BNE
  CY+=2;if(fZ){CY+=2;pc=0xF5F8;continue;} // F606 BEQ
  case 0xF608:CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // F608 LDA
  CY+=4;R[0x6D+X&127]=A; // F60A STA
  CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // F60C LDX
  CY+=3;A=R[0x10];fZ=(A)===0;fN=(A)>127; // F60E LDA
  CY+=4;R[0x65+X&127]=A; // F610 STA
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // F612 TAX
  CY+=4;if((0xFEA2&255)+X>255) CY++;A=RB1[0xEA2+X];fZ=(A)===0;fN=(A)>127; // F613 LDA
  case 0xF616:CY+=5;t=R[0x68];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x68]=t; // F616 INC
  CY+=5;t=R[0x70];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x70]=t; // F618 INC
  CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // F61A LDX
  CY+=4;R[0x1F+X&127]=A; // F61C STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F61E LDA
  CY+=4;R[0x23+X&127]=A; // F620 STA
  CY+=3;A=R[0x10];fZ=(A)===0;fN=(A)>127; // F622 LDA
  CY+=4;R[0x27+X&127]=A; // F624 STA
  case 0xF626:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // F626 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F628 LSR
  CY+=2;if(fC){CY+=1;pc=0xF671;continue;} // F629 BCS
  CY+=3;A=R[0x68];fZ=(A)===0;fN=(A)>127; // F62B LDA
  CY+=2;if(fZ){CY+=1;pc=0xF671;continue;} // F62D BEQ
  CY+=5;t=R[0x62];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x62]=t; // F62F DEC
  CY+=2;if(!fN){CY+=1;pc=0xF671;continue;} // F631 BPL
  CY+=6;push(0xF6);push(0x35);pc=0xFCE1;continue; // F633 JSR
  case 0xF636:CY+=4;if((0xFE61&255)+X>255) CY++;A=RB1[0xE61+X];fZ=(A)===0;fN=(A)>127; // F636 LDA
  CY+=3;R[0x62]=A; // F639 STA
  CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // F63B LDA
  CY+=2;if(fZ){CY+=1;pc=0xF644;continue;} // F63D BEQ
  CY+=4;if((0xFE63&255)+X>255) CY++;A=RB1[0xE63+X];fZ=(A)===0;fN=(A)>127; // F63F LDA
  CY+=3;R[0x62]=A; // F642 STA
  case 0xF644:CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // F644 LDX
  case 0xF646:CY+=4;A=R[0x27+X&127];fZ=(A)===0;fN=(A)>127; // F646 LDA
  CY+=2;t=0xD;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F648 CMP
  CY+=2;if(fC){CY+=1;pc=0xF66C;continue;} // F64A BCS
  CY+=4;A=R[0x71+X&127];fZ=(A)===0;fN=(A)>127; // F64C LDA
  CY+=2;A&=0xF;fZ=(A)===0;fN=(A)>127; // F64E AND
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // F650 TAY
  CY+=4;if((0xFE83&255)+Y>255) CY++;A=RB1[0xE83+Y];fZ=(A)===0;fN=(A)>127; // F651 LDA
  CY+=4;adc(R[0x1F+X&127]); // F654 ADC
  CY+=4;Y=R[0x27+X&127];fZ=(Y)===0;fN=(Y)>127; // F656 LDY
  CY+=4;if((0xFEA9&255)+Y>255) CY++;t=RB1[0xEA9+Y];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F658 CMP
  CY+=2;if(fC){CY+=1;pc=0xF667;continue;} // F65B BCS
  CY+=4;if((0xFEA5&255)+Y>255) CY++;t=RB1[0xEA5+Y];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F65D CMP
  CY+=2;if(fC){CY+=1;pc=0xF66A;continue;} // F660 BCS
  CY+=4;if((0xFEA5&255)+Y>255) CY++;A=RB1[0xEA5+Y];fZ=(A)===0;fN=(A)>127; // F662 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF66A;continue;} // F665 BNE
  case 0xF667:CY+=4;if((0xFEA9&255)+Y>255) CY++;A=RB1[0xEA9+Y];fZ=(A)===0;fN=(A)>127; // F667 LDA
  case 0xF66A:CY+=4;R[0x1F+X&127]=A; // F66A STA
  case 0xF66C:CY+=6;t=R[0x71+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x71+X&127]=t; // F66C INC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F66E DEX
  CY+=2;if(!fZ){CY+=1;pc=0xF646;continue;} // F66F BNE
  case 0xF671:CY+=3;pc=0xF6F6;continue; // F671 JMP
  case 0xF674:CY+=5;t=R[0x71];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x71]=t; // F674 DEC
  CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // F676 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF692;continue;} // F678 BNE
  CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // F67A LDA
  CY+=2;if(fZ){CY+=1;pc=0xF686;continue;} // F67C BEQ
  CY+=2;t=0x51;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F67E CMP
  CY+=2;if(fC){CY+=1;pc=0xF692;continue;} // F680 BCS
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F682 BIT
  CY+=2;if(fN){CY+=1;pc=0xF671;continue;} // F684 BMI
  case 0xF686:CY+=5;t=R[0x9];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x9]=t; // F686 INC
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F688 LDA
  CY+=3;R[0xA]=A; // F68A STA
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // F68C LDX
  CY+=3;R[0x70]=X; // F68E STX
  CY+=2;if(fZ){CY+=1;pc=0xF671;continue;} // F690 BEQ
  case 0xF692:CY+=6;push(0xF6);push(0x94);pc=0xFE44;continue; // F692 JSR
  case 0xF695:CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F695 LDX
  case 0xF697:CY+=4;A=R[0x64+X&127];fZ=(A)===0;fN=(A)>127; // F697 LDA
  CY+=2;t=0x90;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F699 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF6B7;continue;} // F69B BNE
  CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F69D LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F69F AND
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // F6A1 TAY
  CY+=4;if((0xFE7B&255)+Y>255) CY++;A=RB1[0xE7B+Y];fZ=(A)===0;fN=(A)>127; // F6A2 LDA
  CY+=4;R[0x60+X&127]=A; // F6A5 STA
  CY+=2;if(fZ){CY+=1;pc=0xF6AD;continue;} // F6A7 BEQ
  CY+=3;t=R[0x2];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F6A9 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF6B1;continue;} // F6AB BPL
  case 0xF6AD:CY+=2;A=0xF0;fZ=(A)===0;fN=(A)>127; // F6AD LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF6B3;continue;} // F6AF BNE
  case 0xF6B1:CY+=2;A=0x10;fZ=(A)===0;fN=(A)>127; // F6B1 LDA
  case 0xF6B3:CY+=4;R[0x62+X&127]=A; // F6B3 STA
  CY+=2;if(!fZ){CY+=1;pc=0xF6BF;continue;} // F6B5 BNE
  case 0xF6B7:CY+=2;t=0x9F;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F6B7 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF6BF;continue;} // F6B9 BCC
  CY+=2;sbc(0xA0); // F6BB SBC
  CY+=4;R[0x64+X&127]=A; // F6BD STA
  case 0xF6BF:CY+=6;t=R[0x64+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x64+X&127]=t; // F6BF INC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F6C1 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF697;continue;} // F6C2 BPL
  CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // F6C4 LDA
  CY+=2;t=0x9F;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F6C6 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF6CE;continue;} // F6C8 BCC
  CY+=2;sbc(0xA0); // F6CA SBC
  CY+=3;R[0x5D]=A; // F6CC STA
  case 0xF6CE:CY+=5;t=R[0x5D];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x5D]=t; // F6CE INC
  CY+=6;push(0xF6);push(0xD2);pc=0xFE3A;continue; // F6D0 JSR
  case 0xF6D3:CY+=2;t=0xFE;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F6D3 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF6F6;continue;} // F6D5 BNE
  CY+=2;A=0x1F;fZ=(A)===0;fN=(A)>127; // F6D7 LDA
  CY+=2;X=0x12;fZ=(X)===0;fN=(X)>127; // F6D9 LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F6DB LDY
  CY+=3;R[0x79]=Y; // F6DD STY
  CY+=7;push(0xF6);push(0xE1);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F6DF BRK
  case 0xF6E0:CY+=2;A=0x49;fZ=(A)===0;fN=(A)>127; // F6E0 LDA
  CY+=2;X=0xC;fZ=(X)===0;fN=(X)>127; // F6E2 LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F6E4 LDY
  CY+=7;push(0xF6);push(0xE8);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F6E6 BRK
  case 0xF6E7:CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // F6E7 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // F6E9 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF6F6;continue;} // F6EB BNE
  CY+=2;A=0x37;fZ=(A)===0;fN=(A)>127; // F6ED LDA
  CY+=2;X=0xC;fZ=(X)===0;fN=(X)>127; // F6EF LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F6F1 LDY
  CY+=3;R[0x79]=Y; // F6F3 STY
  CY+=7;push(0xF6);push(0xF7);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F6F5 BRK
  case 0xF6F6:CY+=4;A=rd(0x284);fZ=(A)===0;fN=(A)>127; // F6F6 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF6F6;continue;} // F6F9 BNE
  CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // F6FB LDA
  CY+=3;wr(0x0,A);if(FE)return 0xF6FF; // F6FD STA
  case 0xF6FF:CY+=3;wr(0x1,A);if(FE)return 0xF701; // F6FF STA
  case 0xF701:CY+=3;wr(0x2,A);if(FE)return 0xF703; // F701 STA
  case 0xF703:CY+=3;wr(0x2,A);if(FE)return 0xF705; // F703 STA
  case 0xF705:CY+=3;wr(0x2,A);if(FE)return 0xF707; // F705 STA
  case 0xF707:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F707 LDA
  CY+=3;wr(0x0,A);if(FE)return 0xF70B; // F709 STA
  case 0xF70B:CY+=2;A=0x2D;fZ=(A)===0;fN=(A)>127; // F70B LDA
  CY+=4;wr(0x296,A);if(FE)return 0xF710; // F70D STA
  case 0xF710:CY+=3;t=R[0xA];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F710 BIT
  CY+=2;if(fN){CY+=1;pc=0xF717;continue;} // F712 BMI
  CY+=3;pc=0xF792;continue; // F714 JMP
  case 0xF717:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // F717 LDA
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F719 CMP
  CY+=2;if(fZ){CY+=1;pc=0xF740;continue;} // F71B BEQ
  CY+=2;t=0x3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F71D CMP
  CY+=2;if(fZ){CY+=1;pc=0xF773;continue;} // F71F BEQ
  CY+=2;X=0x4A;fZ=(X)===0;fN=(X)>127; // F721 LDX
  case 0xF723:CY+=4;if((0xFED8&255)+X>255) CY++;A=RB1[0xED8+X];fZ=(A)===0;fN=(A)>127; // F723 LDA
  CY+=4;R[0x1F+X&127]=A; // F726 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F728 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF723;continue;} // F729 BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F72B LDA
  CY+=2;X=0xA;fZ=(X)===0;fN=(X)>127; // F72D LDX
  case 0xF72F:CY+=4;R[0x6A+X&127]=A; // F72F STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F731 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF72F;continue;} // F732 BPL
  CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // F734 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF75F;continue;} // F736 BNE
  CY+=3;R[0x6]=A; // F738 STA
  CY+=2;A=0x50;fZ=(A)===0;fN=(A)>127; // F73A LDA
  CY+=3;R[0x7]=A; // F73C STA
  CY+=2;if(!fZ){CY+=1;pc=0xF781;continue;} // F73E BNE
  case 0xF740:CY+=2;X=0x30;fZ=(X)===0;fN=(X)>127; // F740 LDX
  case 0xF742:CY+=4;if((0xFF23&255)+X>255) CY++;A=rd((0xFF23+X));fZ=(A)===0;fN=(A)>127; // F742 LDA
  CY+=4;R[0x37+X&127]=A; // F745 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F747 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF742;continue;} // F748 BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F74A LDA
  CY+=2;X=0x7;fZ=(X)===0;fN=(X)>127; // F74C LDX
  case 0xF74E:CY+=4;R[0x68+X&127]=A; // F74E STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F750 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF74E;continue;} // F751 BPL
  CY+=3;R[0x27]=A; // F753 STA
  CY+=2;A=0x25;fZ=(A)===0;fN=(A)>127; // F755 LDA
  CY+=3;R[0x1F]=A; // F757 STA
  CY+=2;A=0x86;fZ=(A)===0;fN=(A)>127; // F759 LDA
  CY+=3;R[0x23]=A; // F75B STA
  CY+=2;if(!fZ){CY+=1;pc=0xF781;continue;} // F75D BNE
  case 0xF75F:CY+=2;X=0xF;fZ=(X)===0;fN=(X)>127; // F75F LDX
  case 0xF761:CY+=4;if((0xFF54&255)+X>255) CY++;A=rd((0xFF54+X));fZ=(A)===0;fN=(A)>127; // F761 LDA
  CY+=4;R[0x37+X&127]=A; // F764 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F766 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF761;continue;} // F767 BPL
  CY+=2;A=0x97;fZ=(A)===0;fN=(A)>127; // F769 LDA
  CY+=3;R[0x5D]=A; // F76B STA
  CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // F76D LDA
  CY+=3;R[0x6A]=A; // F76F STA
  CY+=2;if(!fN){CY+=1;pc=0xF781;continue;} // F771 BPL
  case 0xF773:CY+=2;X=0x14;fZ=(X)===0;fN=(X)>127; // F773 LDX
  case 0xF775:CY+=4;if((0xFE66&255)+X>255) CY++;A=RB1[0xE66+X];fZ=(A)===0;fN=(A)>127; // F775 LDA
  CY+=4;R[0x37+X&127]=A; // F778 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F77A DEX
  CY+=2;if(!fN){CY+=1;pc=0xF775;continue;} // F77B BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F77D LDA
  CY+=3;R[0x72]=A; // F77F STA
  case 0xF781:CY+=3;R[0x19]=X; // F781 STX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F783 INX
  CY+=3;R[0xA]=X; // F784 STX
  CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // F786 LDA
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F788 CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF790;continue;} // F78A BNE
  CY+=3;A=R[0x70];fZ=(A)===0;fN=(A)>127; // F78C LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF792;continue;} // F78E BNE
  case 0xF790:CY+=3;R[0x1E]=X; // F790 STX
  case 0xF792:CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // F792 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF7A7;continue;} // F794 BEQ
  CY+=2;t=0x1;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F796 CMP
  CY+=2;if(fZ){CY+=1;pc=0xF7A4;continue;} // F798 BEQ
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F79A CMP
  CY+=2;if(fZ){CY+=1;pc=0xF7A1;continue;} // F79C BEQ
  CY+=3;pc=0xF928;continue; // F79E JMP
  case 0xF7A1:CY+=3;pc=0xFFF2;continue; // F7A1 JMP
  case 0xF7A4:CY+=3;pc=0xFA0F;continue; // F7A4 JMP
  case 0xF7A7:CY+=3;t=R[0x67];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F7A7 BIT
  CY+=2;if(fN){CY+=1;pc=0xF7AE;continue;} // F7A9 BMI
  CY+=3;pc=0xF895;continue; // F7AB JMP
  case 0xF7AE:CY+=3;A=R[0x72];fZ=(A)===0;fN=(A)>127; // F7AE LDA
  CY+=2;if(fZ){CY+=1;pc=0xF7CC;continue;} // F7B0 BEQ
  CY+=5;t=R[0x72];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x72]=t; // F7B2 DEC
  CY+=2;if(!fZ){CY+=1;pc=0xF7C9;continue;} // F7B4 BNE
  CY+=5;t=R[0x8];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // F7B6 DEC
  CY+=2;if(fN){CY+=2;pc=0xF80D;continue;} // F7B8 BMI
  CY+=2;A=0x5D;fZ=(A)===0;fN=(A)>127; // F7BA LDA
  CY+=3;R[0x66]=A; // F7BC STA
  CY+=3;R[0x75]=A; // F7BE STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F7C0 LDA
  CY+=3;R[0x67]=A; // F7C2 STA
  CY+=3;R[0x73]=A; // F7C4 STA
  CY+=6;push(0xF7);push(0xC8);pc=0xFBC9;continue; // F7C6 JSR
  case 0xF7C9:CY+=3;pc=0xF8E3;continue; // F7C9 JMP
  case 0xF7CC:CY+=3;A=R[0x66];fZ=(A)===0;fN=(A)>127; // F7CC LDA
  CY+=2;t=0x12;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F7CE CMP
  CY+=2;if(fC){CY+=1;pc=0xF7D6;continue;} // F7D0 BCS
  CY+=2;A=0x28;fZ=(A)===0;fN=(A)>127; // F7D2 LDA
  CY+=3;R[0x72]=A; // F7D4 STA
  case 0xF7D6:CY+=3;A=R[0x73];fZ=(A)===0;fN=(A)>127; // F7D6 LDA
  CY+=2;t=0x20;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F7D8 CMP
  CY+=2;if(fC){CY+=1;pc=0xF7E6;continue;} // F7DA BCS
  CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F7DC LDX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F7DE DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F7DF DEX
  CY+=2;if(!fN){CY+=1;pc=0xF7E4;continue;} // F7E0 BPL
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // F7E2 LDX
  case 0xF7E4:CY+=3;R[0x5D]=X; // F7E4 STX
  case 0xF7E6:CY+=3;A=R[0x66];fZ=(A)===0;fN=(A)>127; // F7E6 LDA
  CY+=2;fC=false; // F7E8 CLC
  CY+=3;adc(R[0x74]); // F7E9 ADC
  CY+=3;R[0x66]=A; // F7EB STA
  CY+=3;R[0x75]=A; // F7ED STA
  CY+=5;t=R[0x6F];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x6F]=t; // F7EF DEC
  CY+=2;if(!fN){CY+=2;pc=0xF80D;continue;} // F7F1 BPL
  CY+=2;Y=0x4;fZ=(Y)===0;fN=(Y)>127; // F7F3 LDY
  CY+=3;A=R[0xB];fZ=(A)===0;fN=(A)>127; // F7F5 LDA
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F7F7 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF7FC;continue;} // F7F9 BCC
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F7FB INY
  case 0xF7FC:CY+=3;R[0x6F]=Y; // F7FC STY
  CY+=3;X=R[0x70];fZ=(X)===0;fN=(X)>127; // F7FE LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F800 INX
  CY+=2;t=0x8;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F801 CPX
  CY+=2;if(!fC){CY+=1;pc=0xF806;continue;} // F803 BCC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F805 DEX
  case 0xF806:CY+=3;R[0x70]=X; // F806 STX
  CY+=4;if((0xFECB&255)+X>255) CY++;A=RB1[0xECB+X];fZ=(A)===0;fN=(A)>127; // F808 LDA
  CY+=3;R[0x74]=A; // F80B STA
  case 0xF80D:CY+=3;A=R[0x8];fZ=(A)===0;fN=(A)>127; // F80D LDA
  CY+=2;if(!fN){CY+=1;pc=0xF814;continue;} // F80F BPL
  CY+=6;push(0xF8);push(0x13);pc=0xFD9A;continue; // F811 JSR
  case 0xF814:CY+=3;t=rd(0x30);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F814 BIT
  CY+=2;if(!fV){CY+=1;pc=0xF831;continue;} // F816 BVC
  CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // F818 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F81A LSR
  CY+=2;if(!fC){CY+=1;pc=0xF82F;continue;} // F81B BCC
  CY+=3;A=R[0x66];fZ=(A)===0;fN=(A)>127; // F81D LDA
  CY+=2;t=0x44;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F81F CMP
  CY+=2;if(!fC){CY+=1;pc=0xF82F;continue;} // F821 BCC
  CY+=5;t=R[0x69];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x69]=t; // F823 DEC
  CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // F825 LDA
  CY+=2;A&=0xFE;fZ=(A)===0;fN=(A)>127; // F827 AND
  CY+=3;R[0xA]=A; // F829 STA
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F82B LDX
  CY+=2;if(!fZ){CY+=1;pc=0xF84E;continue;} // F82D BNE
  case 0xF82F:CY+=2;if(!fC){CY+=1;pc=0xF892;continue;} // F82F BCC
  case 0xF831:CY+=3;t=rd(0x31);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F831 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF892;continue;} // F833 BPL
  CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // F835 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F837 LSR
  CY+=2;if(fC){CY+=1;pc=0xF892;continue;} // F838 BCS
  CY+=3;A=R[0x66];fZ=(A)===0;fN=(A)>127; // F83A LDA
  CY+=2;t=0x44;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F83C CMP
  CY+=2;if(!fC){CY+=1;pc=0xF892;continue;} // F83E BCC
  CY+=5;t=R[0x69];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x69]=t; // F840 DEC
  CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // F842 LDA
  CY+=2;A|=0x1;fZ=(A)===0;fN=(A)>127; // F844 ORA
  CY+=3;R[0xA]=A; // F846 STA
  CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // F848 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF866;continue;} // F84A BEQ
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // F84C LDX
  case 0xF84E:CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F84E LDA
  CY+=2;A&=0x7;fZ=(A)===0;fN=(A)>127; // F850 AND
  CY+=2;t=0x6;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F852 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF858;continue;} // F854 BCC
  CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // F856 LDA
  case 0xF858:CY+=2;adc(0x3); // F858 ADC
  CY+=4;R[0x5B+X&127]=A; // F85A STA
  CY+=4;if((0xFF89&255)+X>255) CY++;Y=rd((0xFF89+X));fZ=(Y)===0;fN=(Y)>127; // F85C LDY
  CY+=4;if((0xDB&255)+Y>255) CY++;t=rd((0xDB+Y));fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F85F CMP
  CY+=2;if(!fZ){CY+=1;pc=0xF866;continue;} // F862 BNE
  CY+=6;t=R[0x5B+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x5B+X&127]=t; // F864 INC
  case 0xF866:CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // F866 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xF86F;continue;} // F868 BNE
  CY+=2;X=0x5;fZ=(X)===0;fN=(X)>127; // F86A LDX
  CY+=6;push(0xF8);push(0x6E);pc=0xFDEA;continue; // F86C JSR
  case 0xF86F:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F86F LDA
  CY+=3;R[0x74]=A; // F871 STA
  CY+=3;R[0x6F]=A; // F873 STA
  CY+=3;R[0x73]=A; // F875 STA
  CY+=3;R[0x6A]=A; // F877 STA
  CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F879 LDX
  CY+=6;push(0xF8);push(0x7D);pc=0xFDEA;continue; // F87B JSR
  case 0xF87E:CY+=3;A=R[0x67];fZ=(A)===0;fN=(A)>127; // F87E LDA
  CY+=2;A&=0x7F;fZ=(A)===0;fN=(A)>127; // F880 AND
  CY+=3;R[0x67]=A; // F882 STA
  CY+=6;push(0xF8);push(0x86);pc=0xFE05;continue; // F884 JSR
  case 0xF887:CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // F887 LDA
  CY+=2;fC=false; // F889 CLC
  CY+=2;adc(0x50); // F88A ADC
  CY+=3;R[0x71]=A; // F88C STA
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // F88E LDX
  CY+=3;R[0x1E]=X; // F890 STX
  case 0xF892:CY+=3;pc=0xF90B;continue; // F892 JMP
  case 0xF895:CY+=3;A=R[0x69];fZ=(A)===0;fN=(A)>127; // F895 LDA
  CY+=2;if(fZ){CY+=1;pc=0xF8E3;continue;} // F897 BEQ
  CY+=3;t=R[0x18];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F899 BIT
  CY+=2;if(fN){CY+=1;pc=0xF8E3;continue;} // F89B BMI
  CY+=3;t=rd(0x3C);fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F89D BIT
  CY+=2;if(!fN){CY+=1;pc=0xF8A9;continue;} // F89F BPL
  CY+=3;A=R[0x67];fZ=(A)===0;fN=(A)>127; // F8A1 LDA
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // F8A3 AND
  CY+=3;R[0x67]=A; // F8A5 STA
  CY+=2;if(!fN){CY+=1;pc=0xF8E3;continue;} // F8A7 BPL
  case 0xF8A9:CY+=3;t=R[0x67];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F8A9 BIT
  CY+=2;if(fV){CY+=1;pc=0xF8E3;continue;} // F8AB BVS
  CY+=2;A=0xC0;fZ=(A)===0;fN=(A)>127; // F8AD LDA
  CY+=3;R[0x67]=A; // F8AF STA
  CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // F8B1 LDA
  CY+=3;R[0x6A]=A; // F8B3 STA
  CY+=2;Y=0x3;fZ=(Y)===0;fN=(Y)>127; // F8B5 LDY
  CY+=3;R[0x1E]=Y; // F8B7 STY
  CY+=3;A=R[0x75];fZ=(A)===0;fN=(A)>127; // F8B9 LDA
  CY+=3;R[0x66]=A; // F8BB STA
  case 0xF8BD:CY+=4;if((0xFED2&255)+Y>255) CY++;t=RB1[0xED2+Y];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F8BD CMP
  CY+=2;if(fC){CY+=1;pc=0xF8C5;continue;} // F8C0 BCS
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // F8C2 DEY
  CY+=2;if(!fZ){CY+=1;pc=0xF8BD;continue;} // F8C3 BNE
  case 0xF8C5:CY+=6;push(0xF8);push(0xC7);pc=0xFCE1;continue; // F8C5 JSR
  case 0xF8C8:CY+=2;t=0x0;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F8C8 CPX
  CY+=2;if(fZ){CY+=1;pc=0xF8D6;continue;} // F8CA BEQ
  case 0xF8CC:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // F8CC INY
  CY+=3;A=R[0xB];fZ=(A)===0;fN=(A)>127; // F8CD LDA
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F8CF CMP
  CY+=2;if(fZ){CY+=1;pc=0xF8D6;continue;} // F8D1 BEQ
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F8D3 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xF8CC;continue;} // F8D4 BNE
  case 0xF8D6:CY+=3;R[0x70]=Y; // F8D6 STY
  CY+=4;if((0xFECB&255)+Y>255) CY++;A=RB1[0xECB+Y];fZ=(A)===0;fN=(A)>127; // F8D8 LDA
  CY+=3;R[0x74]=A; // F8DB STA
  CY+=2;A=0x5;fZ=(A)===0;fN=(A)>127; // F8DD LDA
  CY+=3;R[0x6F]=A; // F8DF STA
  CY+=2;if(!fN){CY+=1;pc=0xF892;continue;} // F8E1 BPL
  case 0xF8E3:CY+=6;push(0xF8);push(0xE5);pc=0xFE05;continue; // F8E3 JSR
  case 0xF8E6:CY+=3;A=R[0x8];fZ=(A)===0;fN=(A)>127; // F8E6 LDA
  CY+=2;if(!fN){CY+=1;pc=0xF8ED;continue;} // F8E8 BPL
  CY+=6;push(0xF8);push(0xEC);pc=0xFD9A;continue; // F8EA JSR
  case 0xF8ED:CY+=6;push(0xF8);push(0xEF);pc=0xFBC9;continue; // F8ED JSR
  case 0xF8F0:CY+=2;A=0xB7;fZ=(A)===0;fN=(A)>127; // F8F0 LDA
  CY+=2;fC=false; // F8F2 CLC
  CY+=3;adc(R[0x75]); // F8F3 ADC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F8F5 LSR
  CY+=3;R[0xC]=A; // F8F6 STA
  CY+=4;Y=R[0x60+X&127];fZ=(Y)===0;fN=(Y)>127; // F8F8 LDY
  CY+=3;R[0x7B]=X; // F8FA STX
  CY+=2;A=0x3B;fZ=(A)===0;fN=(A)>127; // F8FC LDA
  CY+=2;fC=true; // F8FE SEC
  CY+=4;if((0xFE9B&255)+Y>255) CY++;sbc(RB1[0xE9B+Y]); // F8FF SBC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F902 LSR
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // F903 TAX
  CY+=2;A=0xDF;fZ=(A)===0;fN=(A)>127; // F904 LDA
  CY+=3;R[0xF]=A; // F906 STA
  CY+=3;pc=0xFFEC;continue; // F908 JMP
  case 0xF90B:CY+=3;wr(0x2C,A);if(FE)return 0xF90D; // F90B STA
  case 0xF90D:CY+=3;A=R[0x5D];fZ=(A)===0;fN=(A)>127; // F90D LDA
  CY+=2;t=0xA0;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F90F CMP
  CY+=2;if(!fC){CY+=1;pc=0xF917;continue;} // F911 BCC
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F913 LDA
  CY+=3;R[0x5D]=A; // F915 STA
  case 0xF917:CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // F917 LDX
  case 0xF919:CY+=4;Y=R[0x60+X&127];fZ=(Y)===0;fN=(Y)>127; // F919 LDY
  CY+=2;A=0x3B;fZ=(A)===0;fN=(A)>127; // F91B LDA
  CY+=2;fC=true; // F91D SEC
  CY+=4;if((0xFE9B&255)+Y>255) CY++;sbc(RB1[0xE9B+Y]); // F91E SBC
  CY+=4;R[0x77+X&127]=A; // F921 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F923 DEX
  CY+=2;if(!fN){CY+=1;pc=0xF919;continue;} // F924 BPL
  CY+=2;if(fN){CY+=1;pc=0xF95F;continue;} // F926 BMI
  case 0xF928:CY+=3;t=R[0x47];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F928 BIT
  CY+=2;if(!fN){CY+=1;pc=0xF962;continue;} // F92A BPL
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F92C LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F92E LSR
  CY+=2;if(fC){CY+=1;pc=0xF956;continue;} // F92F BCS
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F931 LSR
  CY+=2;if(fC){CY+=1;pc=0xF947;continue;} // F932 BCS
  CY+=6;push(0xF9);push(0x36);pc=0xFE3A;continue; // F934 JSR
  case 0xF937:CY+=2;t=0xFE;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F937 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF944;continue;} // F939 BNE
  CY+=2;A=0x1F;fZ=(A)===0;fN=(A)>127; // F93B LDA
  CY+=2;X=0x12;fZ=(X)===0;fN=(X)>127; // F93D LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F93F LDY
  CY+=3;R[0x79]=Y; // F941 STY
  CY+=7;push(0xF9);push(0x45);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F943 BRK
  case 0xF944:CY+=6;push(0xF9);push(0x46);pc=0xFE44;continue; // F944 JSR
  case 0xF947:CY+=3;X=R[0x37];fZ=(X)===0;fN=(X)>127; // F947 LDX
  CY+=2;t=0x50;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F949 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF953;continue;} // F94B BNE
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F94D LDA
  CY+=3;R[0x47]=A; // F94F STA
  CY+=2;if(fZ){CY+=1;pc=0xF95F;continue;} // F951 BEQ
  case 0xF953:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F953 INX
  CY+=3;R[0x37]=X; // F954 STX
  case 0xF956:CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F956 LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F958 INX
  CY+=2;t=0x98;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F959 CPX
  CY+=2;if(fC){CY+=1;pc=0xF95F;continue;} // F95B BCS
  CY+=3;R[0x5D]=X; // F95D STX
  case 0xF95F:CY+=3;pc=0xFFF2;continue; // F95F JMP
  case 0xF962:CY+=3;X=R[0x4A];fZ=(X)===0;fN=(X)>127; // F962 LDX
  CY+=2;if(fZ){CY+=1;pc=0xF9AA;continue;} // F964 BEQ
  CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // F966 LDX
  CY+=2;t=0x21;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F968 CPX
  CY+=2;if(fC){CY+=1;pc=0xF9C4;continue;} // F96A BCS
  CY+=3;t=R[0x45];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F96C BIT
  CY+=2;if(!fN){CY+=1;pc=0xF9C4;continue;} // F96E BPL
  CY+=3;X=R[0x48];fZ=(X)===0;fN=(X)>127; // F970 LDX
  CY+=2;if(!fN){CY+=1;pc=0xF9C4;continue;} // F972 BPL
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F974 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F976 LSR
  CY+=2;if(fC){CY+=1;pc=0xF95F;continue;} // F977 BCS
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F979 LSR
  CY+=2;if(fC){CY+=1;pc=0xF98F;continue;} // F97A BCS
  CY+=6;push(0xF9);push(0x7E);pc=0xFE3A;continue; // F97C JSR
  case 0xF97F:CY+=2;t=0xFE;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F97F CPX
  CY+=2;if(!fZ){CY+=1;pc=0xF98C;continue;} // F981 BNE
  CY+=2;A=0x1F;fZ=(A)===0;fN=(A)>127; // F983 LDA
  CY+=2;X=0x12;fZ=(X)===0;fN=(X)>127; // F985 LDX
  CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // F987 LDY
  CY+=3;R[0x79]=Y; // F989 STY
  CY+=7;push(0xF9);push(0x8D);push(getP()|16);fI=true;pc=0xFD31;if(FE)return pc;continue; // F98B BRK
  case 0xF98C:CY+=6;push(0xF9);push(0x8E);pc=0xFE44;continue; // F98C JSR
  case 0xF98F:CY+=3;X=R[0x37];fZ=(X)===0;fN=(X)>127; // F98F LDX
  CY+=2;t=0xA0;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // F991 CPX
  CY+=2;if(fZ){CY+=1;pc=0xF99A;continue;} // F993 BEQ
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // F995 INX
  CY+=3;R[0x37]=X; // F996 STX
  CY+=2;if(!fZ){CY+=1;pc=0xF95F;continue;} // F998 BNE
  case 0xF99A:CY+=5;t=R[0x4A];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x4A]=t; // F99A DEC
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F99C LDA
  CY+=3;R[0x47]=A; // F99E STA
  CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // F9A0 LDA
  CY+=3;R[0x37]=A; // F9A2 STA
  case 0xF9A4:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F9A4 LDA
  CY+=3;R[0x45]=A; // F9A6 STA
  CY+=2;if(fZ){CY+=1;pc=0xF95F;continue;} // F9A8 BEQ
  case 0xF9AA:CY+=3;t=R[0x4B];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F9AA BIT
  CY+=2;if(fN){CY+=1;pc=0xF95F;continue;} // F9AC BMI
  CY+=3;A=R[0x37];fZ=(A)===0;fN=(A)>127; // F9AE LDA
  CY+=2;fC=true; // F9B0 SEC
  CY+=3;sbc(R[0x5D]); // F9B1 SBC
  CY+=2;t=0xF7;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F9B3 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF95F;continue;} // F9B5 BCC
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F9B7 LDA
  CY+=2;X=0x5;fZ=(X)===0;fN=(X)>127; // F9B9 LDX
  CY+=6;push(0xF9);push(0xBD);pc=0xFDEA;continue; // F9BB JSR
  case 0xF9BE:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // F9BE LDA
  CY+=3;R[0x4B]=A; // F9C0 STA
  CY+=2;if(fN){CY+=1;pc=0xF9A4;continue;} // F9C2 BMI
  case 0xF9C4:CY+=3;X=R[0x48];fZ=(X)===0;fN=(X)>127; // F9C4 LDX
  CY+=2;if(fN){CY+=1;pc=0xF9F1;continue;} // F9C6 BMI
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // F9C8 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // F9CA LSR
  CY+=2;if(!fC){CY+=1;pc=0xF95F;continue;} // F9CB BCC
  CY+=3;t=R[0x49];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // F9CD BIT
  CY+=2;if(!fN){CY+=1;pc=0xF9DB;continue;} // F9CF BPL
  CY+=2;A=0xFE;fZ=(A)===0;fN=(A)>127; // F9D1 LDA
  CY+=3;adc(R[0x37]); // F9D3 ADC
  CY+=2;t=0x30;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F9D5 CMP
  CY+=2;if(!fC){CY+=1;pc=0xF9E5;continue;} // F9D7 BCC
  CY+=2;if(fC){CY+=1;pc=0xF9E3;continue;} // F9D9 BCS
  case 0xF9DB:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // F9DB LDA
  CY+=3;adc(R[0x37]); // F9DD ADC
  CY+=2;t=0x70;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F9DF CMP
  CY+=2;if(fC){CY+=1;pc=0xF9E5;continue;} // F9E1 BCS
  case 0xF9E3:CY+=3;R[0x37]=A; // F9E3 STA
  case 0xF9E5:CY+=4;if((0xFEAD&255)+X>255) CY++;A=RB1[0xEAD+X];fZ=(A)===0;fN=(A)>127; // F9E5 LDA
  CY+=6;push(0xF9);push(0xEA);pc=0xFD77;continue; // F9E8 JSR
  case 0xF9EB:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // F9EB DEX
  CY+=3;R[0x48]=X; // F9EC STX
  case 0xF9EE:CY+=3;pc=0xFFF2;continue; // F9EE JMP
  case 0xF9F1:CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // F9F1 LDA
  CY+=2;A&=0x26;fZ=(A)===0;fN=(A)>127; // F9F3 AND
  CY+=2;if(!fZ){CY+=1;pc=0xF9EE;continue;} // F9F5 BNE
  CY+=3;A=R[0x37];fZ=(A)===0;fN=(A)>127; // F9F7 LDA
  CY+=2;t=0x68;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F9F9 CMP
  CY+=2;if(fC){CY+=2;pc=0xFA01;continue;} // F9FB BCS
  CY+=3;t=R[0x5D];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // F9FD CMP
  CY+=2;if(!fC){CY+=1;pc=0xFA05;continue;} // F9FF BCC
  case 0xFA01:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // FA01 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xFA07;continue;} // FA03 BNE
  case 0xFA05:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FA05 LDA
  case 0xFA07:CY+=3;R[0x49]=A; // FA07 STA
  CY+=2;A=0x17;fZ=(A)===0;fN=(A)>127; // FA09 LDA
  CY+=3;R[0x48]=A; // FA0B STA
  CY+=2;if(!fZ){CY+=2;pc=0xF9EE;continue;} // FA0D BNE
  case 0xFA0F:CY+=5;t=R[0x76];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x76]=t; // FA0F DEC
  CY+=2;if(!fN){CY+=1;pc=0xFA28;continue;} // FA11 BPL
  CY+=6;push(0xFA);push(0x15);pc=0xFCE1;continue; // FA13 JSR
  case 0xFA16:CY+=4;if((0xFE79&255)+X>255) CY++;A=RB1[0xE79+X];fZ=(A)===0;fN=(A)>127; // FA16 LDA
  CY+=3;R[0x76]=A; // FA19 STA
  CY+=2;X=0x3;fZ=(X)===0;fN=(X)>127; // FA1B LDX
  case 0xFA1D:CY+=4;A=R[0x27+X&127];fZ=(A)===0;fN=(A)>127; // FA1D LDA
  CY+=2;t=0xD;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA1F CMP
  CY+=2;if(fC){CY+=1;pc=0xFA25;continue;} // FA21 BCS
  CY+=6;t=R[0x23+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x23+X&127]=t; // FA23 INC
  case 0xFA25:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FA25 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xFA1D;continue;} // FA26 BNE
  case 0xFA28:CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FA28 LDX
  CY+=2;if(fZ){CY+=1;pc=0xFA49;continue;} // FA2A BEQ
  case 0xFA2C:CY+=4;A=R[0x23+X&127];fZ=(A)===0;fN=(A)>127; // FA2C LDA
  CY+=2;t=0x87;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA2E CMP
  CY+=2;if(fC){CY+=1;pc=0xFA37;continue;} // FA30 BCS
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FA32 DEX
  CY+=2;if(!fN){CY+=1;pc=0xFA2C;continue;} // FA33 BPL
  CY+=2;if(fN){CY+=1;pc=0xFA49;continue;} // FA35 BMI
  case 0xFA37:CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // FA37 LDA
  CY+=2;if(fZ){CY+=1;pc=0xFA43;continue;} // FA39 BEQ
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FA3B LDA
  CY+=3;R[0x6C]=A; // FA3D STA
  CY+=2;A=0x5;fZ=(A)===0;fN=(A)>127; // FA3F LDA
  CY+=3;R[0x64]=A; // FA41 STA
  case 0xFA43:CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FA43 TXA
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // FA44 TAY
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FA45 DEX
  CY+=6;push(0xFA);push(0x48);pc=0xFCEA;continue; // FA46 JSR
  case 0xFA49:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // FA49 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FA4B LSR
  CY+=2;if(!fC){CY+=1;pc=0xFA51;continue;} // FA4C BCC
  CY+=3;pc=0xFACC;continue; // FA4E JMP
  case 0xFA51:CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FA51 LDX
  CY+=2;if(fZ){CY+=1;pc=0xFA67;continue;} // FA53 BEQ
  case 0xFA55:CY+=4;A=R[0x1F+X&127];fZ=(A)===0;fN=(A)>127; // FA55 LDA
  CY+=2;fC=true; // FA57 SEC
  CY+=3;sbc(R[0x1F]); // FA58 SBC
  CY+=3;R[0x7A]=A; // FA5A STA
  CY+=2;t=0xFE;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA5C CMP
  CY+=2;if(fC){CY+=1;pc=0xFA69;continue;} // FA5E BCS
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA60 CMP
  CY+=2;if(!fC){CY+=1;pc=0xFA69;continue;} // FA62 BCC
  case 0xFA64:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FA64 DEX
  CY+=2;if(!fZ){CY+=1;pc=0xFA55;continue;} // FA65 BNE
  case 0xFA67:CY+=2;if(fZ){CY+=1;pc=0xFACA;continue;} // FA67 BEQ
  case 0xFA69:CY+=4;A=R[0x23+X&127];fZ=(A)===0;fN=(A)>127; // FA69 LDA
  CY+=2;fC=true; // FA6B SEC
  CY+=3;sbc(R[0x23]); // FA6C SBC
  CY+=3;R[0x13]=A; // FA6E STA
  CY+=2;t=0xF3;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA70 CMP
  CY+=2;if(fC){CY+=1;pc=0xFA78;continue;} // FA72 BCS
  CY+=2;t=0x8;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA74 CMP
  CY+=2;if(fC){CY+=1;pc=0xFA64;continue;} // FA76 BCS
  case 0xFA78:CY+=4;A=R[0x5E+X&127];fZ=(A)===0;fN=(A)>127; // FA78 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFA64;continue;} // FA7A BPL
  CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // FA7C LDA
  CY+=2;t=0xC;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA7E CMP
  CY+=2;if(fZ){CY+=1;pc=0xFA94;continue;} // FA80 BEQ
  CY+=3;t=R[0x6A];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // FA82 BIT
  CY+=2;if(!fN){CY+=1;pc=0xFA94;continue;} // FA84 BPL
  CY+=3;A=R[0x13];fZ=(A)===0;fN=(A)>127; // FA86 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFA94;continue;} // FA88 BPL
  CY+=3;A=R[0x7A];fZ=(A)===0;fN=(A)>127; // FA8A LDA
  CY+=2;t=0xFF;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA8C CMP
  CY+=2;if(fC){CY+=1;pc=0xFAA7;continue;} // FA8E BCS
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FA90 CMP
  CY+=2;if(!fC){CY+=1;pc=0xFAA7;continue;} // FA92 BCC
  case 0xFA94:CY+=5;t=R[0x8];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // FA94 DEC
  CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // FA96 LDA
  CY+=3;R[0x6A]=A; // FA98 STA
  CY+=3;A=R[0x70];fZ=(A)===0;fN=(A)>127; // FA9A LDA
  CY+=2;fC=true; // FA9C SEC
  CY+=3;sbc(R[0x68]); // FA9D SBC
  CY+=3;R[0x70]=A; // FA9F STA
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // FAA1 LDA
  CY+=3;R[0x6B]=A; // FAA3 STA
  CY+=2;if(!fZ){CY+=1;pc=0xFACA;continue;} // FAA5 BNE
  case 0xFAA7:CY+=2;A=0x19;fZ=(A)===0;fN=(A)>127; // FAA7 LDA
  CY+=4;R[0x5E+X&127]=A; // FAA9 STA
  CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // FAAB LDA
  CY+=2;if(fZ){CY+=1;pc=0xFAB3;continue;} // FAAD BEQ
  CY+=2;A=0xF;fZ=(A)===0;fN=(A)>127; // FAAF LDA
  CY+=2;if(!fN){CY+=1;pc=0xFABF;continue;} // FAB1 BPL
  case 0xFAB3:CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // FAB3 LDA
  CY+=2;t=0xA;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FAB5 CMP
  CY+=2;if(fZ){CY+=1;pc=0xFABD;continue;} // FAB7 BEQ
  CY+=2;A=0xD;fZ=(A)===0;fN=(A)>127; // FAB9 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFABF;continue;} // FABB BPL
  case 0xFABD:CY+=2;A=0xE;fZ=(A)===0;fN=(A)>127; // FABD LDA
  case 0xFABF:CY+=4;R[0x27+X&127]=A; // FABF STA
  CY+=2;fC=true; // FAC1 SEC
  CY+=2;sbc(0xC); // FAC2 SBC
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FAC4 TAX
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FAC5 LDA
  CY+=6;push(0xFA);push(0xC9);pc=0xFDEA;continue; // FAC7 JSR
  case 0xFACA:CY+=2;if(!fN){CY+=1;pc=0xFAFD;continue;} // FACA BPL
  case 0xFACC:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // FACC LDA
  CY+=2;A&=0x2;fZ=(A)===0;fN=(A)>127; // FACE AND
  CY+=2;if(!fZ){CY+=1;pc=0xFAEE;continue;} // FAD0 BNE
  CY+=5;t=R[0x6B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x6B]=t; // FAD2 DEC
  CY+=2;if(!fZ){CY+=1;pc=0xFAFD;continue;} // FAD4 BNE
  CY+=2;A=0x6;fZ=(A)===0;fN=(A)>127; // FAD6 LDA
  CY+=3;R[0x6B]=A; // FAD8 STA
  CY+=3;X=R[0x1F];fZ=(X)===0;fN=(X)>127; // FADA LDX
  CY+=2;t=0x25;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FADC CPX
  CY+=2;if(!fZ){CY+=1;pc=0xFAE9;continue;} // FADE BNE
  CY+=2;A=0x3;fZ=(A)===0;fN=(A)>127; // FAE0 LDA
  CY+=3;R[0x6A]=A; // FAE2 STA
  CY+=2;A=0x50;fZ=(A)===0;fN=(A)>127; // FAE4 LDA
  CY+=3;R[0x6B]=A; // FAE6 STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FAE8 DEX
  case 0xFAE9:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FAE9 INX
  CY+=3;R[0x1F]=X; // FAEA STX
  CY+=2;if(!fZ){CY+=1;pc=0xFAFD;continue;} // FAEC BNE
  case 0xFAEE:CY+=5;t=R[0x6B];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x6B]=t; // FAEE DEC
  CY+=2;if(!fZ){CY+=1;pc=0xFAFD;continue;} // FAF0 BNE
  CY+=3;A=R[0x8];fZ=(A)===0;fN=(A)>127; // FAF2 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFAF9;continue;} // FAF4 BPL
  CY+=6;push(0xFA);push(0xF8);pc=0xFD9A;continue; // FAF6 JSR
  case 0xFAF9:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // FAF9 LDA
  CY+=3;R[0xA]=A; // FAFB STA
  case 0xFAFD:CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // FAFD LDX
  case 0xFAFF:CY+=4;Y=R[0x5F+X&127];fZ=(Y)===0;fN=(Y)>127; // FAFF LDY
  CY+=2;if(fN){CY+=1;pc=0xFB07;continue;} // FB01 BMI
  CY+=6;t=R[0x5F+X&127];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x5F+X&127]=t; // FB03 DEC
  CY+=2;if(fN){CY+=1;pc=0xFB0C;continue;} // FB05 BMI
  case 0xFB07:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FB07 DEX
  CY+=2;if(!fN){CY+=2;pc=0xFAFF;continue;} // FB08 BPL
  CY+=2;if(fN){CY+=1;pc=0xFB20;continue;} // FB0A BMI
  case 0xFB0C:CY+=3;R[0x7A]=X; // FB0C STX
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FB0E TXA
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // FB0F TAY
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FB10 INY
  CY+=6;push(0xFB);push(0x13);pc=0xFCEA;continue; // FB11 JSR
  case 0xFB14:CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // FB14 LDA
  CY+=2;if(fZ){CY+=1;pc=0xFB20;continue;} // FB16 BEQ
  CY+=2;A=0x5;fZ=(A)===0;fN=(A)>127; // FB18 LDA
  CY+=3;R[0x64]=A; // FB1A STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FB1C LDA
  CY+=3;R[0x6C]=A; // FB1E STA
  case 0xFB20:CY+=2;Y=0x0;fZ=(Y)===0;fN=(Y)>127; // FB20 LDY
  case 0xFB22:CY+=2;A=0x30;fZ=(A)===0;fN=(A)>127; // FB22 LDA
  CY+=3;R[0x15]=A; // FB24 STA
  CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FB26 LDX
  case 0xFB28:CY+=4;A=R[0x1F+X&127];fZ=(A)===0;fN=(A)>127; // FB28 LDA
  CY+=2;if(fN){CY+=1;pc=0xFB34;continue;} // FB2A BMI
  CY+=3;t=R[0x15];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FB2C CMP
  CY+=2;if(fC){CY+=1;pc=0xFB34;continue;} // FB2E BCS
  CY+=3;R[0x15]=A; // FB30 STA
  CY+=3;R[0x7A]=X; // FB32 STX
  case 0xFB34:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FB34 DEX
  CY+=2;if(!fN){CY+=1;pc=0xFB28;continue;} // FB35 BPL
  CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // FB37 LDX
  CY+=3;A=R[0x15];fZ=(A)===0;fN=(A)>127; // FB39 LDA
  CY+=5;wr((0xAB+Y),A);if(FE)return 0xFB3E; // FB3B STA
  case 0xFB3E:CY+=2;A^=0xFF;fZ=(A)===0;fN=(A)>127; // FB3E EOR
  CY+=2;fC=false; // FB40 CLC
  CY+=2;adc(0x1); // FB41 ADC
  CY+=4;R[0x1F+X&127]=A; // FB43 STA
  CY+=4;A=R[0x23+X&127];fZ=(A)===0;fN=(A)>127; // FB45 LDA
  CY+=5;wr((0xAF+Y),A);if(FE)return 0xFB4A; // FB47 STA
  case 0xFB4A:CY+=4;wr((0xB3+Y&255),X);if(FE)return 0xFB4C; // FB4A STX
  case 0xFB4C:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FB4C INY
  CY+=3;t=R[0x68];fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FB4D CPY
  CY+=2;if(fZ){CY+=1;pc=0xFB22;continue;} // FB4F BEQ
  CY+=2;if(!fC){CY+=1;pc=0xFB22;continue;} // FB51 BCC
  CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FB53 LDX
  case 0xFB55:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FB55 LDA
  CY+=2;fC=true; // FB57 SEC
  CY+=4;sbc(R[0x1F+X&127]); // FB58 SBC
  CY+=4;R[0x1F+X&127]=A; // FB5A STA
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FB5C DEX
  CY+=2;if(!fN){CY+=1;pc=0xFB55;continue;} // FB5D BPL
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FB5F LDA
  CY+=2;A&=0x1F;fZ=(A)===0;fN=(A)>127; // FB61 AND
  CY+=2;if(!fZ){CY+=1;pc=0xFB7C;continue;} // FB63 BNE
  CY+=5;t=R[0x75];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x75]=t; // FB65 INC
  CY+=3;A=R[0x75];fZ=(A)===0;fN=(A)>127; // FB67 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // FB69 AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FB6B TAX
  CY+=3;A=R[0x1];fZ=(A)===0;fN=(A)>127; // FB6C LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // FB6E AND
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // FB70 TAY
  CY+=4;if((0xFE59&255)+X>255) CY++;A=RB1[0xE59+X];fZ=(A)===0;fN=(A)>127; // FB71 LDA
  CY+=2;t=0x0;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FB74 CPY
  CY+=2;if(!fZ){CY+=1;pc=0xFB7A;continue;} // FB76 BNE
  CY+=2;adc(0x2); // FB78 ADC
  case 0xFB7A:CY+=3;R[0x71]=A; // FB7A STA
  case 0xFB7C:CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FB7C LDX
  case 0xFB7E:CY+=4;Y=R[0x33+X&127];fZ=(Y)===0;fN=(Y)>127; // FB7E LDY
  CY+=2;if(fZ){CY+=1;pc=0xFB91;continue;} // FB80 BEQ
  CY+=4;if((0xA7&255)+Y>255) CY++;A=rd((0xA7+Y));fZ=(A)===0;fN=(A)>127; // FB82 LDA
  CY+=2;t=0xD;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FB85 CMP
  CY+=2;if(fC){CY+=1;pc=0xFB8B;continue;} // FB87 BCS
  CY+=3;A=R[0x71];fZ=(A)===0;fN=(A)>127; // FB89 LDA
  case 0xFB8B:CY+=4;R[0x33+X&127]=A; // FB8B STA
  CY+=2;t=0x0;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FB8D CMP
  CY+=2;if(!fZ){CY+=1;pc=0xFBAD;continue;} // FB8F BNE
  case 0xFB91:CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // FB91 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFB99;continue;} // FB93 BPL
  CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // FB95 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xFBAB;continue;} // FB97 BNE
  case 0xFB99:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FB99 LDA
  CY+=2;A&=0x18;fZ=(A)===0;fN=(A)>127; // FB9B AND
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FB9D LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FB9E LSR
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FB9F LSR
  CY+=2;Y=A;fZ=(Y)===0;fN=(Y)>127; // FBA0 TAY
  CY+=3;A=R[0x6A];fZ=(A)===0;fN=(A)>127; // FBA1 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FBA3 LSR
  CY+=2;A=Y;fZ=(A)===0;fN=(A)>127; // FBA4 TYA
  CY+=2;if(!fC){CY+=1;pc=0xFBAB;continue;} // FBA5 BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FBA7 LSR
  CY+=2;fC=false; // FBA8 CLC
  CY+=2;adc(0x5); // FBA9 ADC
  case 0xFBAB:CY+=4;R[0x33+X&127]=A; // FBAB STA
  case 0xFBAD:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FBAD DEX
  CY+=2;if(!fN){CY+=1;pc=0xFB7E;continue;} // FBAE BPL
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FBB0 INX
  CY+=3;R[0x79]=X; // FBB1 STX
  CY+=3;X=R[0x68];fZ=(X)===0;fN=(X)>127; // FBB3 LDX
  CY+=3;R[0x69]=X; // FBB5 STX
  CY+=2;if(fZ){CY+=1;pc=0xFBC6;continue;} // FBB7 BEQ
  case 0xFBB9:CY+=4;A=R[0x33+X&127];fZ=(A)===0;fN=(A)>127; // FBB9 LDA
  CY+=2;t=0x7;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FBBB CMP
  CY+=2;if(!fC){CY+=1;pc=0xFBC2;continue;} // FBBD BCC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FBBF DEX
  CY+=2;if(!fN){CY+=1;pc=0xFBB9;continue;} // FBC0 BPL
  case 0xFBC2:CY+=3;R[0x14]=X; // FBC2 STX
  CY+=3;Y=R[0x14];fZ=(Y)===0;fN=(Y)>127; // FBC4 LDY
  case 0xFBC6:CY+=3;pc=0xFFF2;continue; // FBC6 JMP
  case 0xFBC9:CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // FBC9 LDA
  CY+=2;A&=0x1;fZ=(A)===0;fN=(A)>127; // FBCB AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FBCD TAX
  CY+=4;A=R[0x64+X&127];fZ=(A)===0;fN=(A)>127; // FBCE LDA
  CY+=2;fC=false; // FBD0 CLC
  CY+=2;adc(0xF4); // FBD1 ADC
  CY+=3;R[0x5D]=A; // FBD3 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FBD5 RTS
  case 0xFBD6:CY+=2;fD=true; // FBD6 SED
  CY+=2;fC=true; // FBD7 SEC
  CY+=3;A=R[0x6];fZ=(A)===0;fN=(A)>127; // FBD8 LDA
  CY+=2;sbc(0x10); // FBDA SBC
  CY+=3;R[0x6]=A; // FBDC STA
  CY+=3;A=R[0x7];fZ=(A)===0;fN=(A)>127; // FBDE LDA
  CY+=2;sbc(0x0); // FBE0 SBC
  CY+=3;R[0x7]=A; // FBE2 STA
  CY+=2;fD=false; // FBE4 CLD
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FBE5 RTS
  case 0xFBE6:CY+=3;A=R[0x3E];fZ=(A)===0;fN=(A)>127; // FBE6 LDA
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FBE8 TAX
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FBE9 LSR
  CY+=2;if(!fC){CY+=1;pc=0xFBED;continue;} // FBEA BCC
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FBEC INX
  case 0xFBED:CY+=3;R[0x39]=X; // FBED STX
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FBEF TXA
  CY+=2;fC=false; // FBF0 CLC
  CY+=2;adc(0xC); // FBF1 ADC
  CY+=3;R[0x38]=A; // FBF3 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FBF5 RTS
  case 0xFBF6:CY+=3;t=R[0x3D];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // FBF6 BIT
  CY+=2;if(fN){CY+=2;pc=0xFC3A;continue;} // FBF8 BMI
  CY+=3;X=R[0x6A];fZ=(X)===0;fN=(X)>127; // FBFA LDX
  CY+=2;t=0x6;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FBFC CPX
  CY+=2;if(!fZ){CY+=1;pc=0xFC0E;continue;} // FBFE BNE
  CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // FC00 LDA
  CY+=3;R[0x6A]=A; // FC02 STA
  CY+=2;A=0x98;fZ=(A)===0;fN=(A)>127; // FC04 LDA
  CY+=3;R[0x5D]=A; // FC06 STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FC08 LDA
  CY+=3;R[0x41]=A; // FC0A STA
  CY+=3;R[0x43]=A; // FC0C STA
  case 0xFC0E:CY+=2;t=0x0;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FC0E CPX
  CY+=2;if(!fZ){CY+=1;pc=0xFC14;continue;} // FC10 BNE
  CY+=5;t=R[0x6A];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x6A]=t; // FC12 INC
  case 0xFC14:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FC14 LDA
  CY+=2;A&=0x3;fZ=(A)===0;fN=(A)>127; // FC16 AND
  CY+=2;if(!fZ){CY+=1;pc=0xFC41;continue;} // FC18 BNE
  CY+=3;X=R[0x6A];fZ=(X)===0;fN=(X)>127; // FC1A LDX
  CY+=3;t=R[0x41];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // FC1C BIT
  CY+=2;if(!fN){CY+=1;pc=0xFC29;continue;} // FC1E BPL
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FC20 INX
  CY+=2;t=0x4;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FC21 CPX
  CY+=2;if(!fC){CY+=1;pc=0xFC3F;continue;} // FC23 BCC
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FC25 LDA
  CY+=2;if(fZ){CY+=1;pc=0xFC34;continue;} // FC27 BEQ
  case 0xFC29:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FC29 DEX
  CY+=2;if(fN){CY+=1;pc=0xFC32;continue;} // FC2A BMI
  CY+=2;if(fZ){CY+=1;pc=0xFC32;continue;} // FC2C BEQ
  CY+=2;t=0x4;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FC2E CPX
  CY+=2;if(!fC){CY+=1;pc=0xFC3F;continue;} // FC30 BCC
  case 0xFC32:CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // FC32 LDA
  case 0xFC34:CY+=3;R[0x41]=A; // FC34 STA
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // FC36 LDX
  CY+=2;if(!fZ){CY+=1;pc=0xFC3F;continue;} // FC38 BNE
  case 0xFC3A:CY+=2;X=0x4;fZ=(X)===0;fN=(X)>127; // FC3A LDX
  CY+=2;if(fV){CY+=1;pc=0xFC3F;continue;} // FC3C BVS
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FC3E INX
  case 0xFC3F:CY+=3;R[0x6A]=X; // FC3F STX
  case 0xFC41:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FC41 RTS
  case 0xFC42:CY+=3;A=R[0x38];fZ=(A)===0;fN=(A)>127; // FC42 LDA
  CY+=2;fC=true; // FC44 SEC
  CY+=3;sbc(R[0x3C]); // FC45 SBC
  CY+=2;if(!fN){CY+=1;pc=0xFC4B;continue;} // FC47 BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FC49 LDA
  case 0xFC4B:CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FC4B TAX
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FC4C LDA
  CY+=3;Y=R[0x9];fZ=(Y)===0;fN=(Y)>127; // FC4E LDY
  CY+=2;t=0x3;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FC50 CPY
  CY+=2;if(fZ){CY+=1;pc=0xFC5E;continue;} // FC52 BEQ
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FC54 LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FC55 BCS
  CY+=2;t=0x8;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FC57 CPX
  CY+=2;if(!fC){CY+=1;pc=0xFC65;continue;} // FC59 BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FC5B LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FC5C BCS
  case 0xFC5E:CY+=2;t=0x12;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FC5E CPX
  CY+=2;if(!fC){CY+=1;pc=0xFC65;continue;} // FC60 BCC
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FC62 LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FC63 BCS
  case 0xFC65:CY+=5;t=R[0x38];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x38]=t; // FC65 DEC
  CY+=5;t=R[0x38];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x38]=t; // FC67 DEC
  CY+=5;t=R[0x39];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x39]=t; // FC69 DEC
  CY+=5;t=R[0x39];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x39]=t; // FC6B DEC
  CY+=3;A=R[0x38];fZ=(A)===0;fN=(A)>127; // FC6D LDA
  CY+=3;t=R[0x3C];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FC6F CMP
  CY+=2;if(fZ){CY+=1;pc=0xFC75;continue;} // FC71 BEQ
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FC73 BCS
  case 0xFC75:CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // FC75 LDA
  CY+=2;A&=0x3F;fZ=(A)===0;fN=(A)>127; // FC77 AND
  CY+=3;R[0x3D]=A; // FC79 STA
  CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // FC7B LDA
  CY+=3;R[0x6A]=A; // FC7D STA
  case 0xFC7F:CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // FC7F LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FC81 LSR
  CY+=2;if(!fC){CY+=1;pc=0xFCA8;continue;} // FC82 BCC
  CY+=3;A=R[0x9];fZ=(A)===0;fN=(A)>127; // FC84 LDA
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FC86 CMP
  CY+=2;if(fZ){CY+=1;pc=0xFC9A;continue;} // FC88 BEQ
  CY+=3;A=R[0x46];fZ=(A)===0;fN=(A)>127; // FC8A LDA
  CY+=2;fC=false; // FC8C CLC
  CY+=3;adc(R[0x5D]); // FC8D ADC
  CY+=2;t=0x1E;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FC8F CMP
  CY+=2;if(!fC){CY+=1;pc=0xFCA8;continue;} // FC91 BCC
  CY+=2;t=0x98;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FC93 CMP
  CY+=2;if(fC){CY+=1;pc=0xFCA8;continue;} // FC95 BCS
  CY+=3;R[0x5D]=A; // FC97 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FC99 RTS
  case 0xFC9A:CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FC9A LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FC9C LSR
  CY+=2;if(fC){CY+=1;pc=0xFCA8;continue;} // FC9D BCS
  CY+=3;X=R[0x5D];fZ=(X)===0;fN=(X)>127; // FC9F LDX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FCA1 DEX
  CY+=2;t=0x4E;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FCA2 CPX
  CY+=2;if(fZ){CY+=1;pc=0xFCA8;continue;} // FCA4 BEQ
  CY+=3;R[0x5D]=X; // FCA6 STX
  case 0xFCA8:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FCA8 RTS
  case 0xFCA9:CY+=3;A=R[0x3C];fZ=(A)===0;fN=(A)>127; // FCA9 LDA
  CY+=2;fC=true; // FCAB SEC
  CY+=3;sbc(R[0x38]); // FCAC SBC
  CY+=2;if(!fN){CY+=1;pc=0xFCB2;continue;} // FCAE BPL
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FCB0 LDA
  case 0xFCB2:CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FCB2 TAX
  CY+=3;A=R[0x0];fZ=(A)===0;fN=(A)>127; // FCB3 LDA
  CY+=3;Y=R[0x9];fZ=(Y)===0;fN=(Y)>127; // FCB5 LDY
  CY+=2;t=0x3;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FCB7 CPY
  CY+=2;if(fZ){CY+=1;pc=0xFCBE;continue;} // FCB9 BEQ
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FCBB LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FCBC BCS
  case 0xFCBE:CY+=2;t=0xB;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FCBE CPX
  CY+=2;if(fC){CY+=1;pc=0xFCCC;continue;} // FCC0 BCS
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FCC2 LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FCC3 BCS
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FCC5 CPX
  CY+=2;if(fC){CY+=1;pc=0xFCCC;continue;} // FCC7 BCS
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FCC9 LSR
  CY+=2;if(fC){CY+=1;pc=0xFC7F;continue;} // FCCA BCS
  case 0xFCCC:CY+=5;t=R[0x38];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x38]=t; // FCCC INC
  CY+=5;t=R[0x38];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x38]=t; // FCCE INC
  CY+=5;t=R[0x39];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x39]=t; // FCD0 INC
  CY+=5;t=R[0x39];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x39]=t; // FCD2 INC
  CY+=3;A=R[0x38];fZ=(A)===0;fN=(A)>127; // FCD4 LDA
  CY+=3;t=R[0x3C];fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FCD6 CMP
  CY+=2;if(!fC){CY+=1;pc=0xFC7F;continue;} // FCD8 BCC
  CY+=3;A=R[0x3D];fZ=(A)===0;fN=(A)>127; // FCDA LDA
  CY+=2;A&=0xBF;fZ=(A)===0;fN=(A)>127; // FCDC AND
  CY+=3;R[0x3D]=A; // FCDE STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FCE0 RTS
  case 0xFCE1:CY+=3;X=R[0xB];fZ=(X)===0;fN=(X)>127; // FCE1 LDX
  CY+=2;t=0x3;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FCE3 CPX
  CY+=2;if(!fC){CY+=1;pc=0xFCE9;continue;} // FCE5 BCC
  CY+=2;X=0x2;fZ=(X)===0;fN=(X)>127; // FCE7 LDX
  case 0xFCE9:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FCE9 RTS
  case 0xFCEA:CY+=3;R[0x7A]=X; // FCEA STX
  CY+=3;R[0x7B]=Y; // FCEC STY
  CY+=3;A=R[0x6C];fZ=(A)===0;fN=(A)>127; // FCEE LDA
  CY+=2;if(!fZ){CY+=2;pc=0xFD17;continue;} // FCF0 BNE
  CY+=4;A=R[0x65+X&127];fZ=(A)===0;fN=(A)>127; // FCF2 LDA
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FCF4 TAX
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FCF5 LDA
  CY+=4;R[0x6D+X&127]=A; // FCF7 STA
  CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // FCF9 LDX
  case 0xFCFB:CY+=2;t=0x3;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FCFB CPY
  CY+=2;if(fC){CY+=2;pc=0xFD0D;continue;} // FCFD BCS
  CY+=4;if((0xDF&255)+Y>255) CY++;A=rd((0xDF+Y));fZ=(A)===0;fN=(A)>127; // FCFF LDA
  CY+=4;R[0x5F+X&127]=A; // FD02 STA
  CY+=4;if((0xE5&255)+Y>255) CY++;A=rd((0xE5+Y));fZ=(A)===0;fN=(A)>127; // FD04 LDA
  CY+=4;R[0x65+X&127]=A; // FD07 STA
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FD09 INX
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FD0A INY
  CY+=2;if(!fN){CY+=2;pc=0xFCFB;continue;} // FD0B BPL
  case 0xFD0D:CY+=2;A=0xFF;fZ=(A)===0;fN=(A)>127; // FD0D LDA
  CY+=3;R[0x61]=A; // FD0F STA
  CY+=3;R[0x67]=A; // FD11 STA
  CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // FD13 LDX
  CY+=3;Y=R[0x7B];fZ=(Y)===0;fN=(Y)>127; // FD15 LDY
  case 0xFD17:CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FD17 INX
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FD18 INY
  CY+=3;t=R[0x68];fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FD19 CPX
  CY+=2;if(fC){CY+=1;pc=0xFD2E;continue;} // FD1B BCS
  CY+=4;if((0x9F&255)+Y>255) CY++;A=rd((0x9F+Y));fZ=(A)===0;fN=(A)>127; // FD1D LDA
  CY+=4;R[0x1F+X&127]=A; // FD20 STA
  CY+=4;if((0xA3&255)+Y>255) CY++;A=rd((0xA3+Y));fZ=(A)===0;fN=(A)>127; // FD22 LDA
  CY+=4;R[0x23+X&127]=A; // FD25 STA
  CY+=4;if((0xA7&255)+Y>255) CY++;A=rd((0xA7+Y));fZ=(A)===0;fN=(A)>127; // FD27 LDA
  CY+=4;R[0x27+X&127]=A; // FD2A STA
  CY+=2;if(!fN){CY+=1;pc=0xFD17;continue;} // FD2C BPL
  case 0xFD2E:CY+=5;t=R[0x68];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x68]=t; // FD2E DEC
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FD30 RTS
  case 0xFD31:CY+=3;R[0x7B]=A; // FD31 STA
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FD33 TXA
  CY+=2;fC=false; // FD34 CLC
  CY+=3;adc(R[0x7B]); // FD35 ADC
  CY+=3;R[0x7A]=A; // FD37 STA
  case 0xFD39:CY+=3;X=R[0x7A];fZ=(X)===0;fN=(X)>127; // FD39 LDX
  case 0xFD3B:CY+=6;t=R[0x0+X&127];fC=t>127;t=t<<1&255;fZ=(t)===0;fN=(t)>127;R[0x0+X&127]=t; // FD3B ASL
  CY+=6;t=R[0x1+X&127];u=fC?128:0;fC=(t&1)===1;t=t>>1|u;fZ=(t)===0;fN=(t)>127;R[0x1+X&127]=t; // FD3D ROR
  CY+=6;t=R[0x2+X&127];u=fC?1:0;fC=t>127;t=(t<<1|u)&255;fZ=(t)===0;fN=(t)>127;R[0x2+X&127]=t; // FD3F ROL
  CY+=3;t=R[0x79];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // FD41 BIT
  CY+=2;if(!fN){CY+=1;pc=0xFD5A;continue;} // FD43 BPL
  CY+=2;if(!fC){CY+=1;pc=0xFD4D;continue;} // FD45 BCC
  CY+=4;A=R[0x0+X&127];fZ=(A)===0;fN=(A)>127; // FD47 LDA
  CY+=2;A|=0x10;fZ=(A)===0;fN=(A)>127; // FD49 ORA
  CY+=4;R[0x0+X&127]=A; // FD4B STA
  case 0xFD4D:CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FD4D DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FD4E DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FD4F DEX
  case 0xFD50:CY+=3;t=R[0x7B];fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FD50 CPX
  CY+=2;if(fC){CY+=1;pc=0xFD3B;continue;} // FD52 BCS
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // FD54 DEY
  CY+=2;if(!fN){CY+=1;pc=0xFD39;continue;} // FD55 BPL
  CY+=5;t=R[0x7E];t=t-1&255;fZ=(t)===0;fN=(t)>127;R[0x7E]=t; // FD57 DEC
  CY+=6;setP(pull());t=pull();pc=rpc(pull()<<8|t);continue; // FD59 RTI
  case 0xFD5A:CY+=2;if(!fC){CY+=1;pc=0xFD62;continue;} // FD5A BCC
  CY+=4;A=R[0x3+X&127];fZ=(A)===0;fN=(A)>127; // FD5C LDA
  CY+=2;A|=0x8;fZ=(A)===0;fN=(A)>127; // FD5E ORA
  CY+=4;R[0x3+X&127]=A; // FD60 STA
  case 0xFD62:CY+=6;t=R[0x3+X&127];fC=t>127;t=t<<1&255;fZ=(t)===0;fN=(t)>127;R[0x3+X&127]=t; // FD62 ASL
  CY+=6;t=R[0x4+X&127];u=fC?128:0;fC=(t&1)===1;t=t>>1|u;fZ=(t)===0;fN=(t)>127;R[0x4+X&127]=t; // FD64 ROR
  CY+=6;t=R[0x5+X&127];u=fC?1:0;fC=t>127;t=(t<<1|u)&255;fZ=(t)===0;fN=(t)>127;R[0x5+X&127]=t; // FD66 ROL
  CY+=2;if(!fC){CY+=1;pc=0xFD70;continue;} // FD68 BCC
  CY+=4;A=R[0x0+X&127];fZ=(A)===0;fN=(A)>127; // FD6A LDA
  CY+=2;A|=0x10;fZ=(A)===0;fN=(A)>127; // FD6C ORA
  CY+=4;R[0x0+X&127]=A; // FD6E STA
  case 0xFD70:CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FD70 TXA
  CY+=2;fC=true; // FD71 SEC
  CY+=2;sbc(0x6); // FD72 SBC
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FD74 TAX
  CY+=2;if(!fZ){CY+=1;pc=0xFD50;continue;} // FD75 BNE
  case 0xFD77:CY+=3;R[0x7A]=A; // FD77 STA
  CY+=2;fC=false; // FD79 CLC
  CY+=3;adc(R[0x3A]); // FD7A ADC
  CY+=3;R[0x3A]=A; // FD7C STA
  CY+=3;A=R[0x3B];fZ=(A)===0;fN=(A)>127; // FD7E LDA
  CY+=2;fC=false; // FD80 CLC
  CY+=3;adc(R[0x7A]); // FD81 ADC
  CY+=3;R[0x3B]=A; // FD83 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FD85 RTS
  case 0xFD86:CY+=2;A=0x4;fZ=(A)===0;fN=(A)>127; // FD86 LDA
  CY+=3;R[0x8]=A; // FD88 STA
  CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // FD8A LDA
  CY+=2;A&=0x3F;fZ=(A)===0;fN=(A)>127; // FD8C AND
  CY+=3;R[0x18]=A; // FD8E STA
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // FD90 LDX
  CY+=3;R[0x3]=X; // FD92 STX
  CY+=3;R[0x4]=X; // FD94 STX
  CY+=3;R[0x5]=X; // FD96 STX
  CY+=2;if(fZ){CY+=1;pc=0xFDA6;continue;} // FD98 BEQ
  case 0xFD9A:CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // FD9A LDA
  CY+=2;A|=0x80;fZ=(A)===0;fN=(A)>127; // FD9C ORA
  CY+=3;R[0x18]=A; // FD9E STA
  CY+=2;A&=0x1;fZ=(A)===0;fN=(A)>127; // FDA0 AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FDA2 TAX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FDA3 INX
  CY+=3;R[0x8]=X; // FDA4 STX
  case 0xFDA6:CY+=3;A=R[0x18];fZ=(A)===0;fN=(A)>127; // FDA6 LDA
  CY+=2;A&=0x1;fZ=(A)===0;fN=(A)>127; // FDA8 AND
  CY+=2;X=A;fZ=(X)===0;fN=(X)>127; // FDAA TAX
  CY+=3;R[0xB]=X; // FDAB STX
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // FDAD LDA
  CY+=3;R[0xA]=A; // FDAF STA
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FDB1 LDA
  CY+=3;R[0x9]=A; // FDB3 STA
  CY+=3;wr(0x19,A);if(FE)return 0xFDB7; // FDB5 STA
  case 0xFDB7:CY+=2;A=0xA;fZ=(A)===0;fN=(A)>127; // FDB7 LDA
  CY+=3;R[0x69]=A; // FDB9 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FDBB RTS
  case 0xFDBC:CY+=2;if(fZ){CY+=1;pc=0xFDD7;continue;} // FDBC BEQ
  CY+=2;t=0x10;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FDBE CPX
  CY+=2;if(!fZ){CY+=1;pc=0xFDCB;continue;} // FDC0 BNE
  CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FDC2 INY
  CY+=2;t=0x7;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FDC3 CPY
  CY+=2;if(fN){CY+=1;pc=0xFDCA;continue;} // FDC5 BMI
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // FDC7 DEY
  CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FDC8 LDA
  case 0xFDCA:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FDCA RTS
  case 0xFDCB:CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // FDCB DEY
  CY+=2;if(!fN){CY+=1;pc=0xFDD2;continue;} // FDCC BPL
  CY+=2;Y=0x1;fZ=(Y)===0;fN=(Y)>127; // FDCE LDY
  CY+=2;if(!fZ){CY+=1;pc=0xFDD4;continue;} // FDD0 BNE
  case 0xFDD2:CY+=2;if(!fZ){CY+=1;pc=0xFDD6;continue;} // FDD2 BNE
  case 0xFDD4:CY+=2;X=0x10;fZ=(X)===0;fN=(X)>127; // FDD4 LDX
  case 0xFDD6:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FDD6 RTS
  case 0xFDD7:CY+=2;t=0x10;fC=X>=t;t=X-t&255;fZ=(t)===0;fN=(t)>127; // FDD7 CPX
  CY+=2;if(!fZ){CY+=1;pc=0xFDE1;continue;} // FDD9 BNE
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // FDDB DEY
  CY+=2;if(!fZ){CY+=1;pc=0xFDE0;continue;} // FDDC BNE
  CY+=2;X=0xF0;fZ=(X)===0;fN=(X)>127; // FDDE LDX
  case 0xFDE0:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FDE0 RTS
  case 0xFDE1:CY+=2;Y=Y+1&255;fZ=(Y)===0;fN=(Y)>127; // FDE1 INY
  CY+=2;t=0x7;fC=Y>=t;t=Y-t&255;fZ=(t)===0;fN=(t)>127; // FDE2 CPY
  CY+=2;if(fN){CY+=1;pc=0xFDE9;continue;} // FDE4 BMI
  CY+=2;Y=Y-1&255;fZ=(Y)===0;fN=(Y)>127; // FDE6 DEY
  CY+=2;A=0x80;fZ=(A)===0;fN=(A)>127; // FDE7 LDA
  case 0xFDE9:CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FDE9 RTS
  case 0xFDEA:CY+=2;fD=true; // FDEA SED
  CY+=2;fC=false; // FDEB CLC
  CY+=3;adc(R[0x3]); // FDEC ADC
  CY+=3;R[0x3]=A; // FDEE STA
  CY+=2;A=X;fZ=(A)===0;fN=(A)>127; // FDF0 TXA
  CY+=3;adc(R[0x4]); // FDF1 ADC
  CY+=3;R[0x4]=A; // FDF3 STA
  CY+=2;if(!fC){CY+=1;pc=0xFDFD;continue;} // FDF5 BCC
  CY+=3;A=R[0x5];fZ=(A)===0;fN=(A)>127; // FDF7 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xFDFD;continue;} // FDF9 BNE
  CY+=5;t=R[0x8];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x8]=t; // FDFB INC
  case 0xFDFD:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FDFD LDA
  CY+=3;adc(R[0x5]); // FDFF ADC
  CY+=3;R[0x5]=A; // FE01 STA
  CY+=2;fD=false; // FE03 CLD
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FE04 RTS
  case 0xFE05:CY+=3;A=R[0xA];fZ=(A)===0;fN=(A)>127; // FE05 LDA
  CY+=2;fC=(A&1)===1;A>>=1;fZ=(A)===0;fN=(A)>127; // FE07 LSR
  CY+=2;X=0x0;fZ=(X)===0;fN=(X)>127; // FE08 LDX
  CY+=3;t=R[0x6E];fZ=(A&t)===0;fN=t>127;fV=(t&64)!==0; // FE0A BIT
  CY+=2;if(!fC){CY+=1;pc=0xFE13;continue;} // FE0C BCC
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FE0E INX
  CY+=2;if(!fV){CY+=1;pc=0xFE2C;continue;} // FE0F BVC
  CY+=2;if(fV){CY+=1;pc=0xFE15;continue;} // FE11 BVS
  case 0xFE13:CY+=2;if(!fN){CY+=1;pc=0xFE2C;continue;} // FE13 BPL
  case 0xFE15:CY+=4;A=R[0x62+X&127];fZ=(A)===0;fN=(A)>127; // FE15 LDA
  CY+=2;if(!fN){CY+=1;pc=0xFE27;continue;} // FE17 BPL
  CY+=4;A=R[0x60+X&127];fZ=(A)===0;fN=(A)>127; // FE19 LDA
  CY+=2;t=0x4;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FE1B CMP
  CY+=2;if(fC){CY+=1;pc=0xFE36;continue;} // FE1D BCS
  CY+=2;t=0x2;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FE1F CMP
  CY+=2;if(!fC){CY+=1;pc=0xFE27;continue;} // FE21 BCC
  case 0xFE23:CY+=2;A=0x1;fZ=(A)===0;fN=(A)>127; // FE23 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xFE29;continue;} // FE25 BNE
  case 0xFE27:CY+=2;A=0x0;fZ=(A)===0;fN=(A)>127; // FE27 LDA
  case 0xFE29:CY+=3;R[0x6A]=A; // FE29 STA
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FE2B RTS
  case 0xFE2C:CY+=4;A=R[0x62+X&127];fZ=(A)===0;fN=(A)>127; // FE2C LDA
  CY+=2;if(fN){CY+=1;pc=0xFE36;continue;} // FE2E BMI
  CY+=4;A=R[0x60+X&127];fZ=(A)===0;fN=(A)>127; // FE30 LDA
  CY+=2;t=0x5;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FE32 CMP
  CY+=2;if(fC){CY+=1;pc=0xFE23;continue;} // FE34 BCS
  case 0xFE36:CY+=2;A=0x2;fZ=(A)===0;fN=(A)>127; // FE36 LDA
  CY+=2;if(!fZ){CY+=1;pc=0xFE29;continue;} // FE38 BNE
  case 0xFE3A:CY+=3;X=R[0x6B];fZ=(X)===0;fN=(X)>127; // FE3A LDX
  CY+=2;X=X+1&255;fZ=(X)===0;fN=(X)>127; // FE3C INX
  CY+=2;if(fN){CY+=1;pc=0xFE41;continue;} // FE3D BMI
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FE3F DEX
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FE40 DEX
  case 0xFE41:CY+=3;R[0x6B]=X; // FE41 STX
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FE43 RTS
  case 0xFE44:CY+=2;X=0x1;fZ=(X)===0;fN=(X)>127; // FE44 LDX
  case 0xFE46:CY+=4;A=R[0x5E+X&127];fZ=(A)===0;fN=(A)>127; // FE46 LDA
  CY+=2;t=0x9F;fC=A>=t;t=A-t&255;fZ=(t)===0;fN=(t)>127; // FE48 CMP
  CY+=2;if(!fC){CY+=1;pc=0xFE50;continue;} // FE4A BCC
  CY+=2;sbc(0xA0); // FE4C SBC
  CY+=4;R[0x5E+X&127]=A; // FE4E STA
  case 0xFE50:CY+=6;t=R[0x5E+X&127];t=t+1&255;fZ=(t)===0;fN=(t)>127;R[0x5E+X&127]=t; // FE50 INC
  CY+=2;X=X-1&255;fZ=(X)===0;fN=(X)>127; // FE52 DEX
  CY+=2;if(!fN){CY+=1;pc=0xFE46;continue;} // FE53 BPL
  CY+=6;t=pull();pc=rpc((pull()<<8|t)+1);continue; // FE55 RTS
  case 0xFFEC:CY+=4;BK=0;if(BK!==1)return 0xDFEF; // FFEC STA
  case 0xFFEF:CY+=3;pc=0xF90B;continue; // FFEF JMP
  case 0xFFF2:CY+=4;BK=0;if(BK!==1)return 0xDFF5; // FFF2 STA
  case 0xFFF5:CY+=3;pc=0xF012;continue; // FFF5 JMP
  default:throw new Error("no entry "+pc.toString(16)+" in bank 1");}}}
  // ── running it: one frame is everything the program does from one vertical sync to the next ──
  function b64(s) { var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
  function reset() {
    var rom = b64(D.rom); RB0 = rom.subarray(0, 4096); RB1 = rom.subarray(4096, 8192);
    R.fill(0); A = X = Y = 0; SP = 0xFD; setP(0x24); BK = 0; PC = 0xD000 | (RB0[0xFFC] | RB0[0xFFD] << 8) & 0xFFF;
    CY = 0; frameBase = 0; rLine = rX = 0; fb.fill(BLACK); out.fill(BLACK); cx = 0; aud.length = 0;
  }
  var frameStart = 0, lastCycles = 19912;
  function frame() {
    FE = false; aud.length = 0;
    var start = CY;
    frameStart = CY;
    while (!FE) {
      PC = BK ? bank1(PC) : bank0(PC);
      if (CY - start > 100000) break;         // no vertical sync: give the frame up rather than hang
    }
    lastCycles = CY - start;
    return out;
  }
  // the whole machine, as plain numbers (for save/resume and for looking ahead)
  function save() {
    return {
      R: Array.from(R), c: [A, X, Y, SP, fN, fZ, fC, fV, fD, fI, BK, PC, CY],
      tim: [timVal, timShift, timAt, timInt],
      tia: [frameBase, rLine, rX, vsync, vblank, latch, latched, colPF, colBK, ctrlpf, pf0, pf1, pf2, enblN, enblO, vdelbl, bpos,
        cx, barLine, mvOn, mvNext, mvCount, mvExt, pfL, vsOff],
      arr: [colP, nus, refp, grpN, grpO, vdelp, ppos, enam, mpos, resmp, hm, mvMoving].map(function (a) { return a.slice(); })
    };
  }
  function load(s) {
    if (!RB0) reset();
    R.set(s.R); var c = s.c;
    A = c[0]; X = c[1]; Y = c[2]; SP = c[3]; fN = c[4]; fZ = c[5]; fC = c[6]; fV = c[7]; fD = c[8]; fI = c[9]; BK = c[10]; PC = c[11]; CY = c[12];
    timVal = s.tim[0]; timShift = s.tim[1]; timAt = s.tim[2]; timInt = s.tim[3];
    var t = s.tia;
    frameBase = t[0]; rLine = t[1]; rX = t[2]; vsync = t[3]; vblank = t[4]; latch = t[5]; latched = t[6]; colPF = t[7]; colBK = t[8];
    ctrlpf = t[9]; pf0 = t[10]; pf1 = t[11]; pf2 = t[12]; enblN = t[13]; enblO = t[14]; vdelbl = t[15]; bpos = t[16]; cx = t[17];
    barLine = t[18]; mvOn = t[19]; mvNext = t[20]; mvCount = t[21]; mvExt = t[22]; pfL = t[23]; vsOff = t[24];
    [colP, nus, refp, grpN, grpO, vdelp, ppos, enam, mpos, resmp, hm, mvMoving].forEach(function (a, i) { for (var j = 0; j < a.length; j++) a[j] = s.arr[i][j]; });
    fb.fill(BLACK); dirty = 63;
  }
  window.JHCore = {
    save: save, load: load,
    R: R, IN: IN, T: T, reset: reset, frame: frame,
    pixels: function () { return out; }, lines: function () { return outLines; },
    sound: function () { return aud; }, frameCycles: function () { return lastCycles; },
    cycle: function () { return CY; }, frameCycle: function () { return CY - frameBase; },
    W: W, H: OH, BLACK: BLACK
  };
})();

// ═══ The TIA's sound: two channels, each a 5-bit frequency divider feeding a waveform shaper (pure tones, buzzes
// and noise from 4-, 5- and 9-bit shift-register patterns) at a 4-bit volume. Clocked twice a scanline (31,440 Hz).
// The game writes the sound registers during each frame; they play back here at the cycle they were written.
(function () {
  'use strict';
  function makeTIASound() {
    var B4 = [1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0];
    var B5 = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1];
    var D31 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var B9 = new Uint8Array(511), x = 0x1FF;
    for (var i = 0; i < 511; i++) { B9[i] = x & 1; x = (x >> 1) | ((((x >> 4) ^ x) & 1) << 8); }
    var C = [0, 0], F = [0, 0], V = [0, 0], out = [0, 0], cnt = [0, 0], max = [0, 0], p4 = [0, 0], p5 = [0, 0], p9 = [0, 0];
    function write(r, v) {              // r: 0x15..0x1A
      var ch = (r - 0x15) & 1;
      if (r < 0x17) C[ch] = v & 15; else if (r < 0x19) F[ch] = v & 31; else V[ch] = (v & 15) << 3;
      var nv;
      if (C[ch] === 0) { nv = 0; out[ch] = V[ch]; }
      else { nv = F[ch] + 1; if ((C[ch] & 12) === 12) nv *= 3; }
      if (nv !== max[ch]) { max[ch] = nv; if (cnt[ch] === 0 || nv === 0) cnt[ch] = nv; }
    }
    function tick() {                   // one 31,440 Hz step; returns the summed level (0..240)
      for (var ch = 0; ch < 2; ch++) {
        if (cnt[ch] > 1) cnt[ch]--;
        else if (cnt[ch] === 1) {
          cnt[ch] = max[ch];
          if (++p5[ch] === 31) p5[ch] = 0;
          var c = C[ch];
          if (!(c & 2) || (!(c & 1) && D31[p5[ch]]) || ((c & 1) && B5[p5[ch]])) {
            if (c & 4) out[ch] = out[ch] ? 0 : V[ch];
            else if (c & 8) {
              if (c === 8) { if (++p9[ch] === 511) p9[ch] = 0; out[ch] = B9[p9[ch]] ? V[ch] : 0; }
              else out[ch] = B5[p5[ch]] ? V[ch] : 0;
            } else { if (++p4[ch] === 15) p4[ch] = 0; out[ch] = B4[p4[ch]] ? V[ch] : 0; }
          }
        }
      }
      return out[0] + out[1];
    }
    // one frame: its register writes [cycle, reg, value, ...] and its length in cycles -> levels at 31,400 Hz (a tick
    // every 38 CPU cycles, counted on across frames so the sound keeps exact time)
    var phase = 0;
    function frame(ev, cycles, dst) {
      var e = 0, n = 0;
      for (var at = phase; at < cycles; at += 38) {
        while (e < ev.length && ev[e] <= at) { write(ev[e + 1], ev[e + 2]); e += 3; }
        dst.push(tick()); n++;
      }
      phase = at - cycles;
      while (e < ev.length) { write(ev[e + 1], ev[e + 2]); e += 3; }
      return n;
    }
    return { write: write, tick: tick, frame: frame };
  }
  window.JHTIASound = makeTIASound;
})();

// ═══ Playing it: each frame's TIA sound levels (31,400 a second) go to an AudioWorklet that resamples them for the
// speakers, with a little buffer so frames can arrive unevenly, and the DC taken out as a TV's audio stage does.
(function () {
  'use strict';
  var RATE = 1193182 / 38;
  var WORKLET =
    'class JHTIA extends AudioWorkletProcessor {\n' +
    '  constructor() { super(); this.buf = new Float32Array(16384); this.r = 0; this.w = 0; this.pos = 0; this.step = ' + RATE + ' / sampleRate; this.last = 0; this.dc = 0; this.y = 0;\n' +
    '    this.port.onmessage = (e) => { const d = e.data; if (d === "flush") { this.r = this.w = 0; return; } for (let i = 0; i < d.length; i++) { this.buf[this.w] = d[i]; this.w = (this.w + 1) & 16383; }\n' +
    '      let n = (this.w - this.r) & 16383; const max = Math.floor(' + RATE + ' * 0.12); if (n > max) this.r = (this.w - Math.floor(' + RATE + ' * 0.05)) & 16383; }; }\n' +
    '  process(ins, outs) { const o = outs[0][0];\n' +
    '    for (let i = 0; i < o.length; i++) { let n = (this.w - this.r) & 16383, v;\n' +
    '      if (n >= 2) { const a = this.buf[this.r], b = this.buf[(this.r + 1) & 16383]; v = a + (b - a) * this.pos; this.pos += this.step; while (this.pos >= 1) { this.pos -= 1; this.r = (this.r + 1) & 16383; } this.last = v; }\n' +
    '      else { this.last *= 0.995; v = this.last; }\n' +
    '      this.dc += (v - this.dc) * 0.0015; this.y += ((v - this.dc) - this.y) * 0.55; o[i] = this.y; }\n' +
    '    for (let c = 1; c < outs[0].length; c++) outs[0][c].set(o); return true; } }\n' +
    'registerProcessor("jh-tia", JHTIA);\n';
  function create(opts) {
    var ac = null, node = null, master = null, sp = null, q = [], spBuf = null, synth = window.JHTIASound(), lv = [];
    function on() { return !opts || !opts.on || opts.on(); }
    function ctx() {
      if (ac || !on()) return ac;
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      try { ac = new AC(); } catch (e) { return null; }
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      if (ac.audioWorklet && window.Blob && window.URL) {
        ac.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))).then(function () {
          node = new AudioWorkletNode(ac, 'jh-tia', { numberOfInputs: 0, outputChannelCount: [1] }); node.connect(master);
        }).catch(fallback);
      } else fallback();
      return ac;
    }
    function fallback() {               // older browsers: the same resampler on the main thread
      if (node || sp) return;
      sp = ac.createScriptProcessor(2048, 0, 1);
      var pos = 0, step = RATE / ac.sampleRate, last = 0, dc = 0, y = 0;
      sp.onaudioprocess = function (e) {
        var o = e.outputBuffer.getChannelData(0);
        for (var i = 0; i < o.length; i++) {
          var v;
          if (q.length >= 2) { v = q[0] + (q[1] - q[0]) * pos; pos += step; while (pos >= 1) { pos -= 1; q.shift(); } last = v; }
          else { last *= 0.995; v = last; }
          dc += (v - dc) * 0.0015; y += ((v - dc) - y) * 0.55; o[i] = y;
        }
        if (q.length > RATE * 0.12) q.splice(0, q.length - Math.floor(RATE * 0.05));
      };
      sp.connect(master);
    }
    return {
      unlock: function () { var a = ctx(); if (a && a.state !== 'running') try { a.resume(); } catch (e) {} },
      // after each frame: its sound register writes and its length in CPU cycles
      frame: function (ev, cycles) {
        lv.length = 0; synth.frame(ev, cycles, lv);
        if (!ac || ac.state !== 'running' || (!node && !sp)) return;
        var f = new Float32Array(lv.length);
        for (var i = 0; i < lv.length; i++) f[i] = lv[i] / 400;
        if (node) node.port.postMessage(f, [f.buffer]); else for (var j = 0; j < f.length; j++) q.push(f[j]);
      },
      stop: function () {
        if (node) node.port.postMessage('flush'); q.length = 0;
        if (ac && ac.state === 'running') try { ac.suspend(); } catch (e) {}
      }
    };
  }
  window.JHSound = { create: create };
})();
