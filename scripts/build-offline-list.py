#!/usr/bin/env python3
"""The list of files "Offline" in the menu saves on the device (offline-files.json).

Every update already saves the app itself (PRECACHE_URLS in service-worker.js). This lists everything else the
site serves that a game can use: music, crossword puzzles, the Sandlot stats, the 3D library, fonts, pictures and
sounds. Run by deploy.yml on every release, so it's never out of date; run it by hand to refresh the copy in the
repo (used by previews).
"""
import fnmatch, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

sw = open('service-worker.js', encoding='utf-8').read()
pre = set(re.findall(r"'(/[^']+)'", re.search(r"const PRECACHE_URLS = \[(.*?)\];", sw, re.S).group(1)))
ignore = json.load(open('firebase.json'))['hosting']['ignore']

def hidden(p):
    for pat in ignore:
        if fnmatch.fnmatch(p, pat) or fnmatch.fnmatch(p, pat.replace('**/', '')) or any(fnmatch.fnmatch(part, pat.replace('**/', '')) for part in p.split('/')):
            return True
    return False

files = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, check=True).stdout.split('\n')
out, total = [], 0
for f in sorted(files):
    if not f or not os.path.isfile(f) or hidden(f): continue
    if f.endswith(('.py', '.md', '.yml', '.yaml', '.sh', '.txt')) or f.startswith(('.github/', 'scripts/', 'art/')): continue
    if f in ('offline-files.json', 'package.json', 'package-lock.json', 'service-worker.js') or '/tools/' in f: continue
    p = '/' + f
    if p in pre or (p.endswith('.html') and '/' + f in pre): continue
    size = os.path.getsize(f); total += size
    out.append([p, size])

json.dump({'files': out, 'bytes': total}, open('offline-files.json', 'w'), separators=(',', ':'))
print('offline-files.json: %d files, %.1f MB' % (len(out), total / 1e6))
