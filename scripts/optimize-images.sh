#!/usr/bin/env bash
# Makes WebP copies of the shipped JPEG/PNG pictures under static/images at 480, 640 and 800 px wide
# (never upscaled): name.jpg -> name-480.webp, name-640.webp, name-800.webp. `responsiveImage` in src/lib/media.ts
# offers them to browsers through srcset. Re-run after adding a picture.
set -euo pipefail
cd "$(dirname "$0")/../static/images"
find . -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' \) | while read -r src; do
	base="${src%.*}"
	for width in 480 640 800; do
		out="${base}-${width}.webp"
		[ "$out" -nt "$src" ] && continue
		magick "$src" -resize "${width}x>" -strip -quality 72 -define webp:method=6 "$out"
	done
done
