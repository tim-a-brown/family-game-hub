// Temporary: the real app code (online.js in the Centipede page) loads the TURN logins, then two connections
// forced through TURN with them carry a message. Also shows whether a plain fetch of Storage is blocked (CORS).
const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('console', (m) => { if (/CORS|Access-Control|blocked/i.test(m.text())) console.log('console:', m.text().slice(0, 200)); });
  await p.goto('http://localhost:8000/games/centipede.html', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 1500));
  const fetchTry = await p.evaluate(() => fetch('https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/online%2Fice.js?alt=media').then((r) => 'fetch ok ' + r.status, (e) => 'fetch blocked: ' + e.message));
  console.log(fetchTry);
  const ice = await p.evaluate(() => Online.ice());
  console.log('Online.ice():', ice ? ice.map((s) => s.urls.length + (s.username ? ' turn' : ' stun')).join(', ') : 'NOTHING');
  if (!ice) process.exit(1);
  const r = await p.evaluate(async (ice) => {
    const cfg = { iceServers: ice, iceTransportPolicy: 'relay' }, a = new RTCPeerConnection(cfg), c = new RTCPeerConnection(cfg);
    a.onicecandidate = (e) => { if (e.candidate) c.addIceCandidate(e.candidate); };
    c.onicecandidate = (e) => { if (e.candidate) a.addIceCandidate(e.candidate); };
    const ch = a.createDataChannel('t'); let got = null; const t0 = Date.now(); let ms = 0;
    c.ondatachannel = (e) => { e.channel.onmessage = (m) => { got = m.data; ms = Date.now() - t0; }; };
    ch.onopen = () => ch.send('hello through turn');
    await a.setLocalDescription(await a.createOffer()); await c.setRemoteDescription(a.localDescription);
    await c.setLocalDescription(await c.createAnswer()); await a.setRemoteDescription(c.localDescription);
    while (!got && Date.now() - t0 < 15000) await new Promise((r) => setTimeout(r, 100));
    return { got, ms };
  }, ice);
  console.log('through TURN:', JSON.stringify(r));
  await b.close();
  if (!r.got) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
