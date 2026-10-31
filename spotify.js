// ==== Family Game Hub  spotify.js ====
// Background music from your own Spotify (Premium). The page doesn't play the music itself (Spotify's in-page
// player doesn't run in iPad or phone browsers): it's a remote for the Spotify app on this iPad, a phone or a
// speaker. Each game can have its own playlist, or follow one for all games.
//
// Sign-in is Spotify's PKCE flow (no secret, no server): Spotify.connect() goes to Spotify and comes back to
// /spotify.html, which finishes it and returns to the game.
//
// Storage
//   spotify_auth   {access, refresh, exp, me:{id,name,img}}  this device only; each PIN keeps its own (sync.js
//                  swaps everything but device keys when the PIN changes) and it never goes to the cloud
//   spotify_pkce   the sign-in in progress {v (verifier), st (state), back (page to return to)}
//   gn_spotify     what plays where {'*': pick, <gameId>: pick}; pick = {u: 'spotify:playlist:…', n, img} or
//                  {u: 'off'}; a setting, so it follows the PIN to other devices
//
// API on window.Spotify
//   ready()            -> true once a Client ID is set
//   connected()        -> signed in on this device
//   connect()          go to Spotify to sign in (comes back to this page)
//   finish()           (spotify.html) complete the sign-in -> Promise<back url>
//   disconnect()
//   owns(gameId)       -> true when Spotify plays for this game (the game keeps its own music quiet)
//   gameStart(gameId)  start this game's music (called by Kit.init)
//   sheet({id, name}, {search})  the Music sheet: the player, search (your playlists and all of Spotify) and
//                      what plays in this game / all games
//   mini(slot, {onOpen, onSearch})  the player for the top of a menu: shows once something is on
(function () {
  'use strict';
  if (window.Spotify) return;
  // The app registered at developer.spotify.com (a Client ID is public: PKCE needs no secret)
  var CLIENT_ID = '932858d1cd9c4eb89f1d3a37d3095b9c';
  var AUTH = 'spotify_auth', PKCE = 'spotify_pkce', PICKS = 'gn_spotify';
  var SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative';
  var API = 'https://api.spotify.com/v1';
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function jget(k) { try { return JSON.parse(LS.getItem(k) || 'null'); } catch (e) { return null; } }
  function jset(k, v) { try { if (v == null) LS.removeItem(k); else LS.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function redirectUri() { return location.origin + '/spotify.html'; }
  function K() { return window.Kit || null; }

  // ── Sign-in ──────────────────────────────────────────────────────────────
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'[b % 66]; }).join(''); }
  function b64url(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function connect() {
    if (!CLIENT_ID) return;
    var v = rand(64), st = rand(16);
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(function (h) {
      jset(PKCE, { v: v, st: st, back: location.href, t: Date.now() });
      location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id: CLIENT_ID, response_type: 'code', redirect_uri: redirectUri(), scope: SCOPES, state: st,
        code_challenge_method: 'S256', code_challenge: b64url(h)
      });
    });
  }
  function tokenCall(body) {
    body.client_id = CLIENT_ID;
    return fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error_description || j.error || 'Spotify said no'); e.code = j.error; throw e; } return j; }); });
  }
  function saveTok(j, me) {
    var a = jget(AUTH) || {};
    a.access = j.access_token; a.exp = Date.now() + (j.expires_in || 3600) * 1000;
    if (j.refresh_token) a.refresh = j.refresh_token;
    if (me) a.me = me;
    jset(AUTH, a); return a;
  }
  function finish() {
    var q = new URLSearchParams(location.search), p = jget(PKCE);
    jset(PKCE, null);
    if (q.get('error')) return Promise.reject(new Error(q.get('error') === 'access_denied' ? 'Not connected.' : q.get('error')));
    if (!p || !q.get('code')) return Promise.reject(new Error('This sign-in started somewhere else. Go back to the game and try again.'));
    if (p.st !== q.get('state')) return Promise.reject(new Error('That sign-in didn’t match. Try again.'));
    return tokenCall({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: redirectUri(), code_verifier: p.v }).then(function (j) {
      saveTok(j);
      return api('GET', '/me').then(function (r) {
        var me = r.json || {};
        var a = jget(AUTH); a.me = { id: me.id, name: me.display_name || me.id, img: me.images && me.images[0] && me.images[0].url, premium: me.product === 'premium' }; jset(AUTH, a);
        return p.back || '/';
      });
    });
  }
  var refreshing = null;
  function token() {
    var a = jget(AUTH);
    if (!a || !a.refresh) return Promise.reject(new Error('not connected'));
    if (a.access && a.exp - 60000 > Date.now()) return Promise.resolve(a.access);
    if (!refreshing) refreshing = tokenCall({ grant_type: 'refresh_token', refresh_token: a.refresh }).then(function (j) { refreshing = null; return saveTok(j).access; },
      function (e) { refreshing = null; if (e.code === 'invalid_grant') jset(AUTH, null); throw e; });
    return refreshing;
  }
  function api(method, path, body, retried) {
    return token().then(function (t) {
      return fetch(API + path, { method: method, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) {
      if (r.status === 401 && !retried) { var a = jget(AUTH); if (a) { a.exp = 0; jset(AUTH, a); } return api(method, path, body, true); }
      if (r.status === 204 || r.status === 202) return { status: r.status, json: null };
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return { status: r.status, json: j }; });
    });
  }
  function disconnect() { jset(AUTH, null); }

  // ── Playing ──────────────────────────────────────────────────────────────
  function picks() { return jget(PICKS) || {}; }
  function setPick(scope, pick) {
    var all = picks();
    if (pick) all[scope] = pick; else delete all[scope];
    try { LS.setItem(PICKS, JSON.stringify(all)); } catch (e) {}
    if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(PICKS);   // follows the PIN
  }
  function pickFor(id) { var all = picks(); return all[id] || all['*'] || null; }
  function owns(id) { var p = pickFor(id); return !!(p && p.u && p.u !== 'off' && jget(AUTH)); }
  function state() { return api('GET', '/me/player?additional_types=episode').then(function (r) { return r.status === 200 ? r.json : null; }); }
  // a device to play on: the one already playing, else this iPad/phone/computer's Spotify app, else any
  function device() {
    return api('GET', '/me/player/devices').then(function (r) {
      var ds = (r.json && r.json.devices) || [];
      return ds.filter(function (d) { return d.is_active; })[0] || ds.filter(function (d) { return !d.is_restricted && /tablet|smartphone|computer/i.test(d.type); })[0] || ds.filter(function (d) { return !d.is_restricted; })[0] || null;
    });
  }
  function outcome(r) { return r.status < 300 ? 'ok' : r.status === 403 ? 'premium' : r.status === 404 ? 'nodevice' : 'err'; }
  // play a playlist, album or artist (shuffled), or a song within its album; 'nodevice' when no Spotify app is open
  function playUri(uri, song) {
    return device().then(function (d) {
      if (!d) return 'nodevice';
      var body = song ? { context_uri: song.album, offset: { uri: song.uri } } : { context_uri: uri };
      return (song ? Promise.resolve() : api('PUT', '/me/player/shuffle?state=true&device_id=' + d.id)).then(function () {
        return api('PUT', '/me/player/play?device_id=' + d.id, body);
      }).then(outcome);
    });
  }
  function pause() { return api('PUT', '/me/player/pause'); }
  function resume() { return device().then(function (d) { return d ? api('PUT', '/me/player/play?device_id=' + d.id).then(outcome) : 'nodevice'; }); }
  function next() { return api('POST', '/me/player/next'); }
  function prev() { return api('POST', '/me/player/previous'); }
  function shuffle(on) { return api('PUT', '/me/player/shuffle?state=' + (on ? 'true' : 'false')); }
  function repeat(mode) { return api('PUT', '/me/player/repeat?state=' + mode); }
  function after(res, where) { if (res === 'nodevice') openAppNudge(where); else if (res === 'premium') toast('Spotify only lets apps start music on Premium'); }

  // A game started: its playlist plays, unless it's already the one playing ('off' quiets Spotify)
  var waitingFor = null;
  function gameStart(id) {
    var p = pickFor(id); if (!p || !jget(AUTH) || !CLIENT_ID) return;
    state().then(function (s) {
      if (p.u === 'off') { if (s && s.is_playing) pause(); return; }
      if (s && s.is_playing && s.context && s.context.uri === p.u) return;
      return playUri(p.u);   // (no Spotify app open: nothing pops up; the Music menu has the way to open it)
    }).catch(function () {});
  }
  // No Spotify app is open after you pressed play in the Music menu: the player there shows the way to open it, and
  // the music starts when you come back (never a banner over the game)
  function openAppNudge(id) {
    waitingFor = id;
    document.querySelectorAll('.sp-pl').forEach(function (b) { b.classList.add('sp-need'); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !waitingFor) return;
    var id = waitingFor; waitingFor = null;
    document.querySelectorAll('.sp-pl.sp-need').forEach(function (b) { b.classList.remove('sp-need'); });
    setTimeout(function () { if (id === '*resume') resume(); else gameStart(id); }, 600);
  });
  function toast(m) { var k = K(); if (k) k.toast(m); }

  // ── Looks ───────────────────────────────────────────────────────────────
  function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    play: svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>'),
    pause: svg('<rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none"/>'),
    prev: svg('<path d="M18 6.5v11L10 12z" fill="currentColor"/><path d="M6.5 6v12"/>'),
    next: svg('<path d="M6 6.5v11l8-5.5z" fill="currentColor"/><path d="M17.5 6v12"/>'),
    shuffle: svg('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>'),
    repeat: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
    repeat1: svg('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/><path d="M11 10.5l1.5-1v5.5"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    note: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>')
  };
  var CSS = '' +
    // the player: the song, a thin progress line, and the controls in one row
    '.sp-pl{border-radius:16px;background:var(--w06);padding:10px 10px 8px;margin:2px 0 10px}' +
    '.sp-pl[hidden]{display:none}' +
    '.sp-pl .sp-top{display:flex;align-items:center;gap:12px;width:100%;min-height:0;border-radius:0;background:none;border:0;padding:0;font-weight:inherit;color:inherit;font:inherit;text-align:left;cursor:pointer}' +
    '.sp-art{width:52px;height:52px;border-radius:8px;object-fit:cover;background:var(--w1);flex:none;display:grid;place-items:center;color:var(--text-3);overflow:hidden}' +
    '.sp-art svg{width:24px;height:24px}.sp-art img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.sp-np{flex:1;min-width:0}.sp-np b{display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sp-np small{display:block;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.85rem}' +
    '.sp-dev{color:var(--text-3);font-size:.74rem;white-space:nowrap}' +
    '.sp-bar{height:3px;border-radius:2px;background:var(--w1);margin:10px 2px 6px;overflow:hidden}.sp-bar i{display:block;height:100%;width:0;background:var(--accent);border-radius:2px;transition:width 1s linear}' +
    '.sp-ctl{display:flex;align-items:center;justify-content:space-between;gap:2px}' +
    '.sp-pl .sp-top:active{transform:none;background:none}' +
    '.sp-pl .sp-ctl button{appearance:none;-webkit-appearance:none;border:0;box-shadow:none;margin:0;min-height:0;padding:0;gap:0;flex:none;width:44px;height:44px;border-radius:50%;background:none;display:grid;place-items:center;color:var(--text-2);position:relative;cursor:pointer;transition:transform .12s,color .15s,background .15s}' +
    '.sp-pl .sp-ctl button:active{transform:scale(.88);background:none}.sp-pl .sp-ctl svg{width:22px;height:22px}' +
    '.sp-pl .sp-ctl .sp-pp,.sp-pl .sp-ctl .sp-pp:active{width:52px;height:52px;background:var(--accent);color:var(--accent-ink)}.sp-pl .sp-ctl .sp-pp svg{width:24px;height:24px}' +
    '.sp-pl .sp-ctl .on{color:var(--accent)}.sp-pl .sp-ctl .on::after{content:"";position:absolute;bottom:3px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--accent)}' +
    // search
    '.sp-q{display:flex;align-items:center;gap:8px;padding:0 6px 0 12px;border-radius:12px;background:var(--seg);margin:0 0 10px;color:var(--text-3)}' +
    '.sp-q svg{width:20px;height:20px;flex:none}.sp-q input{flex:1;min-width:0;height:44px;border:0;background:none;color:var(--text);font:inherit;font-size:1rem;outline:none}' +
    '.sp-q button{appearance:none;border:0;background:none;color:var(--text-3);width:34px;height:34px;display:grid;place-items:center;cursor:pointer}.sp-q button svg{width:18px;height:18px}' +
    '.sp-seg{display:flex;padding:3px;border-radius:12px;background:var(--seg);margin:2px 0 8px}' +
    '.sp-seg button{appearance:none;border:0;box-shadow:none;margin:0;background:none;flex:1;min-height:38px;border-radius:9px;font:inherit;font-weight:800;color:var(--text-2);cursor:pointer}.sp-seg button.on{background:var(--w14);color:var(--text)}' +
    '.sp-list{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto;margin:0 -4px;padding:0 4px;-webkit-overflow-scrolling:touch}' +
    '.sp-h{margin:10px 6px 4px;font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3)}.sp-h:first-child{margin-top:2px}' +
    '.sp-row{appearance:none;-webkit-appearance:none;border:0;box-shadow:none;margin:0;font:inherit;cursor:pointer;background:none;width:100%;display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 10px 6px 6px;border-radius:12px;text-align:left;color:var(--text);transition:background .15s,box-shadow .15s}' +
    '.sp-row:active{transform:scale(.98)}' +
    '.sp-row img,.sp-row .sp-ph{width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--w1);flex:none;display:grid;place-items:center;color:var(--text-3)}' +
    '.sp-row.artist img,.sp-row.artist .sp-ph{border-radius:50%}' +
    '.sp-row .sp-ph svg{width:22px;height:22px}.sp-row .sp-tx{flex:1;min-width:0}.sp-row b{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sp-row small{display:block;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sp-row i{width:24px;height:24px;color:var(--accent);opacity:0;flex:none}' +
    '.sp-row.on{background:var(--w1);box-shadow:inset 0 0 0 2px var(--accent)}.sp-row.on i{opacity:1}' +
    '.sp-row.playing .sp-eq{display:flex}.sp-eq{display:none;gap:2px;align-items:flex-end;height:16px;flex:none}' +
    '.sp-eq u{width:3px;background:var(--accent);animation:spEq .9s ease-in-out infinite;text-decoration:none}' +
    '.sp-eq u:nth-child(2){animation-delay:-.3s}.sp-eq u:nth-child(3){animation-delay:-.6s}' +
    '@keyframes spEq{0%,100%{height:4px}50%{height:16px}}' +
    '.sp-none{color:var(--text-3);padding:10px 6px;margin:0}' +
    '.sp-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:18px 8px 8px}' +
    '.sp-hero .sp-big{width:72px;height:72px;border-radius:50%;background:var(--w08);display:grid;place-items:center;color:var(--accent)}.sp-hero .sp-big svg{width:36px;height:36px}' +
    '.sp-hero p{margin:0;color:var(--text-2)}.sp-foot{display:flex;align-items:center;gap:8px;margin-top:12px;color:var(--text-3);font-size:.85rem}' +
    '.sp-foot img{width:24px;height:24px;border-radius:50%}.sp-foot button{appearance:none;border:0;box-shadow:none;background:none;margin-left:auto;color:var(--text-2);font:inherit;font-weight:800;padding:8px;cursor:pointer}' +
    '.sp-open{display:none;align-items:center;justify-content:space-between;gap:10px;margin:8px 2px 2px;font-size:.84rem;font-weight:700;color:var(--text-2)}' +
    '.sp-pl.sp-need .sp-open{display:flex}.sp-open .btn{white-space:nowrap;text-decoration:none;min-height:38px;padding:0 16px}';
  var cssOn = false;
  function css() { if (cssOn) return; cssOn = true; var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  function E(tag, a, kids) { var k = K(); return k.el(tag, a, kids); }
  function imgOf(list, small) { if (!list || !list.length) return null; return (small ? list[list.length - 1] : list[0]).url; }

  // ── The player: what's on, a progress line, and back / play-pause / skip / shuffle / repeat / search ──
  // o.always: show "Nothing playing" instead of hiding; o.onOpen (tap the song), o.onSearch (the search button)
  function player(o) {
    o = o || {}; css();
    var k = K(), st = null, at = 0;
    var art = E('span', { class: 'sp-art', html: IC.note }), title = E('b', { text: 'Nothing playing' }), sub = E('small', { text: '' }), dev = E('span', { class: 'sp-dev' });
    var bar = E('i'), top = E('button', { type: 'button', class: 'sp-top', 'aria-label': 'Music' }, [art, E('span', { class: 'sp-np' }, [title, sub]), dev]);
    function btn(cls, label, ic, fn) { return E('button', { type: 'button', class: cls, 'aria-label': label, html: ic, onclick: function () { k.haptic('light'); fn(); } }); }
    var bShuf = btn('', 'Shuffle', IC.shuffle, function () { if (!st) return; st.shuffle_state = !st.shuffle_state; paint(); shuffle(st.shuffle_state).then(soon); });
    var bPrev = btn('', 'Back', IC.prev, function () { prev().then(soon); });
    var bPlay = btn('sp-pp', 'Play', IC.play, function () {
      var on = !(st && st.is_playing); if (st) st.is_playing = on; paint();
      (on ? resume().then(function (r) { after(r, '*resume'); }) : pause()).then(soon);
    });
    var bNext = btn('', 'Skip', IC.next, function () { next().then(soon); });
    var bRep = btn('', 'Repeat', IC.repeat, function () { if (!st) return; st.repeat_state = st.repeat_state === 'off' ? 'context' : st.repeat_state === 'context' ? 'track' : 'off'; paint(); repeat(st.repeat_state).then(soon); });
    var kids = [bShuf, bPrev, bPlay, bNext, bRep];
    if (o.onSearch) kids.push(btn('', 'Search', IC.search, o.onSearch));
    var open = E('div', { class: 'sp-open' }, [E('span', { text: 'Spotify isn’t open on any device' }), E('a', { class: 'btn btn-primary', href: 'spotify:', text: 'Open Spotify' })]);
    var box = E('div', { class: 'sp-pl' + (waitingFor ? ' sp-need' : '') }, [top, E('div', { class: 'sp-bar' }, [bar]), E('div', { class: 'sp-ctl' }, kids), open]);
    if (o.onOpen) top.onclick = function () { k.sfx('tap'); o.onOpen(); }; else top.style.cursor = 'default';
    if (!o.always) box.hidden = true;
    var lastImg = '';
    function paint() {
      var it = st && st.item;
      box.hidden = !it && !o.always;
      title.textContent = it ? it.name : 'Nothing playing';
      sub.textContent = it ? ((it.artists || []).map(function (x) { return x.name; }).join(', ') || (it.show && it.show.name) || '') : (o.always ? 'Pick something below' : '');
      dev.textContent = st && st.device ? st.device.name : '';
      var img = it && imgOf((it.album && it.album.images) || it.images, false);
      if (img !== lastImg) { lastImg = img; art.innerHTML = img ? '<img src="' + k.esc(img) + '" alt="">' : IC.note; }
      var playing = !!(st && st.is_playing);
      bPlay.innerHTML = playing ? IC.pause : IC.play; bPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      bShuf.classList.toggle('on', !!(st && st.shuffle_state)); bShuf.setAttribute('aria-pressed', String(!!(st && st.shuffle_state)));
      var rp = st ? st.repeat_state : 'off';
      bRep.classList.toggle('on', rp !== 'off'); bRep.innerHTML = rp === 'track' ? IC.repeat1 : IC.repeat;
      bRep.setAttribute('aria-label', rp === 'track' ? 'Repeat: this song' : rp === 'context' ? 'Repeat: on' : 'Repeat: off');
      prog();
    }
    function prog() {
      var it = st && st.item; if (!it || !it.duration_ms) { bar.style.width = '0'; return; }
      var ms = st.progress_ms + (st.is_playing ? Date.now() - at : 0);
      bar.style.width = Math.min(100, ms / it.duration_ms * 100) + '%';
    }
    var stopped = false, tPoll = null, tProg = null, seen = false;
    function refresh() {
      if (stopped) return;
      state().then(function (s) { st = s; at = Date.now(); paint(); if (o.onState) o.onState(s); }).catch(function () {});
    }
    function soon() { setTimeout(refresh, 450); }
    // runs while it's on screen; stops by itself once its sheet closes
    tPoll = setInterval(function () { if (!box.isConnected) { if (seen) stop(); return; } seen = true; refresh(); }, 3000);
    tProg = setInterval(function () { if (box.isConnected) prog(); }, 1000);
    function stop() { stopped = true; clearInterval(tPoll); clearInterval(tProg); }
    refresh();
    return { el: box, refresh: refresh, stop: stop, state: function () { return st; } };
  }
  // the player at the top of a menu: only once something is on
  function mini(slot, o) {
    if (!jget(AUTH) || !CLIENT_ID) return;
    var p = player(o); slot.appendChild(p.el);
  }

  // ── The Music sheet ─────────────────────────────────────────────────────
  // The player on top, a search box (your playlists and all of Spotify), then what plays in this game / all games.
  // Choosing a playlist, album or artist plays it and makes it the music for the game (or all games); a song
  // just plays, carrying on through its album.
  var myPls = null;
  function myPlaylists() {
    if (myPls) return Promise.resolve(myPls);
    var all = [];
    function page(off) {
      return api('GET', '/me/playlists?limit=50&offset=' + off).then(function (r) {
        var items = (r.json && r.json.items) || [];
        items.forEach(function (p) { if (p && p.uri) all.push(p); });
        return items.length === 50 && off < 150 ? page(off + 50) : all;
      });
    }
    return page(0).then(function (a) { myPls = a; return a; });
  }
  function sheet(g, opt) {
    var k = K(); if (!k) return; css();
    g = g || {}; opt = opt || {};
    var el = k.el, icon = k.icon, box = el('div', {}), sh;
    if (!CLIENT_ID) {
      box.appendChild(el('div', { class: 'sp-hero' }, [el('div', { class: 'sp-big', html: icon('headphones') }), el('p', { text: 'Spotify isn’t switched on for this site yet.' })]));
      return k.sheet({ title: 'Music', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
    }
    if (!jget(AUTH)) {
      box.appendChild(el('div', { class: 'sp-hero' }, [
        el('div', { class: 'sp-big', html: icon('headphones') }),
        el('p', { text: 'Play your own Spotify while you play. Each game can have its own playlist.' }),
        el('small', { class: 'muted', text: 'Needs Spotify Premium' })
      ]));
      return k.sheet({ title: 'Music', node: box, actions: [{ label: 'Connect Spotify', primary: true, onClick: connect }, { label: 'Not now', cls: 'btn-soft' }] });
    }
    var a = jget(AUTH), scope = g.id && (picks()[g.id] || !picks()['*']) ? g.id : '*', curCtx = null;
    var pl = player({ always: true, onState: function (s) { curCtx = s && s.context ? s.context.uri : null; markPlaying(); } });
    box.appendChild(pl.el);
    // search
    var q = el('input', { type: 'text', placeholder: 'Search your playlists and Spotify', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': 'Search music' });
    var clr = el('button', { type: 'button', 'aria-label': 'Clear', html: IC.x, onclick: function () { q.value = ''; onQ(); q.focus(); } }); clr.hidden = true;
    box.appendChild(el('label', { class: 'sp-q' }, [el('span', { html: IC.search }), q, clr]));
    // this game / all games
    var seg = null;
    if (g.id) {
      var b1 = el('button', { type: 'button', text: g.name || 'This game' }), b2 = el('button', { type: 'button', text: 'All games' });
      b1.onclick = function () { scope = g.id; draw(); }; b2.onclick = function () { scope = '*'; draw(); };
      seg = el('div', { class: 'sp-seg' }, [b1, b2]); box.appendChild(seg);
    }
    var list = el('div', { class: 'sp-list' }); box.appendChild(list);
    var rows = [];
    function isPick(u) { var cur = picks()[scope]; return cur ? cur.u === u : u === (scope === '*' ? 'off' : 'inherit'); }
    function markPlaying() { rows.forEach(function (r) { r.el.classList.toggle('playing', !!r.u && r.u === curCtx); }); }
    function head(t) { list.appendChild(el('div', { class: 'sp-h', text: t })); }
    // kind: 'pick' (inherit/off), 'ctx' (playlist/album/artist: plays and becomes the music here), 'song'
    function row(kind, u, name, sub2, img, ph, extra) {
      var b = el('button', { type: 'button', class: 'sp-row' + (kind === 'ctx' && /:artist:/.test(u) ? ' artist' : '') + (kind !== 'song' && isPick(u) ? ' on' : '') }, [
        img ? el('img', { src: img, alt: '', loading: 'lazy' }) : el('span', { class: 'sp-ph', html: ph || IC.note }),
        el('span', { class: 'sp-tx' }, [el('b', { text: name })].concat(sub2 ? [el('small', { text: sub2 })] : [])),
        el('span', { class: 'sp-eq', html: '<u></u><u></u><u></u>' }),
        el('i', { html: icon('check') })
      ]);
      b.onclick = function () {
        k.haptic('light'); k.sfx('tap');
        if (kind === 'song') { playUri(extra.uri, extra).then(function (res) { after(res, '*resume'); pl.refresh(); setTimeout(pl.refresh, 900); }); return; }
        if (u === 'inherit') setPick(scope, null);
        else setPick(scope, u === 'off' ? { u: 'off' } : { u: u, n: name, img: img || null });
        rows.forEach(function (r) { if (r.kind !== 'song') r.el.classList.toggle('on', r.el === b); });
        // you hear the change right away
        if (u === 'off') pause().then(pl.refresh);
        else if (u === 'inherit') { if (g.id) gameStart(g.id); setTimeout(pl.refresh, 900); }
        else playUri(u).then(function (res) { after(res, g.id || '*resume'); setTimeout(pl.refresh, 900); });
      };
      rows.push({ el: b, u: kind === 'song' ? null : u, kind: kind }); list.appendChild(b);
    }
    function plRow(p) { row('ctx', p.uri, p.name, p.tracks && p.tracks.total != null ? p.tracks.total + ' songs' : (p.owner && p.owner.display_name) || '', imgOf(p.images, true)); }
    // what plays here (no search)
    function draw() {
      if (q.value.trim()) return;
      if (seg) { seg.hidden = false; seg.children[0].classList.toggle('on', scope !== '*'); seg.children[1].classList.toggle('on', scope === '*'); }
      list.innerHTML = ''; rows = [];
      if (scope !== '*') { var all = picks()['*']; row('pick', 'inherit', 'Same as all games', all && all.u !== 'off' ? all.n : 'No music', null, icon('swap')); }
      row('pick', 'off', 'No music', scope === '*' ? 'Unless a game has its own' : 'Spotify pauses in this game', null, icon('mute'));
      // something chosen from search that isn't one of your playlists stays on the list
      var cur = picks()[scope];
      if (cur && cur.u && cur.u !== 'off' && !(myPls || []).some(function (p) { return p.uri === cur.u; })) row('ctx', cur.u, cur.n || 'Spotify', /:album:/.test(cur.u) ? 'Album' : /:artist:/.test(cur.u) ? 'Artist' : 'Playlist', cur.img);
      head('Your playlists');
      if (!myPls) { list.appendChild(el('p', { class: 'sp-none', text: 'Loading your playlists…' })); return; }
      myPls.forEach(plRow);
      if (!myPls.length) list.appendChild(el('p', { class: 'sp-none', text: 'No playlists in your Spotify yet. Search for some music above.' }));
      markPlaying();
    }
    // search: your own playlists first, then songs, playlists, albums and artists from all of Spotify
    var qT = 0, qN = 0;
    function onQ() {
      var t = q.value.trim(); clr.hidden = !t;
      clearTimeout(qT);
      if (!t) { draw(); return; }
      if (seg) seg.hidden = true;
      var n = ++qN, lt = t.toLowerCase();
      var mine = (myPls || []).filter(function (p) { return (p.name || '').toLowerCase().indexOf(lt) >= 0; }).slice(0, 8);
      function paintQ(res) {
        if (n !== qN) return;
        list.innerHTML = ''; rows = [];
        if (mine.length) { head('Your playlists'); mine.forEach(plRow); }
        if (!res) { list.appendChild(el('p', { class: 'sp-none', text: 'Searching Spotify…' })); return; }
        var tr = ((res.tracks && res.tracks.items) || []).filter(Boolean), pls = ((res.playlists && res.playlists.items) || []).filter(Boolean),
          als = ((res.albums && res.albums.items) || []).filter(Boolean), ars = ((res.artists && res.artists.items) || []).filter(Boolean);
        if (tr.length) { head('Songs'); tr.forEach(function (s) { row('song', s.uri, s.name, (s.artists || []).map(function (x) { return x.name; }).join(', ') + (s.album ? ' · ' + s.album.name : ''), imgOf(s.album && s.album.images, true), null, { uri: s.uri, album: s.album && s.album.uri }); }); }
        if (pls.length) { head('Playlists'); pls.forEach(plRow); }
        if (als.length) { head('Albums'); als.forEach(function (al) { row('ctx', al.uri, al.name, (al.artists || []).map(function (x) { return x.name; }).join(', '), imgOf(al.images, true)); }); }
        if (ars.length) { head('Artists'); ars.forEach(function (ar) { row('ctx', ar.uri, ar.name, 'Artist', imgOf(ar.images, true)); }); }
        if (!mine.length && !tr.length && !pls.length && !als.length && !ars.length) list.appendChild(el('p', { class: 'sp-none', text: 'Nothing found for “' + t + '”' }));
        markPlaying();
      }
      paintQ(null);
      qT = setTimeout(function () {
        api('GET', '/search?' + new URLSearchParams({ q: t, type: 'track,playlist,album,artist', limit: '5' })).then(function (r) { paintQ(r.json || {}); }, function () { paintQ({}); });
      }, 320);
    }
    q.addEventListener('input', onQ);
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') q.blur(); });
    draw();
    myPlaylists().then(function () { if (q.value.trim()) onQ(); else draw(); }, function () { myPls = []; draw(); });
    var me = a.me || {};
    box.appendChild(el('div', { class: 'sp-foot' }, (me.img ? [el('img', { src: me.img, alt: '' })] : []).concat([
      el('span', { text: 'Spotify: ' + (me.name || 'connected') }),
      el('button', { type: 'button', text: 'Disconnect', onclick: function () { disconnect(); myPls = null; sh.close(); toast('Spotify disconnected on this device'); } })
    ])));
    sh = k.sheet({ title: 'Music', node: box, actions: [{ label: 'Done', cls: 'btn-soft' }], onClose: function () { pl.stop(); } });
    if (opt.search) setTimeout(function () { q.focus(); }, 380);
    return sh;
  }

  window.Spotify = {
    ready: function () { return !!CLIENT_ID; }, connected: function () { return !!jget(AUTH); },
    connect: connect, finish: finish, disconnect: disconnect, owns: owns, gameStart: gameStart, sheet: sheet, mini: mini,
    pickFor: pickFor, _api: api
  };
})();
