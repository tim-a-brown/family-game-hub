#!/usr/bin/env python3
# gen.py jobs.json outdir  -- jobs: [{k, prompt, size?, bg?, q?}]; writes outdir/<k>.png, skips existing
import json, sys, os, base64, urllib.request, time, concurrent.futures as cf
jobs = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
def gen(j):
    out = OUT + '/' + j['k'] + '.png'
    if os.path.exists(out): return j['k'] + ' have'
    body = {"model": "gpt-image-2", "prompt": j['prompt'], "size": j.get('size', '1024x1024'), "quality": j.get('q', 'medium'), "n": 1, "stream": True, "partial_images": 1}
    if j.get('bg'): body['background'] = j['bg']
    err = ''
    for attempt in range(6):
        try:
            r = urllib.request.Request("https://api.openai.com/v1/images/generations", data=json.dumps(body).encode(), headers={"Authorization": "Bearer dummy", "Content-Type": "application/json", "Accept": "text/event-stream"})
            img = None
            with urllib.request.urlopen(r, timeout=400) as f:
                for line in f:
                    line = line.decode('utf-8', 'replace').strip()
                    if not line.startswith('data:'): continue
                    d = line[5:].strip()
                    if d == '[DONE]': break
                    try: ev = json.loads(d)
                    except Exception: continue
                    if ev.get('b64_json') and 'completed' in ev.get('type', ''): img = ev['b64_json']
                    if ev.get('error'): err = str(ev['error'])[:200]
            if img: open(out, 'wb').write(base64.b64decode(img)); return j['k'] + ' ok'
            err = err or 'no image'
        except urllib.error.HTTPError as e:
            err = 'HTTP %s %s' % (e.code, e.read().decode()[:200])
            if e.code == 400: break
            if e.code == 429: time.sleep(20 + attempt * 15); continue
        except Exception as e: err = repr(e)[:160]
        time.sleep(3 + attempt * 5)
    return j['k'] + ' FAILED ' + err
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(gen, jobs): print(r, flush=True)
print('ALL DONE', flush=True)
