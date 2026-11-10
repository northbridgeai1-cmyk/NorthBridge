/* ==========================================================================
   NorthBridge home page behaviour  ·  home.js
   Only index.html loads this file. Each block below is independent; the
   "----" comment above a block names the part of the page it drives:

     language        the EN / ES button
     scroll reveal   sections fade in as they enter the screen
     needs picker    "Bring the work that eats your week" tick boxes
     plan builder    "None of these fit? Build your own" counters
     billing toggle  Monthly / Yearly prices
     three doors     Cinderella / Socrates / Hermes door cards
     progress bar    thin line at the top that grows as you scroll
     calculator      "Work out what late invoices are costing you"
     hero canvas     drifting dots behind the headline

   Nothing here sends data anywhere. Forms live in book.js and contact.js.
   ========================================================================== */
(function(){
  /* ---- language ---- */
  var btn = document.getElementById('langBtn');
  var root = document.documentElement;
  function apply(lang){
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    btn.textContent = lang === 'es' ? 'EN' : 'ES';
    try{ localStorage.setItem('nb-lang', lang); }catch(e){}
  }
  var saved = null;
  try{ saved = localStorage.getItem('nb-lang'); }catch(e){}
  if(!saved){
    saved = (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }
  apply(saved);
  btn.addEventListener('click', function(){
    apply(root.getAttribute('data-lang') === 'es' ? 'en' : 'es');
  });

  /* ---- scroll reveal ---- */
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, {threshold:.12});
    document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); });
  }

  /* ---- needs picker ----
     Each tick box in #needsGrid carries data-practice (cinderella, hermes or
     socrates) and data-label (short English name). We count ticks per
     practice, show ONE matching suggestion from the .needs-fit blocks already
     written in index.html, and add the ticks to the booking link so they
     arrive on book.html. Prices and wording live in index.html, not here. */
  var needsGrid = document.getElementById('needsGrid');
  if(needsGrid){
    var needBoxes = needsGrid.querySelectorAll('input[type="checkbox"]');
    var needsCta = document.getElementById('needsCta');
    var FIT_PLAN = {            /* suggestion shown  ->  plan name sent to the booking page */
      chaser:'Payment Chaser', cinderella:'Cinderella', hermes:'Hermes',
      socrates:'Socrates', starter:'Starter bundle', growth:'Growth bundle'
    };
    var pickFit = function(picked){
      var has = {cinderella:false, hermes:false, socrates:false};
      picked.forEach(function(b){ has[b.getAttribute('data-practice')] = true; });
      var practices = (has.cinderella?1:0) + (has.hermes?1:0) + (has.socrates?1:0);
      if(practices === 0) return null;
      if(practices === 1){
        if(has.hermes) return 'hermes';
        if(has.socrates) return 'socrates';
        /* only late invoices ticked: the single-workflow plan is enough */
        return (picked.length === 1 && picked[0].value === 'invoices') ? 'chaser' : 'cinderella';
      }
      /* two or more practices: a bundle. Starter has no training in it. */
      return has.socrates ? 'growth' : 'starter';
    };
    var syncNeeds = function(){
      var picked = Array.prototype.filter.call(needBoxes, function(b){
        b.closest('.need').classList.toggle('on', b.checked);   /* orange 'ticked' look */
        return b.checked;
      });
      var fit = pickFit(picked);
      document.querySelectorAll('.needs-fit').forEach(function(el){
        el.hidden = el.getAttribute('data-fit') !== fit;
      });
      document.getElementById('needsEmpty').hidden = !!fit;
      document.getElementById('needsCaveat').hidden = !fit;
      document.getElementById('needsCarry').hidden = !fit;
      var href = 'book.html';
      if(fit){
        var labels = picked.map(function(b){ return b.getAttribute('data-label'); });
        href += '?plan=' + encodeURIComponent(FIT_PLAN[fit]) + '&needs=' + encodeURIComponent(labels.join(', '));
      }
      needsCta.setAttribute('href', href);
    };
    Array.prototype.forEach.call(needBoxes, function(b){ b.addEventListener('change', syncNeeds); });
    syncNeeds();
  }

  /* ---- custom plan builder ---- */
  var counts = {workflows:2, channels:1, workshops:1};
  var limits = {min:0, max:10};
  var cta = document.getElementById('customCta');
  function refresh(){
    Object.keys(counts).forEach(function(k){
      var el = document.getElementById('v-'+k);
      if(el) el.textContent = counts[k];
    });
    var es = root.getAttribute('data-lang') === 'es';
    var subject = es ? 'Plan personalizado' : 'Custom plan';
    var body = es
      ? 'Hola NorthBridge,\n\nQuiero un plan personalizado con:\n- ' + counts.workflows + ' flujos de trabajo\n- ' + counts.channels + ' canales de comunicación automatizados\n- ' + counts.workshops + ' talleres por trimestre\n\nMi negocio: '
      : 'Hi NorthBridge,\n\nI want a custom plan with:\n- ' + counts.workflows + ' workflows\n- ' + counts.channels + ' communication channels automated\n- ' + counts.workshops + ' workshops per quarter\n\nMy business: ';
    if(cta) cta.href = 'mailto:northbridgeai1@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  document.querySelectorAll('.counter button').forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.getAttribute('data-k');
      var d = parseInt(b.getAttribute('data-d'), 10);
      counts[k] = Math.min(limits.max, Math.max(limits.min, counts[k] + d));
      refresh();
    });
  });
  btn.addEventListener('click', refresh);
  refresh();

  /* ---- billing toggle ---- */
  var plansSec = document.querySelector('.plans');
  document.querySelectorAll('.bill-toggle button').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.bill-toggle button').forEach(function(x){ x.classList.remove('on'); });
      b.classList.add('on');
      if(plansSec) plansSec.setAttribute('data-bill', b.getAttribute('data-bill'));
    });
  });

  /* ---- the three doors ---- */
  document.querySelectorAll('.door-card .door').forEach(function(d){
    function openDoor(){
      var c = d.closest('.door-card');
      c.classList.add('open');
      d.setAttribute('aria-expanded', 'true');
    }
    d.addEventListener('click', openDoor);
    d.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openDoor(); }
    });
  });
  document.querySelectorAll('.door-close').forEach(function(b){
    b.addEventListener('click', function(e){
      e.preventDefault();
      var c = b.closest('.door-card');
      c.classList.remove('open');
      var d = c.querySelector('.door');
      if(d) d.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---- scroll progress bar ---- */
  var bar = document.createElement('div');
  bar.id = 'progress';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }, {passive:true});

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- receivables calculator ----
     Computes cash the visitor already has trapped in unpaid invoices, from
     their own three inputs. The "released" figure only appears once the
     visitor moves the recovery slider themselves, and it is their number,
     not a NorthBridge promise. */
  var invIn  = document.getElementById('invIn');
  var valIn  = document.getElementById('valIn');
  var lateIn = document.getElementById('lateIn');
  var cutIn  = document.getElementById('cutIn');
  var calcOut = document.getElementById('calcOut');
  var releasedWrap = document.getElementById('releasedWrap');
  var releasedOut  = document.getElementById('releasedOut');
  var shownVal = 0;
  var calcRAF = null;

  function fmt(n){
    var es = root.getAttribute('data-lang') === 'es';
    return '$' + Math.round(n).toLocaleString(es ? 'es-ES' : 'en-US');
  }

  function trapped(){
    var monthly = parseInt(invIn.value, 10) * parseInt(valIn.value, 10);
    return monthly * (parseInt(lateIn.value, 10) / 30);
  }

  function calc(animate){
    if(!invIn || !valIn || !lateIn || !calcOut) return;

    document.getElementById('invOut').textContent  = invIn.value;
    document.getElementById('valOut').textContent  = parseInt(valIn.value,10).toLocaleString('en-US');
    document.getElementById('lateOut').textContent = lateIn.value;

    /* recovery can never exceed the lateness it is recovering from */
    if(parseInt(cutIn.value,10) > parseInt(lateIn.value,10)) cutIn.value = lateIn.value;
    cutIn.max = lateIn.value;
    var cut = parseInt(cutIn.value, 10);
    document.getElementById('cutOut').textContent = cut;

    var target = trapped();

    if(cut > 0){
      var monthly = parseInt(invIn.value,10) * parseInt(valIn.value,10);
      var released = monthly * (cut / 30);
      releasedWrap.hidden = false;
      document.getElementById('cutEcho').textContent = cut;
      var esEcho = document.querySelector('.cut-echo-es');
      if(esEcho) esEcho.textContent = cut;
      releasedOut.textContent = fmt(released);
    } else {
      releasedWrap.hidden = true;
    }

    if(calcRAF){ cancelAnimationFrame(calcRAF); calcRAF = null; }
    if(!animate || reducedMotion){
      shownVal = target;
      calcOut.textContent = fmt(target);
      return;
    }
    var start = shownVal, t0 = null;
    calcOut.classList.add('bump');
    setTimeout(function(){ calcOut.classList.remove('bump'); }, 220);
    function step(ts){
      if(t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / 350);
      var eased = 1 - Math.pow(1 - p, 3);
      shownVal = start + (target - start) * eased;
      calcOut.textContent = fmt(shownVal);
      if(p < 1){ calcRAF = requestAnimationFrame(step); }
      else { calcRAF = null; shownVal = target; calcOut.textContent = fmt(target); }
    }
    calcRAF = requestAnimationFrame(step);
  }

  if(invIn && valIn && lateIn && cutIn){
    [invIn, valIn, lateIn, cutIn].forEach(function(el){
      el.addEventListener('input', function(){ calc(true); });
    });
    btn.addEventListener('click', function(){ setTimeout(function(){ calc(false); }, 0); });
    calc(false);

    /* Count the figure in the first time the section is seen. Driven through
       the same calc() as everything else, so there is only ever one animator
       writing to this node. */
    /* Observe the figure itself, not the section: the section is taller than
       a laptop viewport, so a 40% threshold on it never fires. */
    var pilot = calcOut;
    if(pilot && 'IntersectionObserver' in window && !reducedMotion){
      var pio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(!e.isIntersecting) return;
          pio.disconnect();
          shownVal = 0;
          calc(true);
        });
      }, {threshold:.85});
      pio.observe(pilot);
    }
  }

  /* ---- hero network canvas ---- */
  var cv = document.getElementById('net');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(cv && cv.getContext && !reduced){
    var ctx = cv.getContext('2d');
    var pts = [], W, H, N;
    function size(){
      W = cv.width = cv.offsetWidth;
      H = cv.height = cv.offsetHeight;
      N = Math.max(28, Math.min(70, Math.floor(W / 22)));
      pts = [];
      for(var i=0;i<N;i++){
        pts.push({
          x: Math.random()*W, y: Math.random()*H,
          vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
          r: 1.2 + Math.random()*1.8
        });
      }
    }
    function tick(){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<N;i++){
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if(p.x < 0 || p.x > W) p.vx *= -1;
        if(p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(130,210,160,.7)';
        ctx.fill();
        for(var j=i+1;j<N;j++){
          var q = pts[j];
          var dx = p.x-q.x, dy = p.y-q.y, d2 = dx*dx+dy*dy;
          if(d2 < 130*130){
            ctx.beginPath();
            ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
            ctx.strokeStyle = 'rgba(46,125,79,' + (0.16 * (1 - d2/(130*130))).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(tick);
    }
    size();
    window.addEventListener('resize', size);
    tick();
  }
})();
