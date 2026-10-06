#!/usr/bin/env bash
# Temporary: downloads Kenney's CC0 audio packs (kenney.nl) into sounds-src/
# so the best recordings can be picked for the game sounds. Run by
# .github/workflows/fetch-sounds.yml; both get removed once sounds/ is built.
set -u
OUT="${GITHUB_WORKSPACE:-$PWD}/sounds-src"; mkdir -p "$OUT"; cd "$(mktemp -d)"
curl -sL https://kenney.nl/assets/category:Audio | grep -oE '/assets/[a-z0-9-]+' | sort -u > "$OUT/audio-packs.txt" || true
for slug in casino-audio impact-sounds rpg-audio interface-sounds music-jingles ui-audio digital-audio foley-sounds sci-fi-sounds; do
  page=$(curl -sL "https://kenney.nl/assets/$slug") || continue
  zip=$(printf '%s' "$page" | grep -oE '(https://kenney\.nl)?/media/pages/assets/[^"'"'"' ]+\.zip' | head -1)
  [ -z "$zip" ] && { echo "no download for $slug"; continue; }
  case "$zip" in /*) zip="https://kenney.nl$zip";; esac
  curl -sL "$zip" -o p.zip && rm -rf x && mkdir x && unzip -q -o p.zip -d x || { echo "bad zip $slug"; continue; }
  mkdir -p "$OUT/$slug"
  n=$(find x -type f -iname '*.ogg' | wc -l)
  if [ "$n" -gt 0 ]; then find x -type f -iname '*.ogg' -exec cp {} "$OUT/$slug/" \;
  else find x -type f \( -iname '*.wav' -o -iname '*.mp3' \) -exec cp {} "$OUT/$slug/" \; ; fi
  find x -maxdepth 2 -iname 'license*' -exec cp {} "$OUT/$slug/" \;
  echo "$slug: $(ls "$OUT/$slug" | wc -l) files"
done
du -sh "$OUT"
