(function(){
  'use strict';

  /* ==================================================================
     WHERE THE FORM SENDS
     ------------------------------------------------------------------
     FormSubmit delivers straight to the inbox, no account needed. The
     FIRST submission triggers a one-time activation email to that inbox;
     click the link once and every later submission is delivered.

     Set to '' to fall back to a pre-filled email — never a dead end.
     ================================================================== */
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/northbridgeai1@gmail.com';

  var form    = document.getElementById('ctForm');
  var okPanel = document.getElementById('ctSuccess');
  var errBox  = document.getElementById('ctError');
  var submit  = document.getElementById('ctSubmit');
  if(!form) return;

  function isES(){ return document.documentElement.getAttribute('data-lang') === 'es'; }
  function t(en, es){ return isES() ? es : en; }

  /* ---- preselect the branch from ?branch= ------------------------ */
  var MAP = {
    cinderella:  'Cinderella',
    hermes:      'Hermes',
    socrates:    'Socrates'
  };
  try{
    var want = (new URLSearchParams(location.search).get('branch') || '').toLowerCase();
    if(MAP[want]){
      Array.prototype.forEach.call(form.elements.branch, function(r){
        if(r.value.indexOf(MAP[want]) === 0) r.checked = true;
      });
    }
  }catch(e){}

  /* ---- character counter ----------------------------------------- */
  var msg = document.getElementById('ct-msg');
  var count = document.getElementById('ct-count');
  if(msg && count){
    var num = count.querySelector('span');
    var tick = function(){
      num.textContent = msg.value.length;
      count.setAttribute('data-over', msg.value.length > 1900 ? 'true' : 'false');
    };
    msg.addEventListener('input', tick);
    tick();
  }

  /* ---- validation ------------------------------------------------- */
  /* Trimmed, length-capped, and re-checked on the way out. The server side
     (Formspree) validates again; this is for the human, not for security. */
  var RULES = [
    { field:'f-name',  input:'ct-name',  test:function(v){ return v.length >= 2 && v.length <= 80; } },
    { field:'f-email', input:'ct-email', test:function(v){ return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && v.length <= 140; } },
    { field:'f-msg',   input:'ct-msg',   test:function(v){ return v.length >= 10 && v.length <= 2000; } }
  ];

  function check(rule, showIt){
    var wrap = document.getElementById(rule.field);
    var input = document.getElementById(rule.input);
    var ok = rule.test((input.value || '').trim());
    if(showIt) wrap.setAttribute('data-invalid', ok ? 'false' : 'true');
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  RULES.forEach(function(r){
    var input = document.getElementById(r.input);
    /* validate on blur, then live once it has been flagged — so nobody is
       told they're wrong while still typing the first character */
    input.addEventListener('blur', function(){ check(r, true); });
    input.addEventListener('input', function(){
      if(document.getElementById(r.field).getAttribute('data-invalid') === 'true') check(r, true);
    });
  });

  function showError(detail){
    var d = errBox.querySelector('.ct-error-detail');
    d.textContent = ' ' + detail;
    errBox.setAttribute('data-show', 'true');
    errBox.scrollIntoView({behavior:'smooth', block:'center'});
  }

  /* ---- submit ------------------------------------------------------ */
  form.addEventListener('submit', function(e){
    e.preventDefault();
    errBox.setAttribute('data-show', 'false');

    /* honeypot: a bot filled the hidden field — pretend it worked */
    if(form.elements._honey && form.elements._honey.value){
      form.style.display = 'none';
      okPanel.setAttribute('data-show', 'true');
      return;
    }

    var bad = RULES.filter(function(r){ return !check(r, true); });
    if(bad.length){
      var first = document.getElementById(bad[0].input);
      first.focus();
      first.scrollIntoView({behavior:'smooth', block:'center'});
      if(window.nbToast) window.nbToast(t('Check the highlighted fields', 'Revisa los campos marcados'));
      return;
    }

    /* attach the UTM captured when they first landed */
    var utm = (window.nbGetUTM && window.nbGetUTM()) || {};
    var src = Object.keys(utm).map(function(k){ return k + '=' + utm[k]; }).join(' | ');
    document.getElementById('ct-source').value = src || '(direct)';

    var branch = form.elements.branch.value || 'NorthBridge';
    document.getElementById('ct-subject').value = 'Website enquiry · ' + branch;

    submit.setAttribute('data-busy', 'true');
    submit.disabled = true;

    var done = function(){ submit.removeAttribute('data-busy'); submit.disabled = false; };

    /* No endpoint configured → fall back to a pre-filled email so the
       visitor is never stranded. */
    if(!FORM_ENDPOINT){
      var body =
        t('Branch: ', 'Rama: ') + branch + '\n' +
        t('Name: ', 'Nombre: ') + form.elements.name.value + '\n' +
        t('Email: ', 'Correo: ') + form.elements.email.value + '\n' +
        (form.elements.company.value ? t('Business: ', 'Negocio: ') + form.elements.company.value + '\n' : '') +
        t('Reply in: ', 'Responder en: ') + form.elements.reply_language.value + '\n\n' +
        form.elements.message.value + '\n\n---\n' + src;
      window.location.href = 'mailto:northbridgeai1@gmail.com?subject=' +
        encodeURIComponent('Website enquiry · ' + branch) + '&body=' + encodeURIComponent(body);
      setTimeout(function(){
        done();
        form.style.display = 'none';
        okPanel.setAttribute('data-show', 'true');
      }, 600);
      return;
    }

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function(){ return {}; });
    }).then(function(){
      done();
      form.style.display = 'none';
      okPanel.setAttribute('data-show', 'true');
      okPanel.scrollIntoView({behavior:'smooth', block:'center'});
      if(window.gtag) window.gtag('event', 'generate_lead', {branch: branch});
    }).catch(function(err){
      done();
      /* The form service is unreachable: hand the visitor a ready-to-send email
         so the message is never lost. */
      var mailBody =
        t('Branch: ', 'Rama: ') + branch + '\n' +
        t('Name: ', 'Nombre: ') + form.elements.name.value + '\n' +
        t('Email: ', 'Correo: ') + form.elements.email.value + '\n' +
        (form.elements.company.value ? t('Business: ', 'Negocio: ') + form.elements.company.value + '\n' : '') +
        t('Reply in: ', 'Responder en: ') + form.elements.reply_language.value + '\n\n' +
        form.elements.message.value + '\n\n---\n' + src;
      var d = errBox.querySelector('.ct-error-detail');
      d.textContent = ' ' + t('Our form service is not answering right now. ', 'El servicio del formulario no responde ahora mismo. ');
      var a = document.createElement('a');
      a.href = 'mailto:northbridgeai1@gmail.com?subject=' + encodeURIComponent('Website enquiry · ' + branch) + '&body=' + encodeURIComponent(mailBody);
      a.textContent = t('Email this message instead', 'Envía este mensaje por correo');
      d.appendChild(a);
      errBox.setAttribute('data-show', 'true');
      errBox.scrollIntoView({behavior:'smooth', block:'center'});
      if(window.console) console.warn('Contact form:', err.message);
    });
  });
})();
