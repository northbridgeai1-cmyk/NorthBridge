# meetnorthbridge.com — Product Requirements Document

**Status:** Draft v1 — for review. Items marked **DECIDE** need your answer before build starts.
**Owner:** Pierce Tyrrell · **Drafted with:** Claude · **Date:** 2026-09-13

---

## 1. What this site is for

One job: **a stranger decides to contact NorthBridge, or one of its branches, and does.**

Everything on the site either moves a visitor toward that action or gets out of the way. It is not a product, a portal, or a terminal. It is the front door.

**Success is measured by:** contact-form submissions and booked first meetings, attributed by branch and by campaign (UTM). Not page views.

## 2. Who it is for

Primary: **owners of small and medium businesses in the United States and Latin America** who lose hours every week to admin they can't hire for — chasing invoices, moving data between apps, following up with clients — and want it built and kept running for them. Bilingual: English and Spanish are equals, not a translation layer.

Secondary: **schools and event organisers** (Socrates training), and **people who make trading decisions with real money** (PerceptFolio).

The visitor is busy, sceptical of agencies, and decides in seconds. They are on a phone as often as a laptop.

## 3. Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Stack | **React + TypeScript + Tailwind + shadcn/ui, built with Vite** | Your call. Matches the component tooling installed for Cursor. Vite over Next because there is no server: static output is all that's needed. |
| Output | **Static files only** (`dist/`) | No backend. |
| Hosting | **GitHub Pages behind Cloudflare, unchanged** | Domain, DNS, cert, analytics and CSP already work. A build step does not require leaving. |
| Backend | **None** | Marketing + contact. Forms go to Formspree. No accounts, admin, or database. |
| Visual | **New look, same content** | Every page, price, plan and fact carries over. The skin changes; the truth does not. |
| Automation | **All four** — CI test+deploy, lead handling, scheduled checks, PerceptFolio feed | Section 7. |
| Content honesty | **Nothing invented** | No claim the product can't back, no performance figures, no sample data presented as real. |

## 4. Pages (content carried over 1:1)

| Route | Purpose | Notes |
|---|---|---|
| `/` | The pitch, the four doors, calculator, plans, process, FAQ | Hero states what + who in plain terms (done) |
| `/cinderella` `/hermes` `/socrates` | One practice each, with its plans | Add the yearly toggle these pages lack today |
| `/perceptfolio` | The trading-terminal branch | Market tab: **DECIDE** (§11) |
| `/contact` | Branch-picker form — the primary conversion | Formspree endpoint finally set |
| `/book` | First-meeting scheduler | Scheduler URL finally set, or page removed |
| `/terms` `/privacy` | Legal | Carry over |
| `/404`, offline | Fallbacks | Carry over |

Real-estate branch stays "coming soon" until it exists.

## 5. Copy rules

- **Banned words** (either language): powerful, intuitive, streamline, seamless, leverage, cutting-edge, robust, scalable, effortless, revolutionary, game-changing, unlock, supercharge, elevate, empower, synergy, best-in-class, world-class, next-gen, state-of-the-art, holistic, innovative — and Spanish equivalents. Current count on the site: **1** (`seamless`). CI fails the build if any appear.
- **No eyebrow labels above headings.** The heading carries its own weight. (24 already removed.)
- **No claim without a mechanism.** "The invite lands automatically" only once a scheduler is connected. Copy switches with the config, never ahead of it.
- Spanish matches English fact for fact; neither is the "real" one.

## 6. Visual direction — **DECIDE: pick one**

Three worlds, drawn from the references you gave (godly, refero, aceternity, haikei, watermelon). Same content in all three.

**A · Ledger** — *editorial, restrained.* Fraunces display kept; large type, off-white paper, single ink, one green. Asymmetric two-column sections, hairline rules, tabular numerals. Very little colour; whitespace does the work. Closest to godly.design's strongest landing pages. Lowest risk; reads as established.

**B · Workshop** — *warm, tactile, Latin.* Paper texture, terracotta and gold with the green, hand-drawn accents (the underline you already have), organic section dividers (haikei). Feels like a craft business that builds things, not a SaaS. Strongest fit for the audience; most distinctive; most work to keep tasteful.

**C · Instrument** — *cool, precise, dark-first.* Grid lines, monospace numerals, aceternity-style motion. Fits PerceptFolio well and the SMB audience badly. **Not recommended** for the main site; viable for `/perceptfolio` alone.

**Recommendation:** B for the site, with C's restraint applied to `/perceptfolio` only. Say A if you'd rather play it safe.

Whatever you pick: one authored motion moment per page, not an entrance on every section; **skeleton loaders** wherever content arrives after first paint (never a spinner, never an empty region); dark mode from day one with contrast verified in both themes.

## 7. Automation

| What | How | Trigger |
|---|---|---|
| **Test + deploy** | GitHub Actions: build, run the check suite (ported to the new stack), deploy to Pages **only if green** | Every push to `main` |
| **Lead handling** | Formspree → email to the inbox + row appended to a Google Sheet, tagged with branch and UTM; auto-reply to the sender in their language | Each submission |
| **Scheduled checks** | Cron Action: live site returns 200, internal links resolve, contact form accepts a test post; opens a GitHub issue on failure | Daily |
| **PerceptFolio feed** | Cron Action fetches a real source, writes `data/market.json`, rebuilds, deploys. **DECIDE:** which source — or drop the Market tab, since the product itself publishes no performance figures. | Weekly |

## 8. Security — the 20 items, mapped honestly

Static site, no backend. Each item is real work, already done, or not applicable *by construction* — and "not applicable" is stated, not skipped.

| # | Item | Status |
|---|---|---|
| 1 | Hide API keys | **Real.** Only two keys will exist (Formspree, feed source). Build-time env in Actions secrets; never in the repo. |
| 2 | Check env variables | **Real.** `.env.example` documents them; CI fails if a required one is missing. |
| 3 | Protect admin routes | N/A — no admin routes exist. |
| 4 | Authentication | N/A — no accounts. |
| 5 | Least-privilege access | N/A for users. Applies to the *repo*: Actions get read-only tokens except the deploy step. |
| 6 | Sanitise forms | **Real.** Client validation for UX; Formspree validates server-side; honeypot; nothing from user input is ever rendered back. |
| 7 | XSS | **Real.** React escapes by default; `dangerouslySetInnerHTML` banned by lint; a build step makes a CSP *without* `unsafe-inline` possible — an upgrade on today. |
| 8 | Rate limiting | Formspree's, on the form. Nothing else accepts input. |
| 9 | Secure API endpoints | N/A — the site exposes none. |
| 10 | CORS | N/A — no API. Outbound is Formspree, the Cloudflare beacon, and the feed source only. |
| 11 | Security headers | **Real, and better than today.** Move from `<meta>` CSP to Cloudflare Transform Rules: real `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`. One-time Cloudflare setup, plus "Always use HTTPS". |
| 12 | Debug mode off | **Real.** Production build: no source maps shipped, `NODE_ENV=production` enforced in CI. |
| 13 | Update dependencies | **Real, and new.** Today there are zero. React/Tailwind/shadcn introduce a tree. Dependabot + `npm audit` in CI. |
| 14 | Remove unused packages | **Real.** `knip` in CI fails on unused deps. |
| 15 | Secure files | **Real.** `.gitignore` for env/secrets; no `.map` in output; `.git` never served. |
| 16 | Database access | N/A — no database. |
| 17 | Password hashing | N/A — no passwords. |
| 18 | Secrets in git | **Done.** Full history scanned: clean. Add `gitleaks` pre-commit and in CI. |
| 19 | Full security audit | **Partly real.** Strix needs Docker + an LLM key; not runnable on this machine. Substitute: OWASP ZAP baseline scan in CI against the built site, plus the contrast/a11y suite. |
| 20 | Make no mistakes | **Cannot be promised by anyone.** What can be: nothing reaches the live site unless the suite passes, and every claim in the copy is checked against what the product actually does. |

## 9. Non-goals

- No client portal, login, or dashboard on this domain.
- No CMS. Content lives in the repo; editing it is a commit.
- No chat widget, heatmap, or A/B tool. Cloudflare Web Analytics is enough until there are leads to analyse.
- No Three.js. It would break the CSP and there is no object to model.

## 10. Migration plan

1. Scaffold Vite + React + TS + Tailwind + shadcn on a `v2` branch; port the shared layer (theme, i18n, search, drawer, offline) as components.
2. Port pages one at a time, content copied verbatim, in the chosen visual world.
3. Port the test suite (`tests/`) to run against the built `dist/`.
4. Stand up CI: test → build → deploy to Pages from `dist/`.
5. Cut over when every page passes and the suite is green. The current site stays in git history.

## 11. Open decisions — **DECIDE**

1. **Visual world:** A, B, or C (§6).
2. **PerceptFolio Market tab:** real feed (which?), or remove it.
3. **Scheduler:** which service (Cal.com is free and embeds), or drop `/book` and keep the email flow.
4. **Formspree:** you create the form; I need only the endpoint ID.
5. **Hermes Wings voice agents:** built, or remove the tier until it is?
6. **Email:** stay on Gmail, or a domain address before launch.

Answer these and the build starts.
