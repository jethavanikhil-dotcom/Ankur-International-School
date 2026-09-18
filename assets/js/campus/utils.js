import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const range = (s, a, b) => clamp((s - a) / (b - a));
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* deterministic random */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* cheap 3D value noise (position-hashed so shared vertices move together) */
function hash(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = smooth(xf), v = smooth(yf), w = smooth(zf);
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

/* displace along normal + per-vertex colour variation (foliage, hedges, rocks) */
export function organic(src, { amount = 0.25, freq = 1.4, color = 0x4f8f3a, variance = 0.18, seed = 0 } = {}) {
  // weld vertices first so the displaced surface shades smoothly
  src.deleteAttribute('normal');
  src.deleteAttribute('uv');
  const geo = mergeVertices(src);
  const pos = geo.attributes.position;
  const base = new THREE.Color(color);
  const dir = new THREE.Vector3();
  const col = new Float32Array(pos.count * 3);
  const hsl = {};
  base.getHSL(hsl);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = noise3(x * freq + seed, y * freq, z * freq) - 0.5;
    // radial push keeps coincident vertices together, so no cracks
    dir.set(x, y, z).normalize();
    pos.setXYZ(i, x + dir.x * n * amount * 2, y + dir.y * n * amount * 2, z + dir.z * n * amount * 2);
    const shade = noise3(x * 2.3 + 9 + seed, y * 2.3, z * 2.3) - 0.5;
    const up = clamp(y * 0.15 + 0.5);
    tmp.setHSL(hsl.h + shade * 0.04, clamp(hsl.s + shade * variance), clamp(hsl.l * (0.78 + up * 0.35) + shade * variance * 0.6));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/* ---------------- materials ---------------- */
const cache = new Map();
export function mat(color, { rough = 0.85, metal = 0, ...rest } = {}) {
  const key = `${color}|${rough}|${metal}|${JSON.stringify(rest)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...rest }));
  return cache.get(key);
}
const vcCache = new Map();
function vcMat(rough, metal) {
  const key = `${rough}|${metal}`;
  if (!vcCache.has(key)) vcCache.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal }));
  return vcCache.get(key);
}

export function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, s, shadow = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (s !== undefined) m.scale.setScalar(s); else m.scale.set(sx, sy, sz);
  m.castShadow = shadow;
  m.receiveShadow = receive;
  return m;
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const dynamic = (...objs) => objs.forEach((o) => { o.userData.dynamic = true; });

/*
  bake(root): merge every static mesh under root into one mesh per material.
  Plain (untextured, opaque) standard materials collapse into vertex colours.
  Subtrees flagged userData.dynamic are skipped so they can keep animating.
*/
const KEEP = ['position', 'normal', 'uv', 'color'];
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const buckets = new Map();
  const victims = [];

  (function walk(obj) {
    for (const child of obj.children) {
      if (child.userData.dynamic || child.isInstancedMesh) continue;
      if (child.isMesh) {
        const m = child.material;
        const plain = m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.transparent
          && m.side === THREE.FrontSide && m.emissiveIntensity === 1 && m.emissive.getHex() === 0 && m.alphaTest === 0;
        const key = plain ? `vc|${m.roughness}|${m.metalness}` : m.uuid;
        const g = child.geometry.clone();
        g.applyMatrix4(rel.multiplyMatrices(inv, child.matrixWorld));
        Object.keys(g.attributes).forEach((a) => { if (!KEEP.includes(a)) g.deleteAttribute(a); });
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (plain) {
          const n = g.attributes.position.count;
          const src = g.attributes.color;
          const col = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            const r = src ? src.getX(i) : 1, gg = src ? src.getY(i) : 1, b = src ? src.getZ(i) : 1;
            col[i * 3] = m.color.r * r; col[i * 3 + 1] = m.color.g * gg; col[i * 3 + 2] = m.color.b * b;
          }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        } else if (g.attributes.color && !m.vertexColors) {
          g.deleteAttribute('color');
        }
        if (!buckets.has(key)) buckets.set(key, { mat: plain ? vcMat(m.roughness, m.metalness) : m, geos: [], cast: false, receive: false });
        const bk = buckets.get(key);
        bk.geos.push(g);
        bk.cast ||= child.castShadow;
        bk.receive ||= child.receiveShadow;
        victims.push(child);
      }
      walk(child);
    }
  })(root);

  victims.forEach((v) => v.parent && v.parent.remove(v));
  const out = [];
  buckets.forEach((bk) => {
    const hasColor = bk.geos.some((g) => g.attributes.color);
    let geos = bk.geos;
    if (hasColor) geos = geos.filter((g) => g.attributes.color);
    if (!geos.every((g) => g.index)) geos = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    const mm = new THREE.Mesh(merged, bk.mat);
    mm.castShadow = bk.cast;
    mm.receiveShadow = bk.receive;
    root.add(mm);
    out.push(mm);
  });
  return out;
}

export function registerPick(root, list, data) {
  root.traverse((o) => { if (o.isMesh) { o.userData.pick = data; list.push(o); } });
}
