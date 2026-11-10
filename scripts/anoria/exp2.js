'use strict';
const { play, PROF, rng, shuffle } = require('./sim'); const { CARDS, GUIDES, PLACES, ARCH } = require('./cards');
module.exports = function (exp, n) {
  const { batch, fmt, mirror, randDeck, pct, GL } = require('./run');
  const base = { spark: 'round', scoring: 'round', order: 'alt' };
  if (exp === 'tension2') {
    const V = { 'underdog': { catchup: 2 }, 'underdog + stakes 1,1,1,2,2,2': { catchup: 2, ramp: [1, 1, 1, 2, 2, 2] }, 'underdog + stakes 1,1,2,2,2,2': { catchup: 2, ramp: [1, 1, 2, 2, 2, 2] },
      'underdog + clash on arrival': { catchup: 2, rush: 1 }, 'underdog + stakes 1,1,1,2,2,2 + clash on arrival': { catchup: 2, ramp: [1, 1, 1, 2, 2, 2], rush: 1 }, 'underdog + clash on arrival + no dice': { catchup: 2, rush: 1, die: [0] } };
    for (const k in V) console.log(k + ':  ' + fmt(batch(n, Object.assign({}, base, V[k]), mirror(PROF.holder), 37)));
  }
  const STD = { spark: 'round', scoring: 'round', order: 'trail', catchup: 1, ramp: [1, 1, 1, 2, 2, 2], rush: 1, target: 30, rounds: 14, sparkCap: 7, draw2: 1, bounty: 1 };
  const PN = ['holder', 'raider', 'keeper', 'brawler'];
  if (exp === 'cards') {
    const inc = {}, pl = {}, gd = {}, fp = {}, pr = {}, pair = {}, ev = {}, hub = {}; const bump = (m, k, w) => { const x = m[k] || (m[k] = [0, 0]); x[0]++; x[1] += w; };
    const r = batch(n, STD, (R) => { const g = { decks: [randDeck(R), randDeck(R)], guides: [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], pn: [PN[(R() * 4) | 0], PN[(R() * 4) | 0]] }; g.profs = g.pn.map(x => PROF[x]);
      g.after = (S) => { for (let o = 0; o < 2; o++) { const w = S.winner === o ? 1 : S.winner < 0 ? 0.5 : 0, u = [...new Set(g.decks[o])];
          for (const c of u) bump(inc, c, w); for (const c in S.st.played[o]) bump(pl, c, w); bump(gd, g.guides[o], w); bump(pr, g.pn[o], w);
          bump(fp, [...new Set(u.map(c => CARDS[c].f).filter(f => f !== 'N'))].sort().join(''), w);
          for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) if (S.st.played[o][u[i]] && S.st.played[o][u[j]]) bump(pair, u[i] < u[j] ? u[i] + '+' + u[j] : u[j] + '+' + u[i], w); }
        bump(hub, S.places[4], S.how === 'seals' ? 1 : 0);
        for (const e of S.st.ev) { const k = e.join('>'); ev[k] = (ev[k] || 0) + 1; } }; return g; }, 101);
    console.log('STANDARD RULES, ' + n + ' games:  ' + fmt(r));
    const tab = (m, min) => Object.keys(m).filter(k => m[k][0] >= (min || 0)).map(k => [k, m[k][0], 100 * m[k][1] / m[k][0]]).sort((a, b) => b[2] - a[2]);
    const show = (t, rows, nm) => console.log('\n' + t + '\n' + rows.map(x => '  ' + ((nm ? nm(x[0]) : x[0]) + '                              ').slice(0, 30) + x[2].toFixed(1) + '%  (' + x[1] + ')').join('\n'));
    const cn = k => CARDS[k].n + ' [' + CARDS[k].f + CARDS[k].c + ']';
    show('WIN RATE WHEN THE CARD IS IN THE DECK', tab(inc), cn); show('WIN RATE WHEN THE CARD WAS PLAYED', tab(pl), cn);
    show('GUIDES', tab(gd), k => GUIDES[k]); show('FACTION PAIRS', tab(fp)); show('ROBOT STYLE', tab(pr));
    const pt = tab(pair, Math.max(150, n / 60)).map(x => { const [a, b] = x[0].split('+'); const ea = 100 * pl[a][1] / pl[a][0], eb = 100 * pl[b][1] / pl[b][0]; return [x[0], x[1], x[2], x[2] - (ea + eb - 50)]; }).sort((a, b) => b[3] - a[3]);
    console.log('\nBEST COMBOS (both played; lift over what the two cards do alone)\n' + pt.slice(0, 16).map(x => '  ' + x[0].split('+').map(k => CARDS[k].n).join(' + ') + ': ' + x[2].toFixed(1) + '% (+' + x[3].toFixed(1) + ', ' + x[1] + ' games)').join('\n'));
    console.log('\nWORST PAIRS\n' + pt.slice(-6).map(x => '  ' + x[0].split('+').map(k => CARDS[k].n).join(' + ') + ': ' + x[2].toFixed(1) + '% (' + x[3].toFixed(1) + ')').join('\n'));
    console.log('\nHUB: share of games ending by Seals\n' + Object.keys(hub).map(k => '  ' + PLACES[k].n + ': ' + (100 * hub[k][1] / hub[k][0]).toFixed(1) + '%').join('\n'));
    const evs = Object.keys(ev).map(k => { const [a, b, p] = k.split('>'); return { a, b, p, n: ev[k], gap: Math.abs(CARDS[a].y - CARDS[b].y), up: CARDS[b].m - CARDS[a].m }; });
    console.log('\nBIGGEST TIME GAPS IN A KNOCKOUT\n' + evs.filter(e => e.n >= 3).sort((x, y) => y.gap - x.gap).slice(0, 14).map(e => '  ' + CARDS[e.a].n + ' knocked out ' + CARDS[e.b].n + ' at ' + PLACES[e.p].n + ' (' + e.gap + ' years apart, ' + e.n + 'x)').join('\n'));
    console.log('\nBIGGEST UPSETS\n' + evs.filter(e => e.up >= 3).sort((x, y) => y.n - x.n).slice(0, 14).map(e => '  ' + CARDS[e.a].n + ' (' + CARDS[e.a].m + ') knocked out ' + CARDS[e.b].n + ' (' + CARDS[e.b].m + ') at ' + PLACES[e.p].n + ' (' + e.n + 'x)').join('\n'));
  }
  if (exp === 'styles') {   // robot style vs robot style, random decks: rows beat columns by this much
    const names = ['holder', 'raider', 'keeper', 'brawler', 'novice'];
    console.log('ROW style win % vs COLUMN style (' + n + ' games each)\n          ' + names.map(x => (x + '       ').slice(0, 9)).join(''));
    for (const a of names) { let row = (a + '          ').slice(0, 10);
      for (const b of names) { if (a === b) { row += '   -     '; continue; } let w = 0, g = 0;
        for (let i = 0; i < n; i++) { const R = rng(500 + i * 13), sw = i & 1, S = play([randDeck(R), randDeck(R)], [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], sw ? [PROF[b], PROF[a]] : [PROF[a], PROF[b]], STD, 9000 + i); g++; if (S.winner < 0) w += 0.5; else if (S.winner === (sw ? 1 : 0)) w++; }
        row += ((100 * w / g).toFixed(1) + '%      ').slice(0, 9); }
      console.log(row); }
  }
  if (exp === 'decks2') { Object.assign(STD, { lineNear: 1 }); exp = 'decks'; }
  if (exp === 'decks') {   // the five built decks against each other, each played in its own style
    const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Tricksters: 'raider' }, dk = k => ARCH[k].cards.concat(ARCH[k].cards);
    for (const mode of (process.argv[4] ? ['own style'] : ['own style', 'all holder'])) {
      console.log('\nBUILT DECKS, ' + mode + ': ROW win % vs COLUMN (' + n + ' games each)\n            ' + D.map(x => (x + '         ').slice(0, 11)).join('') + 'overall  seal wins');
      for (const a of D) { let row = (a + '            ').slice(0, 12), tw = 0, tg = 0, sw = 0;
        for (const b of D) { if (a === b) { row += '   -       '; continue; } let w = 0;
          for (let i = 0; i < n; i++) { const fl = i & 1, pa = PROF[mode === 'own style' ? style[a] : 'holder'], pb = PROF[mode === 'own style' ? style[b] : 'holder'];
            const S = play(fl ? [dk(b), dk(a)] : [dk(a), dk(b)], fl ? [ARCH[b].guide, ARCH[a].guide] : [ARCH[a].guide, ARCH[b].guide], fl ? [pb, pa] : [pa, pb], STD, 7000 + i * 3);
            const me = fl ? 1 : 0; if (S.winner < 0) w += 0.5; else if (S.winner === me) { w++; if (S.how === 'seals') sw++; } }
          tw += w; tg += n; row += ((100 * w / n).toFixed(1) + '%        ').slice(0, 11); }
        console.log(row + (100 * tw / tg).toFixed(1) + '%    ' + (100 * sw / tg).toFixed(1) + '%'); }
    }
  }
  if (exp === 'multi') {
    for (const N of [2, 3, 4, 6]) {
      const seat = new Array(N).fill(0); let draws = 0, spread = 0, t = Date.now(), lead3 = 0, l3n = 0, flips = 0, top2 = 0, figs = 0, ko = 0, lastPlace = 0, rds = 0;
      for (let i = 0; i < n; i++) { const R = rng(77 + i * 17), decks = [], gs = [], ps = []; for (let p = 0; p < N; p++) { decks.push(randDeck(R)); gs.push(GL[(R() * 5) | 0]); ps.push(PROF[PN[(R() * 4) | 0]]); }
        const S = play(decks, gs, ps, Object.assign({}, STD, { extraEdge: ['wall', 'stonehenge', 'globe', 'machu'] }), 3000 + i), rn = S.P.map(p => p.renown).sort((a, b) => b - a);
        if (S.winner < 0) draws++; else seat[S.winner]++; spread += rn[0] - rn[N - 1]; top2 += rn[0] - rn[1]; lastPlace += rn[N - 1]; figs += S.st.plays; ko += S.st.ko; rds += S.round;
        const l3 = S.st.lead[2]; if (l3 >= 0) { l3n++; if (l3 === S.winner) lead3++; } const pl = S.st.lead[S.st.lead.length - 2]; if (pl >= 0 && S.winner >= 0 && pl !== S.winner) flips++; }
      console.log(N + ' players (' + (2 * N + 1) + ' Places): wins by seat ' + seat.map(x => pct(x, n) + '%').join(' ') + '  draws ' + pct(draws, n) + '%  winner beats 2nd by ' + (top2 / n).toFixed(1) + '  first-to-last gap ' + (spread / n).toFixed(1) + '  last place scores ' + (lastPlace / n).toFixed(1) +
        '  leader after r3 wins ' + pct(lead3, l3n) + '%  last-round flips ' + pct(flips, n) + '%  figures ' + (figs / n).toFixed(0) + '  KOs ' + (ko / n).toFixed(1) + '  ' + ((Date.now() - t) / n).toFixed(0) + ' ms/game');
    }
  }
  if (exp === 'swing') {
    const V = process.argv[4] ? { 'bounty, first to 30': { bounty: 1, target: 30 }, 'bounty, first to 28': { bounty: 1, target: 28 }, 'bounty, far behind +2 Spark, first to 28': { bounty: 1, catchup: 3, target: 28 } } : { 'now': {}, 'far behind (4+) gets +2 Spark': { catchup: 3 }, 'far behind (3+) gets +2 Spark': { catchup: 3, far: 3 }, 'bounty: knock out the leader\'s Figure, +1 Renown': { bounty: 1 }, 'most Places held: +1 (x stakes)': { majority: 1 },
      'far behind +2 Spark, and bounty': { catchup: 3, bounty: 1 }, 'bounty 2': { bounty: 2 }, 'first to 30, far behind +2, bounty': { catchup: 3, bounty: 1, target: 30 } };
    for (const k in V) { const cfg = Object.assign({}, STD, V[k]); let sk = 0, sn = 600;
      for (let i = 0; i < sn; i++) { const R = rng(900 + i * 5), fl = i & 1, S = play([randDeck(R), randDeck(R)], [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], fl ? [PROF.novice, PROF.holder] : [PROF.holder, PROF.novice], cfg, 4000 + i); if (S.winner === (fl ? 1 : 0)) sk++; else if (S.winner < 0) sk += 0.5; }
      console.log(k + ':  steady player beats beginner ' + pct(sk, sn) + '%  ' + fmt(batch(n, cfg, (R) => { const g = mirror(PROF.holder)(R); g.profs = [PROF[PN[(R() * 4) | 0]], PROF[PN[(R() * 4) | 0]]]; return g; }, 71)).replace(/  clashes.*/, '')); }
  }
  if (exp === 'length') {
    const T = { rounds: 14, sparkCap: 7 };
    const V = { 'six rounds (current)': {}, 'first to 20': Object.assign({ target: 20 }, T), 'first to 25': Object.assign({ target: 25 }, T), 'first to 30': Object.assign({ target: 30 }, T),
      'first to 25, draw 2 a turn': Object.assign({ target: 25, draw2: 1 }, T), 'first to 30, draw 2 a turn': Object.assign({ target: 30, draw2: 1 }, T), 'first to 30, Spark cap 8': Object.assign({ target: 30 }, T, { sparkCap: 8 }),
      'first to 30, flat stakes': Object.assign({ target: 30 }, T, { ramp: null }) , 'first to 20, flat stakes': Object.assign({ target: 20 }, T, { ramp: null }) };
    for (const k in V) console.log(k + ':  ' + fmt(batch(n, Object.assign({}, STD, V[k]), (R) => { const g = mirror(PROF.holder)(R); g.profs = [PROF[PN[(R() * 4) | 0]], PROF[PN[(R() * 4) | 0]]]; return g; }, 61)));
  }
  if (exp === 'tension3') {
    const R2 = [1, 1, 1, 2, 2, 2];
    const V = { 'A: underdog Spark+card, stakes, rush, alternate': { catchup: 2, ramp: R2, rush: 1 }, 'B: same but leader goes first': { catchup: 2, ramp: R2, rush: 1, order: 'trail' },
      'C: leader goes first, underdog +1 Spark only': { catchup: 1, ramp: R2, rush: 1, order: 'trail' }, 'D: leader goes first, no other help': { ramp: R2, rush: 1, order: 'trail' }, 'E: leader first, no stakes, underdog Spark': { catchup: 1, rush: 1, order: 'trail' } };
    for (const k in V) console.log(k + ':  ' + fmt(batch(n, Object.assign({}, base, V[k]), mirror(PROF.holder), 41)));
  }
  if (exp === 'tension') {
    const V = { base: {}, 'stakes 1,1,2,2,3,3': { ramp: [1, 1, 2, 2, 3, 3] }, 'stakes 1,1,1,2,2,3': { ramp: [1, 1, 1, 2, 2, 3] }, 'stakes 1,2,3,4,5,6': { ramp: [1, 2, 3, 4, 5, 6] }, 'underdog +1 Spark': { catchup: 1 }, 'underdog +1 Spark +1 card': { catchup: 2 },
      'stakes 1,1,2,2,3,3 + underdog Spark': { ramp: [1, 1, 2, 2, 3, 3], catchup: 1 }, 'no dice': { die: [0] }, 'big dice 0-3': { die: [0, 1, 2, 3] }, 'home +2': { home: 2 }, '7 rounds': { rounds: 7 }, '5 rounds': { rounds: 5 }, 'cap 4 per Place': { cap: 4 } };
    for (const k in V) console.log(k + ':  ' + fmt(batch(n, Object.assign({}, base, V[k]), mirror(PROF.holder), 23)));
  }
};
