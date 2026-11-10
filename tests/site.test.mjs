/* NorthBridge site checks. Serve the site, then:  node tests/site.test.mjs
     python3 -m http.server 8899 --bind 127.0.0.1
   Covers: interactive elements, the contact form (empty / garbage / valid),
   responsive overflow at 375/768/1440, console errors, contrast in both
   themes, one-language-at-a-time, and internal links. */
import { launch, newPage, kill, BASE } from './cdp.mjs';
import { mkdirSync } from 'node:fs';

const R = []; const ok = (c, n, d = '') => { R.push([c ? 'PASS' : 'FAIL', n, d]); if (process.env.VERBOSE) console.log(`${c ? '✅' : '❌'} ${n}${d ? '  —  ' + d : ''}`); };
process.on('uncaughtException', e => { console.log('\n!! aborted:', e.message); const pass=R.filter(r=>r[0]==='PASS').length; console.log(`${pass} passed, ${R.length-pass} failed so far`); process.exit(2); });
const PAGES = ['index.html','contact.html','terms.html','privacy.html',
               'cinderella.html','hermes.html','socrates.html','book.html','404.html','offline.html'];
mkdirSync('tests/shots', { recursive: true });

const h = await launch(); const p = await newPage();
const fresh = async (pg, theme = 'light', lang = 'en') => {
  await p.goto(`${BASE}/${pg}`);
  await p.eval(`localStorage.setItem('nb-theme','${theme}');localStorage.setItem('nb-lang','${lang}');return 1;`);
  await p.goto(`${BASE}/${pg}`); p.clearConsole();
  // Smooth scrolling is for people; under a loaded machine it outlasts a click.
  await p.eval(`document.documentElement.style.scrollBehavior='auto'; return 1;`);
};

/* ─── 1. interactive elements (home, 1440) ─────────────────────────── */
await p.setViewport(1440, 900); await fresh('index.html');
{
  const a = await p.eval(`return document.documentElement.dataset.theme;`);
  await p.clickSel('.nb-theme-btn'); await p.eval(`await new Promise(s=>setTimeout(s,450)); return 1;`);
  const b = await p.eval(`return {t:document.documentElement.dataset.theme, ls:localStorage.getItem('nb-theme')};`);
  ok(a !== b.t && b.ls === b.t, 'Dark-mode toggle flips and persists', `${a} -> ${b.t}`);
  await p.clickSel('.nb-theme-btn');

  await p.clickSel('.nb-search-btn'); await p.type('.nb-search input', 'plans');
  const s = await p.eval(`await new Promise(s=>setTimeout(s,150)); return {open:document.querySelector('.nb-search').dataset.open, n:document.querySelectorAll('.nb-search-item').length};`);
  ok(s.open === 'true' && s.n > 0, 'Search opens and returns results', `${s.n} hits`);
  await p.key('Escape', 'Escape', 27);
  ok((await p.eval(`return document.querySelector('.nb-search').dataset.open;`)) === 'false', 'Escape closes search');

  ok((await p.eval(`return document.querySelectorAll('.door-card').length;`)) === 3, 'Three doors present');
  await p.clickSel('.door-card .door', { index: 2 });
  ok(await p.eval(`return document.querySelectorAll('.door-card')[2].classList.contains('open');`), 'Socrates door opens');
  await p.clickSel('.door-card.open .door-close');
  ok(await p.eval(`return !document.querySelector('.door-card.open');`), 'Door closes');

  // Needs picker: ticks choose ONE suggestion and travel to the booking link.
  const np = await p.eval(`
    const tick=v=>{const b=document.querySelector('#needsGrid input[value="'+v+'"]');b.checked=!b.checked;b.dispatchEvent(new Event('change',{bubbles:true}))};
    const shown=()=>[...document.querySelectorAll('.needs-fit')].filter(e=>!e.hidden).map(e=>e.dataset.fit).join(',');
    const href=()=>document.getElementById('needsCta').getAttribute('href');
    const out={empty:shown()===''&&href()==='book.html'&&!document.getElementById('needsEmpty').hidden};
    tick('invoices'); out.one=shown(); out.oneHref=href();
    tick('replies');  out.two=shown();
    tick('training'); out.three=shown(); out.threeHref=href();
    tick('invoices'); tick('replies'); tick('training'); out.cleared=shown()===''&&href()==='book.html';
    return out;`);
  ok(np.empty && np.cleared, 'Needs picker: nothing ticked shows the plain booking link');
  ok(np.one === 'chaser' && /plan=Payment%20Chaser&needs=Chasing%20late%20invoices/.test(np.oneHref), 'Needs picker: late invoices alone suggests the Payment Chaser', np.oneHref);
  ok(np.two === 'starter' && np.three === 'growth' && /plan=Growth%20bundle/.test(np.threeHref), 'Needs picker: two practices suggest Starter, three suggest Growth', `${np.two} / ${np.three}`);

  const c = await p.eval(`
    const s=(id,v)=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input'))};
    s('invIn',30);s('valIn',400);s('lateIn',21);s('cutIn',10);
    await new Promise(r=>setTimeout(r,1600));
    return {out:document.getElementById('calcOut').textContent, rel:document.getElementById('releasedOut').textContent};`);
  ok(c.out === '$8,400' && c.rel === '$4,000', 'Receivables calculator: 30x$400x21/30=$8,400; 10 days recovered=$4,000', `${c.out} / ${c.rel}`);

  const y = await p.eval(`
    document.querySelector('.bill-toggle button[data-bill="y"]').click(); await new Promise(s=>setTimeout(s,700));
    return [...document.querySelectorAll('.tier')].map(t=>{
      const annual=+t.querySelector('.tprice .by').textContent.replace(/\\D/g,'');
      const unit=getComputedStyle(t.querySelector('.py')).display!=='none' && getComputedStyle(t.querySelector('.pm')).display==='none';
      return annual>0 && unit && !t.querySelector('.yt-was') && !t.querySelector('.yt-save'); });`);
  ok(y.every(Boolean), 'Yearly pricing: annual total, unit /year, no struck price, no savings pill', y.join(','));

  await p.clickSel('#langBtn');
  ok((await p.eval(`return document.documentElement.dataset.lang;`)) === 'es', 'Language toggle switches to Spanish');
  await p.clickSel('#langBtn');

  const bt = await p.eval(`window.scrollTo(0,2400); await new Promise(s=>setTimeout(s,350)); return document.querySelector('.nb-top').dataset.show;`);
  ok(bt === 'true', 'Back-to-top appears after scrolling');
  await p.clickSel('.nb-top');
  ok((await p.eval(`await new Promise(s=>setTimeout(s,2500)); return window.scrollY;`)) < 50, 'Back-to-top returns to top');

  ok(await p.eval(`return !!document.querySelector('.nb-fab[href="book.html"]');`), 'Floating button links to the booking page');
  await p.clickSel('[data-nb-delete]');
  ok(await p.eval(`return !!document.querySelector('.nb-modal[data-open="true"]');`), 'Delete-my-data asks for confirmation first');
  await p.clickSel('.nb-modal-row .nb-btn:not(.nb-btn--danger)');
}

/* ─── 2. mobile menu (375) ─────────────────────────────────────────── */
await p.setViewport(375, 812); await fresh('index.html');
{
  await p.clickSel('.nb-burger');
  const d = await p.eval(`return {open:document.querySelector('.nb-drawer').dataset.open, links:document.querySelectorAll('.nb-drawer-link').length};`);
  ok(d.open === 'true' && d.links >= 5, 'Mobile drawer opens with nav links', `${d.links} links`);
  await p.key('Escape', 'Escape', 27);
  ok((await p.eval(`return document.querySelector('.nb-drawer').dataset.open;`)) === 'false', 'Escape closes drawer');
}

/* ─── 3. contact form: empty / garbage / valid ─────────────────────── */
await p.setViewport(1440, 900); await fresh('contact.html');
{
  await p.clickSel('#ctSubmit');
  const e = await p.eval(`await new Promise(s=>setTimeout(s,250)); return {inv:document.querySelectorAll('.nb-field[data-invalid="true"]').length, succ:document.getElementById('ctSuccess').dataset.show==='true', focus:document.activeElement.id};`);
  ok(e.inv === 3 && !e.succ && e.focus === 'ct-name', 'Empty submit: 3 fields flagged, no success, focus on first', `${e.inv} flagged, focus=${e.focus}`);
  await p.eval(`document.getElementById('ct-name').value='x';document.getElementById('ct-email').value='not@@mail';document.getElementById('ct-msg').value='short';return 1;`);
  await p.clickSel('#ctSubmit');
  const g = await p.eval(`await new Promise(s=>setTimeout(s,250)); return ['f-name','f-email','f-msg'].every(id=>document.getElementById(id).dataset.invalid==='true') && document.getElementById('ctSuccess').dataset.show!=='true';`);
  ok(g, 'Garbage submit: all three rejected, no success');
  // The endpoint is real now. Stub fetch for this one step so the suite
  // exercises the success path without sending a message every run.
  await p.eval(`window.__posted=null; window.fetch=async(u,o)=>{window.__posted={url:String(u),method:o&&o.method}; return {ok:true,status:200,json:async()=>({success:'true'})}}; return 1;`);
  await p.eval(`document.getElementById('ct-name').value='Pierce Test';document.getElementById('ct-email').value='pierce@example.com';document.getElementById('ct-msg').value='A message long enough to pass validation.';return 1;`);
  await p.clickSel('#ctSubmit');
  const posted = await p.eval(`await new Promise(s=>setTimeout(s,300)); return window.__posted;`);
  ok(posted && /formsubmit\.co\/ajax\//.test(posted.url) && posted.method==='POST', 'Valid submit POSTs to the FormSubmit endpoint', posted ? posted.url : 'no request');
  const v = await p.eval(`await new Promise(s=>setTimeout(s,900)); return document.getElementById('ctSuccess').dataset.show==='true' && document.getElementById('ctForm').style.display==='none';`);
  ok(v, 'Valid submit: success state replaces the form');
  await fresh('contact.html?branch=hermes');
  ok((await p.eval(`return document.querySelector('input[name=branch]:checked').value;`)).startsWith('Hermes'), '?branch=hermes preselects the branch');
}

/* ─── 3b. booking form: on-page, plan prefilled, posts to FormSubmit ─── */
await fresh('book.html?plan=Scale+bundle&needs=Chasing+late+invoices%2C+Missed+calls');
{
  ok((await p.eval(`return document.getElementById('bk-plan').value;`)) === 'Scale bundle', 'Booking form carries the chosen plan');
  const bk = await p.eval(`
    const f=document.getElementById('schedFrame'), alt=document.getElementById('bkAlt');
    return {src:f.getAttribute('src')||'', frameShown:getComputedStyle(f).display!=='none',
      frameFirst:f.getBoundingClientRect().top < alt.getBoundingClientRect().top,
      folded:!alt.open, needs:document.getElementById('bk-needs').value,
      chips:!document.getElementById('planChip').hidden && document.getElementById('needsName').textContent==='Chasing late invoices, Missed calls',
      fab:(()=>{const b=document.querySelector('.nb-fab');return !b||getComputedStyle(b).display==='none'})()};`);
  ok(/^https:\/\/cal\.com\//.test(bk.src) && /notes=Plan/.test(bk.src) && bk.frameShown && bk.frameFirst && bk.folded, 'Booking page: calendar shows first, written form folded beneath it', bk.src.slice(0, 80));
  ok(bk.needs === 'Chasing late invoices, Missed calls' && bk.chips, 'Booking page shows and carries the ticked needs');
  ok(bk.fab, 'No floating booking button on the booking page itself');
  await p.eval(`document.getElementById('bkAlt').open=true; await new Promise(s=>setTimeout(s,200)); return 1;`);
  await p.clickSel('#bkSubmit');
  const e = await p.eval(`await new Promise(s=>setTimeout(s,250)); return document.querySelectorAll('#bkForm .nb-field[data-invalid="true"]').length;`);
  ok(e === 3, 'Booking form: empty submit flags name, email, times', `${e} flagged`);
  // The page scrolls to the first error; let that finish before the next click.
  await p.eval(`await new Promise(s=>setTimeout(s,1500)); return 1;`);
  await p.eval(`window.__posted=null; window.fetch=async(u,o)=>{window.__posted={url:String(u),method:o&&o.method}; return {ok:true,status:200,json:async()=>({success:'true'})}}; return 1;`);
  await p.eval(`document.getElementById('bk-name').value='Pierce Test';document.getElementById('bk-email').value='pierce@example.com';document.getElementById('bk-times').value='Tue 10:00 or Wed 15:00 (GMT-5)';return 1;`);
  await p.clickSel('#bkSubmit');
  const v = await p.eval(`await new Promise(s=>setTimeout(s,900)); return {posted:window.__posted, ok:document.getElementById('bkSuccess').dataset.show==='true' && document.getElementById('bkForm').style.display==='none'};`);
  ok(v.posted && /formsubmit\.co\/ajax\//.test(v.posted.url) && v.ok, 'Booking form posts to FormSubmit and shows success without leaving the page', v.posted ? v.posted.url : 'no request');
}

/* ─── 4. responsive: overflow + overlap, three widths ──────────────── */
// 466x678 = iPhone Duo folded · 890x626 = unfolded (landscape) · 445x626 = Split View half
for (const [w, hgt] of [[375, 812], [466, 678], [445, 626], [768, 1024], [890, 626], [1440, 900]]) {
  await p.setViewport(w, hgt);
  for (const pg of PAGES) {
    await fresh(pg);
    const r = await p.eval(`
      await new Promise(s=>setTimeout(s,250)); const over=[];
      document.querySelectorAll('body *').forEach(el=>{ const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||cs.position==='fixed') return;
        const r=el.getBoundingClientRect(); if(r.width===0||r.right<=innerWidth+2) return;
        let p=el.parentElement, clip=false; while(p&&p!==document.body){ if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)){clip=true;break} p=p.parentElement; }
        if(!clip) over.push(el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0]); });
      const b=document.querySelector('.brand')?.getBoundingClientRect(), n=document.querySelector('.nav-right')?.getBoundingClientRect();
      return {sw:document.documentElement.scrollWidth, iw:innerWidth, over:over.slice(0,3), overlap:b&&n&&b.right>n.left+1};`);
    ok(r.sw <= r.iw + 2 && !r.overlap && !r.over.length, `${w}px · ${pg}`, r.over.length ? 'overflow: ' + r.over.join(', ') : r.overlap ? 'nav overlap' : 'clean');
  }
}

/* ─── 5. console errors ────────────────────────────────────────────── */
await p.setViewport(1440, 900);
for (const pg of ['index.html', 'hermes.html', 'contact.html']) {
  await fresh(pg); await p.eval(`await new Promise(s=>setTimeout(s,800)); return 1;`);
  const errs = p.consoleLogs.filter(l => l.level !== 'warning');
  ok(errs.length === 0, `Console clean · ${pg}`, errs.map(e => e.text).join(' | ').slice(0, 160) || 'no errors');
}

/* ─── 6. contrast, both themes, every page ─────────────────────────── */
const AUDIT = `
  const lum=(r,g,b)=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const parse=c=>{const m=String(c).match(/rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,\\s/]+([\\d.]+))?/);return m?{r:+m[1],g:+m[2],b:+m[3],a:m[4]===undefined?1:+m[4]}:null};
  const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const bgOf=el=>{let cur=el,st=[];while(cur&&cur!==document.documentElement){const cs=getComputedStyle(cur);if(cs.backgroundImage&&cs.backgroundImage!=='none')return null;const c=parse(cs.backgroundColor);if(c&&c.a>0){st.push(c);if(c.a===1)break}cur=cur.parentElement}
    const root=parse(getComputedStyle(document.documentElement).backgroundColor)||parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};
    let acc=st.length&&st[st.length-1].a===1?st.pop():root;while(st.length)acc=over(st.pop(),acc);return acc};
  const bad=[],seen=new Set();
  for(const el of document.querySelectorAll('body *')){
    if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1))continue;
    const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||el.closest('[hidden]'))continue;
    const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;
    const fg0=parse(cs.color);const bg=bgOf(el);if(!fg0||!bg)continue;const fg=fg0.a<1?over(fg0,bg):fg0;
    const L1=lum(fg.r,fg.g,fg.b),L2=lum(bg.r,bg.g,bg.b);const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const px=parseFloat(cs.fontSize),bold=(parseInt(cs.fontWeight,10)||400)>=700;const need=(px>=24||(px>=18.66&&bold))?3:4.5;
    if(ratio<need){const k=el.tagName+String(el.className).split(' ')[0]+Math.round(ratio*10);if(!seen.has(k)){seen.add(k);bad.push(el.tagName.toLowerCase()+' '+ratio.toFixed(2)+':1 "'+el.textContent.trim().slice(0,28)+'"')}}
  } return bad;`;
for (const theme of ['light', 'dark']) for (const pg of PAGES) {
  await fresh(pg, theme);
  const bad = await p.eval(`document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));document.getAnimations().forEach(a=>{try{a.finish()}catch(e){}});await new Promise(s=>setTimeout(s,300));${AUDIT}`);
  ok(bad.length === 0, `Contrast · ${theme} · ${pg}`, bad.slice(0, 3).join(' | ') || 'AA everywhere');
}

/* ─── 7. one language at a time ───────────────────────────────────── */
for (const lang of ['en', 'es']) for (const pg of PAGES) {
  await fresh(pg, 'light', lang);
  const leaked = await p.eval(`const hide='${lang}'==='es'?'.en':'.es';return [...document.querySelectorAll(hide)].filter(e=>getComputedStyle(e).display!=='none').length;`);
  ok(leaked === 0, `One language visible · ${lang} · ${pg}`, leaked ? `${leaked} leaked` : 'clean');
}

/* ─── 8. internal links ────────────────────────────────────────────── */
{
  const broken = [];
  for (const pg of PAGES) {
    await fresh(pg);
    const hrefs = await p.eval(`return [...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&!/^(#|mailto|http)/.test(h)))];`);
    for (const href of hrefs) { const r = await fetch(`${BASE}/${href.split('#')[0]}`, { method: 'HEAD' }).catch(() => ({ status: 0 })); if (r.status !== 200) broken.push(`${pg} -> ${href}`); }
  }
  ok(!broken.length, 'All internal links resolve', broken.join(', ') || `${PAGES.length} pages, 0 broken`);
}

/* ─── 8a. videos: files exist, light to load, one plays at a time ──── */
{
  const missing = []; let count = 0;
  for (const pg of ['index.html', 'cinderella.html', 'hermes.html', 'socrates.html']) {
    await fresh(pg);
    const v = await p.eval(`return [...document.querySelectorAll('video.reel-video')].map(v=>({src:v.querySelector('source').getAttribute('src'), poster:v.getAttribute('poster'), pre:v.getAttribute('preload'), txt:!!v.closest('.reel').querySelector('.reel-problem') && !!v.closest('.reel').querySelector('.reel-fix')}));`);
    if (!v.length) missing.push(`${pg}: no videos`);
    for (const r of v) {
      count++;
      for (const f of [r.src, r.poster]) { const s = await fetch(`${BASE}/${f}`, { method: 'HEAD' }).catch(() => ({ status: 0 })); if (s.status !== 200) missing.push(`${pg} -> ${f}`); }
      if (r.pre !== 'none') missing.push(`${pg} ${r.src}: preload should be none`);
      if (!r.txt) missing.push(`${pg} ${r.src}: missing problem or fix text`);
    }
  }
  ok(!missing.length, 'Videos: every file and still exists, loads only on play, has problem + fix text', missing.join(', ') || `${count} videos`);

  await fresh('index.html');
  const one = await p.eval(`
    const vs=[...document.querySelectorAll('video.reel-video')]; vs.forEach(v=>v.muted=true);
    await vs[0].play().catch(()=>{}); await vs[1].play().catch(()=>{}); await new Promise(s=>setTimeout(s,300));
    const r={first:vs[0].paused, second:vs[1].paused}; vs.forEach(v=>v.pause()); return r;`);
  ok(one.first === true && one.second === false, 'Starting a second video pauses the first', JSON.stringify(one));
}

/* ─── 8b. safety: nothing inline can run, and address-bar text stays text ─── */
{
  const loose = [];
  for (const pg of PAGES) {
    await fresh(pg);
    const r = await p.eval(`
      const csp=(document.querySelector('meta[http-equiv="Content-Security-Policy"]')||{}).content||'';
      const scriptSrc=(csp.match(/script-src[^;]*/)||[''])[0];
      const inline=[...document.querySelectorAll('script:not([src])')].filter(s=>s.type!=='application/ld+json').length;
      const handlers=[...document.querySelectorAll('*')].filter(e=>[...e.attributes].some(a=>/^on/i.test(a.name))).length;
      const blank=[...document.querySelectorAll('a[target="_blank"]')].filter(a=>!/noopener/.test(a.rel)).length;
      return {csp:!!csp, unsafe:/unsafe-inline|unsafe-eval/.test(scriptSrc), inline, handlers, blank};`);
    if (!r.csp || r.unsafe || r.inline || r.handlers || r.blank) loose.push(`${pg} ${JSON.stringify(r)}`);
  }
  ok(!loose.length, 'Every page: security policy set, no inline scripts or handlers, new-tab links isolated', loose.join(' | ') || `${PAGES.length} pages`);

  await fresh('book.html?plan=' + encodeURIComponent('<img src=x onerror=window.__xss=1>') + '&needs=' + encodeURIComponent('<script>window.__xss=1</script>'));
  const x = await p.eval(`await new Promise(s=>setTimeout(s,400)); return {xss:window.__xss===1, imgs:document.querySelectorAll('.book-chips img, .book-chips script').length, text:document.getElementById('planName').textContent};`);
  ok(!x.xss && x.imgs === 0 && x.text.startsWith('<img'), 'Booking page treats address-bar text as text, never as code', x.text.slice(0, 40));
}

/* ─── 9. screenshots for the eye ───────────────────────────────────── */
const settle = `document.querySelectorAll('.rv').forEach(e=>e.classList.add('in'));document.getAnimations().forEach(a=>{try{a.finish()}catch(e){}});await new Promise(s=>setTimeout(s,700));return 1;`;
await p.setViewport(1440, 940); await fresh('index.html'); await p.eval(settle); await p.shot('tests/shots/home-1440.png');
await p.eval(`document.getElementById('brands').scrollIntoView();await new Promise(s=>setTimeout(s,700));return 1;`); await p.shot('tests/shots/home-doors.png');
await p.setViewport(375, 812); await fresh('index.html'); await p.eval(settle); await p.shot('tests/shots/home-375.png');

await kill(h);
const pass = R.filter(r => r[0] === 'PASS').length, fail = R.length - pass;
console.log('\n' + '='.repeat(76));
for (const [st, n, d] of R) if (st === 'FAIL' || process.env.VERBOSE) console.log(`${st === 'PASS' ? '✅' : '❌'} ${st}  ${n}${d ? '  —  ' + d : ''}`);
console.log('='.repeat(76)); console.log(`${pass} passed, ${fail} failed, ${R.length} total`);
process.exit(fail ? 1 : 0);
