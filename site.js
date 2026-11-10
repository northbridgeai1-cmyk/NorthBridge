/* NorthBridge  ·  site.js
   Language switch (EN/ES) and scroll-reveal for every page except the home
   page, which has its own copy of both in home.js.
   (The scheduler link lives in ONE place: the top of book.js) */
(function(){
  var btn = document.getElementById('langBtn');
  var root = document.documentElement;
  function apply(lang){
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    if(btn) btn.textContent = lang === 'es' ? 'EN' : 'ES';
    try{ localStorage.setItem('nb-lang', lang); }catch(e){}
  }
  var saved = null;
  try{ saved = localStorage.getItem('nb-lang'); }catch(e){}
  if(!saved){
    saved = (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }
  apply(saved);
  if(btn){
    btn.addEventListener('click', function(){
      apply(root.getAttribute('data-lang') === 'es' ? 'en' : 'es');
    });
  }

  /* scroll reveal */
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

  /* scroll progress bar */
  var bar = document.createElement('div');
  bar.id = 'progress';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }, {passive:true});
})();
