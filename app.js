// ═══════════════════════════════════════════════════════════════════════════
// Game Night — native-app layer for every game page
//
// Loaded (deferred) by each games/*.html after shared.css. It:
//   • fixes the viewport/theme metas for edge-to-edge iPhone layouts
//   • turns .site-nav into an iOS-style bar (chevron back, centered title,
//     actions grouped on the right) and makes Back return to the hub
//     without a full reload when we came from it
//   • blocks pinch/double-tap zoom and rubber-banding during play
//   • keeps the screen awake while a game is open (Screen Wake Lock)
//   • exposes window.GN helpers games can use:
//       GN.haptic('light'|'medium'|'heavy'|'success'|'error')
//       GN.toast('Saved')
//       GN.confirm('Start over?', {ok:'Restart', danger:true}) -> Promise<bool>
//       GN.sheet({title, body (Node|html), actions:[{label, primary, danger, onClick}]})
// ═══════════════════════════════════════════════════════════════════════════
(function(){
  'use strict';
  if (window.GN && window.GN._loaded) return;
  var doc = document, root = doc.documentElement;

  // ── Metas ────────────────────────────────────────────────────────────────
  function meta(name, content){
    var m = doc.querySelector('meta[name="'+name+'"]');
    if(!m){ m = doc.createElement('meta'); m.name = name; doc.head.appendChild(m); }
    if(content != null) m.content = content;
    return m;
  }
  var vp = meta('viewport');
  vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  meta('theme-color', '#0b0d12');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  if(!doc.querySelector('link[rel="manifest"]')){
    var mf = doc.createElement('link'); mf.rel = 'manifest'; mf.href = '/manifest.json'; doc.head.appendChild(mf);
  }

  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  root.classList.add('gn-app');
  if(standalone) root.classList.add('is-standalone');

  // ── Zoom / gesture hygiene ───────────────────────────────────────────────
  // iOS ignores user-scalable=no; block pinch via gesture events.
  ['gesturestart','gesturechange'].forEach(function(t){
    doc.addEventListener(t, function(e){ e.preventDefault(); }, {passive:false});
  });
  // Double-tap zoom is disabled in CSS (html{touch-action:manipulation}) so
  // rapid taps still register as clicks.
  // Lets :active styles fire on iOS Safari.
  doc.addEventListener('touchstart', function(){}, {passive:true});

  // ── Nav bar ──────────────────────────────────────────────────────────────
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  function isHubHref(h){
    if(!h) return false;
    try{ var u = new URL(h, location.href); return u.origin === location.origin && /^\/(index\.html)?$/.test(u.pathname); }catch(e){ return false; }
  }
  function cameFromHub(){
    try{
      if(!doc.referrer) return false;
      var r = new URL(doc.referrer);
      return r.origin === location.origin && /\/(index\.html)?$/.test(r.pathname);
    }catch(e){ return false; }
  }
  function upgradeNav(){
    var nav = doc.querySelector('.site-nav');
    if(!nav || nav.dataset.gn) return;
    nav.dataset.gn = '1';
    var back = nav.querySelector(':scope > .nav-back');
    if(back){
      var href = back.getAttribute('href') || '';
      var label = isHubHref(href) ? 'Games' : (back.textContent.replace(/[←‹<]/g,'').trim() || 'Back');
      if(label.length > 12) label = 'Back';
      back.innerHTML = CHEV + '<span>' + label + '</span>';
      back.setAttribute('aria-label', label === 'Games' ? 'Back to games' : label);
      // Return to the hub via history when we came from it: restores the
      // hub's scroll position and plays the native back transition.
      if(isHubHref(href) && !back.hasAttribute('onclick')){
        back.addEventListener('click', function(e){
          if(e.defaultPrevented) return;
          if(cameFromHub() && history.length > 1){ e.preventDefault(); history.back(); }
        });
      }
    }
    // Group everything that isn't back/title into a right-side action cluster
    var extras = [].slice.call(nav.children).filter(function(el){
      return !el.classList.contains('nav-back') && !el.classList.contains('nav-title') && !el.classList.contains('nav-actions');
    });
    var actions = nav.querySelector(':scope > .nav-actions');
    if(extras.length){
      if(!actions){ actions = doc.createElement('div'); actions.className = 'nav-actions'; nav.appendChild(actions); }
      extras.forEach(function(el){ actions.appendChild(el); });
    }
    if(!nav.querySelector(':scope > .nav-title')){
      var t = doc.createElement('span'); t.className = 'nav-title';
      t.textContent = (doc.title || '').split(/[—–|-]/)[0].trim();
      nav.insertBefore(t, nav.children[1] || null);
    }
    if(!back){
      var spacer = doc.createElement('span'); spacer.className = 'nav-spacer';
      nav.insertBefore(spacer, nav.firstChild);
    }
  }

  // ── Screen wake lock (keep the screen on during game night) ──────────────
  var wakeLock = null;
  function requestWake(){
    if(!('wakeLock' in navigator) || doc.visibilityState !== 'visible' || wakeLock) return;
    navigator.wakeLock.request('screen').then(function(l){
      wakeLock = l; l.addEventListener('release', function(){ wakeLock = null; });
    }).catch(function(){});
  }
  doc.addEventListener('visibilitychange', function(){ if(doc.visibilityState === 'visible') requestWake(); });
  ['pointerdown','keydown'].forEach(function(t){ doc.addEventListener(t, requestWake, {once:true, passive:true}); });

  // ── Helpers ──────────────────────────────────────────────────────────────
  var PATTERNS = { light:8, medium:16, heavy:28, success:[12,60,18], error:[30,50,30,50,30], select:6 };
  function haptic(kind){
    try{ if(navigator.vibrate) navigator.vibrate(PATTERNS[kind] || PATTERNS.light); }catch(e){}
  }

  var toastEl = null, toastTimer = null;
  function toast(msg, ms){
    if(!toastEl){ toastEl = doc.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role','status'); doc.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    requestAnimationFrame(function(){ toastEl.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, ms || 2200);
  }

  function injectSheetCSS(){
    if(doc.getElementById('gn-sheet-css')) return;
    var s = doc.createElement('style'); s.id = 'gn-sheet-css';
    s.textContent =
      '.gn-sheet-ov{position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .2s;}' +
      '.gn-sheet-ov.show{opacity:1;}' +
      '.gn-sheet{width:100%;max-width:440px;background:var(--surface,#12151c);border:1px solid var(--line-2,rgba(255,255,255,.12));border-bottom:0;border-radius:26px 26px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom));transform:translateY(30px);transition:transform .3s cubic-bezier(.2,.8,.2,1);max-height:88dvh;overflow:auto;}' +
      '.gn-sheet-ov.show .gn-sheet{transform:none;}' +
      '@media(min-width:600px){.gn-sheet-ov{align-items:center;}.gn-sheet{border-radius:24px;border-bottom:1px solid var(--line-2,rgba(255,255,255,.12));}}' +
      '.gn-grab{width:38px;height:5px;border-radius:3px;background:rgba(255,255,255,.16);margin:0 auto 16px;}' +
      '.gn-sheet h3{font-family:var(--display);font-size:1.3rem;font-weight:800;letter-spacing:-.02em;margin-bottom:6px;text-align:center;}' +
      '.gn-sheet .gn-body{color:var(--text-2,#a2abbb);font-size:.95rem;line-height:1.5;text-align:center;margin-bottom:18px;}' +
      '.gn-actions{display:flex;flex-direction:column;gap:8px;}' +
      '.gn-actions .btn{width:100%;}' +
      '.gn-actions .btn-danger{background:rgba(248,113,113,.16);}';
    doc.head.appendChild(s);
  }

  function sheet(opts){
    injectSheetCSS();
    opts = opts || {};
    var ov = doc.createElement('div'); ov.className = 'gn-sheet-ov';
    var sh = doc.createElement('div'); sh.className = 'gn-sheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-modal','true');
    sh.innerHTML = '<div class="gn-grab"></div>';
    if(opts.title){ var h = doc.createElement('h3'); h.textContent = opts.title; sh.appendChild(h); }
    if(opts.body){
      var b = doc.createElement('div'); b.className = 'gn-body';
      if(typeof opts.body === 'string') b.innerHTML = opts.body; else b.appendChild(opts.body);
      sh.appendChild(b);
    }
    var acts = doc.createElement('div'); acts.className = 'gn-actions';
    function close(){ ov.classList.remove('show'); setTimeout(function(){ ov.remove(); }, 220); doc.removeEventListener('keydown', onKey); }
    function onKey(e){ if(e.key === 'Escape'){ close(); if(opts.onCancel) opts.onCancel(); } }
    (opts.actions || [{label:'OK', primary:true}]).forEach(function(a){
      var btn = doc.createElement('button'); btn.type = 'button';
      btn.className = 'btn ' + (a.danger ? 'btn-danger' : a.primary ? 'btn-gold' : 'btn-outline');
      btn.textContent = a.label;
      btn.addEventListener('click', function(){ close(); if(a.onClick) a.onClick(); });
      acts.appendChild(btn);
    });
    sh.appendChild(acts);
    ov.appendChild(sh);
    ov.addEventListener('click', function(e){ if(e.target === ov){ close(); if(opts.onCancel) opts.onCancel(); } });
    doc.addEventListener('keydown', onKey);
    doc.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('show'); });
    return { close: close, el: sh };
  }

  function confirmSheet(message, o){
    o = o || {};
    return new Promise(function(resolve){
      sheet({
        title: o.title || message,
        body: o.title ? message : (o.body || ''),
        actions: [
          {label: o.ok || 'OK', primary: !o.danger, danger: !!o.danger, onClick: function(){ resolve(true); }},
          {label: o.cancel || 'Cancel', onClick: function(){ resolve(false); }}
        ],
        onCancel: function(){ resolve(false); }
      });
    });
  }

  window.GN = { _loaded:true, haptic:haptic, toast:toast, sheet:sheet, confirm:confirmSheet, standalone:standalone };

  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', upgradeNav);
  else upgradeNav();
})();
