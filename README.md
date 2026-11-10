# northbridge-website
NorthBridge marketing website: AI automation, communication, and training for small businesses.

**New here? Read [GUIDE.md](GUIDE.md) first.** It explains which file is which, how to change prices and wording, how to test, and how the site is kept safe.

## Shipping a change

After editing any `.css` or `.js` file, run:

    python3 version-assets.py

It stamps each stylesheet and script link with a hash of the file (`nb.css?v=…`) and renames the service worker cache, so every device loads the new files on its next visit instead of a cached old copy.
