import json, sys, os, base64, urllib.request, time, concurrent.futures as cf
D = os.path.dirname(os.path.abspath(__file__)); jobs = json.load(open(D + '/redo-jobs.json'))
def gen(j):
    out = D + '/' + j['k'] + '.png'
    if os.path.exists(out): return j['k'] + ' have'
    body = {"model": "gpt-image-2", "prompt": j['prompt'], "size": j['size'], "quality": "medium", "n": 1, "stream": True, "partial_images": 1}
    for attempt in range(4):
        try:
            r = urllib.request.Request("https://api.openai.com/v1/images/generations", data=json.dumps(body).encode(), headers={"Authorization": "Bearer dummy", "Content-Type": "application/json", "Accept": "text/event-stream"})
            img = None
            with urllib.request.urlopen(r, timeout=300) as f:
                for line in f:
                    line = line.decode('utf-8', 'replace').strip()
                    if not line.startswith('data:'): continue
                    d = line[5:].strip()
                    if d == '[DONE]': break
                    try: ev = json.loads(d)
                    except Exception: continue
                    if ev.get('b64_json') and 'completed' in ev.get('type', ''): img = ev['b64_json']
            if img: open(out, 'wb').write(base64.b64decode(img)); return j['k'] + ' ok'
            err = 'no image'
        except urllib.error.HTTPError as e: err = 'HTTP %s %s' % (e.code, e.read().decode()[:160])
        except Exception as e: err = repr(e)[:160]
        time.sleep(3 + attempt * 4)
    return j['k'] + ' FAILED ' + err
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(gen, jobs): print(r, flush=True)
print('ALL DONE', flush=True)
