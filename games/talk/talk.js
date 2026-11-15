// What the computer players say, picked so a line doesn't come round again until most of its pool has been said.
// Each game's lines live beside this file (games/talk/<game>.js, setting window.TALK_<GAME>), 20 times as many as
// the game first had (Tim, 2026-11-15). A page loads this file and its own lines with script tags, then asks:
//   Talk.line('a2a.wild', pool)            one line from the pool, not one said lately
//   Talk.line('a2a.two', pool, {a: 'Chili'}) the same, with {a} and the other slots filled in
// The pool's key keeps its own recent list in memory (a reload starts afresh). A slot with no value is left as it is.
(function () {
  var recent = {};
  function pick(key, pool) {
    if (!pool || !pool.length) return null;
    if (pool.length === 1) return pool[0];
    var r = recent[key] || (recent[key] = []), keep = Math.max(1, Math.floor(pool.length * 0.8));
    while (r.length > keep) r.shift();
    var open = [];
    for (var i = 0; i < pool.length; i++) if (r.indexOf(i) < 0) open.push(i);
    var k = open[Math.floor(Math.random() * open.length)];
    r.push(k);
    return pool[k];
  }
  function fill(s, v) {
    return !v ? s : String(s).replace(/\{(\w+)\}/g, function (m, n) { return v[n] != null ? v[n] : m; });
  }
  window.Talk = {
    pick: pick,
    fill: fill,
    line: function (key, pool, v) { var s = pick(key, pool); return s == null ? null : fill(s, v); }
  };
})();
