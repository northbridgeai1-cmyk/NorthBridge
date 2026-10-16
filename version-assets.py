#!/usr/bin/env python3
"""Stamp every local CSS/JS reference with a hash of the file's contents.

    python3 version-assets.py

Run before each commit that changes a .css or .js file. The HTML then asks for
nb.css?v=<hash>, so browsers, Cloudflare and the service worker all fetch the
new file the moment a page changes, instead of reusing a cached old copy.
It also bumps the service worker's CACHE name so old caches are cleared.
"""
import hashlib
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
ASSETS = ["styles.css", "nb.css", "site.js", "nb.js", "search-index.js"]

hashes = {a: hashlib.sha1((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS}


def stamp(text):
    for name, h in hashes.items():
        # matches "nb.css", "nb.css?v=old", 'nb.css' — but not other-nb.css
        text = re.sub(r"""(?<=["'/])%s(\?v=[0-9a-f]+)?(?=["'])""" % re.escape(name),
                      "%s?v=%s" % (name, h), text)
    return text


changed = []
for page in sorted(ROOT.glob("*.html")):
    old = page.read_text(encoding="utf-8")
    new = stamp(old)
    if new != old:
        page.write_text(new, encoding="utf-8")
        changed.append(page.name)

sw = ROOT / "sw.js"
old = sw.read_text(encoding="utf-8")
new = stamp(old)
release = hashlib.sha1("".join(sorted(hashes.values())).encode()).hexdigest()[:8]
new = re.sub(r"var CACHE = 'nb-[^']*';", "var CACHE = 'nb-%s';" % release, new)
if new != old:
    sw.write_text(new, encoding="utf-8")
    changed.append("sw.js")

print("assets:", ", ".join("%s=%s" % kv for kv in hashes.items()))
print("updated:", ", ".join(changed) or "nothing (already current)")
