import * as THREE from 'three';
import { rng } from './utils.js';

function make(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  t.userData.redraw = () => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
  return t;
}

function speckle(g, w, h, n, colors, size, r) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size * (0.4 + r());
    g.fillRect(r() * w, r() * h, s, s);
  }
}

export function grass(repeat = 80) {
  return make(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#7fae55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 0; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 40 + r() * 90);
      grd.addColorStop(0, r() > 0.5 ? 'rgba(140,180,90,.35)' : 'rgba(70,110,50,.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
    g.lineWidth = 1.2;
    for (let i = 0; i < 9000; i++) {
      const x = r() * w, y = r() * h, l = 3 + r() * 7;
      g.strokeStyle = ['#6c9a45', '#86b45c', '#94c066', '#739f4a', '#9fc674'][Math.floor(r() * 5)];
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke();
    }
  }, { repeat: [repeat, repeat] });
}

export function asphalt(rx = 60, ry = 2) {
  return make(512, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#5b5f68'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 14000, ['#4c5058', '#6a6e77', '#777b84', '#44474f'], 2, r);
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = 'rgba(40,42,48,.25)'; g.lineWidth = 1;
      g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 20; g.lineTo(x, y); }
      g.stroke();
    }
  }, { repeat: [rx, ry] });
}

export function pavers(rx = 4, ry = 4, tone = ['#e6ded0', '#ddd3c2', '#efe8dc', '#d5cab7']) {
  return make(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#b9ae9c'; g.fillRect(0, 0, w, h);
    const tw = 64, th = 32;
    for (let row = 0; row < h / th; row++) {
      for (let col = -1; col < w / tw + 1; col++) {
        const x = col * tw + (row % 2) * tw / 2, y = row * th;
        g.fillStyle = tone[Math.floor(r() * tone.length)];
        g.fillRect(x + 2, y + 2, tw - 4, th - 4);
        speckle(g, 0, 0, 0, [], 0, r);
        g.fillStyle = 'rgba(0,0,0,.035)';
        for (let k = 0; k < 20; k++) g.fillRect(x + 2 + r() * (tw - 6), y + 2 + r() * (th - 6), 2, 2);
      }
    }
  }, { repeat: [rx, ry] });
}

export function plaster(rx = 4, ry = 2) {
  return make(512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#e9e2d6'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 16000, ['rgba(0,0,0,.025)', 'rgba(255,255,255,.4)', 'rgba(120,100,80,.03)'], 2, r);
    for (let i = 0; i < 30; i++) {
      const grd = g.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 60 + r() * 120);
      grd.addColorStop(0, 'rgba(160,140,120,.05)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  }, { repeat: [rx, ry] });
}

export function stone(rx = 6, ry = 1) {
  return make(512, 256, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = '#8f8374'; g.fillRect(0, 0, w, h);
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      let x = -r() * 60;
      const y = row * (h / rows);
      while (x < w) {
        const sw = 60 + r() * 90;
        const shade = 180 + Math.floor(r() * 40);
        g.fillStyle = `rgb(${shade + 10},${shade},${shade - 18})`;
        g.fillRect(x + 2, y + 2, sw - 4, h / rows - 4);
        speckle(g, 0, 0, 0, [], 0, r);
        x += sw;
      }
    }
  }, { repeat: [rx, ry] });
}

export function wood(rx = 4, ry = 1) {
  return make(512, 128, (g, w, h) => {
    const r = rng(23);
    for (let i = 0; i < 8; i++) {
      const y = (i * h) / 8;
      g.fillStyle = ['#b7864f', '#a97a46', '#c29360'][i % 3];
      g.fillRect(0, y, w, h / 8 - 1);
      g.strokeStyle = 'rgba(80,50,20,.15)';
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, y + r() * h / 8); g.bezierCurveTo(w * 0.3, y + r() * h / 8, w * 0.6, y + r() * h / 8, w, y + r() * h / 8); g.stroke(); }
    }
  }, { repeat: [rx, ry] });
}

export function bark() {
  return make(128, 512, (g, w, h) => {
    const r = rng(29);
    g.fillStyle = '#6b4a33'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = ['#503523', '#7d5a40', '#5d412e'][i % 3]; g.lineWidth = 1 + r() * 3;
      const x = r() * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 40) g.lineTo(x + (r() - 0.5) * 10, y);
      g.stroke();
    }
  }, { repeat: [2, 2] });
}

/* transparent leaf cluster card */
export function leaves(palette = ['#4f8f3a', '#5f9e45', '#3f7a31', '#72ab52', '#8dbb5e']) {
  return make(256, 256, (g, w, h) => {
    const r = rng(31);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * w * 0.42;
      const x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d;
      g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
      g.fillStyle = palette[Math.floor(r() * palette.length)];
      g.beginPath(); g.ellipse(0, 0, 7 + r() * 5, 3 + r() * 2.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(30,60,20,.35)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke();
      g.restore();
    }
  });
}

export function grassBlades() {
  return make(128, 128, (g, w, h) => {
    const r = rng(37);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = 14 + r() * (w - 28), bend = (r() - 0.5) * 26, top = h * (0.15 + r() * 0.45);
      g.fillStyle = ['#7aa84f', '#8fbb5f', '#6c9a45', '#a0c96f'][i % 4];
      g.beginPath(); g.moveTo(x - 2.5, h); g.quadraticCurveTo(x + bend * 0.4, (h + top) / 2, x + bend, top); g.quadraticCurveTo(x + bend * 0.4 + 1, (h + top) / 2, x + 2.5, h); g.fill();
    }
  });
}

export function solar() {
  return make(256, 128, (g, w, h) => {
    g.fillStyle = '#1b2d52'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8fa3c7'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
}

export function sign(text, { bg = '#fdfcf8', fg = '#16214d', w = 1024, h = 128, font = '800 70px Outfit, system-ui, sans-serif', letter = 6 } = {}) {
  const t = make(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } else g.clearRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${letter}px`;
    g.fillText(text, w / 2, h / 2 + 4);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
