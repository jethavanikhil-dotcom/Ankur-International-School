import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mesh, box, mat, bake, dynamic } from './utils.js';
import * as T from './textures.js';

const rbox = (w, h, d, r = 0.2, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

/* ---------------- school bus (drives along +x, door on the campus side, -z) ---------------- */
export function buildBus() {
  const bus = new THREE.Group();
  const body = new THREE.Group();
  bus.add(body);

  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf2b92c, roughness: 0.35, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.6 });
  const black = mat(0x1f232b, { rough: 0.6, metal: 0.2 });
  const chrome = mat(0xd8dde4, { rough: 0.2, metal: 1 });

  body.add(mesh(rbox(10.4, 2.7, 2.9, 0.35), paint, { y: 2.15 }));
  body.add(mesh(rbox(1.9, 1.5, 2.8, 0.3), paint, { x: 5.9, y: 1.55 }));
  body.add(mesh(box(8.9, 1.0, 2.96), glass, { x: -0.6, y: 2.75, shadow: false }));
  for (let i = 0; i < 6; i++) body.add(mesh(box(0.14, 1.02, 2.98), paint, { x: -4.9 + i * 1.72, y: 2.75 }));
  body.add(mesh(box(0.08, 1.15, 2.4), glass, { x: 5.2, y: 2.7, rz: 0.12, shadow: false }));
  body.add(mesh(box(10.5, 0.14, 2.98), black, { y: 2.08 }));
  body.add(mesh(box(10.5, 0.1, 2.98), black, { y: 1.62 }));
  body.add(mesh(rbox(0.4, 0.5, 2.9, 0.1), black, { x: 6.9, y: 0.95 }));
  body.add(mesh(rbox(0.3, 0.4, 2.9, 0.1), black, { x: -5.25, y: 0.95 }));
  const busTex = T.sign('SCHOOL BUS', { bg: null, fg: '#1f232b', w: 512, h: 96, font: '800 60px Outfit, system-ui, sans-serif', letter: 4 });
  const signMat = new THREE.MeshStandardMaterial({ map: busTex, transparent: true, roughness: 0.5 });
  body.add(mesh(new THREE.PlaneGeometry(4.4, 0.8), signMat, { x: -1.2, y: 1.2, z: 1.47, shadow: false }));
  const signBack = mesh(new THREE.PlaneGeometry(4.4, 0.8), signMat, { x: -1.2, y: 1.2, z: -1.47, ry: Math.PI, shadow: false });
  body.add(signBack);
  // mirrors, lights
  for (const z of [-1.7, 1.7]) {
    body.add(mesh(box(0.1, 0.1, 0.4), black, { x: 6.5, y: 2.9, z: z * 0.92 }));
    body.add(mesh(rbox(0.12, 0.5, 0.3, 0.05), black, { x: 6.5, y: 2.6, z }));
  }
  const headlights = [];
  for (const z of [-1.05, 1.05]) {
    const hl = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0.4 }), { x: 6.87, y: 1.55, z, rz: Math.PI / 2, shadow: false });
    dynamic(hl);
    body.add(hl);
    headlights.push(hl);
    body.add(mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), chrome, { x: 6.9, y: 1.55, z, ry: Math.PI / 2, shadow: false }));
    body.add(mesh(box(0.06, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0x8a1c10, emissiveIntensity: 0.5 }), { x: -5.25, y: 1.7, z, shadow: false }));
  }
  const door = mesh(box(1.1, 2.2, 0.06), glass, { x: 3.9, y: 1.9, z: -1.47, shadow: false });
  dynamic(door);
  body.add(door);
  body.add(mesh(box(1.25, 0.08, 0.08), black, { x: 3.9, y: 3.02, z: -1.48 }));

  const wheels = [];
  const tire = mat(0x1b1d22, { rough: 0.9 });
  for (const [x, z] of [[-3.3, -1.35], [-3.3, 1.35], [4.5, -1.35], [4.5, 1.35]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.72, z);
    w.add(mesh(new THREE.TorusGeometry(0.5, 0.22, 12, 24), tire, { ry: 0 }));
    w.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20), chrome, { rx: Math.PI / 2 }));
    w.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 12), black, { rx: Math.PI / 2 }));
    bus.add(w);
    wheels.push(w);
    bake(w);
    dynamic(w);
  }
  bake(body);
  return { bus, body, wheels, door, headlights, busTex };
}

/* ---------------- playground (swings are interactive) ---------------- */
export function buildPlayground() {
  const play = new THREE.Group();
  const frame = mat(0x2f5f9e, { rough: 0.4, metal: 0.5 });
  const chain = mat(0x9aa1ab, { rough: 0.3, metal: 1 });
  const rubber = mat(0xc75b3c, { rough: 1 });

  play.add(mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.08, 40), rubber, { y: 0.04, x: 2, shadow: false }));
  for (const x of [-2.8, 2.8]) {
    play.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.4, 10), frame, { x, y: 2.05, z: -0.9, rx: 0.22 }));
    play.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.4, 10), frame, { x, y: 2.05, z: 0.9, rx: -0.22 }));
  }
  play.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.9, 12), frame, { y: 4.2, rz: Math.PI / 2 }));

  const swings = [];
  [-1.3, 1.3].forEach((x, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 4.15, 0);
    for (const cx of [-0.38, 0.38]) pivot.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6), chain, { x: cx, y: -1.6 }));
    pivot.add(mesh(rbox(0.95, 0.1, 0.42, 0.04, 2), mat(i ? 0x2e8a5e : 0xef7a43, { rough: 0.7 }), { y: -3.2 }));
    bake(pivot);
    dynamic(pivot);
    play.add(pivot);
    swings.push({ pivot, angle: i ? -0.25 : 0.35, vel: 0 });
  });

  const slide = new THREE.Group();
  slide.position.set(6.5, 0, 0.5);
  slide.add(mesh(rbox(1.6, 0.2, 1.6, 0.05, 2), mat(0x3d7bf5, { rough: 0.5 }), { y: 2.6 }));
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) slide.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.6, 10), frame, { x, y: 1.8, z }));
  slide.add(mesh(rbox(1.3, 0.14, 4.8, 0.06, 2), new THREE.MeshPhysicalMaterial({ color: 0xf5c542, roughness: 0.3, clearcoat: 0.6 }), { y: 1.35, z: 2.85, rx: 0.58 }));
  for (let i = 0; i < 6; i++) slide.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8), chain, { y: 0.35 + i * 0.42, z: -0.8, rz: Math.PI / 2 }));
  // roof
  slide.add(mesh(new THREE.ConeGeometry(1.4, 1, 4), mat(0xef7a43, { rough: 0.6 }), { y: 4.1, ry: Math.PI / 4 }));
  play.add(slide);

  bake(play);
  return { play, swings };
}
