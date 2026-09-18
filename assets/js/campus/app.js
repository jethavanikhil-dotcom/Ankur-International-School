/* =========================================================
   Campus 3D — a scroll-driven school morning
   ========================================================= */
import * as THREE from 'three';
import { clamp, lerp, smooth, easeOut, range, damp, lerpAngle, bake, dynamic, registerPick } from './utils.js';
import { buildSky, buildGrounds, buildGate, buildFurniture } from './environment.js';
import { buildSchool } from './school.js';
import { makeTree, makeGrass, hedgeRow, shrub } from './nature.js';
import { buildBus, buildPlayground } from './props.js';
import { makeCharacter, animateCharacter, HAIR } from './characters.js';

const section = document.getElementById('campus');
const canvas = document.getElementById('campusCanvas');
const labelLayer = document.getElementById('campusLabels');
const chapters = [...section.querySelectorAll('.chapter')];
const railFill = section.querySelector('.campus__rail i');
const railDots = [...section.querySelectorAll('.campus__rail b')];
const loader = section.querySelector('.campus__loader');

const isTouch = window.matchMedia('(pointer: coarse)').matches;
const isSmall = window.innerWidth < 760;

/* ---------------- renderer ---------------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  section.classList.add('no-webgl');
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.4 : 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.66;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 5000);
const pickables = [];

/* ---------------- world ---------------- */
const env = buildSky(scene, renderer, { isSmall });
const world = new THREE.Group();
scene.add(world);

buildGrounds(world);
const gate = buildGate(world);
const furniture = buildFurniture(world);

const school = buildSchool();
world.add(school.group);

const { play, swings } = buildPlayground();
play.position.set(26, 0, 14);
play.rotation.y = -0.35;
world.add(play);
swings.forEach((s) => registerPick(s.pivot, pickables, { type: 'swing', ref: s }));

const bus = buildBus();
bus.bus.position.set(-80, 0, 32.9);
dynamic(bus.bus);
world.add(bus.bus);
const busState = { honk: 0 };
registerPick(bus.body, pickables, { type: 'bus', ref: busState });

// greenery
hedgeRow(world, -5.6, -70, 22.9, { seed: 3 });
hedgeRow(world, 5.6, 70, 22.9, { seed: 8 });
[[-5.5, 20, 0xf28ca8], [5.5, 20, 0xf5c542], [-5.2, 8, null], [5.2, 8, 0xffffff], [-16, 6.6, 0xf28ca8], [16, 6.6, 0xf5c542], [-36, 3, null], [36, 3, 0xf28ca8]]
  .forEach(([x, z, f], i) => shrub(world, x, z, 1.1, f, i + 1));

const TREE_SPOTS = [
  [-12, 18, 1.15, 'round'], [12, 19.5, 1.05, 'round'], [-22, 15, 1.3, 'round'], [-9.5, 11, 0.8, 'tall'], [9.5, 8.5, 0.8, 'tall'],
  [-40, 12, 1.4, 'round'], [44, 20, 1.3, 'round'], [-50, -6, 1.6, 'round'], [52, -4, 1.5, 'round'], [-32, -24, 1.7, 'round'],
  [30, -24, 1.6, 'round'], [0, -28, 1.8, 'round'], [-64, 18, 1.4, 'round'], [64, 14, 1.4, 'round'], [-20, 48, 1.2, 'round'],
  [24, 48, 1.3, 'round'], [-48, 48, 1.5, 'round'], [52, 47, 1.4, 'round'], [-42, 3, 0.9, 'tall'], [40, 3, 0.9, 'tall'],
];
const trees = TREE_SPOTS.slice(0, isSmall ? 13 : TREE_SPOTS.length).map(([x, z, s, kind], i) => {
  const t = makeTree(x, z, { scale: s, seed: i + 1, kind });
  dynamic(t.crown);
  world.add(t.g);
  registerPick(t.crown, pickables, { type: 'tree', ref: t });
  return t;
});

const grass = makeGrass(isSmall ? 3500 : 9000, (x, z) => {
  if (z > 25.4 && z < 42.2) return false;
  if (Math.abs(x) < 37 && z > -16 && z < 7.4) return false;
  if (Math.abs(x) < 4 && z < 25) return false;
  if (Math.abs(z - 23.4) < 1.4) return false;
  if (Math.hypot(x - 28, z - 14) < 8.5) return false;
  return true;
});
world.add(grass.mesh);

// bake the static world (dynamic parts are flagged and skipped)
bake(world);

/* ---------------- characters ---------------- */
const V = (x, z) => new THREE.Vector3(x, 0, z);
function route(from, lane) {
  return new THREE.CatmullRomCurve3([...from, V(lane * 0.6, 24), V(lane * 0.9, 17), V(lane * 0.8, 9.5), V(lane * 0.5, 5.6), V(lane * 0.35, 3.2), V(lane * 0.2, 1.7)], false, 'centripetal', 0.5);
}
const BUS_DOOR = [V(-3.1, 31.1), V(-2.9, 29.3)];
const KIDS = [
  { name: 'Aarav', line: 'Hi! I love science experiments!', skin: 0xd9a27a, hair: 'spiky', hairColor: HAIR.black, bottom: 'shorts', bag: 0xef7a43, from: [...BUS_DOOR, V(-1.6, 26.6)], lane: -1, start: 0.3, dur: 0.4 },
  { name: 'Meera', line: 'Art class is my favourite!', skin: 0xeec3a0, hair: 'ponytail', hairColor: HAIR.dark, bottom: 'skirt', bag: 0x6b4fd8, from: [...BUS_DOOR, V(-0.6, 26.6)], lane: 0.3, start: 0.335, dur: 0.4 },
  { name: 'Kabir', line: 'Race you to the classroom!', skin: 0xa86f4c, hair: 'curly', hairColor: HAIR.black, bottom: 'pants', bag: 0x2e8a5e, from: [...BUS_DOOR, V(-2.2, 26.8)], lane: -1.8, start: 0.37, dur: 0.38 },
  { name: 'Zoya', line: 'I brought my new storybook!', skin: 0xcf9870, hair: 'long', hairColor: HAIR.brown, bottom: 'skirt', bag: 0x3d7bf5, from: [...BUS_DOOR, V(0.4, 26.6)], lane: 1.2, start: 0.405, dur: 0.4 },
  { name: 'Ishaan', line: 'Good morning, teacher!', skin: 0xf0c9a8, hair: 'short', hairColor: HAIR.auburn, bottom: 'shorts', bag: 0x3d7bf5, from: [V(-50, 27.6), V(-22, 27.8), V(-6, 28), V(-1.9, 26.4)], lane: -1.4, start: 0.08, dur: 0.6 },
  { name: 'Anaya', line: 'Let’s play on the swings later!', skin: 0x8d5a3b, hair: 'buns', hairColor: HAIR.black, bottom: 'skirt', bag: 0xef7a43, from: [V(-56, 28.8), V(-26, 28.8), V(-7, 28.8), V(-0.9, 26.5)], lane: 0.8, start: 0.12, dur: 0.6 },
  { name: 'Vivaan', line: 'Maths quiz today — I’m ready!', skin: 0xe2b08a, hair: 'short', hairColor: HAIR.brown, bottom: 'pants', bag: 0x6b4fd8, from: [V(52, 28.2), V(24, 28.2), V(7, 28.4), V(1.8, 26.4)], lane: 1.8, start: 0.1, dur: 0.62 },
];
const kids = KIDS.map((cfg, i) => {
  const ch = makeCharacter(cfg);
  ch.cfg = cfg;
  ch.baseScale = 1.12 + (i % 3) * 0.05;
  ch.curve = route(cfg.from, cfg.lane);
  ch.length = ch.curve.getLength();
  ch.u = -1;
  ch.fromBus = i < 4;
  world.add(ch.root);
  registerPick(ch.root, pickables, { type: 'kid', ref: ch });
  return ch;
});
const teacher = makeCharacter({ adult: true, skin: 0xc98f68, hair: 'buns', hairColor: HAIR.dark, bottom: 'pants', bag: null, shirt: 0xef7a43, trim: 0xf7f7f4, pants: 0x2a3550 });
teacher.cfg = { name: 'Ms. Priya', line: 'Welcome in, everyone! Have a lovely day.' };
teacher.root.position.set(3.4, 0.9, 2.6);
teacher.root.rotation.y = 0.2;
teacher.root.scale.setScalar(1.05);
world.add(teacher.root);
registerPick(teacher.root, pickables, { type: 'kid', ref: teacher });

function groundY(x, z) {
  const walkway = z > 26.2 && z < 30.2 ? 0.22 : 0;
  return Math.max(walkway, school.groundY(x, z));
}

/* ---------------- camera path ---------------- */
const P = (x, y, z) => new THREE.Vector3(x, y, z);
const shots = isSmall
  ? [[P(62, 58, 118), P(-2, 4, 6)], [P(20, 11, 72), P(-7, 2.5, 32)], [P(-18, 5, 28), P(-3, 1.6, 30)], [P(12, 4.4, 24), P(-1, 1.8, 11)], [P(6.5, 4.2, 15), P(0, 3, 1.5)], [P(-52, 34, 72), P(2, 5, -2)]]
  : [[P(70, 48, 110), P(-2, 4, 6)], [P(14, 8, 64), P(-8, 2.5, 32)], [P(-20, 3.6, 26.8), P(-3, 1.6, 30)], [P(10, 3.4, 21), P(-1, 1.8, 11)], [P(5, 3.4, 12.8), P(0, 3, 1.5)], [P(-46, 26, 58), P(4, 5, -2)]];
const camPosCurve = new THREE.CatmullRomCurve3(shots.map((s) => s[0]), false, 'centripetal');
const camTgtCurve = new THREE.CatmullRomCurve3(shots.map((s) => s[1]), false, 'centripetal');

/* ---------------- scroll & pointer ---------------- */
let target = 0;
let progress = 0;
function readScroll() {
  const r = section.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  target = total > 0 ? clamp(-r.top / total) : 0;
}
window.addEventListener('scroll', readScroll, { passive: true });
readScroll();
progress = target;

const pointer = new THREE.Vector2(-10, -10);
let pointerDirty = false;
const look = { x: 0, y: 0, tx: 0, ty: 0, yaw: 0, tyaw: 0, pitch: 0, tpitch: 0 };
let drag = null;
function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  pointerDirty = true;
}
canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  if (!isTouch) { look.tx = pointer.x; look.ty = pointer.y; }
  if (drag && !drag.touch) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    look.tyaw = clamp(drag.yaw - dx * 0.005, -1.1, 1.1);
    look.tpitch = clamp(drag.pitch + dy * 0.003, -0.2, 0.3);
  }
});
canvas.addEventListener('pointerleave', () => { look.tx = 0; look.ty = 0; pointer.set(-10, -10); });
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, yaw: look.tyaw, pitch: look.tpitch, moved: false, touch: e.pointerType === 'touch' };
  if (!drag.touch) { canvas.setPointerCapture(e.pointerId); section.classList.add('is-dragging'); }
});
window.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const moved = drag.moved || (drag.touch && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10);
  drag = null;
  section.classList.remove('is-dragging');
  if (!moved) { setPointer(e); handleClick(); }
});

const raycaster = new THREE.Raycaster();
function pick() {
  if (pointer.x < -1.5) return null;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(school.belfry, true).length) return { type: 'bell' };
  const hit = raycaster.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.pick : null;
}

/* ---------------- bubbles & hotspots ---------------- */
const bubbles = [];
function say(text, anchor, offsetY, name = '') {
  bubbles.filter((b) => b.anchor === anchor).forEach((b) => { b.life = Math.min(b.life, 0.2); });
  const el = document.createElement('div');
  el.className = 'bubble';
  el.innerHTML = (name ? `<b>${name}</b>` : '') + `<span>${text}</span>`;
  labelLayer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-on'));
  bubbles.push({ el, anchor, offsetY, life: 3 });
}
const tmp = new THREE.Vector3();
const hotspots = [
  { label: 'Ring the bell', get: (v) => school.belfry.localToWorld(v.set(0, 4.8, 0)), show: [0.6, 1] },
  { label: 'Honk the bus', get: (v) => bus.bus.localToWorld(v.set(0, 4.2, 0)), show: [0.2, 0.6] },
  { label: 'Say hi', get: (v) => kids[1].root.localToWorld(v.set(0, 2.2, 0)), show: [0.36, 0.62] },
  { label: 'Push the swing', get: (v) => play.localToWorld(v.set(-1.3, 4.9, 0)), show: [0.86, 1] },
  { label: 'Shake a tree', get: (v) => trees[0].g.localToWorld(v.set(0, 8.5, 0)), show: [0.45, 0.62] },
].map((h) => {
  const el = document.createElement('div');
  el.className = 'hotspot';
  el.innerHTML = `<i></i><span>${h.label}</span>`;
  labelLayer.appendChild(el);
  return { ...h, el };
});

/* ---------------- interactions ---------------- */
const leaves = [];
const leafGeo = new THREE.PlaneGeometry(0.22, 0.14);
const leafMats = [0x4f8f3a, 0x78a646, 0xd9a441].map((c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.9 }));
const bellState = { t: 0 };
function handleClick() {
  const hit = pick();
  if (!hit) return;
  if (hit.type === 'bell') {
    bellState.t = 2.4;
    say('Ding dong! Class is starting', school.belfry, 5.2);
    [...kids, teacher].forEach((k, i) => setTimeout(() => { k.jump = 1; k.wave = 1; }, i * 90));
  } else if (hit.type === 'kid') {
    hit.ref.jump = 1;
    hit.ref.wave = 1.2;
    say(hit.ref.cfg.line, hit.ref.root, hit.ref.adult ? 2.7 : 2.1, hit.ref.cfg.name);
  } else if (hit.type === 'bus') {
    busState.honk = 1;
    say('Beep beep!', bus.bus, 4.4);
  } else if (hit.type === 'tree') {
    hit.ref.shake = 1;
    const origin = hit.ref.g.localToWorld(new THREE.Vector3(0, 6, 0));
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(leafGeo, leafMats[i % 3]);
      m.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 2.5, (Math.random() - 0.5) * 5));
      scene.add(m);
      leaves.push({ m, vy: -0.7 - Math.random() * 0.8, spin: 2 + Math.random() * 4, sway: Math.random() * 6, life: 5 });
    }
  } else if (hit.type === 'swing') {
    hit.ref.vel += 2.4;
  }
}

/* ---------------- resize: shift the view so captions have room ---------------- */
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  if (w / h > 1.1) {
    const full = w * 1.34;
    camera.aspect = full / h;
    camera.setViewOffset(full, h, 0, 0, w, h);
    camera.fov = 34;
  } else {
    camera.clearViewOffset();
    camera.aspect = w / h;
    camera.fov = 50;
  }
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

let active = true;
new IntersectionObserver(([e]) => { active = e.isIntersecting; }, { rootMargin: '300px' }).observe(section);

function updateUI(s) {
  chapters.forEach((c) => c.classList.toggle('is-active', s >= parseFloat(c.dataset.from) && s <= parseFloat(c.dataset.to)));
  railFill.style.transform = `scaleY(${s.toFixed(4)})`;
  railDots.forEach((d) => d.classList.toggle('is-on', s >= parseFloat(d.dataset.at) - 0.001));
}

document.fonts?.load('700 40px Outfit').then(() => {
  school.redrawText();
  gate.archTex.userData.redraw();
  bus.busTex.userData.redraw();
});

/* ---------------- loop ---------------- */
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), offset = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
let frameNo = 0;
let hoverOn = false;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (!active && frameNo > 0) return;
  frameNo++;

  progress = damp(progress, target, 3.4, dt);
  if (Math.abs(progress - target) < 0.00004) progress = target;
  const s = progress;
  updateUI(s);

  /* camera */
  const cs = smooth(s);
  camPosCurve.getPoint(cs, camPos);
  camTgtCurve.getPoint(cs, camTgt);
  look.x = damp(look.x, look.tx, 2.5, dt);
  look.y = damp(look.y, look.ty, 2.5, dt);
  if (!drag) {
    const keep = s > 0.86 ? 1 : 0;
    look.tyaw *= keep ? 1 : Math.exp(-1.5 * dt);
    look.tpitch *= keep ? 1 : Math.exp(-1.5 * dt);
  }
  look.yaw = damp(look.yaw, look.tyaw, 5, dt);
  look.pitch = damp(look.pitch, look.tpitch, 5, dt);
  offset.subVectors(camPos, camTgt).applyAxisAngle(up, look.yaw - look.x * 0.05);
  offset.y += offset.length() * (look.pitch + look.y * 0.025);
  camera.position.copy(camTgt).add(offset);
  camera.position.y = Math.max(1.4, camera.position.y + Math.sin(t * 0.7) * 0.03);
  camera.lookAt(camTgt);

  /* morning light: sun climbs as you scroll */
  env.setSun(lerp(12, 34, s));

  /* bus */
  const arrive = easeOut(range(s, 0.05, 0.27));
  const leave = Math.pow(range(s, 0.72, 0.92), 2);
  const busX = lerp(-80, -7, arrive) + leave * 120;
  const dx = busX - bus.bus.position.x;
  bus.bus.position.x = busX;
  bus.wheels.forEach((w) => { w.rotation.z -= dx / 0.72; });
  bus.body.position.y = (Math.abs(dx) > 0.002 ? Math.sin(t * 16) * 0.02 : 0) + Math.sin(Math.min(1, busState.honk) * Math.PI) * 0.25;
  bus.body.rotation.z = clamp(-dx * 0.25, -0.025, 0.025);
  if (busState.honk > 0) busState.honk = Math.max(0, busState.honk - dt * 2);
  bus.headlights.forEach((h) => { h.material.emissiveIntensity = busState.honk > 0 && Math.sin(t * 40) > 0 ? 3 : 0.4; });
  bus.door.position.x = 3.9 - range(s, 0.27, 0.3) * (1 - range(s, 0.62, 0.66)) * 1.15;

  /* gate */
  const g = easeOut(range(s, 0.12, 0.24));
  gate.leaves.forEach(({ hinge, side }) => { hinge.rotation.y = side * g * 1.7; });

  /* kids */
  let doorWanted = 0;
  kids.forEach((k) => {
    const raw = (s - k.cfg.start) / k.cfg.dur;
    const u = clamp(raw);
    const prevU = k.u < 0 ? u : k.u;
    k.u = u;
    const hidden = (k.fromBus && raw <= 0) || u >= 0.995;
    k.root.visible = !hidden;
    if (u > 0.8 && u < 0.999) doorWanted = 1;
    if (hidden) return;
    const pt = k.curve.getPointAt(u, tmp);
    const moved = (u - prevU) * k.length;
    k.root.position.set(pt.x, groundY(pt.x, pt.z), pt.z);
    if (Math.abs(moved) > 0.0008) {
      const tan = k.curve.getTangentAt(u);
      const dir = Math.sign(moved);
      k.heading = Math.atan2(tan.x * dir, tan.z * dir);
      k.phase += (Math.abs(moved) / 0.55) * Math.PI;
      k.walk = damp(k.walk, 1, 10, dt);
    } else {
      k.walk = damp(k.walk, 0, 4, dt);
      if (k.walk < 0.05) k.heading = lerpAngle(k.heading, Math.atan2(camera.position.x - pt.x, camera.position.z - pt.z), 0.012);
    }
    k.root.rotation.y = lerpAngle(k.root.rotation.y, k.heading, 1 - Math.exp(-12 * dt));
    const pop = k.fromBus ? smooth(clamp(raw / 0.04)) : 1;
    const shrink = 1 - smooth(clamp((u - 0.96) / 0.035));
    k.root.scale.setScalar(k.baseScale * Math.max(0.001, pop * shrink));
    animateCharacter(k, dt, t);
  });
  if (s > 0.55 && s < 0.85 && Math.sin(t * 0.9) > 0.7) teacher.wave = Math.max(teacher.wave, 0.4);
  animateCharacter(teacher, dt, t);
  school.doors.forEach((d) => { d.open = damp(d.open, doorWanted, 4, dt); d.hinge.rotation.y = d.side * d.open * 1.35; });

  /* ambient */
  school.hourHand.rotation.z = -t * 0.01;
  school.minuteHand.rotation.z = -t * 0.1;
  if (frameNo % 2 === 0) furniture.updateFlag(t);
  grass.uniforms.uTime.value = t;
  trees.forEach((tr) => {
    tr.crown.rotation.z = Math.sin(t * 0.7 + tr.seed) * 0.018 + Math.sin(t * 22) * 0.07 * tr.shake;
    tr.crown.rotation.x = Math.cos(t * 0.5 + tr.seed) * 0.014;
    if (tr.shake > 0) tr.shake = Math.max(0, tr.shake - dt * 1.3);
  });
  for (let i = leaves.length - 1; i >= 0; i--) {
    const l = leaves[i];
    l.life -= dt;
    l.m.position.y = Math.max(0.05, l.m.position.y + l.vy * dt);
    l.m.position.x += Math.sin(t * 2 + l.sway) * dt * 0.8;
    l.m.rotation.x += l.spin * dt; l.m.rotation.y += l.spin * 0.6 * dt;
    if (l.life < 0) { scene.remove(l.m); leaves.splice(i, 1); }
  }
  swings.forEach((sw) => {
    sw.vel += -Math.sin(sw.angle) * (9.8 / 3.2) * dt;
    sw.vel *= Math.exp(-0.22 * dt);
    sw.angle += sw.vel * dt;
    sw.pivot.rotation.x = sw.angle;
  });
  if (bellState.t > 0) {
    bellState.t = Math.max(0, bellState.t - dt);
    school.bell.rotation.x = Math.sin(t * 13) * 0.5 * (bellState.t / 2.4);
  }

  /* hover (only when the pointer moved) */
  if (!isTouch && !drag && pointerDirty && frameNo % 3 === 0) {
    pointerDirty = false;
    const on = !!pick();
    if (on !== hoverOn) { hoverOn = on; section.classList.toggle('is-pointing', on); }
  }

  /* labels */
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life -= dt;
    b.anchor.getWorldPosition(tmp);
    tmp.y += b.offsetY;
    tmp.project(camera);
    b.el.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px)`;
    b.el.style.visibility = tmp.z < 1 ? 'visible' : 'hidden';
    if (b.life < 0.3) b.el.classList.remove('is-on');
    if (b.life < 0) { b.el.remove(); bubbles.splice(i, 1); }
  }
  hotspots.forEach((hs) => {
    const on = s >= hs.show[0] && s <= hs.show[1];
    hs.get(tmp).project(camera);
    const vis = on && tmp.z < 1 && tmp.x > -0.3 && tmp.x < 0.95 && Math.abs(tmp.y) < 0.9;
    hs.el.classList.toggle('is-on', vis);
    if (vis) hs.el.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px)`;
  });

  renderer.render(scene, camera);
  if (frameNo === 1) loader.classList.add('is-done');
}
requestAnimationFrame(frame);

