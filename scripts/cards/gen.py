# Paints court cards and jokers for Kit.card: python3 scripts/cards/gen.py <work folder> KH,QS,...  (keys from prompts.json)
# Writes <work folder>/<KEY>.png and the prompt beside it as <KEY>.txt. JKB (the black-and-white joker) is an edit of
# <work folder>/JK.png, so make JK first. Same endpoint and dummy key as scripts/anoria/art/gen.py: a proxy adds the real
# key (never ask for one, never print one). At most 3 requests at a time; an HTTP 429 waits and retries.
# Look at every picture at full size (hands, the thing held, the convention of the card), then pack the ones you keep
# with pack.py.
import json, sys, os, base64, urllib.request, urllib.error, time, uuid, concurrent.futures as cf
P = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompts.json')))
OUT = os.path.abspath(sys.argv[1]); keys = sys.argv[2].split(',')
os.makedirs(OUT, exist_ok=True)

def prompt(k):
    c = P['cards'][k]
    if k == 'JKB': return P['bw']
    return (P['jstyle'] if k == 'JK' else P['style']) + ' ' + P['palette'][c['suit']] + ' ' + c['brief'] + ' ' + P['tail']

def multipart(fields, name, data):
    b = uuid.uuid4().hex; out = b''
    for k, v in fields.items(): out += ('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n' % (b, k, v)).encode()
    out += ('--%s\r\nContent-Disposition: form-data; name="image[]"; filename="%s"\r\nContent-Type: image/png\r\n\r\n' % (b, name)).encode() + data + b'\r\n'
    return out + ('--%s--\r\n' % b).encode(), 'multipart/form-data; boundary=' + b

def gen(k):
    out = os.path.join(OUT, k + '.png')
    if os.path.exists(out): return k + ' have'
    text = prompt(k); open(os.path.join(OUT, k + '.txt'), 'w').write(text)
    fields = {"model": P['model'], "prompt": text, "size": P['size'], "quality": P['quality']}
    for attempt in range(6):
        try:
            if P['cards'][k].get('edit'):
                src = os.path.join(OUT, P['cards'][k]['edit'] + '.png')
                data, ct = multipart(dict(fields, n='1'), os.path.basename(src), open(src, 'rb').read())
                r = urllib.request.Request("https://api.openai.com/v1/images/edits", data=data, headers={"Authorization": "Bearer dummy", "Content-Type": ct})
                with urllib.request.urlopen(r, timeout=400) as f: img = json.loads(f.read())['data'][0].get('b64_json')
            else:   # (streamed, as the Anoria script does, so a slow picture keeps the connection alive)
                r = urllib.request.Request("https://api.openai.com/v1/images/generations", data=json.dumps(dict(fields, n=1, stream=True, partial_images=1)).encode(),
                                           headers={"Authorization": "Bearer dummy", "Content-Type": "application/json", "Accept": "text/event-stream"})
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
            if img: open(out, 'wb').write(base64.b64decode(img)); return k + ' ok'
            err = 'no image'
        except urllib.error.HTTPError as e:
            err = 'HTTP %s %s' % (e.code, e.read().decode()[:200])
            if e.code == 429: time.sleep(30); continue
        except Exception as e: err = repr(e)[:200]
        time.sleep(3 + attempt * 4)
    return k + ' FAILED ' + err

with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(gen, [k for k in keys if k != 'JKB']): print(r, flush=True)
if 'JKB' in keys: print(gen('JKB'), flush=True)
print('ALL DONE', flush=True)
