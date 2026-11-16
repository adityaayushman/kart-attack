(function () {
  'use strict';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.CCK, wipe = document.querySelector('.wipe'), hero = document.querySelector('.hero');
  // every "Take the grid" button drops into the game behind a door wipe
  function launch(e) {
    if (!G) return;
    if (e && e.preventDefault) e.preventDefault();
    if (REDUCED) { G.open(); return; }
    wipe.className = 'wipe shut';
    setTimeout(function () { G.open(); wipe.className = 'wipe shut open'; }, 430);
    setTimeout(function () { wipe.className = 'wipe'; }, 1000);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-play]'), function (a) { a.addEventListener('click', launch); });
  if (G) G.onPlay = launch;
  // replaying the start plays the lights and the launch out loud
  var timers = [];
  var rp = document.getElementById('replay');
  if (rp) rp.addEventListener('click', function () {
    if (!G) return;
    G.initAudio(); timers.forEach(clearTimeout); timers = [];
    for (var i = 0; i < 5; i++) timers.push(setTimeout(function () { G.sfx('beep', 440); }, 350 + i * 420));
    timers.push(setTimeout(function () { G.sfx('go'); G.sfx('roar'); }, 2600));
    timers.push(setTimeout(function () { G.sfx('boost'); }, 3900));
  });
  if (REDUCED) return;
  // the hero drifts apart as you scroll away
  var ticking = false;
  addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; var y = Math.min(window.scrollY || 0, 900); hero.style.setProperty('--sy', y.toFixed(0)); });
  }, { passive: true });
  // karts roll into their grid boxes
  var slots = document.getElementById('slots');
  if (slots && 'IntersectionObserver' in window) {
    Array.prototype.forEach.call(slots.children, function (li, i) { li.style.setProperty('--n', i); });
    slots.classList.add('pre');
    new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { slots.classList.add('in'); ob.disconnect(); } }, { threshold: 0.2 }).observe(slots);
  }
})();
