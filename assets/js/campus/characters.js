import * as THREE from 'three';
import { mesh, box, bake, dynamic, lerp, damp } from './utils.js';

export const HAIR = { black: 0x1f1a1a, brown: 0x4e2f1d, dark: 0x33231a, auburn: 0x6f3520 };

const matCache = new Map();
function m(color, rough = 0.7, extra = {}) {
  const key = `${color}|${rough}|${JSON.stringify(extra)}`;
  if (!matCache.has(key)) {
    const physical = extra.sheen !== undefined || extra.clearcoat !== undefined;
    const Cls = physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    matCache.set(key, new Cls({ color, roughness: rough, ...extra }));
  }
  return matCache.get(key);
}
const fabric = (c) => m(c, 0.9, { sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff) });
const cap = (r, l, s = 12) => new THREE.CapsuleGeometry(r, l, 6, s);
const sph = (r, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);

/*
  Stylised kid in school uniform. Proportions are gently cartoonish (big head, short limbs)
  but materials are physically based so they sit naturally in the lit scene.
*/
export function makeCharacter(opts) {
  const {
    skin = 0xe9b996, hair = 'short', hairColor = HAIR.black, bottom = 'shorts', bag = 0xef7a43,
    shirt = 0xf7f7f4, trim = 0x1d2a52, pants = 0x1d2a52, adult = false,
  } = opts;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinM = m(skin, 0.55, { sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffc9b0) });
  const hairM = m(hairColor, 0.45, { clearcoat: 0.4, clearcoatRoughness: 0.5 });
  const legLen = adult ? 0.9 : 0.52;
  const hipY = legLen + 0.08;

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.11, hipY, 0);
    const long = bottom === 'pants' || adult;
    leg.add(mesh(cap(0.078, legLen - 0.18), long ? fabric(pants) : skinM, { y: -(legLen - 0.08) / 2 }));
    if (!long) leg.add(mesh(new THREE.CylinderGeometry(0.083, 0.08, 0.18, 12), fabric(0xffffff), { y: -legLen + 0.2 }));
    leg.add(mesh(cap(0.09, 0.14), m(0xf4f4f2, 0.6), { y: -legLen + 0.03, z: 0.06, rx: Math.PI / 2, sy: 1, sx: 1.05 }));
    leg.add(mesh(box(0.18, 0.045, 0.32), m(0x2a2f3a, 0.8), { y: -legLen - 0.05, z: 0.06 }));
    bake(leg);
    dynamic(leg);
    body.add(leg);
    legs.push(leg);
  }
  if (bottom === 'skirt') body.add(mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.34, 20, 1, true), m(pants, 0.85, { side: THREE.DoubleSide }), { y: hipY - 0.04 }));
  else body.add(mesh(new THREE.CylinderGeometry(0.19, 0.22, bottom === 'shorts' ? 0.3 : 0.2, 20), fabric(pants), { y: hipY - (bottom === 'shorts' ? 0.06 : -0.02) }));

  const torsoH = adult ? 0.5 : 0.28;
  const torsoY = hipY + 0.13 + torsoH / 2;
  body.add(mesh(cap(0.2, torsoH, 18), fabric(shirt), { y: torsoY, sz: 0.8 }));
  const shoulderY = torsoY + torsoH / 2 + 0.08;
  // polo collar + placket + crest
  for (const side of [-1, 1]) body.add(mesh(box(0.13, 0.03, 0.09), fabric(trim), { x: side * 0.07, y: shoulderY + 0.02, z: 0.1, rz: side * 0.35, ry: side * 0.3 }));
  body.add(mesh(box(0.035, 0.14, 0.02), fabric(trim), { y: shoulderY - 0.08, z: 0.165 }));
  body.add(mesh(new THREE.CircleGeometry(0.04, 16), m(0xef7a43, 0.5), { x: 0.1, y: shoulderY - 0.12, z: 0.168, shadow: false }));

  if (bag) {
    body.add(mesh(new THREE.CapsuleGeometry(0.16, 0.18, 6, 16), m(bag, 0.75), { y: torsoY + 0.03, z: -0.23, sx: 1.2, sz: 0.62 }));
    body.add(mesh(box(0.2, 0.13, 0.07), m(bag, 0.75), { y: torsoY - 0.09, z: -0.34 }));
    body.add(mesh(box(0.2, 0.02, 0.075), m(0xd9dde4, 0.3, { metalness: 1 }), { y: torsoY - 0.03, z: -0.345 }));
    for (const side of [-1, 1]) body.add(mesh(box(0.045, torsoH + 0.14, 0.025), m(0x2a2f3a, 0.8), { x: side * 0.11, y: torsoY + 0.02, z: 0.16 }));
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.25, shoulderY - 0.03, 0);
    arm.add(mesh(sph(0.095), fabric(shirt), { y: -0.05 }));
    const armLen = adult ? 0.48 : 0.26;
    arm.add(mesh(cap(0.055, armLen), skinM, { y: -armLen / 2 - 0.12 }));
    arm.add(mesh(sph(0.065), skinM, { y: -armLen - 0.17, sz: 0.8 }));
    arm.rotation.z = side * 0.1;
    bake(arm);
    dynamic(arm);
    body.add(arm);
    arms.push(arm);
  }

  body.add(mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 12), skinM, { y: shoulderY + 0.08 }));
  const head = new THREE.Group();
  const headR = adult ? 0.23 : 0.27;
  head.position.y = shoulderY + 0.12 + headR;
  body.add(head);
  head.add(mesh(sph(headR, 32, 24), skinM, { sy: 1.02, sz: 0.97 }));
  for (const side of [-1, 1]) head.add(mesh(sph(0.055, 12, 10), skinM, { x: side * headR * 0.96, y: -0.03, sz: 0.55 }));

  // face
  const eyes = [];
  const white = m(0xffffff, 0.2);
  const iris = m(0x3a2518, 0.15, { clearcoat: 1, clearcoatRoughness: 0.05 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.09, 0.02, headR * 0.86);
    eye.add(mesh(sph(0.05, 16, 12), white, { sz: 0.5, shadow: false }));
    eye.add(mesh(sph(0.032, 16, 12), iris, { z: 0.02, sz: 0.5, shadow: false }));
    eye.add(mesh(sph(0.011, 8, 6), m(0xffffff, 0, { emissive: 0xffffff, emissiveIntensity: 0.6 }), { x: 0.012, y: 0.013, z: 0.036, shadow: false }));
    dynamic(eye);
    head.add(eye);
    eyes.push(eye);
    head.add(mesh(cap(0.011, 0.05, 6), hairM, { x: side * 0.095, y: 0.095, z: headR * 0.88, rz: Math.PI / 2 + side * 0.12, shadow: false }));
    head.add(mesh(sph(0.045, 12, 8), m(0xff9a8a, 0.9, { transparent: true, opacity: 0.35 }), { x: side * 0.16, y: -0.06, z: headR * 0.82, sz: 0.3, shadow: false }));
  }
  head.add(mesh(sph(0.03, 12, 8), skinM, { y: -0.03, z: headR * 0.98, sy: 0.8, shadow: false }));
  head.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 20, Math.PI), m(0x9b3b45, 0.5), { y: -0.09, z: headR * 0.91, rz: Math.PI, shadow: false }));

  // hair
  head.add(mesh(new THREE.SphereGeometry(headR * 1.06, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, { y: 0.015, rx: -0.3 }));
  const fringe = (n, spread, y = 0.17) => {
    for (let i = 0; i < n; i++) head.add(mesh(sph(0.09, 14, 10), hairM, { x: -spread / 2 + (i * spread) / (n - 1), y, z: headR * 0.72, sy: 0.55, sz: 0.7 }));
  };
  let pony = null;
  if (hair === 'short' || hair === 'spiky') {
    fringe(4, 0.3);
    if (hair === 'spiky') for (let i = 0; i < 6; i++) head.add(mesh(new THREE.ConeGeometry(0.06, 0.16, 10), hairM, { x: -0.15 + i * 0.06, y: headR + 0.03, z: 0.05 - Math.abs(i - 2.5) * 0.04, rx: -0.4, rz: (i - 2.5) * 0.12 }));
  } else if (hair === 'curly') {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      head.add(mesh(sph(0.095, 12, 10), hairM, { x: Math.cos(a) * headR * 0.82, y: 0.12 + Math.sin(i * 1.7) * 0.05, z: Math.sin(a) * headR * 0.82 - 0.03 }));
    }
    head.add(mesh(sph(0.19, 16, 12), hairM, { y: headR * 0.95, z: -0.02 }));
  } else {
    fringe(3, 0.26);
    if (hair === 'long') {
      head.add(mesh(cap(0.23, 0.36, 18), hairM, { y: -0.2, z: -0.13, sz: 0.55 }));
      for (const side of [-1, 1]) head.add(mesh(cap(0.065, 0.3), hairM, { x: side * 0.23, y: -0.18, z: 0.03 }));
    }
    if (hair === 'ponytail') {
      head.add(mesh(new THREE.TorusGeometry(0.045, 0.018, 8, 16), m(0xef7a43, 0.5), { y: 0.1, z: -0.29 }));
      pony = new THREE.Group();
      pony.position.set(0, 0.1, -0.3);
      pony.add(mesh(cap(0.075, 0.28), hairM, { y: -0.17, z: -0.06, rx: 0.35 }));
      bake(pony);
      dynamic(pony);
      head.add(pony);
    }
    if (hair === 'buns') for (const side of [-1, 1]) head.add(mesh(sph(0.11, 16, 12), hairM, { x: side * 0.2, y: headR * 0.95, z: -0.05 }));
  }
  bake(head);
  dynamic(head);
  bake(body);

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, legs, arms, head, eyes, pony, phase: Math.random() * 6, walk: 0, jump: 0, wave: 0, blink: Math.random() * 4, heading: 0, lookT: Math.random() * 10, adult };
}

export function animateCharacter(ch, dt, time) {
  const w = ch.walk;
  const s = Math.sin(ch.phase);
  ch.legs[0].rotation.x = s * 0.65 * w;
  ch.legs[1].rotation.x = -s * 0.65 * w;
  ch.arms[0].rotation.x = -s * 0.55 * w;
  if (ch.wave <= 0) ch.arms[1].rotation.x = s * 0.55 * w;
  const breathe = Math.sin(time * 2.2 + ch.lookT) * 0.008 * (1 - w);
  const jumpY = Math.sin(Math.min(1, ch.jump) * Math.PI) * 0.5;
  ch.body.position.y = Math.abs(Math.cos(ch.phase)) * 0.045 * w + breathe + jumpY;
  ch.body.rotation.z = s * 0.035 * w;
  ch.body.rotation.x = 0.05 * w;
  if (ch.jump > 0) ch.jump = Math.max(0, ch.jump - dt * 1.7);

  if (ch.wave > 0) {
    ch.wave = Math.max(0, ch.wave - dt * 0.45);
    const k = Math.min(1, ch.wave * 3);
    ch.arms[1].rotation.z = lerp(0.1, 2.6, k) + Math.sin(time * 13) * 0.22 * k;
    ch.arms[1].rotation.x = 0;
  } else {
    ch.arms[1].rotation.z = damp(ch.arms[1].rotation.z, 0.1, 8, dt);
  }
  ch.arms[0].rotation.z = -0.1;

  ch.head.rotation.y = Math.sin(time * 0.6 + ch.lookT) * 0.3 * (1 - w);
  ch.head.rotation.z = Math.sin(time * 0.9 + ch.lookT) * 0.04;
  ch.blink -= dt;
  const open = ch.blink < 0.1 ? 0.1 : 1;
  if (ch.blink < 0) ch.blink = 2 + Math.random() * 3;
  ch.eyes.forEach((e) => { e.scale.y = open; });
  if (ch.pony) ch.pony.rotation.x = Math.sin(ch.phase * 2) * 0.22 * w + Math.sin(time * 1.5) * 0.04;
}
