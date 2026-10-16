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
//   sheet({id, name})  the Music sheet: now playing and the playlist for this game / all games
(function () {
  'use strict';
  if (window.Spotify) return;
  // The app registered at developer.spotify.com (a Client ID is public: PKCE needs no secret)
  var CLIENT_ID = '';
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
  // play a playlist from the top in shuffle; 'nodevice' when no Spotify app is open anywhere
  function playUri(uri) {
    return device().then(function (d) {
      if (!d) return 'nodevice';
      return api('PUT', '/me/player/shuffle?state=true&device_id=' + d.id).then(function () {
        return api('PUT', '/me/player/play?device_id=' + d.id, { context_uri: uri });
      }).then(function (r) { return r.status < 300 ? 'ok' : r.status === 403 ? 'premium' : r.status === 404 ? 'nodevice' : 'err'; });
    });
  }
  function pause() { return api('PUT', '/me/player/pause'); }
  function resume() { return device().then(function (d) { return d ? api('PUT', '/me/player/play?device_id=' + d.id) : null; }); }
  function next() { return api('POST', '/me/player/next'); }

  // A game started: its playlist plays, unless it's already the one playing ('off' quiets Spotify)
  var waitingFor = null;
  function gameStart(id) {
    var p = pickFor(id); if (!p || !jget(AUTH) || !CLIENT_ID) return;
    state().then(function (s) {
      if (p.u === 'off') { if (s && s.is_playing) pause(); return; }
      if (s && s.is_playing && s.context && s.context.uri === p.u) return;
      return playUri(p.u).then(function (res) { if (res === 'nodevice') openAppNudge(id); else if (res === 'premium') toast('Spotify only lets apps start music on Premium'); });
    }).catch(function () {});
  }
  // No Spotify app is open: show the way to open it, and start the music when they come back
  function openAppNudge(id) {
    waitingFor = id;
    var k = K(); if (!k) return;
    var row = k.el('div', { class: 'sp-nudge' }, [
      k.el('span', { class: 'sp-nudge-ic', html: k.icon('headphones') }),
      k.el('span', { class: 'sp-nudge-t', text: 'Open Spotify, then come back here' }),
      k.el('a', { class: 'btn btn-primary sp-nudge-go', href: 'spotify:', text: 'Open Spotify' }),
      k.el('button', { type: 'button', class: 'icon-btn sp-nudge-x', 'aria-label': 'Not now', html: k.icon('close'), onclick: function () { row.remove(); waitingFor = null; } })
    ]);
    css(); document.body.appendChild(row);
    requestAnimationFrame(function () { row.classList.add('show'); });
    setTimeout(function () { if (row.isConnected) { row.classList.remove('show'); setTimeout(function () { row.remove(); }, 400); } }, 15000);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !waitingFor) return;
    var id = waitingFor; waitingFor = null;
    var old = document.querySelector('.sp-nudge'); if (old) old.remove();
    setTimeout(function () { gameStart(id); }, 600);
  });
  function toast(m) { var k = K(); if (k) k.toast(m); }

  // ── The Music sheet ─────────────────────────────────────────────────────
  var CSS = '.sp-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:var(--w06);margin:6px 0 12px}' +
    '.sp-art{width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--w1);flex:none;display:grid;place-items:center;color:var(--text-3)}' +
    '.sp-art svg{width:28px;height:28px}' +
    '.sp-np{flex:1;min-width:0}.sp-np b{display:block;font-size:1.02rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sp-np small{display:block;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sp-np .sp-dev{color:var(--text-3);font-size:.78rem;margin-top:2px}' +
    '.sp-ctl{display:flex;gap:6px}.sp-ctl button{width:46px;height:46px;border-radius:50%;background:var(--w1);display:grid;place-items:center;color:var(--text)}' +
    '.sp-ctl button.on{background:var(--accent);color:var(--accent-ink)}.sp-ctl svg{width:22px;height:22px}' +
    '.sp-seg{display:flex;padding:3px;border-radius:12px;background:var(--seg);margin:2px 0 8px}' +
    '.sp-seg button,.sp-row,.sp-foot button,.sp-ctl button{appearance:none;-webkit-appearance:none;border:0;box-shadow:none;font:inherit;margin:0;cursor:pointer}' +
    '.sp-seg button{background:none;flex:1;min-height:38px;border-radius:9px;font-weight:800;color:var(--text-2)}.sp-seg button.on{background:var(--w14);color:var(--text)}' +
    '.sp-list{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto;margin:0 -4px;padding:0 4px}' +
    '.sp-row{background:none;width:100%;display:flex;align-items:center;gap:12px;min-height:56px;padding:6px 10px 6px 6px;border-radius:12px;text-align:left;color:var(--text);transition:background .15s,box-shadow .15s}' +
    '.sp-row:active{transform:scale(.98)}' +
    '.sp-row img,.sp-row .sp-ph{width:44px;height:44px;border-radius:6px;object-fit:cover;background:var(--w1);flex:none;display:grid;place-items:center;color:var(--text-3)}' +
    '.sp-row .sp-ph svg{width:22px;height:22px}.sp-row .sp-tx{flex:1;min-width:0}.sp-row b{display:block;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sp-row small{color:var(--text-3)}.sp-row i{width:24px;height:24px;color:var(--accent);opacity:0}' +
    '.sp-row.on{background:var(--w1);box-shadow:inset 0 0 0 2px var(--accent)}.sp-row.on i{opacity:1}' +
    '.sp-row.playing .sp-eq{display:flex}.sp-eq{display:none;gap:2px;align-items:flex-end;height:16px;margin-left:6px}' +
    '.sp-eq u{width:3px;background:var(--accent);animation:spEq .9s ease-in-out infinite;text-decoration:none}' +
    '.sp-eq u:nth-child(2){animation-delay:-.3s}.sp-eq u:nth-child(3){animation-delay:-.6s}' +
    '@keyframes spEq{0%,100%{height:4px}50%{height:16px}}' +
    '.sp-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:18px 8px 8px}' +
    '.sp-hero .sp-big{width:72px;height:72px;border-radius:50%;background:var(--w08);display:grid;place-items:center;color:var(--accent)}.sp-hero .sp-big svg{width:36px;height:36px}' +
    '.sp-hero p{margin:0;color:var(--text-2)}.sp-foot{display:flex;align-items:center;gap:8px;margin-top:12px;color:var(--text-3);font-size:.85rem}' +
    '.sp-foot img{width:24px;height:24px;border-radius:50%}.sp-foot button{background:none;margin-left:auto;color:var(--text-2);font-weight:800;padding:8px}' +
    '.sp-nudge{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translate(-50%,140%);z-index:90;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:16px;background:var(--glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,.4);transition:transform .35s cubic-bezier(.2,1.3,.4,1);max-width:calc(100vw - 32px)}' +
    '.sp-nudge.show{transform:translate(-50%,0)}.sp-nudge-ic{color:var(--accent);display:grid}.sp-nudge-ic svg{width:22px;height:22px}.sp-nudge-t{font-weight:700}.sp-nudge-go{white-space:nowrap;text-decoration:none}';
  var cssOn = false;
  function css() { if (cssOn) return; cssOn = true; var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

  function sheet(g) {
    var k = K(); if (!k) return; css();
    g = g || {};
    var el = k.el, icon = k.icon, box = el('div', {}), sh, poll = null;
    if (!CLIENT_ID) {
      box.appendChild(el('div', { class: 'sp-hero' }, [el('div', { class: 'sp-big', html: icon('headphones') }), el('p', { text: 'Spotify isn’t switched on for this site yet.' })]));
      sh = k.sheet({ title: 'Music', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] }); return sh;
    }
    if (!jget(AUTH)) {
      box.appendChild(el('div', { class: 'sp-hero' }, [
        el('div', { class: 'sp-big', html: icon('headphones') }),
        el('p', { text: 'Play your own Spotify while you play. Each game can have its own playlist.' }),
        el('small', { class: 'muted', text: 'Needs Spotify Premium' })
      ]));
      sh = k.sheet({ title: 'Music', node: box, actions: [{ label: 'Connect Spotify', primary: true, onClick: connect }, { label: 'Not now', cls: 'btn-soft' }] });
      return sh;
    }
    var a = jget(AUTH), scope = g.id && picks()[g.id] ? g.id : (g.id && !picks()['*'] ? g.id : '*');
    // now playing
    var art = el('div', { class: 'sp-art', html: icon('music') }), title = el('b', { text: 'Nothing playing' }), sub = el('small', { text: '' }), dev = el('small', { class: 'sp-dev', text: '' });
    var playB = el('button', { type: 'button', 'aria-label': 'Play', html: icon('play') }), nextB = el('button', { type: 'button', 'aria-label': 'Next song', html: icon('right') });
    var playing = false;
    playB.onclick = function () { k.haptic('light'); (playing ? pause() : resume()).then(function () { setTimeout(refresh, 400); }); playing = !playing; showPlay(); };
    nextB.onclick = function () { k.haptic('light'); next().then(function () { setTimeout(refresh, 500); }); };
    function showPlay() { playB.innerHTML = icon(playing ? 'pause' : 'play'); playB.classList.toggle('on', playing); playB.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
    box.appendChild(el('div', { class: 'sp-card' }, [art, el('div', { class: 'sp-np' }, [title, sub, dev]), el('div', { class: 'sp-ctl' }, [playB, nextB])]));
    var curCtx = null;
    function refresh() {
      state().then(function (s) {
        var it = s && s.item;
        playing = !!(s && s.is_playing); showPlay();
        curCtx = s && s.context ? s.context.uri : null;
        title.textContent = it ? it.name : 'Nothing playing';
        sub.textContent = it ? (it.artists || []).map(function (x) { return x.name; }).join(', ') || (it.show && it.show.name) || '' : 'Pick a playlist below';
        dev.textContent = s && s.device ? 'On ' + s.device.name : '';
        var img = it && ((it.album && it.album.images) || it.images || [])[0];
        if (img) { if (!art.querySelector('img') || art.querySelector('img').src !== img.url) art.innerHTML = '<img class="sp-art" src="' + k.esc(img.url) + '" alt="">'; }
        else art.innerHTML = icon('music');
        rows.forEach(function (r) { r.el.classList.toggle('playing', r.u === curCtx); });
      }).catch(function () {});
    }
    // this game / all games
    var seg = null;
    if (g.id) {
      var b1 = el('button', { type: 'button', text: g.name || 'This game' }), b2 = el('button', { type: 'button', text: 'All games' });
      b1.onclick = function () { scope = g.id; draw(); }; b2.onclick = function () { scope = '*'; draw(); };
      seg = el('div', { class: 'sp-seg' }, [b1, b2]); box.appendChild(seg);
    }
    var list = el('div', { class: 'sp-list' }); box.appendChild(list);
    var rows = [], pls = null;
    function row(u, name, sub2, img, ph) {
      var cur = picks()[scope], on = cur ? cur.u === u : u === (scope === '*' ? 'off' : 'inherit');
      var b = el('button', { type: 'button', class: 'sp-row' + (on ? ' on' : '') }, [
        img ? el('img', { src: img, alt: '', loading: 'lazy' }) : el('span', { class: 'sp-ph', html: icon(ph || 'music') }),
        el('span', { class: 'sp-tx' }, [el('b', { text: name })].concat(sub2 ? [el('small', { text: sub2 })] : [])),
        el('span', { class: 'sp-eq', html: '<u></u><u></u><u></u>' }),
        el('i', { html: icon('check') })
      ]);
      b.onclick = function () {
        k.haptic('light'); k.sfx('tap');
        if (u === 'inherit') setPick(scope, null);
        else setPick(scope, u === 'off' ? { u: 'off' } : { u: u, n: name, img: img || null });
        rows.forEach(function (r) { r.el.classList.toggle('on', r.el === b); });
        // you hear the change right away
        if (u === 'off') pause().then(refresh);
        else if (u === 'inherit') { if (g.id) gameStart(g.id); setTimeout(refresh, 900); }
        else playUri(u).then(function (res) {
          if (res === 'nodevice') { sh.close(); openAppNudge(g.id || '*'); }
          else if (res === 'premium') toast('Spotify only lets apps start music on Premium');
          setTimeout(refresh, 900);
        });
      };
      rows.push({ el: b, u: u }); list.appendChild(b);
    }
    function draw() {
      if (seg) { seg.children[0].classList.toggle('on', scope !== '*'); seg.children[1].classList.toggle('on', scope === '*'); }
      list.innerHTML = ''; rows = [];
      if (scope !== '*') { var all = picks()['*']; row('inherit', 'Same as all games', all && all.u !== 'off' ? all.n : 'No music', null, 'swap'); }
      row('off', 'No music', scope === '*' ? 'Unless a game has its own' : 'Spotify pauses in this game', null, 'mute');
      if (!pls) { list.appendChild(el('p', { class: 'muted', text: 'Loading your playlists…' })); return; }
      pls.forEach(function (p) { row(p.uri, p.name, (p.tracks && p.tracks.total != null ? p.tracks.total + ' songs' : ''), p.images && p.images.length ? p.images[p.images.length > 1 ? 1 : 0].url : null); });
      if (!pls.length) list.appendChild(el('p', { class: 'muted', text: 'No playlists in your Spotify yet.' }));
      rows.forEach(function (r) { r.el.classList.toggle('playing', r.u === curCtx); });
    }
    draw();
    api('GET', '/me/playlists?limit=50').then(function (r) { pls = (r.json && r.json.items || []).filter(function (p) { return p && p.uri; }); draw(); }).catch(function () { pls = []; draw(); });
    var me = a.me || {};
    box.appendChild(el('div', { class: 'sp-foot' }, (me.img ? [el('img', { src: me.img, alt: '' })] : []).concat([
      el('span', { text: 'Spotify: ' + (me.name || 'connected') }),
      el('button', { type: 'button', text: 'Disconnect', onclick: function () { disconnect(); sh.close(); toast('Spotify disconnected on this device'); } })
    ])));
    refresh(); poll = setInterval(refresh, 4000);
    sh = k.sheet({ title: 'Music', node: box, actions: [{ label: 'Done', cls: 'btn-soft' }], onClose: function () { clearInterval(poll); } });
    return sh;
  }

  window.Spotify = {
    ready: function () { return !!CLIENT_ID; }, connected: function () { return !!jget(AUTH); },
    connect: connect, finish: finish, disconnect: disconnect, owns: owns, gameStart: gameStart, sheet: sheet,
    pickFor: pickFor, _api: api
  };
})();
