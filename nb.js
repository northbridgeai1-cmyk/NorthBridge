/* ==========================================================================
   NorthBridge shared behaviour  ·  nb.js
   Loaded with `defer` on every page. Progressive enhancement only: no page
   content is rendered by this file, so nothing here can produce a blank
   screen if it fails. Page markup ships complete in the HTML.
   ========================================================================== */
(function () {
  'use strict';

  /* ====== CONFIG ========================================================= */
  /* Paste a GA4 measurement ID here to switch analytics on. Left empty,
     nothing is loaded and no consent banner appears at all. */
  var NB_GA4_ID = '';

  var EMAIL = 'northbridgeai1@gmail.com';
  var LS = { theme: 'nb-theme', consent: 'nb-consent', lang: 'nb-lang' };

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ====== SMALL HELPERS ================================================== */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }
    catch (e) { return null; }
  }
  function isES() { return root.getAttribute('data-lang') === 'es'; }
  function t(en, es) { return isES() ? es : en; }
  /* Escape before any innerHTML that touches non-literal text. */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICON = {
    moon: '<svg class="nb-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
    sun: '<svg class="nb-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6.5 9-6.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5.2 5.2L20 7"/></svg>'
  };

  /* ====== 1. THEME ======================================================= */
  /* The initial value is applied by a tiny inline script in <head> so there is
     no flash. This only wires the toggle. */
  function setTheme(mode, announce) {
    root.setAttribute('data-theme', mode);
    store(LS.theme, mode);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', mode === 'dark' ? '#121614' : '#fbfaf6');
    $$('.nb-theme-btn').forEach(function (b) {
      b.setAttribute('aria-label', mode === 'dark' ? t('Switch to light mode', 'Cambiar a modo claro') : t('Switch to dark mode', 'Cambiar a modo oscuro'));
      b.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
    });
    if (announce) toast(mode === 'dark' ? t('Dark mode on', 'Modo oscuro activado') : t('Light mode on', 'Modo claro activado'));
  }

  /* ====== 2. HEADER CONTROLS =========================================== */
  function buildHeader() {
    var navRight = $('.nav-right');
    if (!navRight) return;
    var langBtn = $('#langBtn', navRight);

    var search = el('button', {
      type: 'button', class: 'nb-icon-btn nb-search-btn',
      'aria-label': t('Search the site', 'Buscar en el sitio')
    }, ICON.search);

    var theme = el('button', {
      type: 'button', class: 'nb-icon-btn nb-theme-btn', 'aria-pressed': 'false',
      'aria-label': t('Switch to dark mode', 'Cambiar a modo oscuro')
    }, ICON.moon + ICON.sun);

    var burger = el('button', {
      type: 'button', class: 'nb-icon-btn nb-burger', 'aria-expanded': 'false',
      'aria-controls': 'nb-drawer', 'aria-label': t('Open menu', 'Abrir menú')
    }, '<span></span><span></span><span></span>');

    if (langBtn) navRight.insertBefore(search, langBtn); else navRight.appendChild(search);
    if (langBtn) navRight.insertBefore(theme, langBtn); else navRight.appendChild(theme);
    navRight.appendChild(burger);

    theme.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
    search.addEventListener('click', function () { openSearch(); });
    burger.addEventListener('click', function () { toggleDrawer(); });

    setTheme(root.getAttribute('data-theme') || 'light', false);
    root.classList.add('nb-theme-ready');

    /* sticky-header shadow */
    var onScroll = function () {
      var h = $('header');
      if (h) h.classList.toggle('nb-stuck', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ====== 3. MOBILE DRAWER ============================================== */
  /* Built from the links already in the DOM, so it can never drift out of sync
     with the desktop nav. */
  var drawer, lastFocus;
  function buildDrawer() {
    var links = $$('.nav-links a');
    if (!links.length) return;

    drawer = el('div', { class: 'nb-drawer', id: 'nb-drawer', 'data-open': 'false', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Menu', 'Menú') });
    var scrim = el('div', { class: 'nb-drawer-scrim' });
    var panel = el('div', { class: 'nb-drawer-panel' });

    var head = el('div', { class: 'nb-drawer-head' });
    head.appendChild(el('span', { class: 'nb-drawer-title' }, t('Menu', 'Menú')));
    var close = el('button', { type: 'button', class: 'nb-icon-btn', 'aria-label': t('Close menu', 'Cerrar menú') },
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
    head.appendChild(close);
    panel.appendChild(head);

    links.forEach(function (a) {
      var c = a.cloneNode(true);
      c.className = 'nb-drawer-link';
      panel.appendChild(c);
    });

    var foot = el('div', { class: 'nb-drawer-foot' });
    var cta = el('a', { class: 'nb-btn nb-btn--primary', href: 'contact.html' });
    cta.textContent = t('Contact us', 'Contáctanos');
    foot.appendChild(cta);

    /* The header language pill is hidden on the narrowest phones, so the
       drawer carries the language switch there. It just drives the real
       toggle, keeping one source of truth. */
    var langInDrawer = el('button', { type: 'button', class: 'nb-btn nb-drawer-lang' });
    langInDrawer.textContent = t('Español', 'English');
    langInDrawer.addEventListener('click', function (e) {
      e.stopPropagation();
      var real = $('#langBtn');
      if (real) real.click();
      setTimeout(function () { langInDrawer.textContent = t('Español', 'English'); }, 0);
    });
    foot.appendChild(langInDrawer);
    panel.appendChild(foot);

    drawer.appendChild(scrim);
    drawer.appendChild(panel);
    document.body.appendChild(drawer);

    scrim.addEventListener('click', closeDrawer);
    close.addEventListener('click', closeDrawer);
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a') && !e.target.closest('.nb-drawer-lang')) closeDrawer();
    });
  }
  function toggleDrawer() {
    if (!drawer) return;
    drawer.getAttribute('data-open') === 'true' ? closeDrawer() : openDrawer();
  }
  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.setAttribute('data-open', 'true');
    $$('.nb-burger').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    document.body.style.overflow = 'hidden';
    var f = $('.nb-drawer-panel a, .nb-drawer-panel button', drawer);
    if (f) f.focus();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.setAttribute('data-open', 'false');
    $$('.nb-burger').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ====== 4. SITE SEARCH ================================================ */
  var searchUI, searchInput, searchList, activeIdx = -1;
  function buildSearch() {
    searchUI = el('div', { class: 'nb-search', 'data-open': 'false', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Search', 'Buscar') });
    searchUI.appendChild(el('div', { class: 'nb-search-scrim' }));
    var box = el('div', { class: 'nb-search-box' });
    var field = el('div', { class: 'nb-search-field' }, ICON.search);
    searchInput = el('input', {
      type: 'search', autocomplete: 'off', spellcheck: 'false',
      'aria-label': t('Search the site', 'Buscar en el sitio'),
      placeholder: t('Search plans, services, FAQ…', 'Busca planes, servicios, preguntas…')
    });
    field.appendChild(searchInput);
    field.appendChild(el('kbd', {}, 'Esc'));
    box.appendChild(field);
    searchList = el('div', { class: 'nb-search-results', role: 'listbox' });
    box.appendChild(searchList);
    searchUI.appendChild(box);
    document.body.appendChild(searchUI);

    $('.nb-search-scrim', searchUI).addEventListener('click', closeSearch);
    searchInput.addEventListener('input', function () { runSearch(searchInput.value); });
    searchInput.addEventListener('keydown', function (e) {
      var items = $$('.nb-search-item', searchList);
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(items, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(items, -1); }
      else if (e.key === 'Enter' && items[activeIdx]) { e.preventDefault(); items[activeIdx].click(); }
    });
  }
  function moveActive(items, d) {
    if (!items.length) return;
    if (activeIdx >= 0 && items[activeIdx]) items[activeIdx].removeAttribute('data-active');
    activeIdx = (activeIdx + d + items.length) % items.length;
    items[activeIdx].setAttribute('data-active', 'true');
    items[activeIdx].scrollIntoView({ block: 'nearest' });
  }
  function openSearch() {
    if (!searchUI) return;
    searchUI.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    runSearch('');
    setTimeout(function () { searchInput.focus(); }, 30);
  }
  function closeSearch() {
    if (!searchUI) return;
    searchUI.setAttribute('data-open', 'false');
    document.body.style.overflow = '';
    searchInput.value = '';
  }
  function runSearch(q) {
    var data = window.NB_SEARCH || [];
    var lang = isES() ? 'es' : 'en';
    q = (q || '').trim().toLowerCase();
    searchList.textContent = '';
    activeIdx = -1;

    var rows = data.map(function (d) {
      return { url: d.url, section: d[lang].section, title: d[lang].title, body: d[lang].body };
    });

    var hits;
    if (!q) {
      hits = rows.slice(0, 7);
    } else {
      var terms = q.split(/\s+/).filter(Boolean);
      hits = rows.map(function (r) {
        var hay = (r.title + ' ' + r.body + ' ' + r.section).toLowerCase();
        var score = 0, all = true;
        terms.forEach(function (term) {
          var inTitle = r.title.toLowerCase().indexOf(term) > -1;
          var inBody = hay.indexOf(term) > -1;
          if (!inBody) all = false;
          if (inTitle) score += 8;
          if (inBody) score += 2;
        });
        return all ? { r: r, score: score } : null;
      }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8).map(function (x) { return x.r; });
    }

    if (!hits.length) {
      var e = el('div', { class: 'nb-search-empty' });
      e.textContent = t('No matches. Try “plans”, “training” or “pricing”.', 'Sin resultados. Prueba “planes”, “capacitación” o “precios”.');
      searchList.appendChild(e);
      return;
    }

    hits.forEach(function (r) {
      var a = el('a', { class: 'nb-search-item', href: r.url, role: 'option' });
      var kicker = el('em'); kicker.textContent = r.section;
      var title = el('strong'); title.textContent = r.title;
      var body = el('span');
      /* highlight: escape first, then inject only our own <mark> tags */
      var snip = r.body.length > 132 ? r.body.slice(0, 132) + '…' : r.body;
      var safe = esc(snip);
      if (q) {
        q.split(/\s+/).filter(Boolean).forEach(function (term) {
          var re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
          safe = safe.replace(re, '<mark>$1</mark>');
        });
      }
      body.innerHTML = safe;
      a.appendChild(kicker); a.appendChild(title); a.appendChild(body);
      searchList.appendChild(a);
    });
  }

  /* ====== 5. FLOATING CONTROLS ========================================== */
  function buildFloat() {
    var wrap = el('div', { class: 'nb-float' });

    var top = el('button', { type: 'button', class: 'nb-top', 'data-show': 'false', 'aria-label': t('Back to top', 'Volver arriba') }, ICON.up);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      var skip = $('#top') || $('main');
      if (skip) skip.setAttribute('tabindex', '-1'), skip.focus({ preventScroll: true });
    });

    var fab = el('a', { class: 'nb-fab', href: 'contact.html', 'aria-label': t('Contact NorthBridge', 'Contactar a NorthBridge') });
    fab.innerHTML = ICON.mail;
    var lbl = el('span'); lbl.textContent = t('Contact', 'Contacto');
    fab.appendChild(lbl);

    wrap.appendChild(top);
    wrap.appendChild(fab);
    document.body.appendChild(wrap);

    var onScroll = function () { top.setAttribute('data-show', window.scrollY > 620 ? 'true' : 'false'); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* a single, finite nudge — never an infinite loop in the corner of the eye */
    if (!reduced && !sessionStorage.getItem('nb-nudged')) {
      setTimeout(function () {
        fab.classList.add('nb-nudge');
        try { sessionStorage.setItem('nb-nudged', '1'); } catch (e) {}
        setTimeout(function () { fab.classList.remove('nb-nudge'); }, 3400);
      }, 5200);
    }
  }

  /* ====== 6. CONSENT + GA4 ============================================== */
  function loadGA() {
    if (!NB_GA4_ID) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(NB_GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', NB_GA4_ID, { anonymize_ip: true });
  }
  function buildConsent() {
    /* No analytics configured → no banner. A cookie banner with nothing behind
       it is theatre, and it costs a real conversion. */
    if (!NB_GA4_ID) { if (store(LS.consent) === 'yes') loadGA(); return; }
    var prior = store(LS.consent);
    if (prior === 'yes') { loadGA(); return; }
    if (prior === 'no') return;

    var b = el('div', { class: 'nb-cookie', role: 'region', 'aria-label': t('Cookie notice', 'Aviso de cookies') });
    b.innerHTML =
      '<h3>' + esc(t('A quick note on cookies', 'Una nota rápida sobre cookies')) + '</h3>' +
      '<p>' + esc(t('We would like to use Google Analytics to see which pages help and which do not. Nothing is loaded unless you say yes, and we never sell anything.',
        'Nos gustaría usar Google Analytics para ver qué páginas ayudan y cuáles no. No se carga nada a menos que aceptes, y nunca vendemos nada.')) +
      ' <a href="privacy.html">' + esc(t('Privacy', 'Privacidad')) + '</a></p>' +
      '<div class="nb-cookie-row">' +
      '<button type="button" class="nb-btn nb-btn--primary" data-consent="yes">' + esc(t('Accept', 'Aceptar')) + '</button>' +
      '<button type="button" class="nb-btn" data-consent="no">' + esc(t('Decline', 'Rechazar')) + '</button>' +
      '</div>';
    document.body.appendChild(b);
    setTimeout(function () { b.setAttribute('data-open', 'true'); }, 900);
    $$('[data-consent]', b).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-consent');
        store(LS.consent, v);
        b.setAttribute('data-open', 'false');
        if (v === 'yes') loadGA();
        toast(v === 'yes' ? t('Thanks — analytics on', 'Gracias, analítica activada') : t('Declined. Nothing loaded.', 'Rechazado. No se cargó nada.'));
      });
    });
  }

  /* ====== 7. UTM CAPTURE =============================================== */
  /* Captured once on landing, kept for the session, and attached to whatever
     form the visitor eventually submits — so you can see which channel
     actually produced the enquiry. */
  function captureUTM() {
    try {
      var p = new URLSearchParams(location.search), found = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) {
        var v = p.get(k);
        if (v) found[k] = v.slice(0, 120);
      });
      if (Object.keys(found).length) {
        found._landing = location.pathname;
        found._referrer = document.referrer ? document.referrer.slice(0, 200) : '(direct)';
        found._at = new Date().toISOString();
        sessionStorage.setItem('nb-utm', JSON.stringify(found));
      }
    } catch (e) {}
  }
  function getUTM() {
    try { return JSON.parse(sessionStorage.getItem('nb-utm') || '{}'); } catch (e) { return {}; }
  }
  window.nbGetUTM = getUTM;

  /* ====== 8. COPY BUTTONS ============================================== */
  function wireCopy() {
    $$('[data-copy]').forEach(function (btn) {
      if (btn.dataset.nbWired) return;
      btn.dataset.nbWired = '1';
      btn.classList.add('nb-copy');
      btn.type = 'button';
      var val = btn.getAttribute('data-copy') || EMAIL;
      var idle = el('span', { class: 'nb-copy-idle' });
      idle.innerHTML = ICON.copy;
      var it = el('span'); it.textContent = btn.getAttribute('data-copy-label') || t('Copy', 'Copiar');
      idle.appendChild(it);
      var done = el('span', { class: 'nb-copy-done' });
      done.innerHTML = ICON.tick;
      var dt = el('span'); dt.textContent = t('Copied', 'Copiado');
      done.appendChild(dt);
      btn.textContent = '';
      btn.appendChild(idle); btn.appendChild(done);

      btn.addEventListener('click', function () {
        var ok = function () {
          btn.setAttribute('data-done', 'true');
          toast(t('Copied to clipboard', 'Copiado al portapapeles'));
          setTimeout(function () { btn.removeAttribute('data-done'); }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(val).then(ok, fallback);
        } else fallback();
        function fallback() {
          var ta = el('textarea'); ta.value = val;
          ta.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); ok(); } catch (e) { toast(t('Copy failed', 'No se pudo copiar')); }
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* ====== 9. TOAST + CONFIRM MODAL ==================================== */
  var toastHost;
  function toast(msg) {
    if (!toastHost) {
      toastHost = el('div', { class: 'nb-toasts', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastHost);
    }
    var n = el('div', { class: 'nb-toast' });
    n.textContent = msg;
    toastHost.appendChild(n);
    setTimeout(function () {
      n.setAttribute('data-leaving', 'true');
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 320);
    }, 2600);
  }
  window.nbToast = toast;

  function confirmModal(opts, onYes) {
    var m = el('div', { class: 'nb-modal', 'data-open': 'true', role: 'dialog', 'aria-modal': 'true' });
    m.appendChild(el('div', { class: 'nb-modal-scrim' }));
    var box = el('div', { class: 'nb-modal-box' });
    var h = el('h3'); h.textContent = opts.title;
    var p = el('p'); p.textContent = opts.body;
    var row = el('div', { class: 'nb-modal-row' });
    var no = el('button', { type: 'button', class: 'nb-btn' });
    no.textContent = opts.cancel || t('Cancel', 'Cancelar');
    var yes = el('button', { type: 'button', class: 'nb-btn ' + (opts.danger ? 'nb-btn--danger' : 'nb-btn--primary') });
    yes.textContent = opts.confirm || t('Confirm', 'Confirmar');
    row.appendChild(no); row.appendChild(yes);
    box.appendChild(h); box.appendChild(p); box.appendChild(row);
    m.appendChild(box);
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    yes.focus();

    function shut() {
      document.body.style.overflow = '';
      if (m.parentNode) m.parentNode.removeChild(m);
    }
    no.addEventListener('click', shut);
    $('.nb-modal-scrim', m).addEventListener('click', shut);
    yes.addEventListener('click', function () { shut(); onYes(); });
    m.dataset.nbDismiss = '1';
    window.__nbTopModal = { close: shut };
  }
  window.nbConfirm = confirmModal;

  /* ====== 10. DELETE MY DATA ========================================== */
  /* Everything this site stores lives in the visitor's own browser. This
     genuinely removes all of it, including the offline cache. */
  function wireDelete() {
    $$('[data-nb-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        confirmModal({
          title: t('Delete everything stored on this device?', '¿Borrar todo lo guardado en este dispositivo?'),
          body: t('This clears your language and theme choice, your cookie answer, any saved form draft, and the offline copy of the site. It cannot be undone.',
            'Esto borra tu idioma y tema, tu respuesta de cookies, cualquier borrador de formulario guardado, y la copia sin conexión del sitio. No se puede deshacer.'),
          confirm: t('Delete it all', 'Borrar todo'),
          danger: true
        }, function () {
          try { localStorage.clear(); } catch (e) {}
          try { sessionStorage.clear(); } catch (e) {}
          document.cookie.split(';').forEach(function (c) {
            var n = c.split('=')[0].trim();
            if (n) document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
          });
          var done = function () {
            toast(t('Deleted. Reloading…', 'Borrado. Recargando…'));
            setTimeout(function () { location.reload(); }, 1100);
          };
          if (window.caches && caches.keys) {
            caches.keys().then(function (ks) {
              return Promise.all(ks.map(function (k) { return caches.delete(k); }));
            }).then(function () {
              if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
                return navigator.serviceWorker.getRegistrations().then(function (rs) {
                  return Promise.all(rs.map(function (r) { return r.unregister(); }));
                });
              }
            }).then(done, done);
          } else done();
        });
      });
    });
  }

  /* ====== 11. RIPPLE ================================================== */
  function wireRipple() {
    if (reduced) return;
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.btn, .nb-btn, .nb-fab');
      if (!b) return;
      var r = b.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var d = el('span', { class: 'nb-ripple' });
      d.style.width = d.style.height = size + 'px';
      d.style.left = (e.clientX - r.left - size / 2) + 'px';
      d.style.top = (e.clientY - r.top - size / 2) + 'px';
      if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
      b.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 520);
    }, { passive: true });
  }

  /* ====== 12. OFFLINE ================================================= */
  function wireOffline() {
    var badge = el('div', { class: 'nb-offline', role: 'status', 'aria-live': 'polite', 'data-show': 'false' });
    var dot = el('span'); dot.textContent = '●';
    var txt = el('span', { class: 'nb-offline-txt' });
    badge.appendChild(dot); badge.appendChild(txt);
    document.body.appendChild(badge);

    var hideTimer;
    /* Trust the event that fired, not navigator.onLine: that flag can lag the
       event (and lies outright under some proxies), which would show "back
       online" at the exact moment the connection dropped. */
    function sync(isOffline) {
      txt.textContent = isOffline
        ? t('Offline — showing the saved copy', 'Sin conexión, mostrando la copia guardada')
        : t('Back online', 'Conexión restablecida');
      badge.setAttribute('data-show', 'true');
      clearTimeout(hideTimer);
      if (!isOffline) {
        hideTimer = setTimeout(function () { badge.setAttribute('data-show', 'false'); }, 2600);
      }
    }
    window.addEventListener('offline', function () { sync(true); });
    window.addEventListener('online', function () { sync(false); });
    if (!navigator.onLine) sync(true);

    /* Secure contexts only — which includes localhost, so offline support can
       actually be tested before deploying. */
    var secure = location.protocol === 'https:' ||
                 ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) > -1;
    if ('serviceWorker' in navigator && secure) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline is a bonus, never a requirement */ });
      });
    }
  }

  /* ====== 13. PREFETCH ================================================ */
  /* Warm the next page on hover/touch so navigation feels instant and the
     visitor never sits on an empty screen waiting for HTML. */
  function wirePrefetch() {
    if (navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''))) return;
    var seen = {};
    function warm(e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (!/\.html$/.test(href) || href.indexOf('//') > -1 || seen[href]) return;
      seen[href] = 1;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href; l.as = 'document';
      document.head.appendChild(l);
    }
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('touchstart', warm, { passive: true });
  }

  /* ====== 14. GLOBAL KEYS ============================================= */
  function wireKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (window.__nbTopModal && $('.nb-modal[data-open="true"]')) { window.__nbTopModal.close(); window.__nbTopModal = null; return; }
        if (searchUI && searchUI.getAttribute('data-open') === 'true') return closeSearch();
        if (drawer && drawer.getAttribute('data-open') === 'true') return closeDrawer();
      }
      /* ⌘K / Ctrl-K opens search, but never while the visitor is typing */
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        var tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        openSearch();
      }
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault(); openSearch();
      }
    });
  }

  /* ====== 15. LANGUAGE RE-SYNC ======================================== */
  /* The pages own the language toggle; this keeps injected UI in step. */
  function wireLang() {
    var b = $('#langBtn');
    if (!b) return;
    b.addEventListener('click', function () {
      setTimeout(function () {
        setTheme(root.getAttribute('data-theme') || 'light', false);
        var f = $('.nb-fab span'); if (f) f.textContent = t('Contact', 'Contacto');
        var d = $('.nb-drawer-title'); if (d) d.textContent = t('Menu', 'Menú');
        var c = $('.nb-drawer-foot .nb-btn'); if (c) c.textContent = t('Contact us', 'Contáctanos');
        if (searchInput) searchInput.placeholder = t('Search plans, services, FAQ…', 'Busca planes, servicios, preguntas…');
        if (searchUI && searchUI.getAttribute('data-open') === 'true') runSearch(searchInput.value);
      }, 0);
    });
  }

  /* ====== 16. LAST UPDATED ============================================ */
  function wireUpdated() {
    $$('[data-nb-updated]').forEach(function (n) {
      var iso = n.getAttribute('data-nb-updated');
      var d = new Date(iso + 'T00:00:00Z');
      if (isNaN(d)) return;
      var txt = d.toLocaleDateString(isES() ? 'es' : 'en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
      var s = $('.nb-updated-date', n);
      if (s) s.textContent = txt;
    });
  }

  /* ====== 17. COUNT-UP ON SCROLL ======================================
     Prices and headline figures count up the first time they scroll into
     view. The original string is captured before anything is touched and
     written back verbatim at the end, so a parse failure or an interrupted
     animation can never leave a wrong number on screen. */
  function wireCountUp() {
    if (reduced || !('IntersectionObserver' in window)) return;

    var targets = $$('.tprice .n, .big-num').filter(function (el) {
      return /\d/.test(el.textContent);
    });
    if (!targets.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.55 });

    targets.forEach(function (el) { io.observe(el); });

    function countUp(el) {
      var leaves = el.querySelectorAll('span');
      var nodes = leaves.length ? Array.prototype.slice.call(leaves) : [el];

      nodes.forEach(function (n) {
        if (n.querySelector && n.querySelector('span')) return;   /* not a leaf */
        var original = n.textContent;
        var m = original.match(/^(\D*?)([\d,]+)(.*)$/);
        if (!m) return;
        var target = parseInt(m[2].replace(/,/g, ''), 10);
        if (!isFinite(target) || target < 10) return;             /* not worth animating */

        var t0 = null, dur = 700;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          if (p < 1) {
            n.textContent = m[1] + Math.round(target * eased).toLocaleString('en-US') + m[3];
            requestAnimationFrame(step);
          } else {
            n.textContent = original;   /* exact original string, always */
          }
        }
        n.textContent = m[1] + '0' + m[3];
        requestAnimationFrame(step);
      });
    }
  }

  /* ====== BOOT ======================================================== */
  function boot() {
    captureUTM();
    buildHeader();
    buildDrawer();
    buildSearch();
    buildFloat();
    buildConsent();
    wireCopy();
    wireDelete();
    wireRipple();
    wireOffline();
    wirePrefetch();
    wireKeys();
    wireLang();
    wireUpdated();
    wireCountUp();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
