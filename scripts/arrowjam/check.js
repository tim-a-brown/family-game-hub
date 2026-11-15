#!/usr/bin/env node
// Checks every Arrow Jam level in games/arrowjam/levels.js and prints how hard each one is (see measure.js).
//   node scripts/arrowjam/check.js            the table, and an exit code of 1 if any level is broken
// A level passes when every arrow is well made (core.js check) and a player who never bumps clears the whole board,
// and when its difficulty (blind bumps) is no lower than the level before it.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('../../games/arrowjam/core.js');
const { metrics } = require('./measure.js');
const box = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../games/arrowjam/levels.js'), 'utf8'), box);
const LV = box.window.ARROWJAM_LEVELS;
let bad = 0, prev = 0;
console.log('level\tsize\tarrows\tcells\tbent\tlongest\tfree at start\tchain\tavg free\tblind bumps\tlog10 orders');
LV.forEach((L, i) => {
  const faults = C.check(L);
  // play it the long way too: one arrow at a time, always the first free one, until the board is empty
  const gone = {}; let left = L.a.length;
  while (left) { const f = C.free(L, gone); if (!f.length) break; gone[f[0]] = true; left--; }
  if (left) faults.push(left + ' arrows are stuck');
  const m = metrics(L, 400, i + 1);
  if (m.blind < prev - 1e-9) faults.push('easier than the level before');
  prev = m.blind;
  console.log([i + 1, L.w + 'x' + L.h, m.arrows, m.cells, m.bent, m.maxLen, m.free0, m.chain, m.avgFree.toFixed(1), m.blind.toFixed(1), m.orders.toFixed(1)].join('\t') + (faults.length ? '\tFAULT ' + faults.join('; ') : ''));
  if (faults.length) bad++;
});
console.log(LV.length + ' levels, ' + (bad ? bad + ' with faults' : 'all clearable'));
process.exit(bad ? 1 : 0);
