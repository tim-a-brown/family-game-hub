// Sync diagnostics sheet (opened from the account sheet on the home screen).
// Shows local vs cloud counts and offers force push/pull. Moved from index.html.
(function(){
var css=document.createElement('style');css.textContent=`
.sd-overlay{position:fixed;inset:0;z-index:500;display:none;align-items:center;justify-content:center;padding:16px;}
.sd-overlay.show{display:flex;}
.sd-box{width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:20px;}
.sd-title{font-size:1.15rem;margin-bottom:4px;}
.sd-sub{font-size:.74rem;color:var(--text-3);margin-bottom:14px;}
.sd-section{background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px;}
.sd-section-title{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;}
.sd-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:.82rem;}
.sd-row .lbl{color:var(--text-2);}
.sd-row .val{color:var(--text);font-weight:600;font-variant-numeric:tabular-nums;}
.sd-row .val.mismatch{color:#ffc83d;}
.sd-row .val.match{color:#3ddc84;}
.sd-actions{display:flex;flex-direction:column;gap:6px;margin-top:12px;}
.sd-btn{all:unset;cursor:pointer;text-align:center;padding:11px;border-radius:var(--r-sm);font-size:.85rem;font-weight:700;background:var(--surface-2);border:1px solid var(--line-2);color:var(--text);}
.sd-btn:hover{background:var(--surface-3);}
.sd-btn.primary{background:rgba(245,200,66,.14);border-color:rgba(245,200,66,.4);color:var(--gold);}
.sd-btn.danger{border-color:rgba(248,113,113,.35);color:#fca5a5;}
.sd-raw{background:rgba(0,0,0,.45);border:1px solid var(--line);border-radius:8px;padding:8px;font-family:ui-monospace,'SF Mono',Monaco,monospace;font-size:.68rem;max-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--text-2);margin-top:8px;}
.sd-overlay{background:rgba(8,5,22,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
.sd-box{background:var(--bg-2);border-radius:24px;color:var(--text);}
`;document.head.appendChild(css);
function openSyncDiagnostics(){
  if(document.getElementById('sd-modal')) return;
  const overlay = document.createElement('div');
  overlay.className = 'sd-overlay show';
  overlay.id = 'sd-modal';
  overlay.innerHTML = `<div class="sd-box">
    <div class="sd-title">Sync diagnostics</div>
    <div class="sd-sub" id="sd-sub">Gathering local data…</div>
    <div id="sd-content"><div style="padding:24px;text-align:center;color:rgba(255,255,255,.45);">Loading cloud data…</div></div>
    <div class="sd-close-row"><button class="sd-btn" id="sd-close">Close</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target === overlay) closeSyncDiag(); });
  document.getElementById('sd-close').addEventListener('click', closeSyncDiag);
  document.addEventListener('keydown', function esc(e){
    if(e.key === 'Escape'){ closeSyncDiag(); document.removeEventListener('keydown', esc); }
  });

  // Gather local counts
  const local = countLocal();
  const mode = (typeof FGHSync !== 'undefined') ? FGHSync.mode() : null;
  const pin = (typeof FGHSync !== 'undefined') ? FGHSync.pin() : null;
  document.getElementById('sd-sub').textContent = mode === 'pin' ? ('PIN ' + pin) : 'Guest mode (no cloud sync)';

  // If the last sync attempt errored, surface that message immediately — the
  // user hit Retry specifically to see this.
  const syncSt = (typeof FGHSync !== 'undefined' && typeof FGHSync.syncStatus === 'function') ? FGHSync.syncStatus() : null;
  let errorBanner = '';
  if(syncSt && syncSt.state === 'error' && syncSt.error){
    errorBanner = `<div class="sd-section" style="border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.04);">
      <div class="sd-section-title" style="color:#fca5a5">⚠ Last sync error</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.85);word-break:break-word;">${escapeHtml(syncSt.error)}</div>
    </div>`;
  }

  if(mode !== 'pin'){
    document.getElementById('sd-content').innerHTML = errorBanner + `
      <div class="sd-section">
        <div class="sd-section-title">Local</div>
        ${formatCounts(local)}
      </div>
      <div class="sd-section" style="color:rgba(255,255,255,.5);font-size:.82rem;">
        You're in guest mode. Sign in with a PIN to enable cross-device sync.
      </div>`;
    return;
  }

  // Pull cloud data
  FGHSync.pullCloudRaw().then(result => {
    if(!document.getElementById('sd-modal')) return;
    let content = '';
    if(result.error){
      content = errorBanner + `<div class="sd-section" style="border-color:rgba(248,113,113,.3);">
        <div class="sd-section-title" style="color:#fca5a5">Cloud error</div>
        <div style="font-size:.82rem;color:rgba(255,255,255,.85);">${escapeHtml(result.error)}</div>
      </div>
      <div class="sd-section"><div class="sd-section-title">Local</div>${formatCounts(local)}</div>`;
    } else if(!result.exists){
      content = errorBanner + `<div class="sd-section" style="border-color:rgba(251,191,36,.3);">
        <div class="sd-section-title" style="color:#fbbf24">Cloud</div>
        <div style="font-size:.82rem;color:rgba(255,255,255,.75);">No document exists yet for PIN ${pin}. Use "Push to cloud" to create one.</div>
      </div>
      <div class="sd-section"><div class="sd-section-title">Local</div>${formatCounts(local)}</div>
      <div class="sd-actions">
        <button class="sd-btn primary" id="sd-push">⬆ Push local to cloud</button>
      </div>`;
    } else {
      const cloud = countCloud(result.data);
      content = errorBanner + `<div class="sd-section">
        <div class="sd-section-title">Local vs cloud</div>
        ${compareCounts(local, cloud)}
      </div>
      <div class="sd-actions">
        <button class="sd-btn primary" id="sd-sync">🔄 Sync now (merge)</button>
        <button class="sd-btn" id="sd-pull">⬇ Pull from cloud (overwrite local)</button>
        <button class="sd-btn" id="sd-push">⬆ Push to cloud (overwrite cloud)</button>
        <button class="sd-btn" id="sd-raw-toggle">🔍 Show raw cloud data</button>
      </div>
      <div id="sd-raw-host"></div>`;
    }
    document.getElementById('sd-content').innerHTML = content;
    // Wire actions
    const wire = (id, fn) => {
      const b = document.getElementById(id);
      if(b) b.addEventListener('click', fn);
    };
    wire('sd-sync', () => {
      FGHSync.syncNow().then(() => { closeSyncDiag(); setTimeout(openSyncDiagnostics, 300); });
    });
    wire('sd-pull', () => {
      if(!confirm('Pull cloud data and overwrite local storage? Any unsaved local changes will be lost.')) return;
      FGHSync.forceOverwriteLocal().then(() => { closeSyncDiag(); setTimeout(openSyncDiagnostics, 300); });
    });
    wire('sd-push', () => {
      if(!confirm('Push local data to cloud, overwriting whatever is there?')) return;
      FGHSync.forceOverwriteCloud().then(() => { closeSyncDiag(); setTimeout(openSyncDiagnostics, 300); });
    });
    wire('sd-raw-toggle', () => {
      const host = document.getElementById('sd-raw-host');
      if(host.innerHTML){ host.innerHTML = ''; return; }
      host.innerHTML = `<div class="sd-raw">${escapeHtml(JSON.stringify(result.data, null, 2))}</div>`;
    });
  }).catch(err => {
    if(!document.getElementById('sd-modal')) return;
    document.getElementById('sd-content').innerHTML = `<div class="sd-section" style="border-color:rgba(248,113,113,.3);">
      <div class="sd-section-title" style="color:#fca5a5">Pull failed</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.85);">${escapeHtml((err && err.message) || String(err))}</div>
    </div>
    <div class="sd-section"><div class="sd-section-title">Local</div>${formatCounts(local)}</div>`;
  });
}
function closeSyncDiag(){ const m = document.getElementById('sd-modal'); if(m) m.remove(); }
function countLocal(){
  const out = { hi:0, hiGames:0, gh:0, ghGames:0, rklists:0, favs:0, bank:null };
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(!k) continue;
    if(k.indexOf('hi_') === 0){
      out.hiGames++;
      try{ out.hi += (JSON.parse(localStorage.getItem(k))||[]).length; }catch(e){}
    } else if(k.indexOf('gh_') === 0){
      out.ghGames++;
      try{ out.gh += (JSON.parse(localStorage.getItem(k))||[]).length; }catch(e){}
    } else if(k === 'rklists'){
      try{ const d = JSON.parse(localStorage.getItem(k)); out.rklists = (d && d.lists ? d.lists.length : 0); }catch(e){}
    } else if(k === 'fav_games'){
      try{ const d = JSON.parse(localStorage.getItem(k)); out.favs = Array.isArray(d) ? d.length : 0; }catch(e){}
    } else if(k === 'casino_bank'){
      try{ out.bank = parseInt(localStorage.getItem(k))||null; }catch(e){}
    }
  }
  return out;
}
function countCloud(d){
  const out = { hi:0, hiGames:0, gh:0, ghGames:0, rklists:0, favs:0, bank:null };
  if(!d) return out;
  if(d.hi && typeof d.hi === 'object'){
    Object.keys(d.hi).forEach(k => {
      out.hiGames++;
      const arr = Array.isArray(d.hi[k]) ? d.hi[k] : (d.hi[k] && typeof d.hi[k] === 'object' ? Object.values(d.hi[k]) : []);
      out.hi += arr.length;
    });
  }
  if(d.gh && typeof d.gh === 'object'){
    Object.keys(d.gh).forEach(k => {
      out.ghGames++;
      const arr = Array.isArray(d.gh[k]) ? d.gh[k] : (d.gh[k] && typeof d.gh[k] === 'object' ? Object.values(d.gh[k]) : []);
      out.gh += arr.length;
    });
  }
  if(d.rklists){
    const lists = d.rklists.lists;
    if(Array.isArray(lists)) out.rklists = lists.length;
    else if(lists && typeof lists === 'object') out.rklists = Object.keys(lists).length;
  }
  if(Array.isArray(d.favs)) out.favs = d.favs.length;
  if(typeof d.bank === 'number') out.bank = d.bank;
  return out;
}
function formatCounts(c){
  return `
    <div class="sd-row"><span class="lbl">High scores</span><span class="val">${c.hi} across ${c.hiGames} games</span></div>
    <div class="sd-row"><span class="lbl">Game history</span><span class="val">${c.gh} across ${c.ghGames} games</span></div>
    <div class="sd-row"><span class="lbl">Ranker lists</span><span class="val">${c.rklists}</span></div>
    <div class="sd-row"><span class="lbl">Favorites</span><span class="val">${c.favs}</span></div>
    <div class="sd-row"><span class="lbl">Casino bank</span><span class="val">${c.bank == null ? '—' : '$'+c.bank.toLocaleString()}</span></div>`;
}
function compareCounts(local, cloud){
  function row(label, a, b, formatter){
    const fmt = formatter || (x => x);
    const eq = a === b;
    const av = fmt(a), bv = fmt(b);
    return `<div class="sd-row"><span class="lbl">${label}</span><span class="val ${eq?'match':'mismatch'}">${av} / ${bv}</span></div>`;
  }
  return `
    <div class="sd-row" style="padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:4px;"><span class="lbl" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;">Metric</span><span class="val" style="color:rgba(255,255,255,.5);font-size:.7rem;">LOCAL / CLOUD</span></div>
    ${row('High score rows', local.hi, cloud.hi)}
    ${row('Hi-score games', local.hiGames, cloud.hiGames)}
    ${row('History rows', local.gh, cloud.gh)}
    ${row('History games', local.ghGames, cloud.ghGames)}
    ${row('Ranker lists', local.rklists, cloud.rklists)}
    ${row('Favorites', local.favs, cloud.favs)}
    ${row('Bank', local.bank, cloud.bank, v => v==null?'—':'$'+v.toLocaleString())}
  `;
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
window.openSyncDiagnostics = openSyncDiagnostics;
window.openSyncDiagnostics=openSyncDiagnostics;
})();
