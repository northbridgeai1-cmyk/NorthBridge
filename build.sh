#!/usr/bin/env bash
# =============================================================================
# NorthBridge website build  ·  build.sh
#
# Cloudflare Pages runs this on every push to main:
#     Build command:           bash build.sh
#     Build output directory:  dist
#
# It copies ONLY the public website into dist/. Everything else in this
# folder (GUIDE.md, PRD.md, README.md, tests, .cursor, version-assets.py,
# founder/, reels/) is never published. This is an allow-list: a new file
# stays private until it matches a line below.
#
# To publish a new kind of file or folder, add it to PUBLIC_FILES or
# PUBLIC_DIRS. Run "bash build.sh" yourself to check what ends up in dist/.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

OUT=dist
rm -rf "$OUT"
mkdir -p "$OUT"

# Top-level files, by type. agents.md, llms.txt and llms-full.txt are public on
# purpose: they tell AI assistants what NorthBridge does.
PUBLIC_FILES=(*.html *.css *.js *.svg *.png *.ico *.webmanifest *.xml *.txt agents.md _headers)
# Whole folders that are public.
PUBLIC_DIRS=(media og for-agents)

shopt -s nullglob
for f in "${PUBLIC_FILES[@]}"; do
  [ -f "$f" ] && cp "$f" "$OUT/"
done
for d in "${PUBLIC_DIRS[@]}"; do
  [ -d "$d" ] && cp -R "$d" "$OUT/"
done

# Never publish system junk even if it sneaks into a public folder.
find "$OUT" -name '.DS_Store' -delete

# Safety net: stop the build if anything private got in.
for bad in GUIDE.md PRD.md README.md DESIGN.md version-assets.py tests founder reels .cursor .claude .git; do
  if [ -e "$OUT/$bad" ]; then
    echo "build.sh: refusing to publish $bad" >&2
    exit 1
  fi
done

echo "build.sh: $(find "$OUT" -type f | wc -l | tr -d ' ') files ready in $OUT/"
