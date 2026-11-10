#!/bin/bash
# Turns the generated PNGs (argument: their folder) into the game's WebP files. Needs ffmpeg.
set -e; SRC="$1"; OUT="$(dirname "$0")/../../games/anoria/art"; mkdir -p "$OUT"
for f in "$SRC"/*.png; do k=$(basename "$f" .png); o="$OUT/$k.webp"; [ -f "$o" ] && continue
  case "$k" in place-*) w=960;; *) w=640;; esac
  ffmpeg -loglevel error -y -i "$f" -vf "scale=$w:-2:flags=lanczos" -c:v libwebp -quality 80 "$o"; done
ls "$OUT" | wc -l
