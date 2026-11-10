/* NorthBridge  ·  boot.js
   The one script that runs BEFORE the page paints, on every page.
   Keep it tiny: it blocks rendering while it loads. */
/* Theme applied before first paint so dark-mode visitors never see a white flash. */
(function(){try{var s=localStorage.getItem('nb-theme');
var m=s||((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');
document.documentElement.setAttribute('data-theme',m);
if(m==='dark'){var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute('content','#121614');}
}catch(e){}
/* Set before first paint so hero content animates in from hidden instead of
   flashing visible and then moving. Purely additive: without it the CSS
   simply never fires and everything renders in its final state. */
try{document.documentElement.classList.add('nb-anim');}catch(e){}})();
