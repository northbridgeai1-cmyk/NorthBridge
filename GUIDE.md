# How this website works

A plain-English map of meetnorthbridge.com for whoever opens this folder next. No build step, no framework: what is in this folder is what visitors get.

## The 30-second version

- Each page is one `.html` file. Open it, change the words, save.
- Looks live in `.css` files, behaviour in `.js` files. HTML files contain no code of their own, only words and structure.
- Every sentence appears twice, once in `<span class="en">` and once in `<span class="es">`. Change both.
- After changing any `.css` or `.js` file, run `python3 version-assets.py` so visitors get the new file instead of a saved old copy.
- Pushing to `main` on GitHub publishes the site a minute or two later.

## Which file is which

| File | What it is |
| --- | --- |
| `index.html` | Home page: words and structure only |
| `home.css` | How the home page looks |
| `home.js` | What the home page does (picker, calculator, doors, price toggle). The top of the file lists each part |
| `book.html` + `book.js` | Booking page. The calendar link and the form's destination are the first two settings in `book.js` |
| `contact.html` + `contact.js` | Contact form |
| `cinderella.html`, `hermes.html`, `socrates.html` | One page per practice |
| `terms.html`, `privacy.html` | Legal pages |
| `404.html`, `offline.html` | Shown when a page is missing or the visitor has no connection |
| `styles.css` | Base look for every page except home |
| `nb.css` | Shared look on every page: buttons, forms, footer, dark mode, the orange accent. Loads last, so it wins |
| `boot.js` | Tiny script that sets light or dark mode before the page appears |
| `site.js` | EN/ES switch and fade-in for every page except home |
| `nb.js` | Shared extras on every page: search, dark-mode button, mobile menu, floating button, pop-up messages |
| `search-index.js` | The list of things site search can find. Update it if you add a page or section |
| `sw.js` | Lets the site open offline. `version-assets.py` keeps it current; you rarely touch it |
| `llms.txt`, `llms-full.txt`, `agents.md`, `for-agents/` | Facts written for AI assistants. If a price or fact changes on the site, change it here too |
| `sitemap.xml`, `robots.txt` | For search engines |
| `_config.yml` | Tells GitHub which working files not to publish |
| `tests/` | Automatic checks (see below) |

## Common jobs

**Change a price.** Search the whole folder for the old price (for example `$199`). It appears on the home page, the practice page, the hidden data block at the top of `index.html` (the part that starts `application/ld+json`, which Google reads), `llms.txt`, `llms-full.txt`, `agents.md` and `for-agents/facts.json`. Change every one.

**Change wording.** Find the sentence in the `.html` file and edit both the `en` and `es` versions.

**Change the calendar link.** First setting in `book.js`. Set it to `""` to switch the calendar off; the page then shows only the written request form and its wording changes to match.

**Change where forms are delivered.** `NB_FORM_ENDPOINT` in `book.js`, and `FORM_ENDPOINT` in `contact.js`.

**Add or reword a tick box in "Bring the work that eats your week".** In `index.html`, find `class="need"` and copy a line. `data-practice` must be `cinderella`, `hermes` or `socrates`. The suggestions it can show are the `needs-fit` blocks just below; the rule for choosing one is in `home.js` under "needs picker".

**Change the accent colour.** `--pop` near the bottom of `nb.css`.

## Before you publish

1. Start a local copy of the site: `python3 -m http.server 8899 --bind 127.0.0.1`
2. Open http://127.0.0.1:8899 and look at what you changed, on a narrow window too.
3. In a second terminal, run the checks: `node tests/site.test.mjs` (needs Google Chrome installed). It clicks through the site like a visitor: forms, picker, calculator, both languages, both colour modes, six screen sizes, text contrast, broken links and the safety rules below. It should end with `0 failed`.
4. If you changed a `.css` or `.js` file: `python3 version-assets.py`
5. Commit and push.

## How the site is kept safe

There is no login, database or server of our own, so there is very little to attack. What exists:

- **Security policy.** Near the top of every `.html` file is a line starting `<meta http-equiv="Content-Security-Policy"`. It is a list of the only places the browser may load things from. Scripts may come only from this site and Cloudflare's visitor counter; forms may post only to FormSubmit; only Cal.com may appear in a frame. A script written directly into a page will not run, which is why all code lives in `.js` files. **If you add a new outside service (analytics, another calendar, a chat widget) it will silently not work until you add its address to this line on every page.** For Google Analytics that means adding `https://www.googletagmanager.com` to `script-src` and `https://www.google-analytics.com https://*.analytics.google.com` to `connect-src`.
- **Forms.** Each form checks its fields, has a hidden trap field that catches spam bots, and limits how much can be typed. Nothing a visitor types is ever shown back as page code.
- **Text from links.** The booking page reads the plan name from its own web address. It is treated strictly as text and cut to a fixed length.
- **Working files stay off the website.** `build.sh` copies only the public pages, styles, scripts, images and videos into `dist/`, and only `dist/` is published. Planning notes, tests and this guide never are. A new kind of file stays private until you add it to the lists at the top of `build.sh`. (`_config.yml` does the same job for GitHub Pages, the old host.)
- **Security headers.** `_headers` tells Cloudflare to send extra protections with every page: HTTPS only, no framing by other sites, no file-type guessing, a minimal referrer, and no camera, microphone or location access. The comments in the file say what each line does.
- **The checks enforce it.** `tests/site.test.mjs` fails if any page gains an inline script, loses its policy, or opens a new tab unsafely.

### Where the site lives

The site is served by **Cloudflare Pages** from the GitHub repository, which is **private**: only you can see the code. Every push to `main` makes Cloudflare run `bash build.sh` and publish `dist/` within about a minute. Cloudflare → Workers & Pages → the project shows each deploy, and any old deploy can be restored with one click ("Rollback").

To check what will be published before you push, run `bash build.sh` and look in `dist/`. To test it like the live site: `python3 -m http.server 8897 --directory dist`, then open http://localhost:8897.

### Moving from GitHub Pages to Cloudflare Pages (one time, about fifteen minutes)

Do these in order, so the site never goes offline.

1. **Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.** Sign in to GitHub when asked and give Cloudflare access to the **NorthBridge** repository only.
2. Pick the repository, then set:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `bash build.sh`
   - Build output directory: `dist`

   Press **Save and Deploy**. When it finishes you get a test address ending in `.pages.dev`. Open it and click through a few pages and a video.
3. In the new project → **Custom domains → Set up a custom domain**, add `meetnorthbridge.com`, then again for `www.meetnorthbridge.com`. Because the domain is already on Cloudflare, it offers to replace the old records that point to GitHub. Accept. Within a few minutes the live site is served by Cloudflare Pages.
4. Check it switched: open https://meetnorthbridge.com/GUIDE.md. It should say the page is not found.
5. **GitHub → the NorthBridge repository → Settings → Pages:** set the source to **None** (stops the old copy).
6. **GitHub → Settings → General → Danger Zone → Change visibility → Make private.** Cloudflare keeps its access; the public can no longer see the code.
7. Optional: in Cloudflare **SSL/TLS → Edge Certificates**, turn on "Always Use HTTPS".

Leave **Rocket Loader off** (Cloudflare → Speed). It rewrites scripts in a way the security policy blocks, and the site would break.

Note: anyone who copied the repository while it was public keeps that copy. There are no passwords or keys in it, so nothing needs changing, but never put any in this folder.

## Why the pages are laid out this way

Decisions from the November 2026 redesign, so they are not undone by accident:

- **The calendar is the first thing on the booking page**, on phones too. It used to sit under two screens of text. The written form is folded beneath it for people who want Zoom or prefer to send times.
- **One orange button per screen, always "free first meeting".** Pages with one clear action convert better than pages with several competing ones.
- **The four ticks under the hero button** (free meeting, you approve the wording, money-back guarantee, accounts you own). Surveys of small-business owners in 2026 show most do not trust AI to act without oversight, and are least comfortable where a mistake reaches a customer. So approval and ownership are stated before anything about AI.
- **Prices are shown early.** Done-for-you automation is usually quoted at $500 to $2,500 a month; a visible $99 starting point is an advantage.
- **The tick-box picker** replaced an empty video frame. It gives the visitor something to do, shows a plan that fits, and passes their ticks to the booking page so the meeting starts from their list.
- **No testimonials, client names or result figures** anywhere, because there are none yet. The calculator uses only the visitor's own numbers.

## Being found: Google, ChatGPT, Gemini and the rest

What the site already does:

- **Every search engine and AI crawler is allowed in** (`robots.txt`), and `sitemap.xml` lists every page. When you add a page, add it to `sitemap.xml`.
- **Files written for AI assistants:** `llms.txt` (short), `llms-full.txt` (everything), `agents.md` and `for-agents/`. They state what NorthBridge does, the prices, and who it suits. When a price or plan changes, change it there too.
- **Hidden labels for search engines** ("structured data", the `application/ld+json` block near the top of a page). They say NorthBridge is a company, what it sells, and that Pierce Tyrrell founded it.
- **`pierce-tyrrell.html`** is the founder page, so a search for the name has a page that answers it.

No one can promise a ranking or a mention. Search engines and AI assistants decide for themselves, mostly from what *other* websites say about you. These steps are yours, and they matter more than anything else on the site:

1. **Google Search Console** (search.google.com/search-console): add `meetnorthbridge.com`, submit `sitemap.xml`, then use "URL inspection" → "Request indexing" on the home page and `pierce-tyrrell.html`.
2. **Bing Webmaster Tools** (bing.com/webmasters): same again. ChatGPT and Copilot search through Bing, so this is how they find you.
3. **LinkedIn:** a personal profile titled "Founder, NorthBridge" linking to the site, and a NorthBridge company page. For a person's name, LinkedIn usually ranks first. Then add both links to the `sameAs` lists in `index.html` and `pierce-tyrrell.html`.
4. **Make the Instagram account public.** It is restricted, so search engines and AI assistants cannot read it. Put "Founder: Pierce Tyrrell" and the site link in the bio.
5. **Google Business Profile** (business.google.com) for NorthBridge, so the name shows a company panel.
6. **Get listed and mentioned elsewhere:** Crunchbase, Clutch, the n8n partner and community directories, local Quito business directories, guest posts, podcasts. Each real mention with a link is what moves you up for "AI automation" and "AI training" searches, and what AI assistants quote.
7. **Later, real client results** (with permission). Nothing persuades people or AI assistants more. Until then the site states plainly that there are none.

Expect days for the name searches to update and months for the broad ones.
