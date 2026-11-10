#!/bin/bash
# Turns the generated PNGs (argument: their folder) into the game's WebP files, plus a small copy of each
# in art/t/ for the table (240 wide; Places 480). Needs ffmpeg.
set -e; SRC="$1"; OUT="$(dirname "$0")/../../games/anoria/art"; mkdir -p "$OUT/t"
for f in "$SRC"/*.png; do k=$(basename "$f" .png); o="$OUT/$k.webp"; [ -f "$o" ] && continue
  case "$k" in place-*) w=960;; *) w=640;; esac
  ffmpeg -loglevel error -y -i "$f" -vf "scale=$w:-2:flags=lanczos" -c:v libwebp -quality 80 "$o"; done
for f in "$OUT"/*.webp; do k=$(basename "$f"); [ -f "$OUT/t/$k" ] && continue
  case "$k" in place-*) w=480;; *) w=240;; esac
  ffmpeg -loglevel error -y -i "$f" -vf "scale=$w:-2:flags=lanczos" -c:v libwebp -quality 76 "$OUT/t/$k"; done
ls "$OUT"/*.webp | wc -l
