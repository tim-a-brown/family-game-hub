// Temporary: two browser connections forced through the TURN server (relay only), one message across.
const puppeteer = require('puppeteer-core');
(async () => {
  const ice = (await (await fetch('https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/online%2Fice.json?alt=media')).json()).iceServers;
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  for (const only of [null, 'udp', 'tcp', 'turns']) {
    const list = ice.map((s) => Object.assign({}, s, { urls: [].concat(s.urls).filter((u) => !only || (only === 'turns' ? /^turns:/.test(u) : /^turn:/.test(u) && u.includes('transport=' + only))) })).filter((s) => s.urls.length && s.username);
    const r = await p.evaluate(async (ice) => {
      const cfg = { iceServers: ice, iceTransportPolicy: 'relay' }, a = new RTCPeerConnection(cfg), c = new RTCPeerConnection(cfg), cands = [];
      a.onicecandidate = (e) => { if (e.candidate) { cands.push(e.candidate.candidate.split(' ').slice(2, 8).join(' ')); c.addIceCandidate(e.candidate); } };
      c.onicecandidate = (e) => { if (e.candidate) a.addIceCandidate(e.candidate); };
      const ch = a.createDataChannel('t'); let got = null; const t0 = Date.now(); let ms = 0;
      c.ondatachannel = (e) => { e.channel.onmessage = (m) => { got = m.data; ms = Date.now() - t0; }; };
      ch.onopen = () => ch.send('hello through turn');
      await a.setLocalDescription(await a.createOffer()); await c.setRemoteDescription(a.localDescription);
      await c.setLocalDescription(await c.createAnswer()); await a.setRemoteDescription(c.localDescription);
      while (!got && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
      return { got, ms, state: a.connectionState, relayCandidates: cands.length };
    }, list);
    console.log((only || 'all') + ':', JSON.stringify(r));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
