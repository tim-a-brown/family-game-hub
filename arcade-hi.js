/* arcade-hi.js — shared top-15 leaderboard with 3-letter arcade name entry
 * Usage:
 *   ArcadeHi.check(gameKey, score, onDone)
 *     - shows entry screen if score qualifies; calls onDone() when dismissed
 *   ArcadeHi.show(gameKey)
 *     - opens the leaderboard drawer
 *   ArcadeHi.btn(gameKey, label)
 *     - returns a button element that opens the leaderboard
 */
const ArcadeHi = (function(){
  const MAX = 15;

  function load(key){ try{return JSON.parse(localStorage.getItem('hi_'+key)||'[]');}catch(e){return [];} }
  function save(key,list){ try{localStorage.setItem('hi_'+key,JSON.stringify(list));}catch(e){} }

  function qualifies(key, score){
    const list = load(key);
    if(list.length < MAX) return true;
    return score > list[list.length-1].score;
  }

  function insert(key, name, score){
    const list = load(key);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const timeStr = now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    list.push({name: name.toUpperCase().slice(0,3).padEnd(3,' '), score, date: dateStr+' '+timeStr});
    list.sort((a,b)=>b.score-a.score);
    if(list.length > MAX) list.length = MAX;
    save(key, list);
    return list.findIndex(e=>e.name===name&&e.score===score);
  }

  // ── CSS (injected once) ───────────────────────────────────────────────────
  let cssInjected = false;
  function injectCSS(){
    if(cssInjected) return; cssInjected = true;
    const s = document.createElement('style');
    s.textContent = `
.ahi-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;animation:ahi-in .2s ease;}
@keyframes ahi-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
.ahi-box{background:#111827;border:2px solid rgba(245,200,66,.3);border-radius:18px;padding:24px 20px;max-width:380px;width:100%;max-height:90vh;overflow-y:auto;}
.ahi-title{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:900;text-align:center;color:#f5c842;margin-bottom:4px;}
.ahi-sub{text-align:center;color:rgba(255,255,255,.45);font-size:.78rem;margin-bottom:18px;}
/* 3-letter name entry */
.ahi-slots{display:flex;gap:10px;justify-content:center;margin-bottom:18px;}
.ahi-slot{display:flex;flex-direction:column;align-items:center;gap:6px;}
.ahi-letter{width:64px;height:80px;background:rgba(245,200,66,.1);border:2px solid rgba(245,200,66,.4);border-radius:10px;font-family:'Playfair Display',serif;font-size:2.6rem;font-weight:900;color:#f5c842;display:flex;align-items:center;justify-content:center;letter-spacing:0;user-select:none;}
.ahi-letter.active{border-color:#f5c842;background:rgba(245,200,66,.2);box-shadow:0 0 12px rgba(245,200,66,.3);}
.ahi-arrows{display:flex;flex-direction:column;gap:4px;}
.ahi-arrow{width:64px;height:32px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:rgba(255,255,255,.6);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation;}
.ahi-arrow:active{background:rgba(255,255,255,.15);}
.ahi-score-disp{text-align:center;margin-bottom:16px;}
.ahi-score-val{font-family:'Playfair Display',serif;font-size:2rem;font-weight:900;color:#f5c842;}
.ahi-score-lbl{font-size:.72rem;color:rgba(255,255,255,.4);margin-top:2px;}
/* Leaderboard table */
.ahi-table{width:100%;border-collapse:collapse;font-size:.82rem;}
.ahi-table th{color:rgba(255,255,255,.4);font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1);}
.ahi-table td{padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.05);}
.ahi-table tr.ahi-new td{color:#f5c842;}
.ahi-table tr.ahi-top td:first-child::before{content:'🏆 ';}
.ahi-rank{color:rgba(255,255,255,.3);font-size:.72rem;width:24px;}
.ahi-name{font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:900;letter-spacing:.1em;}
.ahi-pts{font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:900;text-align:right;}
.ahi-dt{color:rgba(255,255,255,.3);font-size:.65rem;text-align:right;}
.ahi-empty{text-align:center;color:rgba(255,255,255,.25);padding:24px;font-size:.85rem;}
`;
    document.head.appendChild(s);
  }

  // ── Name entry screen ─────────────────────────────────────────────────────
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function showEntry(key, score, onDone){
    injectCSS();
    const letters = ['A','A','A'];
    let focusIdx = 0;

    const overlay = document.createElement('div');
    overlay.className = 'ahi-overlay';
    overlay.innerHTML = `
      <div class="ahi-box">
        <div class="ahi-title">🎮 HIGH SCORE!</div>
        <div class="ahi-sub">You made the top ${MAX}. Enter your initials.</div>
        <div class="ahi-score-disp">
          <div class="ahi-score-val">${score.toLocaleString()}</div>
          <div class="ahi-score-lbl">SCORE</div>
        </div>
        <div class="ahi-slots" id="ahi-slots"></div>
        <div id="ahi-warn" style="display:none;color:#ef4444;font-size:.75rem;text-align:center;margin-bottom:8px;"></div>
        <button class="btn btn-gold btn-block" id="ahi-submit" style="max-width:240px;margin:0 auto 10px;display:block;">Submit →</button>
        <button class="btn btn-outline btn-block" id="ahi-skip" style="max-width:240px;margin:0 auto;display:block;font-size:.78rem;">Skip</button>
      </div>`;
    document.body.appendChild(overlay);

    function renderSlots(){
      const container = document.getElementById('ahi-slots');
      container.innerHTML = '';
      for(let i=0;i<3;i++){
        const ci = CHARS.indexOf(letters[i]);
        const slot = document.createElement('div');
        slot.className = 'ahi-slot';
        slot.innerHTML = `
          <div class="ahi-arrows">
            <button class="ahi-arrow" data-i="${i}" data-dir="1">▲</button>
          </div>
          <div class="ahi-letter${i===focusIdx?' active':''}" data-i="${i}">${letters[i]}</div>
          <div class="ahi-arrows">
            <button class="ahi-arrow" data-i="${i}" data-dir="-1">▼</button>
          </div>`;
        container.appendChild(slot);
      }
      // Arrow click handlers
      container.querySelectorAll('.ahi-arrow').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const i=+btn.dataset.i, dir=+btn.dataset.dir;
          focusIdx=i;
          const ci=(CHARS.indexOf(letters[i])+dir+26)%26;
          letters[i]=CHARS[ci];
          renderSlots();
        });
      });
      container.querySelectorAll('.ahi-letter').forEach(el=>{
        el.addEventListener('click',()=>{focusIdx=+el.dataset.i;renderSlots();});
      });
    }
    renderSlots();

    // Keyboard support
    function onKey(e){
      if(e.key.length===1&&((e.key>='A'&&e.key<='Z')||(e.key>='a'&&e.key<='z'))){
        letters[focusIdx]=e.key.toUpperCase();
        focusIdx=Math.min(2,focusIdx+1);
        const warn=document.getElementById('ahi-warn');if(warn)warn.style.display='none';
        renderSlots();e.preventDefault();
      } else if(e.key==='Backspace'){
        focusIdx=Math.max(0,focusIdx-1);
        letters[focusIdx]='A';
        renderSlots();e.preventDefault();
      } else if(e.key==='ArrowRight') { focusIdx=Math.min(2,focusIdx+1);renderSlots();}
      else if(e.key==='ArrowLeft')  { focusIdx=Math.max(0,focusIdx-1);renderSlots();}
      else if(e.key==='ArrowUp')    { const ci=(CHARS.indexOf(letters[focusIdx])+1)%26;letters[focusIdx]=CHARS[ci];renderSlots();}
      else if(e.key==='ArrowDown')  { const ci=(CHARS.indexOf(letters[focusIdx])-1+26)%26;letters[focusIdx]=CHARS[ci];renderSlots();}
      else if(e.key==='Enter'||e.key===' ') { document.getElementById('ahi-submit')?.click(); }
    }
    document.addEventListener('keydown', onKey);

    function dismiss(submit){
      document.removeEventListener('keydown', onKey);
      if(submit){
        // Block default AAA — user hasn't actually typed initials
        if(letters.join('')==='AAA'){
          // Flash warning on the slots
          const slotsEl=document.getElementById('ahi-slots');
          if(slotsEl){slotsEl.style.outline='2px solid #ef4444';setTimeout(()=>{slotsEl.style.outline='';},600);}
          const warn=document.getElementById('ahi-warn');
          if(warn){warn.textContent='Enter your initials first!';warn.style.display='block';}
          document.addEventListener('keydown',onKey); // re-attach
          return;
        }
        const name = letters.join('').trim()||'???';
        insert(key, name, score);
      }
      overlay.remove();
      onDone && onDone();
    }

    document.getElementById('ahi-submit').addEventListener('click',()=>dismiss(true));
    document.getElementById('ahi-skip').addEventListener('click',()=>dismiss(false));
  }

  // ── Leaderboard display ───────────────────────────────────────────────────
  function showBoard(key, title, newScore=null){
    injectCSS();
    const list = load(key);
    const newIdx = newScore!==null ? list.findIndex(e=>e.score===newScore) : -1;
    const gameName = title || 'High Scores';

    const overlay = document.createElement('div');
    overlay.className = 'ahi-overlay';

    let rows = '';
    if(list.length===0){
      rows = `<tr><td colspan="4" class="ahi-empty">No scores yet — be the first!<br><span style="font-size:.75rem;color:rgba(255,255,255,.2);display:block;margin-top:6px;">Play a game to get on the board.</span></td></tr>`;
    } else {
      list.forEach((e,i)=>{
        const isNew = i===newIdx;
        const isTop = i===0;
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
        rows += `<tr class="${isNew?'ahi-new':''}">
          <td class="ahi-rank">${medal||i+1}</td>
          <td class="ahi-name">${e.name}</td>
          <td class="ahi-pts">${e.score.toLocaleString()}</td>
          <td class="ahi-dt">${e.date}</td>
        </tr>`;
      });
    }

    const hasScores = list.length > 0;
    overlay.innerHTML = `
      <div class="ahi-box">
        <div class="ahi-title">🏆 ${gameName}</div>
        <div class="ahi-sub">Top ${MAX} · ${list.length} entr${list.length===1?'y':'ies'}</div>
        <table class="ahi-table">
          <thead><tr><th>#</th><th>Name</th><th style="text-align:right">Score</th><th style="text-align:right">Date</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
          <button class="btn btn-gold" id="ahi-close" style="min-width:100px;">Close</button>
          ${hasScores?`<button class="btn btn-outline btn-sm" id="ahi-clear" style="color:rgba(255,100,100,.7);border-color:rgba(255,100,100,.3);">🗑 Clear scores</button>`:''}
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    document.getElementById('ahi-close').addEventListener('click', () => overlay.remove());

    if(hasScores){
      document.getElementById('ahi-clear').addEventListener('click', () => {
        if(confirm(`Clear all ${gameName} high scores?\n\nThis can't be undone.`)){
          save(key, []);
          overlay.remove();
          // Re-open to show empty state
          showBoard(key, title, null);
        }
      });
    }

    // Close on Escape
    function onEsc(e){ if(e.key==='Escape'){overlay.remove();document.removeEventListener('keydown',onEsc);} }
    document.addEventListener('keydown', onEsc);
    overlay.addEventListener('remove', () => document.removeEventListener('keydown', onEsc));
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    check(key, score, onDone){
      if(score>0 && qualifies(key, score)){
        showEntry(key, score, ()=>{
          onDone && onDone();
        });
      } else {
        onDone && onDone();
      }
    },
    show(key, title){
      showBoard(key, title);
    },
    btn(key, title){
      injectCSS();
      const b = document.createElement('button');
      b.className = 'btn btn-outline btn-sm';
      b.innerHTML = '🏆 Scores';
      b.addEventListener('click', ()=>showBoard(key, title));
      return b;
    }
  };
})();
