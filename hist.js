'use strict';
// ── Shared Game History System ─────────────────────────────────────────────
// Saves completed game snapshots to localStorage and renders a read-only
// history drawer accessible via a 📜 button in any game.

const GameHistory = (function(){
  const MAX = 20;

  function save(key, entry){
    const list = load(key);
    list.unshift({ ...entry, _date: Date.now() });
    if(list.length > MAX) list.length = MAX;
    try{ localStorage.setItem('gh_' + key, JSON.stringify(list));if(typeof FGHSync!=='undefined')FGHSync.noteWrite('gh_'+key); }catch(e){}
  }

  function load(key){
    try{ return JSON.parse(localStorage.getItem('gh_' + key)) || []; }
    catch(e){ return []; }
  }

  function fmt(ts){
    const d = new Date(ts);
    return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) +
      ' · ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  }

  // Inject drawer HTML + CSS into document once
  function ensureDrawer(){
    if(document.getElementById('gh-drawer')) return;

    const style = document.createElement('style');
    style.textContent = `
      #gh-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:299;display:none;}
      #gh-drawer{position:fixed;bottom:0;left:0;right:0;max-height:78vh;background:#161b22;
        border-top:1px solid rgba(255,255,255,.15);border-radius:20px 20px 0 0;
        z-index:300;overflow-y:auto;padding:0 0 env(safe-area-inset-bottom);
        transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);}
      #gh-drawer.open{transform:translateY(0);}
      #gh-drawer-handle{text-align:center;padding:14px 20px 10px;position:sticky;top:0;
        background:#161b22;z-index:1;border-bottom:1px solid rgba(255,255,255,.07);}
      #gh-drawer-handle-bar{width:36px;height:4px;background:rgba(255,255,255,.2);
        border-radius:2px;margin:0 auto 10px;}
      #gh-drawer-title{font-family:var(--serif,serif);font-size:1.05rem;font-weight:900;
        color:#fff;display:inline;}
      #gh-drawer-close{float:right;background:rgba(255,255,255,.1);border:none;color:#fff;
        border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:1rem;
        display:flex;align-items:center;justify-content:center;line-height:1;}
      #gh-drawer-body{padding:12px 16px 20px;}
      .gh-entry{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
        border-radius:12px;margin-bottom:10px;overflow:hidden;}
      .gh-entry-head{display:flex;align-items:center;justify-content:space-between;
        padding:12px 14px;cursor:pointer;user-select:none;}
      .gh-entry-head:hover{background:rgba(255,255,255,.04);}
      .gh-entry-date{font-size:.66rem;color:rgba(255,255,255,.4);margin-bottom:2px;}
      .gh-entry-summary{font-size:.88rem;font-weight:700;color:#fff;}
      .gh-entry-badge{font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:20px;
        background:rgba(245,200,66,.15);color:var(--gold,#f5c842);white-space:nowrap;flex-shrink:0;margin-left:10px;}
      .gh-entry-detail{display:none;padding:0 14px 14px;border-top:1px solid rgba(255,255,255,.07);}
      .gh-entry.expanded .gh-entry-detail{display:block;}
      .gh-entry-detail-inner{margin-top:10px;}
      .gh-ro-table{border-collapse:collapse;width:100%;font-size:.78rem;}
      .gh-ro-table th{background:rgba(255,255,255,.07);padding:5px 7px;text-align:center;
        font-weight:700;color:rgba(255,255,255,.5);font-size:.68rem;white-space:nowrap;}
      .gh-ro-table td{padding:4px 6px;text-align:center;border-bottom:1px solid rgba(255,255,255,.05);}
      .gh-ro-table tr:last-child td{border-bottom:none;}
      .gh-ro-table tr.gh-totals td{background:rgba(255,255,255,.06);font-weight:800;
        border-top:1px solid rgba(255,255,255,.1);}
      .gh-ro-table .gh-rl{text-align:left;padding-left:8px;color:rgba(255,255,255,.4);font-size:.7rem;}
      .gh-wordle-grid{display:flex;flex-direction:column;gap:4px;align-items:center;margin:8px 0;}
      .gh-wordle-row{display:flex;gap:4px;}
      .gh-wordle-cell{width:34px;height:34px;border-radius:4px;display:flex;align-items:center;
        justify-content:center;font-weight:900;font-size:1rem;color:#fff;}
      .gh-wordle-cell[data-s="correct"]{background:#22c55e;}
      .gh-wordle-cell[data-s="present"]{background:#f59e0b;}
      .gh-wordle-cell[data-s="absent"]{background:#374151;}
      .gh-wordle-cell[data-s="empty"]{border:2px solid rgba(255,255,255,.12);}
      .gh-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0;}
      .gh-stat{background:rgba(255,255,255,.05);border-radius:8px;padding:8px;text-align:center;}
      .gh-stat-val{font-family:var(--serif,serif);font-size:1.2rem;font-weight:900;color:var(--gold,#f5c842);}
      .gh-stat-lbl{font-size:.6rem;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.4);margin-top:2px;}
      .gh-empty{text-align:center;color:rgba(255,255,255,.3);padding:32px 0;font-size:.9rem;}
      .gh-sudoku{display:grid;grid-template-columns:repeat(9,1fr);gap:1px;
        background:rgba(255,255,255,.3);border:2px solid rgba(255,255,255,.5);
        border-radius:4px;max-width:260px;margin:8px auto;}
      .gh-sudoku-cell{background:#161b22;display:flex;align-items:center;justify-content:center;
        aspect-ratio:1;font-size:.7rem;font-weight:700;}
      .gh-sudoku-cell.given{color:rgba(255,255,255,.9);}
      .gh-sudoku-cell.solved{color:#5ac8fa;}
      .gh-sudoku-box-border-r{border-right:2px solid rgba(255,255,255,.4)!important;}
      .gh-sudoku-box-border-b{border-bottom:2px solid rgba(255,255,255,.4)!important;}
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'gh-overlay';
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.id = 'gh-drawer';
    drawer.innerHTML = `
      <div id="gh-drawer-handle">
        <div id="gh-drawer-handle-bar"></div>
        <span id="gh-drawer-title">📜 Past Games</span>
        <button id="gh-drawer-close" onclick="GameHistory.close()">×</button>
      </div>
      <div id="gh-drawer-body"></div>`;
    document.body.appendChild(drawer);
  }

  function open(key, title, renderFn){
    ensureDrawer();
    document.getElementById('gh-drawer-title').textContent = '📜 ' + title;
    const body = document.getElementById('gh-drawer-body');
    const entries = load(key);
    if(!entries.length){
      body.innerHTML = '<div class="gh-empty">No completed games yet</div>';
    } else {
      body.innerHTML = '';
      entries.forEach((entry, i) => {
        const el = document.createElement('div');
        el.className = 'gh-entry';
        const head = document.createElement('div');
        head.className = 'gh-entry-head';
        head.innerHTML = `<div>
          <div class="gh-entry-date">${fmt(entry._date)}</div>
          <div class="gh-entry-summary">${entry._summary || 'Completed game'}</div>
        </div>
        <div class="gh-entry-badge">${entry._badge || ''}</div>`;
        const detail = document.createElement('div');
        detail.className = 'gh-entry-detail';
        const inner = document.createElement('div');
        inner.className = 'gh-entry-detail-inner';
        if(renderFn) inner.appendChild(renderFn(entry));
        detail.appendChild(inner);
        head.addEventListener('click', () => {
          const wasOpen = el.classList.contains('expanded');
          body.querySelectorAll('.gh-entry').forEach(e => e.classList.remove('expanded'));
          if(!wasOpen){ el.classList.add('expanded'); }
        });
        el.appendChild(head); el.appendChild(detail);
        body.appendChild(el);
      });
    }
    document.getElementById('gh-overlay').style.display = 'block';
    requestAnimationFrame(() => document.getElementById('gh-drawer').classList.add('open'));
  }

  function close(){
    const d = document.getElementById('gh-drawer');
    if(d){ d.classList.remove('open'); setTimeout(()=>{ if(!d.classList.contains('open')) document.getElementById('gh-overlay').style.display='none'; },320); }
  }

  // Build a History button element
  function btn(key, title, renderFn, label='📜 History'){
    ensureDrawer();
    const b = document.createElement('button');
    b.className = 'btn btn-outline btn-sm';
    b.textContent = label;
    b.style.cssText = 'font-size:.72rem;padding:4px 10px;';
    b.addEventListener('click', () => open(key, title, renderFn));
    return b;
  }

  // ── Standard detail renderers ─────────────────────────────────────────────

  function renderRoundTable(names, rounds, totals, colors){
    const div = document.createElement('div');
    const n = names.length;
    const gtc = `24px repeat(${n},1fr)`;
    let html = `<table class="gh-ro-table" style="table-layout:fixed;">
      <thead><tr><th class="gh-rl">#</th>${names.map((nm,i)=>`<th style="color:${colors[i]||'#fff'}">${nm}</th>`).join('')}</tr></thead>
      <tbody>`;
    rounds.forEach((r,ri) => {
      const vals = Array.isArray(r[0]) ? r.map(v=>v) : r;
      html += `<tr><td class="gh-rl">${ri+1}</td>${Array.isArray(vals)?vals.map(v=>`<td>${v}</td>`).join(''):'<td colspan="${n}"></td>'}</tr>`;
    });
    html += `<tr class="gh-totals"><td class="gh-rl">Σ</td>${totals.map((t,i)=>`<td style="color:${colors[i]||'#fff'}">${t}</td>`).join('')}</tr>`;
    html += '</tbody></table>';
    div.innerHTML = html;
    return div;
  }

  function renderStatGrid(stats){
    const div = document.createElement('div');
    div.className = 'gh-stat-grid';
    stats.forEach(s => {
      div.innerHTML += `<div class="gh-stat"><div class="gh-stat-val">${s.val}</div><div class="gh-stat-lbl">${s.lbl}</div></div>`;
    });
    return div;
  }

  function renderWordleGrid(guesses, results, answer){
    const div = document.createElement('div');
    div.className = 'gh-wordle-grid';
    const totalRows = 6;
    for(let r=0; r<totalRows; r++){
      const row = document.createElement('div');
      row.className = 'gh-wordle-row';
      for(let c=0; c<5; c++){
        const cell = document.createElement('div');
        cell.className = 'gh-wordle-cell';
        if(guesses[r]){
          cell.textContent = guesses[r][c];
          cell.dataset.s = results[r] ? results[r][c] : 'absent';
        } else {
          cell.dataset.s = 'empty';
        }
        row.appendChild(cell);
      }
      div.appendChild(row);
    }
    const ans = document.createElement('div');
    ans.style.cssText = 'text-align:center;margin-top:8px;font-size:.8rem;color:rgba(255,255,255,.5);';
    ans.textContent = 'Answer: ' + answer;
    div.appendChild(ans);
    return div;
  }

  function renderSudokuGrid(board, givens){
    const div = document.createElement('div');
    div.className = 'gh-sudoku';
    for(let r=0;r<9;r++) for(let c=0;c<9;c++){
      const cell = document.createElement('div');
      cell.className = 'gh-sudoku-cell' + (givens[r][c]?' given':' solved');
      if(c===2||c===5) cell.classList.add('gh-sudoku-box-border-r');
      if(r===2||r===5) cell.classList.add('gh-sudoku-box-border-b');
      cell.textContent = board[r][c] || '';
      div.appendChild(cell);
    }
    return div;
  }

  // Render a players-and-scores table that highlights the winner.
  // scores: array of {name, score, [isYou]} objects, OR parallel arrays.
  // winner: index of winning player
  function renderPlayerResults(players, winnerIdx){
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:4px;';
    players.forEach((p, i) => {
      const isWinner = i === winnerIdx;
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex','align-items:center','justify-content:space-between',
        'padding:8px 12px','border-radius:8px',
        isWinner ? 'background:rgba(245,200,66,.15);border:1px solid rgba(245,200,66,.45)'
                 : 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)'
      ].join(';');
      const name = document.createElement('div');
      name.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.85rem;font-weight:'+(isWinner?'700':'500')+';color:'+(isWinner?'#f5c842':'rgba(255,255,255,.85)')+';';
      name.innerHTML = (isWinner ? '🏆 ' : '') + (p.isYou ? '<span style="color:#a78bfa">● </span>' : '') + escapeHtml(p.name || 'Player');
      const score = document.createElement('div');
      score.style.cssText = 'font-family:var(--serif,Georgia);font-size:1rem;font-weight:900;color:'+(isWinner?'#f5c842':'rgba(255,255,255,.7)')+';';
      score.textContent = p.score != null ? p.score.toLocaleString() : '';
      row.appendChild(name); row.appendChild(score);
      div.appendChild(row);
    });
    return div;
  }

  function escapeHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // savePlayerGame: standardized save for multi-player games.
  // Args:
  //   key      — storage key (e.g. 'flip7')
  //   title    — game label for summary prefix (e.g. 'Flip 7 (AI)')
  //   players  — array of {name, score}
  //   winnerIdx— index of winning player in `players` array
  //   youIdx   — index of the human player (typically 0)
  //   extra    — optional object merged into the saved entry
  function savePlayerGame(key, title, players, winnerIdx, youIdx, extra){
    youIdx = youIdx == null ? 0 : youIdx;
    const you = players[youIdx];
    const won = winnerIdx === youIdx;
    const winnerName = (players[winnerIdx] && players[winnerIdx].name) || 'Player '+(winnerIdx+1);
    // Mark who "you" is so the renderer can highlight
    const taggedPlayers = players.map((p,i) => ({ ...p, isYou: i === youIdx }));
    const entry = {
      _summary: `${title} · ${won ? 'Win' : `${winnerName} wins`} · ${you ? you.score : 0} pts`,
      _badge: won ? 'Win' : 'Loss',
      result: won ? 'win' : 'loss',
      score: you ? you.score : 0,
      players: taggedPlayers,
      winner: winnerIdx,
      ...(extra || {})
    };
    save(key, entry);
  }

  return { save, load, open, close, btn, fmt, savePlayerGame,
    renderRoundTable, renderStatGrid, renderWordleGrid, renderSudokuGrid, renderPlayerResults };
})();

// ── One-time cleanup of legacy duplicate entries ──────────────────────────
// Earlier bugs caused some games to double-save. De-dupe any gh_* keys on
// load, based on (_date + _summary + score/result) signature. Idempotent.
(function(){
  try{
    const FLAG = 'gh_dedup_v1';
    if(localStorage.getItem(FLAG)) return;
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(!k || !k.startsWith('gh_')) continue;
      let arr;
      try{ arr = JSON.parse(localStorage.getItem(k)); }catch(e){ continue; }
      if(!Array.isArray(arr) || !arr.length) continue;
      const seen = new Set();
      const deduped = [];
      for(const row of arr){
        if(!row || typeof row !== 'object') continue;
        // Signature: timestamp (rounded to second) + summary + score + result
        const ts = row._date ? Math.floor(row._date / 1000) : 0;
        const sig = ts + '|' + (row._summary || '') + '|' + (row.score != null ? row.score : '') + '|' + (row.result || '');
        if(seen.has(sig)) continue;
        seen.add(sig);
        deduped.push(row);
      }
      if(deduped.length !== arr.length){
        try{ localStorage.setItem(k, JSON.stringify(deduped)); }catch(e){}
      }
    }
    localStorage.setItem(FLAG, Date.now().toString());
  }catch(e){}
})();
