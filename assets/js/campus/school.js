import * as THREE from 'three';
import { mesh, box, mat, bake, dynamic, organic } from './utils.js';
import * as T from './textures.js';

/*
  Modern two/three-storey school, front facade faces +z at z = 0.
  Entrance atrium centred on x = 0, doors at z = 1.5, entrance platform top at y = 0.9.
*/
export function buildSchool() {
  const group = new THREE.Group();

  const wall = new THREE.MeshStandardMaterial({ map: T.plaster(6, 2), roughness: 0.92 });
  const wallSide = new THREE.MeshStandardMaterial({ map: T.plaster(3, 2), roughness: 0.92, color: 0xf3eee6 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: T.stone(14, 1), roughness: 0.9 });
  const stonePier = new THREE.MeshStandardMaterial({ map: T.stone(1, 6), roughness: 0.9 });
  const paverMat = new THREE.MeshStandardMaterial({ map: T.pavers(3, 1), roughness: 0.95 });
  const woodMat = new THREE.MeshStandardMaterial({ map: T.wood(3, 2), roughness: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x7ea6c4, metalness: 0.2, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8 });
  const frame = mat(0x3a404d, { rough: 0.4, metal: 0.7 });
  const trim = mat(0xf8f7f3, { rough: 0.6 });
  const roofMat = mat(0x9a9791, { rough: 1 });
  const metalGrey = mat(0xb9bec6, { rough: 0.45, metal: 0.6 });

  /* one window: reveal surround, glass, mullions, sill, sunshade */
  function windowUnit(parent, x, y, z, { w = 2.2, h = 2.4, shade = true, fin = null, ry = 0 } = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const d = 0.32, t = 0.16;
    g.add(mesh(box(w, h, 0.05), glass, { z: 0.02 }));
    g.add(mesh(box(t, h + t * 2, d), trim, { x: -w / 2 - t / 2, z: d / 2 }));
    g.add(mesh(box(t, h + t * 2, d), trim, { x: w / 2 + t / 2, z: d / 2 }));
    g.add(mesh(box(w, t, d), trim, { y: h / 2 + t / 2, z: d / 2 }));
    g.add(mesh(box(w + 0.5, 0.1, 0.5), trim, { y: -h / 2 - 0.1, z: 0.25 }));
    g.add(mesh(box(0.07, h, 0.1), frame, { z: 0.08 }));
    g.add(mesh(box(w, 0.07, 0.1), frame, { y: h * 0.18, z: 0.08 }));
    if (shade) g.add(mesh(box(w + 0.8, 0.09, 0.95), trim, { y: h / 2 + 0.45, z: 0.48 }));
    if (fin) g.add(mesh(box(0.16, h + 1.2, 0.6), mat(fin, { rough: 0.7 }), { x: w / 2 + 0.55, z: 0.3 }));
    parent.add(g);
  }

  function block({ x0, x1, depth, floors, finColor, sideWindows = 0 }) {
    const H = floors * 4;
    const W = x1 - x0;
    const cx = (x0 + x1) / 2;
    group.add(mesh(box(W, H, depth), wall, { x: cx, y: H / 2, z: -depth / 2 }));
    group.add(mesh(box(W + 0.1, 1.1, 0.12), stoneMat, { x: cx, y: 0.55, z: 0.06 }));
    for (let f = 1; f < floors; f++) group.add(mesh(box(W + 0.2, 0.28, 0.32), trim, { x: cx, y: f * 4, z: 0.16 }));
    // parapet + roof
    group.add(mesh(box(W + 0.3, 0.25, depth + 0.3), mat(0xe9e6df, { rough: 0.8 }), { x: cx, y: H + 0.95, z: -depth / 2 }));
    group.add(mesh(box(W, 0.9, 0.25), trim, { x: cx, y: H + 0.45, z: -0.12 }));
    group.add(mesh(box(W, 0.9, 0.25), trim, { x: cx, y: H + 0.45, z: -depth + 0.12 }));
    group.add(mesh(box(0.25, 0.9, depth), trim, { x: x0 + 0.12, y: H + 0.45, z: -depth / 2 }));
    group.add(mesh(box(0.25, 0.9, depth), trim, { x: x1 - 0.12, y: H + 0.45, z: -depth / 2 }));
    group.add(mesh(box(W - 0.5, 0.1, depth - 0.5), roofMat, { x: cx, y: H + 0.05, z: -depth / 2, shadow: false }));
    // windows
    const count = Math.floor((W - 1) / 3);
    const start = cx - ((count - 1) * 3) / 2;
    for (let f = 0; f < floors; f++) {
      for (let i = 0; i < count; i++) {
        windowUnit(group, start + i * 3, f * 4 + 2.35, 0, { fin: f > 0 && i % 2 === 0 ? finColor : null });
      }
    }
    for (let f = 0; f < floors && sideWindows; f++) {
      for (let i = 0; i < sideWindows; i++) {
        const sx = x0 < 0 ? x0 : x1;
        windowUnit(group, sx, f * 4 + 2.35, -2.5 - i * 3.2, { ry: x0 < 0 ? -Math.PI / 2 : Math.PI / 2, shade: false });
      }
    }
    return H;
  }

  // main block (3 floors) and wings (2 floors)
  block({ x0: -20, x1: -6, depth: 14, floors: 3, finColor: 0xe0865a });
  block({ x0: 6, x1: 20, depth: 14, floors: 3, finColor: 0xe0865a });
  block({ x0: -34, x1: -20, depth: 12, floors: 2, finColor: 0x3f8f75, sideWindows: 3 });
  block({ x0: 20, x1: 34, depth: 12, floors: 2, finColor: 0x6b7fd8, sideWindows: 3 });

  /* ---------- entrance atrium ---------- */
  const TH = 15.5;
  group.add(mesh(box(12, TH, 14.5), wallSide, { y: TH / 2, z: -5.75 }));
  for (const s of [-1, 1]) group.add(mesh(box(1.1, TH, 1.2), stonePier, { x: s * 5.65, y: TH / 2, z: 1.0 }));
  group.add(mesh(box(10.2, 9.2, 0.1), glass, { y: 9.4, z: 1.1 }));
  for (let i = 0; i <= 8; i++) group.add(mesh(box(0.1, 9.2, 0.25), frame, { x: -5.1 + i * 1.275, y: 9.4, z: 1.2 }));
  for (let i = 0; i <= 6; i++) group.add(mesh(box(10.2, 0.1, 0.25), frame, { y: 4.8 + i * 1.53, z: 1.2 }));
  group.add(mesh(box(12.3, 1.5, 1.3), trim, { y: TH - 0.75, z: 0.95 }));
  group.add(mesh(box(12.4, 0.25, 15), mat(0xe9e6df, { rough: 0.8 }), { y: TH + 0.12, z: -5.75 }));

  // clock
  group.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 40), trim, { y: TH - 0.75, z: 1.65, rx: Math.PI / 2 }));
  group.add(mesh(new THREE.TorusGeometry(0.62, 0.06, 10, 40), frame, { y: TH - 0.75, z: 1.7 }));
  const hourHand = mesh(box(0.06, 0.34, 0.03), frame, { y: TH - 0.75, z: 1.75, shadow: false });
  hourHand.geometry.translate(0, 0.17, 0);
  const minuteHand = mesh(box(0.04, 0.5, 0.03), mat(0xe0865a), { y: TH - 0.75, z: 1.78, shadow: false });
  minuteHand.geometry.translate(0, 0.25, 0);
  dynamic(hourHand, minuteHand);
  group.add(hourHand, minuteHand);

  // canopy: wood soffit, white fascia with the school name
  group.add(mesh(box(15, 0.5, 6.2), trim, { y: 4.65, z: 4.3 }));
  group.add(mesh(box(14.6, 0.05, 5.8), woodMat, { y: 4.38, z: 4.3, shadow: false }));
  const nameTex = T.sign('BRIGHTSIDE ACADEMY', { bg: '#f8f7f3', fg: '#16214d', w: 1024, h: 64, font: '700 40px Outfit, system-ui, sans-serif', letter: 10 });
  group.add(mesh(box(15, 0.5, 0.02), new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.6 }), { y: 4.65, z: 7.41, shadow: false }));
  for (const s of [-1, 1]) group.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.8, 16), metalGrey, { x: s * 6.8, y: 2.3, z: 6.8 }));

  // platform + steps
  group.add(mesh(box(12, 0.9, 2), paverMat, { y: 0.45, z: 2.5 }));
  group.add(mesh(box(12, 0.6, 0.5), paverMat, { y: 0.3, z: 3.75 }));
  group.add(mesh(box(12, 0.3, 0.5), paverMat, { y: 0.15, z: 4.25 }));
  // ramp with handrail on the left
  const ramp = mesh(box(9, 0.2, 1.6), paverMat, { x: -10.4, y: 0.45, z: 2.7, rz: -Math.atan2(0.9, 9) });
  group.add(ramp);
  for (let i = 0; i <= 4; i++) {
    const px = -6.4 - i * 2;
    const py = 0.9 - (i * 2 / 9) * 0.9;
    group.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), metalGrey, { x: px, y: py + 0.5, z: 3.45 }));
  }
  group.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 9.1, 8), metalGrey, { x: -10.4, y: 1.45, z: 3.45, rz: Math.PI / 2 - Math.atan2(0.9, 9) }));

  // interior darkness behind doors + doors
  group.add(mesh(box(10, 3.5, 0.1), mat(0x2b3444, { rough: 0.9 }), { y: 2.6, z: 1.0, shadow: false }));
  const doors = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.45, 0.9, 1.5);
    hinge.add(mesh(box(1.4, 2.9, 0.06), glass, { x: -side * 0.7, y: 1.45 }));
    hinge.add(mesh(box(1.45, 0.1, 0.1), frame, { x: -side * 0.7, y: 2.92 }));
    hinge.add(mesh(box(0.08, 2.9, 0.1), frame, { x: -side * 1.4, y: 1.45 }));
    hinge.add(mesh(box(0.05, 0.9, 0.08), metalGrey, { x: -side * 1.25, y: 1.4, z: 0.12 }));
    dynamic(hinge);
    group.add(hinge);
    doors.push({ hinge, side, open: 0 });
  }

  // cupola with bell
  const belfry = new THREE.Group();
  belfry.position.set(0, TH + 0.25, -3);
  for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) belfry.add(mesh(box(0.2, 2.4, 0.2), trim, { x, y: 1.2, z }));
  belfry.add(mesh(box(2.8, 0.25, 2.8), trim, { y: 2.45 }));
  belfry.add(mesh(new THREE.ConeGeometry(2.1, 1.6, 4), mat(0x5c8f7e, { rough: 0.5, metal: 0.35 }), { y: 3.35, ry: Math.PI / 4 }));
  belfry.add(mesh(new THREE.SphereGeometry(0.14, 12, 8), mat(0xc9a23c, { rough: 0.3, metal: 1 }), { y: 4.2 }));
  const bell = new THREE.Group();
  bell.position.y = 2.3;
  bell.add(mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.04, 0), new THREE.Vector2(0.28, -0.08), new THREE.Vector2(0.36, -0.5),
    new THREE.Vector2(0.58, -0.9), new THREE.Vector2(0.6, -0.98), new THREE.Vector2(0.0, -0.98),
  ], 28), new THREE.MeshStandardMaterial({ color: 0xc9a23c, roughness: 0.28, metalness: 1, side: THREE.DoubleSide })));
  dynamic(bell);
  belfry.add(bell);
  dynamic(belfry);
  group.add(belfry);

  /* ---------- roof details ---------- */
  const solarMat = new THREE.MeshStandardMaterial({ map: T.solar(), roughness: 0.25, metalness: 0.5 });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      group.add(mesh(box(3.6, 0.08, 2), solarMat, { x: sx * (9 + i * 3.9), y: 12.9, z: -8, rx: -0.4 }));
      group.add(mesh(box(0.08, 0.8, 0.08), metalGrey, { x: sx * (9 + i * 3.9), y: 12.4, z: -7.3 }));
    }
    for (let i = 0; i < 2; i++) {
      group.add(mesh(box(1.5, 1, 1.1), mat(0xd9dce1, { rough: 0.5, metal: 0.3 }), { x: sx * (12 + i * 4), y: 12.5, z: -3.2 }));
      group.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20), mat(0x4a505b), { x: sx * (12 + i * 4), y: 13.02, z: -3.2 }));
    }
    group.add(mesh(new THREE.CylinderGeometry(1, 1, 1.8, 20), mat(0x3d4a66, { rough: 0.6 }), { x: sx * 27, y: 8.9, z: -8 }));
  }

  /* ---------- planters along the facade ---------- */
  const planter = mat(0xc9bfae, { rough: 0.9 });
  for (const sx of [-1, 1]) {
    for (const [px, len] of [[13, 12], [27, 12]]) {
      const x = sx * px;
      group.add(mesh(box(len, 0.6, 1.4), planter, { x, y: 0.3, z: 1.2 }));
      for (let k = 0; k < len / 1.3; k++) {
        const geo = organic(new THREE.IcosahedronGeometry(0.6, 2), { amount: 0.18, freq: 2, color: k % 3 ? 0x4f8a3a : 0x5e9a44, seed: x + k });
        group.add(mesh(geo, mat(0xffffff, { rough: 0.95 }), { x: x - len / 2 + 0.7 + k * 1.3, y: 0.85, z: 1.2, sy: 0.75 }));
        if (k % 2) group.add(mesh(new THREE.SphereGeometry(0.12, 8, 6), mat([0xf28ca8, 0xf5c542, 0xffffff][k % 3], { rough: 0.8 }), { x: x - len / 2 + 0.9 + k * 1.3, y: 1.25, z: 1.5 }));
      }
    }
  }

  bake(belfry);
  bake(group);

  return {
    group, doors, belfry, bell, hourHand, minuteHand,
    redrawText: () => nameTex.userData.redraw(),
    /* walkable height in front of the entrance */
    groundY(x, z) {
      if (Math.abs(x) > 6 || z > 4.6) return 0;
      const edge = (e, h) => Math.min(1, Math.max(0, (e - z) / 0.12 + 0.5)) * h;
      return edge(4.5, 0.3) + edge(4.0, 0.3) + edge(3.5, 0.3);
    },
  };
}
