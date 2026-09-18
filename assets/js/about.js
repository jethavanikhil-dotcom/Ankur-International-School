/* =========================================================
   About section
   - sizes the illustrated scene so it never collides with the copy
   - scroll reveal + gentle scroll parallax
   - paper plane that loops along its dashed trail
   ========================================================= */
(() => {
  const section = document.getElementById('about');
  if (!section) return;

  const bg = document.getElementById('aboutBg');
  const scene = document.getElementById('aboutScene');
  const copy = section.querySelector('.about__copy');
  const plane = document.getElementById('aboutPlane');
  const flight = document.getElementById('aboutFlight');
  const path = document.getElementById('aboutPath');
  const trail = document.getElementById('aboutTrail');
  const reveal = document.getElementById('aboutTrailReveal');

  const ART_W = 1983;
  const RATIO = 1983 / 793;
  const SUN_EDGE = 0.43; // left edge of the painted sun's rays, as a fraction of art width
  const PLANE_NOSE = -14.8;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Scene layout ---------------- */
  const box = { left: 0, top: 0, w: 0, h: 0, amt: 0 };

  function layout() {
    const bgW = bg.clientWidth;
    const bgH = bg.clientHeight;
    let W;
    let left;

    if (window.innerWidth < 1180) {
      // stacked: fill the strip, favour the kids + stairs on the right
      W = Math.max(bgW, bgH * 1.06 * RATIO);
      left = Math.max(bgW - W, -0.44 * W);
    } else {
      // side by side: largest art that keeps the sun clear of the copy
      const copyRight = copy.getBoundingClientRect().right - section.getBoundingClientRect().left;
      const cover = Math.max(bgW, bgH * RATIO);
      const maxW = (bgW - copyRight - 16) / (0.97 - SUN_EDGE);
      W = Math.max(Math.min(cover, maxW), bgW * 0.72);
      left = W > bgW ? bgW - W + Math.min(0.03 * W, W - bgW) : bgW - W;
    }

    const H = W / RATIO;
    box.w = W;
    box.h = H;
    box.left = left;
    box.amt = Math.min(22, H * 0.03);
    box.top = bgH - H + box.amt;
    scene.style.width = `${W}px`;
    applyParallax();
  }

  let parallaxY = 0;
  function applyParallax() {
    scene.style.transform = `translate3d(${box.left.toFixed(1)}px, ${(box.top + parallaxY).toFixed(1)}px, 0)`;
  }

  function onScroll() {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
    parallaxY = reduceMotion ? 0 : (0.5 - p) * 2 * box.amt;
    applyParallax();
  }

  new ResizeObserver(layout).observe(bg);
  window.addEventListener('resize', layout);
  window.addEventListener('scroll', onScroll, { passive: true });
  layout();
  onScroll();

  /* ---------------- Reveal ---------------- */
  let visible = false;
  let revealedAt = null;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && revealedAt === null) {
      section.classList.add('is-in');
      revealedAt = performance.now();
    }
  }, { threshold: 0.22 }).observe(section);

  /* ---------------- Paper plane ---------------- */
  const d = path.getAttribute('d');
  trail.setAttribute('d', d);
  reveal.setAttribute('d', d);
  const L = path.getTotalLength();
  reveal.style.strokeDasharray = `${L} ${L}`;
  reveal.style.strokeDashoffset = L;

  function placePlane(pt, angle, scale, opacity) {
    const k = box.w / ART_W;
    const pw = plane.offsetWidth;
    const ph = plane.offsetHeight;
    plane.style.opacity = opacity.toFixed(3);
    plane.style.transform =
      `translate(${(pt.x * k - pw / 2).toFixed(2)}px, ${(pt.y * k - ph / 2).toFixed(2)}px) ` +
      `rotate(${(angle - PLANE_NOSE).toFixed(2)}deg) scale(${scale.toFixed(3)})`;
  }

  function angleAt(len) {
    const a = path.getPointAtLength(Math.min(L, len + 2));
    const b = path.getPointAtLength(Math.max(0, len - 2));
    return Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
  }

  if (reduceMotion) {
    section.classList.add('is-in');
    reveal.style.strokeDashoffset = 0;
    placePlane(path.getPointAtLength(L), angleAt(L), 1, 1);
    return;
  }

  // timeline (ms)
  const FLY = 3600;
  const HOVER = 2200;
  const EXIT = 900;
  const REST = 1300;
  const CYCLE = FLY + HOVER + EXIT + REST;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let cycleStart = null;

  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible || revealedAt === null) { if (cycleStart !== null) cycleStart += 16; return; }
    if (cycleStart === null) {
      if (now - revealedAt < 1500) return;
      cycleStart = now;
    }

    const t = (now - cycleStart) % CYCLE;
    if (t < FLY) {
      if (flight.classList.contains('is-fading')) flight.classList.remove('is-fading');
      const raw = t / FLY;
      const len = easeInOut(raw) * L;
      const pt = path.getPointAtLength(len);
      const bob = Math.sin(now / 240) * 3;
      placePlane({ x: pt.x, y: pt.y + bob }, angleAt(len), lerp(0.35, 1, Math.min(1, raw * 3)), Math.min(1, raw * 6));
      reveal.style.strokeDashoffset = (L - len + 6).toFixed(1);
    } else if (t < FLY + HOVER) {
      // hover at the end of the trail, bobbing
      const end = path.getPointAtLength(L);
      const s = (t - FLY) / 1000;
      placePlane({ x: end.x + Math.sin(s * 2.2) * 6, y: end.y + Math.sin(s * 3.1) * 7 }, angleAt(L) + Math.sin(s * 2.2) * 6, 1, 1);
      reveal.style.strokeDashoffset = 0;
    } else if (t < FLY + HOVER + EXIT) {
      // zoom off along its heading
      const e = (t - FLY - HOVER) / EXIT;
      const end = path.getPointAtLength(L);
      const a = angleAt(L) * Math.PI / 180;
      const dist = e * e * 420;
      placePlane({ x: end.x + Math.cos(a) * dist, y: end.y + Math.sin(a) * dist - e * 60 }, angleAt(L) - e * 14, lerp(1, 0.55, e), 1 - e);
      if (!flight.classList.contains('is-fading')) flight.classList.add('is-fading');
    } else {
      plane.style.opacity = 0;
      reveal.style.strokeDashoffset = L;
    }
  }
  requestAnimationFrame(tick);
})();
