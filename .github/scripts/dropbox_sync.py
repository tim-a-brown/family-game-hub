"""Mirror the repo's tracked files into a Dropbox folder.

Uploads files whose content differs (compared via Dropbox's content_hash) and
removes files/folders in the Dropbox folder that are no longer in the repo.
Deleted files stay recoverable from Dropbox's "Deleted files" for 30+ days.

Env:
  DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN  (required)
  DROPBOX_PATH  target folder; "" (default) = the app's own folder when the
                Dropbox app uses "App folder" access
"""
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BLOCK = 4 * 1024 * 1024


def content_hash(path):
    # https://www.dropbox.com/developers/reference/content-hash
    digests = b""
    with open(path, "rb") as f:
        while chunk := f.read(BLOCK):
            digests += hashlib.sha256(chunk).digest()
    return hashlib.sha256(digests).hexdigest()


def request(url, data, headers, retries=5):
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")
            if e.code == 429 or e.code >= 500:
                time.sleep(int(e.headers.get("Retry-After") or 2 ** attempt))
                continue
            raise RuntimeError(f"{url} -> {e.code}: {body}") from None
    raise RuntimeError(f"{url} -> gave up after {retries} attempts")


def access_token():
    creds = f"{os.environ['DROPBOX_APP_KEY']}:{os.environ['DROPBOX_APP_SECRET']}"
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": os.environ["DROPBOX_REFRESH_TOKEN"],
    }).encode()
    headers = {"Authorization": "Basic " + base64.b64encode(creds.encode()).decode()}
    return request("https://api.dropboxapi.com/oauth2/token", data, headers)["access_token"]


def main():
    missing = [k for k in ("DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN")
               if not os.environ.get(k)]
    if missing:
        print(f"::warning::Dropbox sync skipped; missing secrets: {', '.join(missing)}")
        return

    root = os.environ.get("DROPBOX_PATH", "").strip().rstrip("/")
    if root and not root.startswith("/"):
        root = "/" + root
    auth = {"Authorization": "Bearer " + access_token()}

    def rpc(endpoint, args):
        headers = {**auth, "Content-Type": "application/json"}
        return request(f"https://api.dropboxapi.com/2/{endpoint}", json.dumps(args).encode(), headers)

    # Current Dropbox contents, keyed by lowercased path relative to root.
    remote_files, remote_dirs = {}, set()
    try:
        page = rpc("files/list_folder", {"path": root, "recursive": True})
    except RuntimeError as e:
        if "not_found" not in str(e):
            raise
        page = {"entries": [], "has_more": False}
    while True:
        for entry in page["entries"]:
            rel = entry["path_lower"][len(root):].lstrip("/")
            if not rel:
                continue
            if entry[".tag"] == "file":
                remote_files[rel] = entry["content_hash"]
            elif entry[".tag"] == "folder":
                remote_dirs.add(rel)
        if not page["has_more"]:
            break
        page = rpc("files/list_folder/continue", {"cursor": page["cursor"]})

    local = subprocess.run(["git", "ls-files", "-z"], capture_output=True, check=True,
                           text=True).stdout.split("\0")
    local = [p for p in local if p and os.path.isfile(p)]
    local_lower = {p.lower() for p in local}
    local_dirs = {os.path.dirname(p).lower() for p in local}
    for d in list(local_dirs):
        while d:
            d = os.path.dirname(d)
            local_dirs.add(d)

    uploaded = 0
    for rel in local:
        if remote_files.get(rel.lower()) == content_hash(rel):
            continue
        arg = {"path": f"{root}/{rel}", "mode": "overwrite", "mute": True}
        headers = {**auth, "Content-Type": "application/octet-stream",
                   "Dropbox-API-Arg": json.dumps(arg)}  # json.dumps escapes non-ASCII as required
        with open(rel, "rb") as f:
            request("https://content.dropboxapi.com/2/files/upload", f.read(), headers)
        print(f"uploaded  {rel}")
        uploaded += 1

    # Remove stale folders (topmost only) and stale files not already inside one.
    stale_dirs = sorted(d for d in remote_dirs if d not in local_dirs)
    top_dirs = [d for d in stale_dirs if not any(d.startswith(t + "/") for t in stale_dirs if t != d)]
    stale = top_dirs + sorted(
        f for f in remote_files
        if f not in local_lower and not any(f.startswith(t + "/") for t in top_dirs))
    for rel in stale:
        rpc("files/delete_v2", {"path": f"{root}/{rel}"})
        print(f"deleted   {rel}")

    print(f"Done: {uploaded} uploaded, {len(stale)} deleted, "
          f"{len(local) - uploaded} unchanged -> Dropbox:{root or '/'} ")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as e:
        print(f"::error::{e}")
        sys.exit(1)
