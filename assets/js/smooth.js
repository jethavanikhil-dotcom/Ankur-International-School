/* Smooth, inertial page scrolling (Lenis). Skipped for reduced-motion users. */
(() => {
  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
  window.lenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -10 });
    });
  });
})();
