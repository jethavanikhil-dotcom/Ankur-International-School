/* =========================================================
   School website — hero motion
   - intro orchestration
   - paper plane flying along an SVG path with a drawn trail
   - globe: rotating meridians, orbiting satellites, drag-to-spin
   - pointer parallax, nav, feature reveal
   ========================================================= */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const DEG = 180 / Math.PI;
  let startedAt = null;

  /* ---------------- Intro ---------------- */
  const imagesReady = Promise.all(
    $$('.globe__img, .plane').map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })
    )
  );
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const introTimeout = new Promise((r) => setTimeout(r, 1500));
  Promise.race([Promise.all([imagesReady, fontsReady]), introTimeout]).then(() => {
    requestAnimationFrame(() => document.body.classList.add('is-ready'));
    startedAt = performance.now();
  });

  /* ---------------- Nav ---------------- */
  const nav = $('.nav');
  const navToggle = $('#navToggle');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---------------- Feature reveal ---------------- */
  const features = $('#features');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { features.classList.add('is-in'); obs.disconnect(); }
      });
    }, { threshold: 0.25 }).observe(features);
  } else {
    features.classList.add('is-in');
  }

  /* ---------------- Elements ---------------- */
  const hero = $('#hero');
  const stage = $('#stage');
  const globe = $('#globe');
  const meridianSvg = $('#meridians');
  const sphere = $('.globe__sphere');
  const sats = $$('.sat');
  const plane = $('#plane');
  const flight = $('#flight');
  const path = $('#flightPath');
  const trail = $('#flightTrail');
  const trailReveal = $('#trailReveal');
  const sparkleLayer = $('#sparkles');
  const tags = $$('.tag').map((el) => ({ el, at: parseFloat(el.dataset.at), on: false }));

  const pathD = path.getAttribute('d');
  trail.setAttribute('d', pathD);
  trailReveal.setAttribute('d', pathD);
  const L = path.getTotalLength();
  trailReveal.style.strokeDasharray = `${L} ${L}`;
  trailReveal.style.strokeDashoffset = L;

  // plane.webp nose points ~14.8° above horizontal
  const PLANE_NOSE = -14.8;

  if (reduceMotion) {
    trailReveal.style.strokeDashoffset = 0;
    tags.forEach((t) => t.el.classList.add('is-on'));
    return;
  }

  /* ---------------- Pointer parallax ---------------- */
  $$('[data-depth]').forEach((el) => el.style.setProperty('--d', el.dataset.depth));
  const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    hero.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  }

  /* ---------------- Globe: meridians ---------------- */
  const NS = 'http://www.w3.org/2000/svg';
  const R = 100;
  const MERIDIANS = 12;
  const meridianEls = [];
  (function initMeridianSvg() {
    // latitude rings (static), seen slightly from above
    [-60, -30, 0, 30, 60].forEach((lat) => {
      const rad = lat / DEG;
      const e = document.createElementNS(NS, 'ellipse');
      e.setAttribute('class', 'lat');
      e.setAttribute('cx', 0);
      e.setAttribute('cy', (-R * Math.sin(rad)).toFixed(2));
      e.setAttribute('rx', (R * Math.cos(rad)).toFixed(2));
      e.setAttribute('ry', (R * Math.cos(rad) * 0.14).toFixed(2));
      meridianSvg.appendChild(e);
    });
    for (let i = 0; i < MERIDIANS; i++) {
      const p = document.createElementNS(NS, 'path');
      meridianSvg.appendChild(p);
      meridianEls.push(p);
    }
  })();

  function buildMeridians(rotationDeg) {
    if (!meridianEls.length) return;
    for (let i = 0; i < MERIDIANS; i++) {
      const lon = (rotationDeg + (360 / MERIDIANS) * i) / DEG;
      const s = Math.sin(lon);
      const c = Math.cos(lon);
      const el = meridianEls[i];
      if (c <= 0) { el.setAttribute('d', ''); continue; } // back side hidden
      const rx = Math.max(0.01, Math.abs(s) * R);
      const sweep = s > 0 ? 1 : 0;
      el.setAttribute('d', `M 0 ${-R} A ${rx.toFixed(2)} ${R} 0 0 ${sweep} 0 ${R}`);
      el.setAttribute('stroke-opacity', (0.05 + c * 0.3).toFixed(3));
    }
  }

  /* ---------------- Globe: interaction ---------------- */
  const spin = { angle: 0, base: 22, boost: 0, dragging: false, lastX: 0, dragVel: 0 };

  globe.addEventListener('pointerdown', (e) => {
    spin.dragging = true;
    spin.lastX = e.clientX;
    spin.dragVel = 0;
    globe.setPointerCapture(e.pointerId);
  });
  globe.addEventListener('pointermove', (e) => {
    if (!spin.dragging) return;
    const dx = e.clientX - spin.lastX;
    spin.lastX = e.clientX;
    spin.angle += dx * 0.9;
    spin.dragVel = dx * 40;
  });
  const endDrag = (e) => {
    if (!spin.dragging) return;
    spin.dragging = false;
    // a tap (no real drag) = celebratory spin + relaunch the plane
    if (Math.abs(spin.dragVel) < 40) {
      spin.boost = 520;
      globe.classList.remove('is-spinning');
      void globe.offsetWidth;
      globe.classList.add('is-spinning');
      burst(globeCenter(), 14, true);
      if (flightState.phase === 'idle' || flightState.phase === 'wait') launchPlane();
    } else {
      spin.boost = spin.dragVel;
    }
    if (e && globe.hasPointerCapture?.(e.pointerId)) globe.releasePointerCapture(e.pointerId);
  };
  globe.addEventListener('pointerup', endDrag);
  globe.addEventListener('pointercancel', endDrag);

  function globeCenter() {
    // sphere center in stage 1000-unit coordinates
    const s = stage.getBoundingClientRect();
    const g = sphere.getBoundingClientRect();
    const k = 1000 / s.width;
    return { x: (g.left + g.width / 2 - s.left) * k, y: (g.top + g.height / 2 - s.top) * k };
  }

  /* ---------------- Sparkles ---------------- */
  let sparkleCount = 0;
  function sparkle(x, y, gold = false, spread = 18) {
    if (sparkleCount > 60) return;
    const k = stage.clientWidth / 1000;
    const el = document.createElement('i');
    el.className = gold ? 'sparkle sparkle--gold' : 'sparkle';
    const a = Math.random() * Math.PI * 2;
    const d = (Math.random() * spread + 4) * k;
    el.style.setProperty('--sx', `${x * k}px`);
    el.style.setProperty('--sy', `${y * k}px`);
    el.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    el.style.setProperty('--dy', `${Math.sin(a) * d + 6 * k}px`);
    el.style.animationDuration = `${0.6 + Math.random() * 0.7}s`;
    sparkleLayer.appendChild(el);
    sparkleCount++;
    el.addEventListener('animationend', () => { el.remove(); sparkleCount--; }, { once: true });
  }
  function burst(pt, n, gold) {
    for (let i = 0; i < n; i++) sparkle(pt.x, pt.y, gold && i % 2 === 0, 60);
  }

  /* ---------------- Plane flight ---------------- */
  const FLIGHT_MS = 7800;
  const flightState = { phase: 'wait', t0: 0, waitUntil: 0, lastSpark: 0, prevAngle: null, bank: 0 };

  // gentle speed profile: slow take-off, cruise, speeds up on exit
  const easeFlight = (t) => {
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return lerp(t, e, 0.45);
  };

  function launchPlane() {
    flightState.phase = 'fly';
    flightState.t0 = performance.now();
    flightState.prevAngle = null;
    flight.classList.remove('is-fading');
    trailReveal.style.strokeDashoffset = L;
  }

  function updatePlane(now) {
    const fs = flightState;
    if (fs.phase === 'wait') {
      if (startedAt !== null && now - startedAt > 2100 && fs.waitUntil === 0) launchPlane();
      else if (fs.waitUntil && now > fs.waitUntil) launchPlane();
      return;
    }
    if (fs.phase === 'fade') {
      if (now > fs.fadeEnd) {
        fs.phase = 'wait';
        fs.waitUntil = now + 1400;
        trailReveal.style.strokeDashoffset = L;
      }
      return;
    }
    if (fs.phase !== 'fly') return;

    const raw = clamp((now - fs.t0) / FLIGHT_MS, 0, 1);
    const t = easeFlight(raw);
    const len = t * L;
    const p = path.getPointAtLength(len);
    const ahead = path.getPointAtLength(Math.min(L, len + 2));
    const behind = path.getPointAtLength(Math.max(0, len - 2));
    let angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * DEG;

    // unwrap angle + bank on turns
    if (fs.prevAngle !== null) {
      let diff = angle - fs.prevAngle;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      fs.bank = lerp(fs.bank, clamp(diff * 0.12, -0.35, 0.35), 0.15);
    }
    fs.prevAngle = angle;

    // grows as it emerges from behind the globe, shrinks into the distance
    let scale = 1;
    if (raw < 0.14) scale = lerp(0.2, 1, raw / 0.14);
    else if (raw > 0.8) scale = lerp(1, 0.62, (raw - 0.8) / 0.2);
    const opacity = raw < 0.05 ? raw / 0.05 : raw > 0.94 ? (1 - raw) / 0.06 : 1;
    const bob = Math.sin(now / 260) * 2.5;

    const k = stage.clientWidth / 1000;
    const pw = plane.offsetWidth;
    const ph = plane.offsetHeight;
    plane.style.opacity = opacity.toFixed(3);
    plane.style.transform =
      `translate(${(p.x * k - pw / 2).toFixed(2)}px, ${((p.y + bob) * k - ph / 2).toFixed(2)}px) ` +
      `rotate(${(angle - PLANE_NOSE).toFixed(2)}deg) scale(${scale.toFixed(3)}, ${(scale * (1 - Math.abs(fs.bank))).toFixed(3)})`;

    trailReveal.style.strokeDashoffset = (L - len + 10).toFixed(2);

    // sparkles from the tail
    if (now - fs.lastSpark > 55 && raw > 0.04 && raw < 0.93) {
      fs.lastSpark = now;
      const rad = angle / DEG;
      sparkle(p.x - Math.cos(rad) * 34 * scale, p.y - Math.sin(rad) * 34 * scale, Math.random() < 0.3);
    }

    // labels light up as the plane passes
    tags.forEach((tag) => {
      if (raw >= tag.at && !tag.lit) {
        tag.lit = true;
        tag.el.classList.add('is-on');
        tag.el.classList.remove('is-ping');
        void tag.el.offsetWidth;
        tag.el.classList.add('is-ping');
        const x = parseFloat(tag.el.style.getPropertyValue('--x')) * 10;
        const y = parseFloat(tag.el.style.getPropertyValue('--y')) * 6.2;
        for (let i = 0; i < 8; i++) sparkle(x, y, true, 50);
      }
    });

    if (raw >= 1) {
      fs.phase = 'fade';
      fs.fadeEnd = now + 1500;
      plane.style.opacity = 0;
      flight.classList.add('is-fading');
      tags.forEach((tag) => { tag.lit = false; });
    }
  }

  /* ---------------- Main loop ---------------- */
  let heroVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  }

  const orbit = { a: 0 };
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (heroVisible) {
      // parallax
      pointer.cx = lerp(pointer.cx, pointer.x, 0.06);
      pointer.cy = lerp(pointer.cy, pointer.y, 0.06);
      root.style.setProperty('--px', (pointer.cx * -14).toFixed(2));
      root.style.setProperty('--py', (pointer.cy * -10).toFixed(2));

      // globe spin (base + decaying boost)
      if (!spin.dragging) {
        spin.angle += (spin.base + spin.boost) * dt;
        spin.boost *= Math.pow(0.18, dt);
      }
      buildMeridians(spin.angle);
      sphere.style.setProperty('--shx', `${35 + pointer.cx * 8}%`);
      sphere.style.setProperty('--shy', `${28 + pointer.cy * 6}%`);

      // satellites on a tilted ellipse around the sphere
      const gw = globe.clientWidth;
      const gh = globe.clientHeight;
      const cx = gw * 0.54;
      const cy = gh * 0.405;
      const A = gw * 0.75;
      const B = gh * 0.17;
      const tilt = -15.5 / DEG;
      orbit.a += dt * (0.9 + Math.abs(spin.boost) / 260);
      sats.forEach((sat, i) => {
        const a = orbit.a + (i * Math.PI * 2) / sats.length;
        const ex = A * Math.cos(a);
        const ey = B * Math.sin(a);
        const x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
        const y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
        const front = Math.sin(a) > 0;
        const depth = (Math.sin(a) + 1) / 2; // 0 back → 1 front
        sat.style.zIndex = front ? 4 : -1;
        sat.style.opacity = (0.45 + depth * 0.55).toFixed(2);
        sat.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.6 + depth * 0.55).toFixed(2)}) rotate(${(a * DEG).toFixed(0)}deg)`;
      });

      updatePlane(now);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
