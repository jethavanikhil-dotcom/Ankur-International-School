import * as THREE from 'three';
import { mesh, mat, bake, organic, rng } from './utils.js';
import * as T from './textures.js';

const leafTex = T.leaves();
const leafTexDry = T.leaves(['#6f9a3a', '#88a845', '#5c8a34', '#a0b85a', '#7ea24a']);
const barkMat = new THREE.MeshStandardMaterial({ map: T.bark(), roughness: 1 });

function leafMaterial(map) {
  const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.45 });
  return { m, depth };
}
const leafMats = [leafMaterial(leafTex), leafMaterial(leafTexDry)];

/* ---------------- trees ---------------- */
export function makeTree(x, z, { scale = 1, seed = 1, kind = 'round' } = {}) {
  const r = rng(seed * 977 + 13);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = r() * Math.PI * 2;

  const trunkH = kind === 'tall' ? 3 : 3.6 + r() * 0.8;
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.36, trunkH, 10, 3), barkMat, { y: trunkH / 2 }));
  const crown = new THREE.Group();
  crown.position.y = trunkH - 0.2;
  g.add(crown);

  const clusters = [];
  const green = [0x4c8a36, 0x5b9a40, 0x467f33, 0x62a347][Math.floor(r() * 4)];
  if (kind === 'tall') {
    for (let i = 0; i < 5; i++) clusters.push({ c: new THREE.Vector3((r() - 0.5) * 0.6, 0.8 + i * 1.3, (r() - 0.5) * 0.6), rad: 1.25 - i * 0.14 });
  } else {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + r();
      crown.add(mesh(new THREE.CylinderGeometry(0.06, 0.13, 2, 6), barkMat, { x: Math.cos(a) * 0.6, y: 0.6, z: Math.sin(a) * 0.6, rz: Math.cos(a) * 0.7, rx: -Math.sin(a) * 0.7 }));
    }
    clusters.push({ c: new THREE.Vector3(0, 2.2, 0), rad: 1.9 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.5;
      clusters.push({ c: new THREE.Vector3(Math.cos(a) * 1.5, 1.2 + r() * 1.4, Math.sin(a) * 1.5), rad: 1.1 + r() * 0.5 });
    }
    clusters.push({ c: new THREE.Vector3((r() - 0.5), 3.4, (r() - 0.5)), rad: 1.2 });
  }
  clusters.forEach((cl, i) => {
    const geo = organic(new THREE.IcosahedronGeometry(cl.rad, 3), { amount: cl.rad * 0.22, freq: 1.3 / cl.rad, color: green, variance: 0.2, seed: seed + i * 3.1 });
    crown.add(mesh(geo, mat(0xffffff, { rough: 0.95 }), { x: cl.c.x, y: cl.c.y, z: cl.c.z }));
  });
  bake(crown);

  // leaf cards break up the silhouette
  const count = kind === 'tall' ? 60 : 110;
  const lm = leafMats[r() > 0.7 ? 1 : 0];
  const cards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.2, 1.2), lm.m, count);
  cards.customDepthMaterial = lm.depth;
  cards.castShadow = true;
  cards.receiveShadow = true;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), d = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const cl = clusters[Math.floor(r() * clusters.length)];
    d.set(r() - 0.5, r() - 0.35, r() - 0.5).normalize();
    p.copy(cl.c).addScaledVector(d, cl.rad * (0.85 + r() * 0.3));
    e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
    q.setFromEuler(e);
    s.setScalar(0.7 + r() * 0.8);
    cards.setMatrixAt(i, m4.compose(p, q, s));
    col.setHSL(0.27 + r() * 0.05, 0.45 + r() * 0.2, 0.62 + r() * 0.25);
    cards.setColorAt(i, col);
  }
  crown.add(cards);

  return { g, crown, shake: 0, seed: r() * 10 };
}

/* ---------------- grass tufts (instanced, wind in the vertex shader) ---------------- */
export function makeGrass(count, allow) {
  const plane = new THREE.PlaneGeometry(0.9, 0.7);
  plane.translate(0, 0.35, 0);
  const plane2 = plane.clone().rotateY(Math.PI / 2);
  const geo = new THREE.BufferGeometry();
  // merge two crossed planes
  const merge = (a, b) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const A = a.attributes[name].array, B = b.attributes[name].array;
      const arr = new Float32Array(A.length + B.length);
      arr.set(A); arr.set(B, A.length);
      out.setAttribute(name, new THREE.BufferAttribute(arr, a.attributes[name].itemSize));
    }
    const off = a.attributes.position.count;
    out.setIndex([...a.index.array, ...[...b.index.array].map((i) => i + off)]);
    return out;
  };
  const crossed = merge(plane, plane2);
  geo.copy(crossed);

  const uniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({ map: T.grassBlades(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  float sway = sin(uTime * 1.8 + instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.25);\n  transformed.x += sway * 0.12 * uv.y;\n  transformed.z += cos(uTime * 1.3 + instanceMatrix[3].x * 0.2) * 0.05 * uv.y;'
    );
  };
  const inst = new THREE.InstancedMesh(geo, material, count);
  inst.receiveShadow = true;
  const r = rng(99);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 20) {
    const a = r() * Math.PI * 2, rad = 6 + Math.pow(r(), 1.3) * 75;
    p.set(Math.cos(a) * rad, 0, Math.sin(a) * rad * 0.9 + 6);
    if (!allow(p.x, p.z)) continue;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
    s.setScalar(0.45 + r() * 0.5);
    inst.setMatrixAt(placed, m4.compose(p, q, s));
    col.setHSL(0.24 + r() * 0.04, 0.35 + r() * 0.15, 0.85 + r() * 0.15);
    inst.setColorAt(placed, col);
    placed++;
  }
  inst.count = placed;
  return { mesh: inst, uniforms };
}

/* ---------------- hedge row ---------------- */
export function hedgeRow(parent, x0, x1, z, { height = 1.3, seed = 5 } = {}) {
  const r = rng(seed);
  const dir = Math.sign(x1 - x0);
  for (let x = x0; dir > 0 ? x < x1 : x > x1; x += dir * 1.5) {
    const geo = organic(new THREE.IcosahedronGeometry(1, 2), { amount: 0.2, freq: 1.8, color: 0x44803a, variance: 0.22, seed: x * 0.7 + seed });
    parent.add(mesh(geo, mat(0xffffff, { rough: 0.95 }), { x, y: height * 0.55, z: z + (r() - 0.5) * 0.2, sx: 1.05, sy: height * 0.62, sz: 0.85 }));
  }
}

export function shrub(parent, x, z, s = 1, flowers = null, seed = 1) {
  const geo = organic(new THREE.IcosahedronGeometry(0.9, 2), { amount: 0.22, freq: 1.8, color: 0x4f8a3a, seed });
  parent.add(mesh(geo, mat(0xffffff, { rough: 0.95 }), { x, y: 0.6 * s, z, s, sy: 0.8 * s }));
  if (flowers) {
    const r = rng(seed * 31);
    for (let i = 0; i < 6; i++) {
      const a = r() * Math.PI * 2;
      parent.add(mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), mat(flowers, { rough: 0.7 }), { x: x + Math.cos(a) * 0.65 * s, y: (0.7 + r() * 0.35) * s, z: z + Math.sin(a) * 0.6 * s, shadow: false }));
    }
  }
}
