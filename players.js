'use strict';
// ── Frequent Players ────────────────────────────────────────────────────────
// A small roster of names the user plays with most often, stored locally and
// surfaced as a quick-pick chip row under any name input via attachPicker().
//
//   FrequentPlayers.list()           -> array of names (de-duped, trimmed)
//   FrequentPlayers.add(name)        -> adds if new; moves to front if existing
//   FrequentPlayers.remove(name)     -> removes by case-insensitive match
//   FrequentPlayers.rename(old,new)  -> in-place rename preserving order
//   FrequentPlayers.clear()          -> wipe list
//   FrequentPlayers.attachPicker(input, opts)
//     Renders a chip row below `input`. Tapping a chip sets input.value and
//     fires an 'input' + 'change' event so listeners update. Chips shown are
//     filtered against opts.siblingSelector (default: none) so names already
//     entered in other inputs aren't suggested again.

const FrequentPlayers = (function(){
  const KEY = 'frequent_players';
  const MAX = 20;

  function list(){
    try{
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if(!Array.isArray(arr)) return [];
      // Sanitize: strings only, trimmed, non-empty, de-duped case-insensitively
      const seen = new Set();
      const out = [];
      for(const n of arr){
        if(typeof n !== 'string') continue;
        const t = n.trim();
        if(!t) continue;
        const k = t.toLowerCase();
        if(seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
      return out;
    }catch(e){ return []; }
  }

  function save(arr){
    try{
      localStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX)));
    }catch(e){}
  }

  function add(name){
    const t = (name||'').trim();
    if(!t) return;
    const cur = list();
    const k = t.toLowerCase();
    const filtered = cur.filter(n => n.toLowerCase() !== k);
    filtered.unshift(t);
    save(filtered);
  }

  function remove(name){
    const k = (name||'').trim().toLowerCase();
    if(!k) return;
    save(list().filter(n => n.toLowerCase() !== k));
  }

  function rename(oldName, newName){
    const oldK = (oldName||'').trim().toLowerCase();
    const t = (newName||'').trim();
    if(!oldK || !t) return;
    const cur = list();
    const idx = cur.findIndex(n => n.toLowerCase() === oldK);
    if(idx < 0) return;
    // Also remove any pre-existing entry matching the new name
    const newK = t.toLowerCase();
    const merged = cur.filter((n,i) => i === idx || n.toLowerCase() !== newK);
    const fixedIdx = merged.findIndex(n => n.toLowerCase() === oldK);
    if(fixedIdx >= 0) merged[fixedIdx] = t;
    save(merged);
  }

  function clear(){
    try{ localStorage.removeItem(KEY); }catch(e){}
  }

  // ── Picker UI ─────────────────────────────────────────────────────────────
  // Injects a chip row under the given input. Chips reflect the current list,
  // minus any names already present in siblingSelector-matched inputs.
  function attachPicker(input, opts){
    if(!input) return;
    if(input._fpAttached) return;
    input._fpAttached = true;
    opts = opts || {};

    ensureStyles();

    const row = document.createElement('div');
    row.className = 'fp-row';

    function siblingValues(){
      if(!opts.siblingSelector) return [];
      try{
        return Array.from(document.querySelectorAll(opts.siblingSelector))
          .filter(el => el !== input)
          .map(el => (el.value||'').trim().toLowerCase())
          .filter(Boolean);
      }catch(e){ return []; }
    }

    function render(){
      const used = new Set(siblingValues());
      const names = list().filter(n => !used.has(n.toLowerCase()));
      row.innerHTML = '';
      if(!names.length && !opts.showManage){ row.style.display='none'; return; }
      row.style.display = 'flex';
      names.forEach(n => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'fp-chip';
        chip.textContent = n;
        chip.addEventListener('click', function(e){
          e.preventDefault();
          input.value = n;
          input.dispatchEvent(new Event('input',  {bubbles:true}));
          input.dispatchEvent(new Event('change', {bubbles:true}));
          render();
        });
        row.appendChild(chip);
      });
      if(opts.showManage !== false){
        const manage = document.createElement('button');
        manage.type = 'button';
        manage.className = 'fp-chip fp-manage';
        manage.textContent = names.length ? 'Manage' : '+ Add players';
        manage.addEventListener('click', function(e){
          e.preventDefault();
          openManager(function(){ render(); });
        });
        row.appendChild(manage);
      }
    }

    // Insert row right after the input
    if(input.parentNode){
      input.parentNode.insertBefore(row, input.nextSibling);
    }
    render();

    // Update on input change (so typing a name hides it from other pickers)
    input.addEventListener('input', render);
    input.addEventListener('blur', function(){
      // Auto-add the typed name to the frequent list if it's not already there,
      // skipping the generic "Player N" placeholder pattern.
      if(opts.autoAddOnBlur === false) return;
      const v = (input.value||'').trim();
      if(v && v.length <= 24 && !/^player\s*\d+$/i.test(v)) add(v);
      // Re-render sibling pickers (if any) via a custom event
      document.dispatchEvent(new CustomEvent('fp:update'));
    });
    document.addEventListener('fp:update', render);
    document.addEventListener('frequentplayers:changed', render);

    return { refresh: render, row };
  }

  function ensureStyles(){
    if(document.getElementById('fp-style')) return;
    const s = document.createElement('style');
    s.id = 'fp-style';
    s.textContent = `
      .fp-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px;align-items:center;}
      .fp-chip{all:unset;cursor:pointer;box-sizing:border-box;
        font-family:Inter,system-ui,sans-serif;font-size:.72rem;font-weight:600;
        padding:4px 10px;border-radius:14px;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);
        color:rgba(255,255,255,.75);line-height:1.3;
        transition:background .12s,border-color .12s,color .12s,transform .08s;
        white-space:nowrap;text-decoration:none;display:inline-block;}
      .fp-chip:hover{background:rgba(245,200,66,.12);border-color:rgba(245,200,66,.4);color:#f5c842;}
      .fp-chip:active{transform:scale(.95);}
      .fp-chip.fp-manage{background:transparent;border-style:dashed;color:rgba(255,255,255,.4);}
      .fp-chip.fp-manage:hover{color:#f5c842;border-color:rgba(245,200,66,.5);}

      /* ── Manage Players Dialog ───────────────────────────────────── */
      .fp-mgr-overlay{
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,.72);backdrop-filter:blur(4px);
        display:flex;align-items:center;justify-content:center;
        padding:20px;opacity:0;transition:opacity .18s ease;
      }
      .fp-mgr-overlay.show{opacity:1;}
      .fp-mgr-card{
        background:linear-gradient(180deg,#1a1a24,#12121a);
        border:1px solid rgba(255,255,255,.12);border-radius:16px;
        width:100%;max-width:420px;max-height:86vh;overflow:hidden;
        display:flex;flex-direction:column;
        box-shadow:0 20px 60px rgba(0,0,0,.6);
        transform:scale(.92);transition:transform .2s cubic-bezier(.34,1.56,.64,1);
        font-family:Inter,system-ui,sans-serif;
      }
      .fp-mgr-overlay.show .fp-mgr-card{transform:scale(1);}
      .fp-mgr-head{
        display:flex;align-items:center;justify-content:space-between;
        padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);
      }
      .fp-mgr-title{font-family:Georgia,serif;font-weight:900;font-size:1.1rem;color:#f5c842;letter-spacing:.02em;}
      .fp-mgr-x{
        all:unset;cursor:pointer;
        width:28px;height:28px;border-radius:50%;
        background:rgba(255,255,255,.08);color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-size:1rem;line-height:1;
      }
      .fp-mgr-x:hover{background:rgba(255,255,255,.16);}
      .fp-mgr-body{padding:14px 18px;overflow-y:auto;flex:1;}
      .fp-mgr-add{
        display:flex;gap:8px;margin-bottom:14px;
      }
      .fp-mgr-add input{
        flex:1;padding:10px 12px;border-radius:10px;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);
        color:#fff;font-size:.95rem;font-family:Inter,system-ui,sans-serif;outline:none;
      }
      .fp-mgr-add input:focus{border-color:rgba(245,200,66,.5);background:rgba(245,200,66,.06);}
      .fp-mgr-add button{
        all:unset;cursor:pointer;
        padding:10px 16px;border-radius:10px;
        background:linear-gradient(135deg,#f5c842,#d4a62e);color:#2a1a00;
        font-weight:800;font-size:.88rem;
        transition:filter .12s,transform .08s;
      }
      .fp-mgr-add button:hover{filter:brightness(1.08);}
      .fp-mgr-add button:active{transform:scale(.96);}
      .fp-mgr-add button:disabled{opacity:.35;cursor:default;filter:grayscale(.4);}
      .fp-mgr-list{display:flex;flex-direction:column;gap:6px;}
      .fp-mgr-empty{
        text-align:center;padding:24px 0;color:rgba(255,255,255,.35);font-size:.85rem;
      }
      .fp-mgr-row{
        display:flex;align-items:center;gap:8px;
        padding:8px 10px;border-radius:10px;
        background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
      }
      .fp-mgr-row input{
        flex:1;padding:6px 8px;border-radius:6px;
        background:rgba(0,0,0,.25);border:1px solid transparent;
        color:#fff;font-size:.92rem;font-family:Inter,system-ui,sans-serif;outline:none;
      }
      .fp-mgr-row input:focus{border-color:rgba(245,200,66,.5);background:rgba(245,200,66,.06);}
      .fp-mgr-row button{
        all:unset;cursor:pointer;
        width:30px;height:30px;border-radius:8px;
        display:flex;align-items:center;justify-content:center;
        color:rgba(255,255,255,.55);font-size:.9rem;
        transition:color .12s,background .12s;
      }
      .fp-mgr-row button:hover{background:rgba(255,255,255,.08);color:#fff;}
      .fp-mgr-row button.fp-mgr-del:hover{color:#f87171;background:rgba(248,113,113,.12);}
      .fp-mgr-foot{
        padding:12px 18px 16px;border-top:1px solid rgba(255,255,255,.08);
        display:flex;justify-content:flex-end;
      }
      .fp-mgr-foot button{
        all:unset;cursor:pointer;
        padding:9px 16px;border-radius:9px;
        background:rgba(255,255,255,.08);color:rgba(255,255,255,.85);
        font-size:.85rem;font-weight:600;
      }
      .fp-mgr-foot button:hover{background:rgba(255,255,255,.14);color:#fff;}
    `;
    document.head.appendChild(s);
  }

  // ── Manage Players Dialog ───────────────────────────────────────────────
  // Opens an in-page overlay to add/rename/remove frequent players. Calls
  // `onClose` after the user dismisses the dialog so picker rows can re-render.
  function openManager(onClose){
    ensureStyle();
    // Remove any existing instance
    document.querySelectorAll('.fp-mgr-overlay').forEach(n => n.remove());

    const overlay = document.createElement('div');
    overlay.className = 'fp-mgr-overlay';
    overlay.innerHTML = `
      <div class="fp-mgr-card" role="dialog" aria-modal="true" aria-labelledby="fp-mgr-title">
        <div class="fp-mgr-head">
          <div class="fp-mgr-title" id="fp-mgr-title">👥 Frequent Players</div>
          <button type="button" class="fp-mgr-x" aria-label="Close">×</button>
        </div>
        <div class="fp-mgr-body">
          <div class="fp-mgr-add">
            <input type="text" placeholder="Add a player…" maxlength="20" autocomplete="off" autocorrect="off" spellcheck="false">
            <button type="button" disabled>Add</button>
          </div>
          <div class="fp-mgr-list"></div>
        </div>
        <div class="fp-mgr-foot">
          <button type="button" class="fp-mgr-done">Done</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const card       = overlay.querySelector('.fp-mgr-card');
    const listHost   = overlay.querySelector('.fp-mgr-list');
    const addInput   = overlay.querySelector('.fp-mgr-add input');
    const addBtn     = overlay.querySelector('.fp-mgr-add button');
    const closeBtn   = overlay.querySelector('.fp-mgr-x');
    const doneBtn    = overlay.querySelector('.fp-mgr-done');

    function renderList(){
      const names = list();
      listHost.innerHTML = '';
      if(!names.length){
        const empty = document.createElement('div');
        empty.className = 'fp-mgr-empty';
        empty.textContent = 'No frequent players yet. Add one above to get started.';
        listHost.appendChild(empty);
        return;
      }
      names.forEach(n => {
        const row = document.createElement('div');
        row.className = 'fp-mgr-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = n;
        inp.maxLength = 20;
        inp.dataset.original = n;
        inp.addEventListener('blur', function(){
          const val = (inp.value||'').trim();
          const orig = inp.dataset.original;
          if(!val){ inp.value = orig; return; }
          if(val.toLowerCase() === orig.toLowerCase() && val !== orig){
            // Case change only — rename to update display
            rename(orig, val);
          } else if(val !== orig){
            rename(orig, val);
          }
          renderList();
        });
        inp.addEventListener('keydown', function(e){
          if(e.key === 'Enter') inp.blur();
          else if(e.key === 'Escape'){ inp.value = inp.dataset.original; inp.blur(); }
        });
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'fp-mgr-del';
        del.title = 'Remove ' + n;
        del.innerHTML = '🗑';
        del.addEventListener('click', function(){
          if(confirm('Remove "' + n + '" from frequent players?')){
            remove(n);
            renderList();
          }
        });
        row.appendChild(inp);
        row.appendChild(del);
        listHost.appendChild(row);
      });
    }

    function attemptAdd(){
      const val = (addInput.value||'').trim();
      if(!val) return;
      add(val);
      addInput.value = '';
      addBtn.disabled = true;
      renderList();
      addInput.focus();
    }

    addInput.addEventListener('input', function(){
      addBtn.disabled = !(addInput.value||'').trim();
    });
    addInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && (addInput.value||'').trim()) attemptAdd();
    });
    addBtn.addEventListener('click', attemptAdd);

    function closeManager(){
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        // Re-render every picker on the page so new names appear everywhere
        try{
          if(typeof onClose === 'function') onClose();
          document.dispatchEvent(new CustomEvent('frequentplayers:changed'));
        }catch(e){}
      }, 200);
    }

    closeBtn.addEventListener('click', closeManager);
    doneBtn.addEventListener('click', closeManager);
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) closeManager();
    });
    document.addEventListener('keydown', function onEsc(e){
      if(e.key === 'Escape'){
        closeManager();
        document.removeEventListener('keydown', onEsc);
      }
    });

    renderList();
    setTimeout(() => addInput.focus(), 100);
  }

  // Convenience: attach a picker to every input whose id starts with `prefix`.
  // Sibling filtering is automatic — pickers on inputs sharing the prefix
  // will hide names already typed in any of them.
  function attachPickersByPrefix(prefix, opts){
    const selector = 'input[id^="' + prefix + '"]';
    const inputs = document.querySelectorAll(selector);
    inputs.forEach(inp => attachPicker(inp, Object.assign({siblingSelector:selector}, opts||{})));
    // Scorecards all call this; piggyback the solo-vs-AI CTA injection here
    // so every scorecard gets the prominent 1-player button for free.
    try{ installAiSoloCta(); }catch(e){}
  }

  // ── Solo vs AI CTA for scorecards ─────────────────────────────────────
  // Each scorecard has a .setup-screen and a .ai-link pointing to the AI
  // version. This helper prepends a prominent "🎮 1 Player (vs AI)" banner
  // inside the setup screen so the solo flow is discoverable alongside the
  // 2/3/4+ player picker. Call once per page (auto-runs via installNameChip
  // if not called explicitly).
  function installAiSoloCta(){
    try{
      if(document.getElementById('fp-ai-solo-cta')) return;
      const setup = document.querySelector('.setup-screen');
      const aiLink = document.querySelector('.ai-link');
      if(!setup || !aiLink) return;
      const href = aiLink.getAttribute('href');
      if(!href) return;

      const s = document.createElement('style');
      s.textContent = `
        .fp-ai-cta{
          display:flex;align-items:center;gap:12px;
          padding:12px 14px;border-radius:12px;margin:0 0 14px;
          background:linear-gradient(135deg,rgba(167,139,250,.14),rgba(90,200,250,.10));
          border:1px solid rgba(167,139,250,.35);
          color:#fff;text-decoration:none;
          transition:all .14s;cursor:pointer;
        }
        .fp-ai-cta:hover{
          background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(90,200,250,.18));
          border-color:rgba(167,139,250,.6);
          transform:translateY(-1px);
        }
        .fp-ai-cta:active{transform:translateY(0);}
        .fp-ai-cta-icon{
          flex-shrink:0;
          width:38px;height:38px;border-radius:50%;
          background:rgba(167,139,250,.2);
          display:flex;align-items:center;justify-content:center;
          font-size:1.2rem;
        }
        .fp-ai-cta-body{flex:1;min-width:0;}
        .fp-ai-cta-title{
          font-weight:700;font-size:.92rem;color:#fff;line-height:1.2;
          display:flex;align-items:center;gap:6px;
        }
        .fp-ai-cta-sub{
          font-size:.72rem;color:rgba(255,255,255,.55);margin-top:2px;
        }
        .fp-ai-cta-arrow{
          flex-shrink:0;color:rgba(167,139,250,.7);font-size:1.1rem;
        }
      `;
      document.head.appendChild(s);

      const cta = document.createElement('a');
      cta.id = 'fp-ai-solo-cta';
      cta.className = 'fp-ai-cta';
      cta.href = href;
      cta.innerHTML = `
        <div class="fp-ai-cta-icon">🎮</div>
        <div class="fp-ai-cta-body">
          <div class="fp-ai-cta-title">1 Player (vs AI)</div>
          <div class="fp-ai-cta-sub">Play solo against computer opponents</div>
        </div>
        <div class="fp-ai-cta-arrow">→</div>
      `;
      setup.insertBefore(cta, setup.firstChild);

      // Hide the redundant small nav link now that the CTA is in-page
      aiLink.style.display = 'none';
    }catch(e){}
  }


  // Games that use "You" for the human player read this as the display/history
  // name. Stored globally so all solo games share it.
  const MY_NAME_KEY = 'my_name';

  function myName(){
    try{
      const v = (localStorage.getItem(MY_NAME_KEY)||'').trim();
      return v || null;
    }catch(e){ return null; }
  }

  function setMyName(name){
    const t = (name||'').trim();
    try{
      if(t) localStorage.setItem(MY_NAME_KEY, t);
      else localStorage.removeItem(MY_NAME_KEY);
    }catch(e){}
    if(t) add(t);
  }

  // Small floating chip in the top-right of the page showing "👤 [name]".
  // Clicking opens a modal to change the name. After a change, the page is
  // reloaded so the new name appears everywhere.
  function installNameChip(opts){
    opts = opts || {};
    if(document.getElementById('fp-name-chip')) return;
    ensureStyles();
    ensureNameChipStyles();

    const current = myName() || 'You';
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.id = 'fp-name-chip';
    chip.className = 'fp-name-chip';
    chip.innerHTML = '<span class="fp-nc-icon">👤</span><span class="fp-nc-label">' + escapeHtml(current) + '</span>';
    chip.title = 'Change your name';
    chip.addEventListener('click', openNameModal);
    document.body.appendChild(chip);

    // Auto-prompt on first visit if no name stored yet.
    if(opts.promptIfEmpty !== false && !myName()){
      setTimeout(openNameModal, 400);
    }
  }

  function ensureNameChipStyles(){
    if(document.getElementById('fp-name-style')) return;
    const s = document.createElement('style');
    s.id = 'fp-name-style';
    s.textContent = `
      .fp-name-chip{
        all:unset;box-sizing:border-box;cursor:pointer;
        position:fixed;top:10px;right:12px;z-index:180;
        display:inline-flex;align-items:center;gap:6px;
        padding:6px 11px;border-radius:999px;
        background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.14);
        color:rgba(255,255,255,.78);
        font-family:Inter,system-ui,sans-serif;font-size:.74rem;font-weight:600;
        backdrop-filter:blur(6px);transition:all .15s;
      }
      .fp-name-chip:hover{background:rgba(245,200,66,.15);border-color:rgba(245,200,66,.45);color:#f5c842;}
      .fp-nc-icon{font-size:.9rem;line-height:1;}
      .fp-nc-label{max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

      .fp-name-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(4px);
        z-index:500;display:none;align-items:center;justify-content:center;padding:20px;}
      .fp-name-overlay.show{display:flex;animation:fp-name-fade .18s ease both;}
      @keyframes fp-name-fade{from{opacity:0;}to{opacity:1;}}
      .fp-name-card{width:100%;max-width:340px;background:#161b22;
        border:1px solid rgba(255,255,255,.15);border-radius:16px;
        padding:22px 20px 18px;text-align:center;
        animation:fp-name-pop .22s cubic-bezier(.34,1.56,.64,1) both;}
      @keyframes fp-name-pop{from{transform:scale(.92);opacity:0;}to{transform:scale(1);opacity:1;}}
      .fp-name-icon{font-size:2.2rem;line-height:1;margin-bottom:4px;}
      .fp-name-title{font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;color:#f5c842;margin-bottom:4px;}
      .fp-name-sub{font-size:.78rem;color:rgba(255,255,255,.5);margin-bottom:14px;line-height:1.4;}
      .fp-name-input{width:100%;box-sizing:border-box;padding:10px 14px;border-radius:10px;
        background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
        color:#fff;font-size:1rem;font-family:Inter,system-ui,sans-serif;
        text-align:center;outline:none;margin-bottom:8px;}
      .fp-name-input:focus{border-color:rgba(245,200,66,.5);}
      .fp-name-actions{display:flex;gap:8px;margin-top:12px;}
      .fp-name-save{flex:1;all:unset;cursor:pointer;box-sizing:border-box;text-align:center;
        padding:11px 0;border-radius:10px;
        background:linear-gradient(135deg,#f5c842,#f0a500);color:#0d1117;
        font-weight:700;font-size:.92rem;font-family:Inter,system-ui,sans-serif;}
      .fp-name-save:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(.5);}
      .fp-name-cancel{flex:0 0 auto;background:none;border:none;
        color:rgba(255,255,255,.5);font-size:.82rem;cursor:pointer;padding:10px 14px;
        font-family:Inter,system-ui,sans-serif;}
      .fp-name-cancel:hover{color:#fff;}
    `;
    document.head.appendChild(s);
  }

  function openNameModal(){
    if(document.getElementById('fp-name-modal')) return;
    ensureNameChipStyles();
    const current = myName() || '';
    const overlay = document.createElement('div');
    overlay.className = 'fp-name-overlay';
    overlay.id = 'fp-name-modal';
    overlay.innerHTML = `
      <div class="fp-name-card" role="dialog" aria-modal="true">
        <div class="fp-name-icon">👤</div>
        <div class="fp-name-title">What's your name?</div>
        <div class="fp-name-sub">Used in history and on-screen instead of "You"</div>
        <input class="fp-name-input" id="fp-name-in" type="text" maxlength="24"
               placeholder="e.g. Tim" autocomplete="off" autocorrect="off" spellcheck="false"
               value="${escapeHtml(current)}">
        <div id="fp-name-chips"></div>
        <div class="fp-name-actions">
          <button type="button" class="fp-name-save" id="fp-name-save" ${current?'':'disabled'}>Save</button>
          <button type="button" class="fp-name-cancel" id="fp-name-cancel">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add('show'));

    const input = document.getElementById('fp-name-in');
    const saveBtn = document.getElementById('fp-name-save');
    const cancelBtn = document.getElementById('fp-name-cancel');

    function close(){
      overlay.classList.remove('show');
      setTimeout(()=>overlay.remove(), 180);
    }

    function doSave(){
      const v = input.value.trim();
      if(!v) return;
      const was = myName();
      setMyName(v);
      close();
      // Only reload if the name actually changed (avoid losing state)
      if(was !== v) setTimeout(()=>location.reload(), 120);
    }

    input.addEventListener('input', ()=>{ saveBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', e=>{
      if(e.key==='Enter' && !saveBtn.disabled) doSave();
      else if(e.key==='Escape') close();
    });
    saveBtn.addEventListener('click', doSave);
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });

    // Inject frequent-player chips under the input
    const chipHost = document.getElementById('fp-name-chips');
    const names = list();
    if(names.length){
      const row = document.createElement('div');
      row.className = 'fp-row';
      names.forEach(n=>{
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'fp-chip';
        c.textContent = n;
        c.addEventListener('click', ()=>{ input.value = n; saveBtn.disabled = false; input.focus(); });
        row.appendChild(c);
      });
      chipHost.appendChild(row);
    }

    setTimeout(()=>{ input.focus(); input.select(); }, 120);
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  return { list, add, remove, rename, clear, attachPicker, attachPickersByPrefix,
           myName, setMyName, installNameChip, openManager, installAiSoloCta };
})();
