// 책상 소품(귀여운 아늑한 느낌) — 모두 코드로 만든 창천 고유 모양. 크기는 실제보다 약간 크게(눈에 잘 띄게).
// decorateDesk(seatPos(Vector3), faceDeg, items[], opts) → THREE.Group (장면에 추가해서 사용)
// 좌표: 자리(의자) 기준 f = 앞으로(m), l = 오른쪽(m). 책상 윗면 높이 opts.top (기본 0.745)
import * as THREE from 'three';

const K = 1.35;   // 소품 크기 배율
const cache = new Map();
const M = (color, rough = 0.55, extra = {}) => {
  const key = color + rough + JSON.stringify(extra);
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
  return cache.get(key);
};
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const cyl = (rt, rb, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const sph = (r, m, s = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, s, Math.round(s * 0.75)), m);
function rounded(w, h, d, r, m) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: r * 0.3, bevelThickness: r * 0.3, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, m);
}
function labelTex(text, bg = '#f4efe6', fg = '#3a3330', w = 256, h = 96) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `700 ${Math.round(h * 0.5)}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- 소품들(바닥 원점, +X = 사람 쪽을 바라봄) ----
const PROPS = {
  mug(c = '#6f9be8') {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.085, 28, 1, true), M(c, 0.4, { side: THREE.DoubleSide }), 0, 0.0425));
    g.add(mesh(new THREE.CircleGeometry(0.036, 24).rotateX(-Math.PI / 2), M(c, 0.4), 0, 0.002));
    g.add(mesh(new THREE.CircleGeometry(0.037, 24).rotateX(-Math.PI / 2), M('#5a3424', 0.3), 0, 0.072));   // 커피
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 10, 20, Math.PI * 1.3), M(c, 0.4));
    h.rotation.set(0, 0, -Math.PI * 0.65); h.position.set(0, 0.045, 0.045); h.rotation.y = Math.PI / 2;
    g.add(h);
    g.add(mesh(new THREE.CircleGeometry(0.012, 16), M('#ffffff', 0.5), 0.0405, 0.05, 0).rotateY(Math.PI / 2));
    return g;
  },
  tumbler() {
    const g = new THREE.Group();
    const c = cyl(0.033, 0.03, 0.15, M('#9fd8c0', 0.35)); c.position.y = 0.075; g.add(c);
    const lid = cyl(0.034, 0.034, 0.025, M('#e9f6f0', 0.4)); lid.position.y = 0.162; g.add(lid);
    g.add(mesh(new THREE.CircleGeometry(0.012, 3), M('#ffffff', 0.5), 0.0335, 0.08, 0).rotateY(Math.PI / 2));
    return g;
  },
  coffee() {
    const g = new THREE.Group();
    const c = cyl(0.034, 0.026, 0.11, M('#fbfaf7', 0.6)); c.position.y = 0.055; g.add(c);
    const sl = cyl(0.033, 0.03, 0.04, M('#b07a4f', 0.8)); sl.position.y = 0.055; g.add(sl);
    const lid = cyl(0.036, 0.035, 0.014, M('#3b3634', 0.5)); lid.position.y = 0.117; g.add(lid);
    return g;
  },
  headphones() {
    const g = new THREE.Group();
    const wood = M('#b9875b', 0.55), dark = M('#2f3236', 0.45), mint = M('#9fd8c0', 0.45);
    g.add(mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.012, 28), wood, 0, 0.006));
    const pole = cyl(0.006, 0.006, 0.2, wood); pole.position.y = 0.11; g.add(pole);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.009, 10, 30, Math.PI), dark);
    band.position.y = 0.155; g.add(band);
    for (const s of [-1, 1]) {
      const cup = cyl(0.03, 0.03, 0.026, dark); cup.rotation.x = Math.PI / 2; cup.rotation.z = 0; cup.position.set(s * 0.066, 0.15, 0);
      cup.rotation.set(0, 0, Math.PI / 2); g.add(cup);
      const pad = cyl(0.024, 0.024, 0.008, mint); pad.rotation.set(0, 0, Math.PI / 2); pad.position.set(s * 0.052, 0.15, 0); g.add(pad);
    }
    g.rotation.y = Math.PI / 2;
    return g;
  },
  bear() {
    const g = new THREE.Group();
    const fur = M('#c98d5a', 0.85), light = M('#efd2b1', 0.85), red = M('#d9534f', 0.6), dark = M('#2b2220', 0.4);
    g.add(mesh(new THREE.SphereGeometry(0.04, 18, 14), fur, 0, 0.045));
    const head = sph(0.034, fur); head.position.y = 0.105; g.add(head);
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.SphereGeometry(0.013, 12, 10), fur, -0.005, 0.135, s * 0.026));
      g.add(mesh(new THREE.SphereGeometry(0.016, 12, 10), fur, 0.012, 0.02, s * 0.03));       // 다리
      g.add(mesh(new THREE.SphereGeometry(0.013, 12, 10), fur, 0.02, 0.06, s * 0.04));        // 팔
      g.add(mesh(new THREE.SphereGeometry(0.004, 8, 6), dark, 0.03, 0.112, s * 0.012));       // 눈
    }
    g.add(mesh(new THREE.SphereGeometry(0.013, 12, 10), light, 0.03, 0.098, 0));
    g.add(mesh(new THREE.SphereGeometry(0.004, 8, 6), dark, 0.042, 0.101, 0));
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 20), red); sc.rotation.x = Math.PI / 2; sc.position.y = 0.078; g.add(sc);
    return g;
  },
  tissue() {
    const g = new THREE.Group();
    const b = rounded(0.12, 0.06, 0.07, 0.01, M('#bcd6ee', 0.6)); g.add(b);
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CircleGeometry(0.006, 10).rotateY(Math.PI / 2), M('#ffffff', 0.6), 0.036, 0.02 + (i % 2) * 0.02, -0.04 + i * 0.016));
    const tis = sph(0.03, M('#ffffff', 0.9)); tis.scale.set(0.6, 0.7, 1.1); tis.position.y = 0.075; g.add(tis);
    g.rotation.y = Math.PI / 2;
    return g;
  },
  pencils() {
    const g = new THREE.Group();
    const c = cyl(0.028, 0.026, 0.075, M('#4f74c8', 0.5)); c.position.y = 0.0375; g.add(c);
    const cols = ['#f2c14e', '#e56b6f', '#5fb49c', '#ffffff'];
    cols.forEach((col, i) => {
      const p = cyl(0.004, 0.004, 0.12, M(col, 0.5), 8);
      p.position.set(-0.01 + (i % 2) * 0.016, 0.1, -0.01 + Math.floor(i / 2) * 0.016);
      p.rotation.set((i - 1.5) * 0.08, 0, (i % 2 ? 1 : -1) * 0.08); g.add(p);
    });
    return g;
  },
  calendar() {
    const g = new THREE.Group();
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.09), new THREE.MeshStandardMaterial({ map: calTex(), roughness: 0.8, side: THREE.DoubleSide }));
    page.position.set(0.012, 0.048, 0); page.rotation.set(0, Math.PI / 2, 0); page.rotateX(-0.25);
    g.add(page);
    const back = box(0.006, 0.09, 0.11, M('#e8e2d8', 0.8)); back.position.set(-0.012, 0.045, 0); back.rotation.z = 0.25; g.add(back);
    const top = box(0.026, 0.01, 0.115, M('#d9534f', 0.6)); top.position.set(0.0, 0.094, 0); g.add(top);
    return g;
  },
  basket() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.04, 24, 1, true), M('#c9935f', 0.8, { side: THREE.DoubleSide }));
    b.position.y = 0.02; g.add(b);
    g.add(mesh(new THREE.CircleGeometry(0.045, 20).rotateX(-Math.PI / 2), M('#c9935f', 0.8), 0, 0.002));
    const snacks = [['#e56b6f', 0.018], ['#f2c14e', 0.016], ['#8bc34a', 0.014], ['#b28dff', 0.017], ['#ff9f43', 0.015]];
    snacks.forEach(([c, r], i) => { const s = sph(r, M(c, 0.5)); s.position.set(Math.cos(i * 1.3) * 0.025, 0.04, Math.sin(i * 1.3) * 0.025); g.add(s); });
    const bar = box(0.03, 0.014, 0.05, M('#f4d03f', 0.5)); bar.position.set(0.0, 0.05, 0.01); bar.rotation.y = 0.5; g.add(bar);
    return g;
  },
  mousepad() {
    const g = new THREE.Group();
    const pad = rounded(0.2, 0.004, 0.16, 0.015, new THREE.MeshStandardMaterial({ map: starTex(), roughness: 0.9 }));
    g.add(pad);
    const mouse = sph(0.03, M('#f3efe8', 0.4)); mouse.scale.set(1.3, 0.5, 0.9); mouse.position.set(0, 0.012, 0.02); g.add(mouse);
    return g;
  },
  nameplate(name = '') {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.03, 0.05, 0.17);
    const tex = labelTex(name);
    const mats = [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), M('#e8e0d2', 0.6), M('#e8e0d2', 0.6), M('#e8e0d2', 0.6), M('#e8e0d2', 0.6), M('#e8e0d2', 0.6)];
    const p = new THREE.Mesh(geo, mats); p.position.y = 0.025; p.rotation.z = -0.15; g.add(p);
    return g;
  },
  // ---- 식물
  cactus() {
    const g = new THREE.Group();
    const pot = cyl(0.035, 0.027, 0.05, M('#d98c5f', 0.8)); pot.position.y = 0.025; g.add(pot);
    g.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 20), M('#5a4636', 1), 0, 0.05));
    const green = M('#5f9e5a', 0.7);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.06, 6, 14), green); body.position.y = 0.09; g.add(body);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.025, 4, 10), green); arm.position.set(0, 0.095, 0.026); arm.rotation.x = -0.5; g.add(arm);
    const fl = sph(0.009, M('#f28bb0', 0.6)); fl.position.set(0, 0.14, 0); g.add(fl);
    for (let i = 0; i < 10; i++) g.add(mesh(new THREE.SphereGeometry(0.0022, 6, 4), M('#f4f1e6', 0.6), Math.cos(i * 2.1) * 0.019, 0.065 + (i % 5) * 0.012, Math.sin(i * 2.1) * 0.019));
    return g;
  },
  succulent() {
    const g = new THREE.Group();
    const pot = cyl(0.04, 0.034, 0.035, M('#f1ede6', 0.5)); pot.position.y = 0.0175; g.add(pot);
    g.add(mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 20), M('#5a4636', 1), 0, 0.035));
    const lv = [M('#8cc0a0', 0.6), M('#a7d2b4', 0.6)];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7 - ring * 2; i++) {
      const a = i / (7 - ring * 2) * Math.PI * 2 + ring;
      const l = sph(0.014 - ring * 0.002, lv[ring % 2], 10); l.scale.set(1.4, 0.6, 0.8);
      l.position.set(Math.cos(a) * (0.022 - ring * 0.008), 0.042 + ring * 0.008, Math.sin(a) * (0.022 - ring * 0.008)); l.rotation.y = -a; g.add(l);
    }
    return g;
  },
  flowers() {
    const g = new THREE.Group();
    const vase = cyl(0.024, 0.03, 0.09, M('#9ec6e8', 0.15, { transparent: true, opacity: 0.75 })); vase.position.y = 0.045; g.add(vase);
    const cols = ['#f6c344', '#ef7f8f', '#ffffff', '#f6a35c', '#c79be8'];
    cols.forEach((c, i) => {
      const a = i * 1.26, tilt = 0.18;
      const st = cyl(0.002, 0.002, 0.12, M('#4f8f4a', 0.7), 6);
      st.position.set(Math.cos(a) * 0.01, 0.13, Math.sin(a) * 0.01); st.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); g.add(st);
      const f = sph(0.013, M(c, 0.6), 10); f.scale.y = 0.6; f.position.set(Math.cos(a) * 0.022, 0.19 + (i % 2) * 0.012, Math.sin(a) * 0.022); g.add(f);
      g.add(mesh(new THREE.SphereGeometry(0.004, 6, 4), M('#e0a030', 0.6), f.position.x, f.position.y + 0.006, f.position.z));
    });
    return g;
  },
  // ---- 인형
  cat() {
    const g = new THREE.Group();
    const fur = M('#9aa3ad', 0.85), light = M('#f3efe8', 0.85), pink = M('#f2a5b5', 0.6), dark = M('#2b2220', 0.4);
    const body = sph(0.038, fur); body.scale.set(1, 1.05, 1); body.position.y = 0.04; g.add(body);
    const head = sph(0.034, fur); head.position.y = 0.1; g.add(head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.024, 10), fur); ear.position.set(-0.004, 0.135, s * 0.019); ear.rotation.x = s * 0.35; g.add(ear);
      g.add(mesh(new THREE.SphereGeometry(0.004, 8, 6), dark, 0.03, 0.106, s * 0.012));
      g.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), light, 0.025, 0.012, s * 0.02));
      g.add(mesh(new THREE.SphereGeometry(0.006, 8, 6), pink, 0.028, 0.094, s * 0.02));
    }
    g.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), light, 0.028, 0.092, 0));
    g.add(mesh(new THREE.SphereGeometry(0.0035, 8, 6), pink, 0.04, 0.097, 0));
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16, Math.PI), fur); tail.position.set(-0.035, 0.04, 0); tail.rotation.set(0, Math.PI / 2, 0.3); g.add(tail);
    return g;
  },
  duck() {
    const g = new THREE.Group();
    const y = M('#f7d348', 0.45), o = M('#f08a3c', 0.45), dark = M('#2b2220', 0.4);
    const body = sph(0.04, y); body.scale.set(1.25, 0.85, 1); body.position.y = 0.034; g.add(body);
    const head = sph(0.027, y); head.position.set(0.022, 0.085, 0); g.add(head);
    const bill = sph(0.013, o); bill.scale.set(1.4, 0.5, 1); bill.position.set(0.05, 0.08, 0); g.add(bill);
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.004, 8, 6), dark, 0.042, 0.093, s * 0.012));
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 10), y); tail.position.set(-0.05, 0.05, 0); tail.rotation.z = 0.9; g.add(tail);
    return g;
  },
  // ---- 장식·조명
  lamp() {
    const g = new THREE.Group();
    const metal = M('#1b365d', 0.35, { metalness: 0.3 });
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.012, 28), metal, 0, 0.006));
    const a1 = cyl(0.004, 0.004, 0.17, metal, 8); a1.position.set(-0.02, 0.09, 0); a1.rotation.z = 0.25; g.add(a1);
    const a2 = cyl(0.004, 0.004, 0.13, metal, 8); a2.position.set(0.02, 0.2, 0); a2.rotation.z = -1.0; g.add(a2);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.05, 24, 1, true), M('#1b365d', 0.35, { side: THREE.DoubleSide }));
    head.position.set(0.075, 0.215, 0); head.rotation.z = 0.5; g.add(head);
    const bulb = sph(0.015, new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffd98a', emissiveIntensity: 1.6 })); bulb.position.set(0.082, 0.2, 0); g.add(bulb);
    return g;
  },
  moodlamp() {
    const g = new THREE.Group();
    const base = cyl(0.035, 0.04, 0.03, M('#b9875b', 0.6)); base.position.y = 0.015; g.add(base);
    const glow = sph(0.042, new THREE.MeshStandardMaterial({ color: '#fff1d2', emissive: '#ffcf7a', emissiveIntensity: 1.1, roughness: 0.3 }), 24);
    glow.position.y = 0.068; g.add(glow);
    return g;
  },
  frame() {
    const g = new THREE.Group();
    const wood = M('#b9875b', 0.6);
    const back = box(0.012, 0.11, 0.09, wood); back.position.set(-0.008, 0.055, 0); back.rotation.z = 0.18; g.add(back);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.095), new THREE.MeshStandardMaterial({ map: picTex(), roughness: 0.7 }));
    pic.rotation.set(0, Math.PI / 2, 0); pic.rotateX(0.18); pic.position.set(-0.001, 0.056, 0); g.add(pic);
    const leg = box(0.05, 0.006, 0.01, wood); leg.position.set(-0.03, 0.003, 0); g.add(leg);
    return g;
  },
  clock() {
    const g = new THREE.Group();
    const rim = cyl(0.045, 0.045, 0.025, M('#e9e4da', 0.4), 32); rim.rotation.z = Math.PI / 2; rim.position.y = 0.05; g.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.039, 32), new THREE.MeshStandardMaterial({ map: clockTex(), roughness: 0.5 }));
    face.rotation.y = Math.PI / 2; face.position.set(0.0128, 0.05, 0); g.add(face);
    for (const s of [-1, 1]) { const f = sph(0.008, M('#1b365d', 0.4)); f.position.set(0, 0.006, s * 0.025); g.add(f); }
    return g;
  },
  globe() {
    const g = new THREE.Group();
    const wood = M('#8a5a3b', 0.5), gold = M('#d6b25e', 0.3, { metalness: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.014, 24), wood, 0, 0.007));
    const pole = cyl(0.004, 0.004, 0.05, wood); pole.position.y = 0.035; g.add(pole);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 28, 20), new THREE.MeshStandardMaterial({ map: globeTex(), roughness: 0.5 }));
    ball.position.y = 0.11; ball.rotation.z = 0.4; g.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.003, 6, 40, Math.PI * 1.3), gold); ring.position.y = 0.11; ring.rotation.set(0, Math.PI / 2, 0.4 - Math.PI * 0.65); g.add(ring);
    return g;
  },
  fan() {
    const g = new THREE.Group();
    const white = M('#f4f1ea', 0.4), mint = M('#9fd8c0', 0.45);
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.015, 24), white, 0, 0.0075));
    const pole = cyl(0.007, 0.007, 0.07, white); pole.position.y = 0.05; g.add(pole);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.003, 6, 32), white); cage.position.set(0.01, 0.1, 0); cage.rotation.y = Math.PI / 2; g.add(cage);
    for (let i = 0; i < 3; i++) {
      const b = sph(0.02, mint, 12); b.scale.set(0.2, 1.1, 0.6);
      const a = i * Math.PI * 2 / 3; b.position.set(0.012, 0.1 + Math.sin(a) * 0.02, Math.cos(a) * 0.02); b.rotation.x = -a; g.add(b);
    }
    g.add(mesh(new THREE.SphereGeometry(0.009, 10, 8), white, 0.016, 0.1, 0));
    return g;
  },
  hourglass() {
    const g = new THREE.Group();
    const wood = M('#8a5a3b', 0.55), glass = M('#dfeef5', 0.1, { transparent: true, opacity: 0.45 }), sand = M('#e8c47a', 0.9);
    for (const y of [0.006, 0.124]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 20), wood, 0, y));
    for (const [x, z] of [[0.026, 0.026], [-0.026, 0.026], [0.026, -0.026], [-0.026, -0.026]]) g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), wood, x, 0.065, z));
    const up = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 20), glass); up.position.y = 0.093; up.rotation.x = Math.PI; g.add(up);
    const dn = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.05, 20), glass); dn.position.y = 0.037; g.add(dn);
    const s1 = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.022, 16), sand); s1.position.y = 0.023; g.add(s1);
    const s2 = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.016, 16), sand); s2.position.y = 0.1; s2.rotation.x = Math.PI; g.add(s2);
    return g;
  },
  cube() {
    const g = new THREE.Group();
    const cols = ['#e5484d', '#f6c344', '#3f8f5e', '#2f6fe0', '#f6f4ef', '#f08a3c'];
    const s = 0.017;
    for (let x = -1; x <= 1; x++) for (let y = 0; y < 3; y++) for (let z = -1; z <= 1; z++) {
      const c = box(s * 0.94, s * 0.94, s * 0.94, M(cols[(x + 2 * y + 3 * z + 9) % 6], 0.35));
      c.position.set(x * s, s / 2 + y * s, z * s); g.add(c);
    }
    g.rotation.y = 0.5;
    return g;
  },
  candy() {
    const g = new THREE.Group();
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.085, 24, 1, true), M('#e6f2f7', 0.05, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    jar.position.y = 0.0425; g.add(jar);
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 24), M('#e06f8b', 0.5), 0, 0.092));
    const cols = ['#e5484d', '#f6c344', '#5fb49c', '#b28dff', '#ff9f43', '#6f9be8'];
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4, r = 0.012 + (i % 3) * 0.008;
      g.add(mesh(new THREE.SphereGeometry(0.009, 8, 6), M(cols[i % 6], 0.35), Math.cos(a) * r, 0.01 + Math.floor(i / 6) * 0.016, Math.sin(a) * r));
    }
    return g;
  },
  // ---- 업무·법률 소품
  books() {
    const g = new THREE.Group();
    const spec = [['#1b365d', 0.16, 0.11, 0.028], ['#8a2d2d', 0.15, 0.105, 0.024], ['#2f5d50', 0.14, 0.1, 0.03]];
    let y = 0;
    spec.forEach(([c, w, d, h], i) => {
      const b = box(d, h, w, M(c, 0.7)); b.position.set(0, y + h / 2, 0); b.rotation.y = (i - 1) * 0.12; g.add(b);
      const band = box(d * 1.02, h * 0.25, w * 0.15, M('#d6b25e', 0.4)); band.position.set(0, y + h / 2, -w * 0.3); band.rotation.y = b.rotation.y; g.add(band);
      y += h;
    });
    return g;
  },
  gavel() {
    const g = new THREE.Group();
    const wood = M('#7a4a2e', 0.45), gold = M('#d6b25e', 0.3, { metalness: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.014, 28), wood, 0, 0.007));
    const head = cyl(0.018, 0.018, 0.075, wood); head.rotation.x = Math.PI / 2; head.position.set(0, 0.032, 0); g.add(head);
    for (const s of [-1, 1]) { const r = cyl(0.0185, 0.0185, 0.006, gold); r.rotation.x = Math.PI / 2; r.position.set(0, 0.032, s * 0.026); g.add(r); }
    const handle = cyl(0.006, 0.005, 0.12, wood); handle.rotation.z = Math.PI / 2; handle.position.set(0.065, 0.024, 0); g.add(handle);
    return g;
  },
  scales() {
    const g = new THREE.Group();
    const gold = M('#d6b25e', 0.3, { metalness: 0.7 });
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.012, 24), gold, 0, 0.006));
    const pole = cyl(0.004, 0.005, 0.15, gold); pole.position.y = 0.08; g.add(pole);
    g.add(mesh(new THREE.SphereGeometry(0.008, 10, 8), gold, 0, 0.16, 0));
    const beam = cyl(0.003, 0.003, 0.13, gold); beam.rotation.x = Math.PI / 2; beam.position.y = 0.15; g.add(beam);
    for (const s of [-1, 1]) {
      for (const k of [-1, 1]) { const st = cyl(0.001, 0.001, 0.07, gold, 4); st.position.set(k * 0.012, 0.115, s * 0.065); st.rotation.z = k * 0.17; g.add(st); }
      const pan = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#d6b25e', 0.3, { metalness: 0.7, side: THREE.DoubleSide }));
      pan.position.set(0, 0.085, s * 0.065); g.add(pan);
    }
    return g;
  },
  trophy() {
    const g = new THREE.Group();
    const gold = M('#e2b84a', 0.25, { metalness: 0.75 }), navy = M('#1b365d', 0.5);
    const base = box(0.05, 0.025, 0.05, navy); base.position.y = 0.0125; g.add(base);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.014), new THREE.MeshStandardMaterial({ map: labelTex('칭찬왕', '#d6b25e', '#1b365d', 192, 64), roughness: 0.4 }));
    plate.rotation.y = Math.PI / 2; plate.position.set(0.0255, 0.0125, 0); g.add(plate);
    const stem = cyl(0.006, 0.012, 0.03, gold); stem.position.y = 0.04; g.add(stem);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.016, 0.055, 24, 1, true), M('#e2b84a', 0.25, { metalness: 0.75, side: THREE.DoubleSide }));
    cup.position.y = 0.083; g.add(cup);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 14, Math.PI), gold); h.position.set(0, 0.09, s * 0.036); h.rotation.set(Math.PI / 2, 0, s * -Math.PI / 2); g.add(h); }
    const st = sph(0.012, gold); st.position.y = 0.12; g.add(st);
    return g;
  },
};
let _cal = null, _star = null;
function calTex() {
  if (_cal) return _cal;
  const c = document.createElement('canvas'); c.width = 128; c.height = 104;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 128, 104);
  g.fillStyle = '#d9534f'; g.fillRect(0, 0, 128, 18);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) {
    g.fillStyle = (r === 2 && k === 4) ? '#d9534f' : '#c9c4bc';
    g.fillRect(8 + k * 16, 26 + r * 15, 10, 8);
  }
  _cal = new THREE.CanvasTexture(c); _cal.colorSpace = THREE.SRGBColorSpace; return _cal;
}
let _pic = null, _clock = null, _globe = null;
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
function picTex() {   // 액자 속 그림: 해 질 녘 언덕
  return _pic ||= canvasTex(96, 120, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9cc7ef'); sky.addColorStop(1, '#f6d8b0'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f7c15c'; g.beginPath(); g.arc(66, 52, 12, 0, 7); g.fill();
    g.fillStyle = '#7fb77e'; g.beginPath(); g.ellipse(30, 120, 70, 40, 0, 0, 7); g.fill();
    g.fillStyle = '#5c9a63'; g.beginPath(); g.ellipse(90, 125, 60, 38, 0, 0, 7); g.fill();
    g.strokeStyle = '#f4efe6'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  });
}
function clockTex() {
  return _clock ||= canvasTex(128, 128, (g) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#1b365d';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.arc(64 + Math.sin(a) * 50, 64 - Math.cos(a) * 50, i % 3 ? 3 : 5, 0, 7); g.fill(); }
    g.strokeStyle = '#1b365d'; g.lineCap = 'round';
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(90, 54); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(58, 24); g.stroke();
    g.fillStyle = '#e5484d'; g.beginPath(); g.arc(64, 64, 5, 0, 7); g.fill();
  });
}
function globeTex() {
  return _globe ||= canvasTex(256, 128, (g) => {
    g.fillStyle = '#6fb3e0'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#8cc77d';
    for (const [x, y, rx, ry] of [[50, 45, 28, 20], [70, 85, 14, 24], [130, 40, 22, 14], [150, 75, 20, 26], [200, 50, 32, 18], [215, 95, 14, 10], [100, 115, 40, 8]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, 7); g.fill(); }
  });
}
function starTex() {
  if (_star) return _star;
  const c = document.createElement('canvas'); c.width = 128; c.height = 104;
  const g = c.getContext('2d');
  g.fillStyle = '#3c4a8c'; g.fillRect(0, 0, 128, 104);
  g.fillStyle = '#ffd86b';
  const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
  [[20, 20], [60, 14], [100, 30], [30, 70], [80, 60], [110, 88], [50, 92]].forEach(([x, y]) => star(x, y, 6));
  _star = new THREE.CanvasTexture(c); _star.colorSpace = THREE.SRGBColorSpace; return _star;
}

// 소품별 자리(f: 앞으로, l: 오른쪽, rot: 사람 쪽을 바라보는 기준 추가 회전)
// 같은 자리를 원하는 소품이 둘 이상이면 SLOTS 중 가장 가까운 빈자리로 옮긴다.
const SPOT = {
  mousepad: [0.33, -0.28, 0], basket: [0.5, -0.05, 0], pencils: [0.48, -0.42, 0], calendar: [0.5, -0.6, 0.4],
  mug: [0.33, 0.3, 0.6], tumbler: [0.36, 0.42, 0], coffee: [0.3, 0.53, 0], headphones: [0.5, 0.55, 0.3],
  bear: [0.52, 0.36, -0.4], tissue: [0.55, 0.7, 0.2], nameplate: [0.6, 0.15, 0],
  cactus: [0.58, -0.72, 0], succulent: [0.48, -0.42, 0], flowers: [0.55, 0.7, 0], cat: [0.52, 0.36, -0.4],
  duck: [0.42, 0.66, -0.3], lamp: [0.6, -0.4, 0.6], moodlamp: [0.55, 0.7, 0], frame: [0.6, -0.4, 0.3],
  clock: [0.6, 0.15, -0.2], globe: [0.58, -0.72, 0], fan: [0.5, 0.55, -0.4], hourglass: [0.38, -0.55, 0],
  cube: [0.38, -0.55, 0.3], candy: [0.5, -0.05, 0], books: [0.5, -0.6, 0.15], gavel: [0.36, 0.42, 0.5],
  scales: [0.6, -0.15, 0], trophy: [0.6, 0.15, 0],
};
const SLOTS = [[0.33, -0.28], [0.5, -0.05], [0.48, -0.42], [0.5, -0.6], [0.33, 0.3], [0.36, 0.42], [0.3, 0.53], [0.5, 0.55],
  [0.52, 0.36], [0.55, 0.7], [0.6, 0.15], [0.6, -0.15], [0.6, -0.4], [0.58, -0.72], [0.42, 0.66], [0.38, -0.55]];
export const ALL_PROPS = Object.keys(SPOT);
export const DESK_MAX = 10;   // 책상 하나에 올릴 수 있는 소품 수

export function decorateDesk(seatPos, faceDeg, items, opts = {}) {
  const top = opts.top ?? 0.745;
  const f = THREE.MathUtils.degToRad(faceDeg);
  const fwd = new THREE.Vector3(Math.cos(f), 0, Math.sin(f));
  const right = new THREE.Vector3(-Math.sin(f), 0, Math.cos(f));
  const group = new THREE.Group();
  const used = [];
  const free = (a, b) => used.every(([x, y]) => Math.hypot(x - a, y - b) > 0.14);
  for (const it of items.slice(0, DESK_MAX)) {
    const [name, arg] = Array.isArray(it) ? it : [it];
    if (!PROPS[name] || !SPOT[name]) continue;
    let [ff, ll, rr] = SPOT[name];
    if (!free(ff, ll)) {
      const alt = SLOTS.filter(([a, b]) => free(a, b)).sort((q, r) => Math.hypot(q[0] - ff, q[1] - ll) - Math.hypot(r[0] - ff, r[1] - ll))[0];
      if (!alt) continue;
      [ff, ll] = alt;
    }
    used.push([ff, ll]);
    const o = PROPS[name](arg ?? (name === 'nameplate' ? opts.name : undefined));
    o.scale.setScalar(K);
    o.position.copy(seatPos).addScaledVector(fwd, ff).addScaledVector(right, ll);
    o.position.y = top + 0.001;
    o.rotation.y += -f + Math.PI + (rr || 0);          // 소품 정면(+X)이 사람 쪽을 보게
    group.add(o);
  }
  return group;
}

// 꾸미기 상점용 소품 사진(작은 PNG data URL). renderer: 별도의 작은 WebGLRenderer(alpha, preserveDrawingBuffer)
export function propThumbnails(renderer, items, label = '창천') {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a4, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(1.5, 2.5, 1.8);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 10);
  const out = {};
  for (const name of items) {
    if (!PROPS[name]) continue;
    const o = PROPS[name](name === 'nameplate' ? label : undefined);
    scene.add(o);
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    const dir = new THREE.Vector3(1.0, 0.8, 0.6).normalize();   // 소품 정면은 +X
    cam.position.copy(c).addScaledVector(dir, (r / Math.sin(THREE.MathUtils.degToRad(15))) * 1.02);
    cam.lookAt(c);
    renderer.render(scene, cam);
    out[name] = renderer.domElement.toDataURL('image/png');
    scene.remove(o);
  }
  return out;
}
