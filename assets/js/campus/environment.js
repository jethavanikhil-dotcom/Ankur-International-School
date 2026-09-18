import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mesh, box, mat, dynamic, noise3 } from './utils.js';
import * as T from './textures.js';

/* ---------------- sky, sun, image-based light ---------------- */
export function buildSky(scene, renderer, { isSmall }) {
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const u = sky.material.uniforms;
  u.turbidity.value = 3.2;
  u.rayleigh.value = 1.1;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.82;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xdcecff, 0x8aa66a, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0dc, 3.1);
  sun.castShadow = true;
  const size = isSmall ? 1024 : 2048;
  sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 300 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  const sunDir = new THREE.Vector3();
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  function setSun(elevationDeg, azimuthDeg = 205) {
    const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
    const theta = THREE.MathUtils.degToRad(azimuthDeg);
    sunDir.setFromSphericalCoords(1, phi, theta);
    u.sunPosition.value.copy(sunDir);
    sun.position.copy(sunDir).multiplyScalar(140);
    const warm = THREE.MathUtils.clamp(1 - (elevationDeg - 8) / 30, 0, 1);
    sun.color.setRGB(1, 0.93 - warm * 0.12, 0.84 - warm * 0.25);
    sun.intensity = 2.4 + (1 - warm) * 0.9;
  }

  function bakeEnvironment() {
    const envScene = new THREE.Scene();
    const s2 = new Sky();
    s2.scale.setScalar(1000);
    Object.keys(u).forEach((k) => { s2.material.uniforms[k].value = u[k].value.clone ? u[k].value.clone() : u[k].value; });
    envScene.add(s2);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0, 0.1, 2000);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.75;
  }

  setSun(22);
  bakeEnvironment();
  scene.fog = new THREE.Fog(0xd6e6f1, 140, 520);
  return { sky, sun, hemi, setSun, bakeEnvironment };
}

/* ---------------- ground, road, paths, boundary ---------------- */
export function buildGrounds(world) {
  // large-scale colour drift hides texture tiling
  const grassMat = new THREE.MeshStandardMaterial({ map: T.grass(260), roughness: 1, vertexColors: true });
  const groundGeo = new THREE.PlaneGeometry(1200, 1200, 160, 160);
  const gp = groundGeo.attributes.position;
  const gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i);
    const n = noise3(x * 0.035, y * 0.035, 1.7) * 0.6 + noise3(x * 0.11, y * 0.11, 4.2) * 0.4;
    const dry = noise3(x * 0.018 + 20, y * 0.018, 8);
    const k = 0.8 + n * 0.32;
    gc[i * 3] = k * (1 + dry * 0.12);
    gc[i * 3 + 1] = k;
    gc[i * 3 + 2] = k * (0.9 - dry * 0.1);
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  world.add(mesh(groundGeo, grassMat, { rx: -Math.PI / 2, shadow: false }));

  // road with kerbs and markings
  const asphaltMat = new THREE.MeshStandardMaterial({ map: T.asphalt(70, 1.5), roughness: 0.95 });
  world.add(mesh(box(700, 0.12, 8), asphaltMat, { y: 0.06, z: 34.5, shadow: false }));
  const paint = mat(0xf4f1e8, { rough: 0.8 });
  for (let x = -340; x < 340; x += 7) world.add(mesh(box(3.2, 0.02, 0.18), paint, { x, y: 0.125, z: 34.5, shadow: false }));
  world.add(mesh(box(700, 0.02, 0.15), mat(0xe9c84a, { rough: 0.8 }), { y: 0.125, z: 31.1, shadow: false }));
  for (let i = 0; i < 8; i++) world.add(mesh(box(0.55, 0.02, 7), paint, { x: -3.6 + i * 1.05, y: 0.125, z: 34.5, shadow: false }));

  const kerb = mat(0xcfccc4, { rough: 0.9 });
  world.add(mesh(box(700, 0.28, 0.3), kerb, { y: 0.14, z: 30.35 }));
  world.add(mesh(box(700, 0.28, 0.3), kerb, { y: 0.14, z: 38.65 }));
  const sidewalk = new THREE.MeshStandardMaterial({ map: T.pavers(180, 1), roughness: 0.95 });
  world.add(mesh(box(700, 0.22, 4), sidewalk, { y: 0.11, z: 28.2, shadow: false }));
  world.add(mesh(box(700, 0.22, 3), sidewalk, { y: 0.11, z: 40.3, shadow: false }));

  // campus walkway + forecourt
  const walk = new THREE.MeshStandardMaterial({ map: T.pavers(2, 5, ['#d9cdb8', '#cfc1a8', '#e2d8c6', '#c7b89e']), roughness: 0.95 });
  world.add(mesh(box(6.4, 0.1, 18.5), walk, { y: 0.05, z: 14.6, shadow: false }));
  const edge = mat(0xb8ad9a, { rough: 0.95 });
  world.add(mesh(box(0.25, 0.16, 18.5), edge, { x: -3.3, y: 0.08, z: 14.6 }));
  world.add(mesh(box(0.25, 0.16, 18.5), edge, { x: 3.3, y: 0.08, z: 14.6 }));
  const plaza = new THREE.MeshStandardMaterial({ map: T.pavers(8, 2), roughness: 0.95 });
  world.add(mesh(box(44, 0.09, 5.2), plaza, { y: 0.045, z: 4.5, shadow: false }));

  // boundary: stone plinth, railings, pillars (gate opening |x| < 4)
  const plinth = new THREE.MeshStandardMaterial({ map: T.stone(40, 1), roughness: 0.9 });
  const pillarMat = new THREE.MeshStandardMaterial({ map: T.stone(1, 3), roughness: 0.9 });
  const cap = mat(0xe9e5dc, { rough: 0.8 });
  const rail = mat(0x2a2f3a, { rough: 0.45, metal: 0.8 });
  for (const s of [-1, 1]) {
    const x0 = s * 5, x1 = s * 70;
    const len = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
    world.add(mesh(box(len, 0.8, 0.5), plinth, { x: cx, y: 0.4, z: 24 }));
    world.add(mesh(box(len, 0.1, 0.6), cap, { x: cx, y: 0.85, z: 24 }));
    world.add(mesh(box(len, 0.08, 0.08), rail, { x: cx, y: 2.05, z: 24 }));
    world.add(mesh(box(len, 0.06, 0.06), rail, { x: cx, y: 1.05, z: 24 }));
    for (let x = x0 + s * 0.2; Math.abs(x) < Math.abs(x1); x += s * 0.22) {
      world.add(mesh(box(0.035, 1.2, 0.035), rail, { x, y: 1.5, z: 24, shadow: false }));
    }
    for (let x = x0 + s * 6; Math.abs(x) < Math.abs(x1); x += s * 6) {
      world.add(mesh(box(0.7, 2.4, 0.7), pillarMat, { x, y: 1.2, z: 24 }));
      world.add(mesh(box(0.85, 0.15, 0.85), cap, { x, y: 2.45, z: 24 }));
    }
  }
}

/* ---------------- gate with name arch ---------------- */
export function buildGate(world) {
  const gate = new THREE.Group();
  gate.position.z = 24;
  world.add(gate);
  const pillarMat = new THREE.MeshStandardMaterial({ map: T.stone(1, 4), roughness: 0.9 });
  const cap = mat(0xe9e5dc, { rough: 0.8 });
  const rail = mat(0x2a2f3a, { rough: 0.45, metal: 0.8 });
  for (const x of [-4.6, 4.6]) {
    gate.add(mesh(box(1.4, 4.2, 1.4), pillarMat, { x, y: 2.1 }));
    gate.add(mesh(box(1.7, 0.25, 1.7), cap, { x, y: 4.32 }));
    gate.add(mesh(new THREE.SphereGeometry(0.28, 16, 10), new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd98a, emissiveIntensity: 0.6, roughness: 0.4 }), { x, y: 4.7, shadow: false }));
  }
  const archTex = T.sign('WELCOME', { bg: '#1d2a52', fg: '#ffe6a6', w: 512, h: 64, font: '700 38px Outfit, system-ui, sans-serif', letter: 12 });
  gate.add(mesh(box(8, 0.9, 0.35), mat(0x1d2a52, { rough: 0.5, metal: 0.4 }), { y: 5.05 }));
  gate.add(mesh(new THREE.PlaneGeometry(5, 0.62), new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: archTex, emissiveIntensity: 0.25 }), { y: 5.05, z: 0.18, shadow: false }));

  const leaves = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 3.9, 0, 0);
    const w = 3.8;
    hinge.add(mesh(box(w, 0.1, 0.1), rail, { x: -side * w / 2, y: 2.6 }));
    hinge.add(mesh(box(w, 0.08, 0.08), rail, { x: -side * w / 2, y: 0.35 }));
    hinge.add(mesh(box(w, 0.06, 0.06), rail, { x: -side * w / 2, y: 1.45 }));
    for (let i = 0; i <= 16; i++) hinge.add(mesh(box(0.04, 2.3, 0.04), rail, { x: -side * (0.05 + i * (w / 16)), y: 1.47, shadow: false }));
    dynamic(hinge);
    gate.add(hinge);
    leaves.push({ hinge, side });
  }
  return { gate, leaves, archTex };
}

/* ---------------- street furniture ---------------- */
export function buildFurniture(world) {
  const poleMat = mat(0x2a2f3a, { rough: 0.45, metal: 0.8 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe2a0, emissiveIntensity: 0.5, roughness: 0.3 });
  const lamp = (x, z) => {
    world.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.4, 10), poleMat, { x, y: 2.2, z }));
    world.add(mesh(box(0.9, 0.08, 0.08), poleMat, { x: x + 0.4 * Math.sign(-x || 1), y: 4.35, z }));
    world.add(mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.18, 16), poleMat, { x: x + 0.8 * Math.sign(-x || 1), y: 4.25, z }));
    world.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), glow, { x: x + 0.8 * Math.sign(-x || 1), y: 4.15, z, shadow: false }));
  };
  [[-4.4, 18], [-4.4, 11], [7.5, 19.5], [-18, 27.3], [18, 27.3]].forEach(([x, z]) => lamp(x, z));

  const woodMat = new THREE.MeshStandardMaterial({ map: T.wood(2, 1), roughness: 0.7 });
  const bench = (x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    for (let i = 0; i < 3; i++) g.add(mesh(box(2.2, 0.06, 0.16), woodMat, { y: 0.55, z: -0.2 + i * 0.2 }));
    for (let i = 0; i < 2; i++) g.add(mesh(box(2.2, 0.14, 0.05), woodMat, { y: 0.8 + i * 0.2, z: -0.33, rx: -0.12 }));
    for (const bx of [-0.9, 0.9]) g.add(mesh(box(0.08, 0.55, 0.55), poleMat, { x: bx, y: 0.3 }));
    world.add(g);
  };
  bench(-8.5, 12, 0.35); bench(8.5, 12, -0.35);

  // flag
  world.add(mesh(new THREE.CylinderGeometry(0.06, 0.09, 12, 12), mat(0xd6dae2, { rough: 0.35, metal: 0.8 }), { x: -13, y: 6, z: 12 }));
  world.add(mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 24), mat(0xe9e5dc, { rough: 0.8 }), { x: -13, y: 0.17, z: 12 }));
  const flagGeo = new THREE.PlaneGeometry(3, 1.9, 20, 8);
  flagGeo.translate(1.5, 0, 0);
  const base = flagGeo.attributes.position.array.slice();
  const flag = mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xef7a43, side: THREE.DoubleSide, roughness: 0.85 }), { x: -12.93, y: 11, z: 12 });
  dynamic(flag);
  world.add(flag);
  return {
    updateFlag(t) {
      const pos = flagGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1];
        const k = bx / 3;
        pos.array[i * 3 + 2] = Math.sin(bx * 1.7 - t * 4.2) * 0.26 * k + Math.sin(by * 2.2 + t * 2.6) * 0.06 * k;
        pos.array[i * 3 + 1] = by - k * k * 0.12;
      }
      pos.needsUpdate = true;
      flagGeo.computeVertexNormals();
    },
  };
}
