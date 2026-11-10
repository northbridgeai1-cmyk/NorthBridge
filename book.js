/* ==========================================================================
   NorthBridge booking page behaviour  ·  book.js
   Only book.html loads this file. It does three things, top to bottom:

     1. Reads what the visitor chose on the way here (plan and ticked needs).
     2. Shows the calendar, if a scheduler link is set below.
     3. Runs the written "send us times" form.

   THE TWO SETTINGS YOU MAY NEED TO CHANGE ARE RIGHT HERE.
   ========================================================================== */

/* ▼▼ YOUR SCHEDULER LINK (this is the ONLY place it lives) ▼▼
   A Cal.com event link. Leave the quotes empty ("") to switch the calendar
   off: the page then shows only the written request form and its wording
   changes to match, so it never promises an instant invite it cannot send.
   If you move to a different calendar service, its web address must also be
   added to the "frame-src" part of the security policy line near the top of
   book.html, or the browser will refuse to show it. GUIDE.md explains how. */
var NB_SCHEDULER_URL = "https://cal.com/northbridge-8sqm76/first-meeting";

/* ▼▼ WHERE THE WRITTEN REQUEST FORM IS DELIVERED ▼▼
   FormSubmit forwards each request to this inbox. */
var NB_FORM_ENDPOINT = "https://formsubmit.co/ajax/northbridgeai1@gmail.com";
var NB_EMAIL = "northbridgeai1@gmail.com";

(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function isES() { return document.documentElement.getAttribute('data-lang') === 'es'; }
  function t(en, es) { return isES() ? es : en; }

  /* ---- 1. what the visitor chose -------------------------------------
     Links into this page look like  book.html?plan=Starter+bundle&needs=...
     Anything read from the address bar is treated as plain text only (it is
     written with textContent, never as HTML) and cut to a sensible length. */
  function param(name, max) {
    try {
      var v = new URLSearchParams(location.search).get(name);
      return v ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
    } catch (e) { return ''; }
  }
  var plan = param('plan', 60);
  var needs = param('needs', 300);

  if (plan) { byId('planName').textContent = plan; byId('planChip').hidden = false; }
  if (needs) { byId('needsName').textContent = needs; byId('needsChip').hidden = false; }

  /* A short note that travels with the booking so we arrive prepared. */
  var note = [plan ? 'Plan: ' + plan : '', needs ? 'Wants help with: ' + needs : '']
    .filter(Boolean).join('. ');

  /* ---- 2. the calendar -------------------------------------------------- */
  var live = !!NB_SCHEDULER_URL && NB_SCHEDULER_URL.indexOf('REPLACE_ME') === -1;
  var alt = byId('bkAlt');
  if (live) {
    /* one class switches the mechanism AND the wording that describes it */
    document.documentElement.classList.add('sched-live');
    var url = NB_SCHEDULER_URL;
    if (note) url += (url.indexOf('?') > -1 ? '&' : '?') + 'notes=' + encodeURIComponent(note);
    byId('schedOpen').href = url;
    byId('schedReady').style.display = 'block';
    byId('schedFallback').style.display = 'none';
    var frame = byId('schedFrame');
    frame.src = url;
    frame.style.display = 'block';
  } else if (alt) {
    alt.open = true;   /* no calendar: the written form is the whole page */
  }

  /* ---- 3. the written request form ------------------------------------- */
  var form = byId('bkForm'), okPanel = byId('bkSuccess'), err = byId('bkError'), btn = byId('bkSubmit');
  if (!form) return;

  byId('bk-plan').value = plan;
  byId('bk-needs').value = needs;
  byId('bk-subject').value = 'Meeting request · ' + (plan || 'NorthBridge');

  /* Which ad or link brought them here, if any (captured by nb.js). */
  var utm = (window.nbGetUTM && window.nbGetUTM()) || {};
  byId('bk-source').value = Object.keys(utm).map(function (k) { return k + '=' + utm[k]; }).join(' | ') || '(direct)';

  /* "Prefer email?" link opens a ready-written email instead. */
  var mail = byId('mailBtn');
  if (mail) {
    var body = 'Hi NorthBridge,\n\nI picked: ' + (plan || '(not sure yet)') +
      (needs ? '\nI want help with: ' + needs : '') +
      '\nTimes that work for me (with timezone):\n1.\n2.\n3.\n\nI prefer: Zoom / Google Meet\n\nMy business: ';
    mail.href = 'mailto:' + NB_EMAIL + '?subject=' + encodeURIComponent((plan ? plan + ': ' : '') + 'First meeting') +
      '&body=' + encodeURIComponent(body);
  }

  /* One rule per required field: f = wrapper id, i = input id, test = is it valid? */
  var RULES = [
    { f: 'bf-name',  i: 'bk-name',  test: function (v) { return v.length >= 2 && v.length <= 80; } },
    { f: 'bf-email', i: 'bk-email', test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && v.length <= 140; } },
    { f: 'bf-times', i: 'bk-times', test: function (v) { return v.length >= 4 && v.length <= 600; } }
  ];
  function check(rule, show) {
    var wrap = byId(rule.f), input = byId(rule.i);
    var ok = rule.test((input.value || '').trim());
    if (show) wrap.setAttribute('data-invalid', ok ? 'false' : 'true');
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  RULES.forEach(function (rule) {
    var input = byId(rule.i);
    input.addEventListener('blur', function () { check(rule, true); });
    input.addEventListener('input', function () {
      if (byId(rule.f).getAttribute('data-invalid') === 'true') check(rule, true);
    });
  });

  function showSuccess() {
    form.style.display = 'none';
    okPanel.setAttribute('data-show', 'true');
    okPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.setAttribute('data-show', 'false');

    /* Spam trap: a hidden field people never see. Bots fill it in; we then
       pretend it worked and send nothing. */
    if (form.elements._honey && form.elements._honey.value) { showSuccess(); return; }

    var bad = RULES.filter(function (rule) { return !check(rule, true); });
    if (bad.length) {
      var first = byId(bad[0].i);
      first.focus();
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.nbToast) window.nbToast(t('Check the highlighted fields', 'Revisa los campos marcados'));
      return;
    }

    btn.setAttribute('data-busy', 'true'); btn.disabled = true;
    var done = function () { btn.removeAttribute('data-busy'); btn.disabled = false; };

    fetch(NB_FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json().catch(function () { return {}; }); })
      .then(function () { done(); showSuccess(); })
      .catch(function () {
        /* The form service did not answer. Offer the same request as an email
           so the visitor's typing is not lost. */
        done();
        var detail = err.querySelector('.bk-error-detail');
        function val(n) { return form.elements[n] ? (form.elements[n].value || '').trim() : ''; }
        var lines = [
          t('Name', 'Nombre') + ': ' + val('name'),
          'Email: ' + val('email'),
          t('Times that suit me', 'Horarios que me sirven') + ': ' + val('times'),
          t('Meet on', 'Reunión en') + ': ' + val('meeting_app'),
          t('Language', 'Idioma') + ': ' + val('language')
        ];
        if (note) lines.push(note);
        detail.textContent = ' ' + t('Our form service is not answering right now. ', 'El servicio del formulario no responde ahora mismo. ');
        var a = document.createElement('a');
        a.href = 'mailto:' + NB_EMAIL + '?subject=' + encodeURIComponent('Meeting request · ' + (plan || 'NorthBridge')) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        a.textContent = t('Email this request instead', 'Envía esta solicitud por correo');
        detail.appendChild(a);
        err.setAttribute('data-show', 'true');
      });
  });
})();
