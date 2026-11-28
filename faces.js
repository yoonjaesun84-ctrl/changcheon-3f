// 사진 얼굴(tools/face_build.py 산출물)로 큰머리 캐릭터의 머리를 '사람 머리'로 바꾼다.
// 데이터 <base>.json:
//   pos/uv/idx/blink/smile = 실제 입체를 살린 얼굴 메시(사진 텍스처, 깜빡임·웃음 형태 변형)
//   head{pos,idx}          = 얼굴 윤곽에서 뒤통수까지 이어지는 피부 면(윤곽 꼭짓점 공유 → 이음매 없음)
//   cranium{c,r}           = 머리통 타원체(머리카락·귀 배치 기준), ipd = 눈 사이 거리, eyeY = 눈 높이, top = 이마 끝 높이
// <base>.webp = 얼굴 사진(가장자리는 피부색으로 섞음)
// 머리 좌표: +X 정면, +Y 위, +Z 캐릭터 오른쪽.
import * as THREE from 'three';

const texLoader = new THREE.TextureLoader();

export async function loadFace(base) {
  const [d, tex] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json()),
    texLoader.loadAsync(`${base}.webp`),
  ]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setIndex(d.idx);
  g.morphAttributes.position = [
    new THREE.Float32BufferAttribute(d.blink, 3),
    new THREE.Float32BufferAttribute(d.smile, 3),
  ];
  g.morphTargetsRelative = true;
  g.computeVertexNormals();
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(d.head.pos, 3));
  hg.setIndex(d.head.idx);
  hg.computeVertexNormals();
  return { geometry: g, headGeometry: hg, texture: tex, skin: d.skin, hair: d.hair,
    cranium: d.cranium, ipd: d.ipd, eyeY: d.eyeY, top: d.top, hairInfo: d.hairInfo };
}

// ---------------- 머리카락 ----------------
// 사진에서 잰 값(hairInfo: style·len·top·fringe·sweep·color)으로 '덮개(정수리~헤어라인) + 끝이 뾰족한 머리 다발'을 만든다.
// 높이 단위: 눈 사이 거리(ipd), 기준 = 눈 높이. 'T' = 이마 끝(10번 점) 기준.

function curve(pts) {            // 방위각 |phi|(도) 제어점을 부드럽게 잇는 함수
  return (phi) => {
    const a = Math.abs(phi) * 180 / Math.PI;
    for (let i = 1; i < pts.length; i++) {
      if (a <= pts[i][0]) {
        const [a0, y0] = pts[i - 1], [a1, y1] = pts[i];
        const t = (a - a0) / (a1 - a0), s = t * t * (3 - 2 * t);
        return y0 + (y1 - y0) * s;
      }
    }
    return pts[pts.length - 1][1];
  };
}
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// 머리카락 결(가는 줄무늬) 텍스처
let _strands = null;
function strandTexture() {
  if (_strands) return _strands;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  const r = mulberry(7);
  for (let i = 0; i < 1100; i++) {
    const x = r() * 256, y = r() * 256, l = 30 + r() * 80;
    const v = 150 + r() * 105;
    g.strokeStyle = `rgba(${v},${v},${v},0.6)`;
    g.lineWidth = 0.5 + r() * 1.3;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 6, y + l / 2, x + (r() - 0.5) * 4, y + l); g.stroke();
  }
  _strands = new THREE.CanvasTexture(c);
  _strands.wrapS = _strands.wrapT = THREE.RepeatWrapping;
  _strands.colorSpace = THREE.SRGBColorSpace;
  return _strands;
}

function hairPlan(face, look) {
  const hi = face.hairInfo || {};
  const { ipd, eyeY } = face;
  const [, cy] = face.cranium.c, [, rb] = face.cranium.r;
  const style = hi.style || ({ bob: 'bob', long: 'long' }[look.hair] || 'short');
  const len = style === 'short' ? 0 : Math.max(1.5, hi.len ?? (style === 'long' ? 3.5 : 1.8));
  const hairTop = eyeY + (hi.top ?? 1.95) * ipd;
  const volTop = THREE.MathUtils.clamp((hairTop - (cy + rb * 1.04)) / rb, 0.03, 0.2);
  const fringe = hi.fringe ?? 0;
  const sweep = fringe > 0.08 && hi.sweep ? Math.sign(hi.sweep) : (look.hair === 'side' ? 1 : 0);
  const color = hi.color || look.hairColor || face.hair || '#1d1814';
  return { style, len, volTop, fringe, sweep, color };
}

// 머리 표면: (phi, y) → 점·법선. phi 0 = 정면(+X), + = 캐릭터 오른쪽(+Z). 긴 머리는 귀 아래로 곧게 내려온다
function hairSurface(face, hp) {
  const [cx, cy, cz] = face.cranium.c, [ra, rb, rc] = face.cranium.r;
  const long = hp.style !== 'short';
  const sAt = (dy) => 1.045 + hp.volTop * Math.max(0, dy / rb);
  const yTop = cy + rb * sAt(rb) - 1e-4;
  const at = (phi, y, out, P, N) => {
    const dy = Math.min(y, yTop) - cy;
    let x, z;
    if (dy < 0 && long) {
      x = ra * 1.05 * Math.cos(phi); z = rc * 1.05 * Math.sin(phi);
      N.set(Math.cos(phi) / ra, 0, Math.sin(phi) / rc).normalize();
    } else {
      const s = sAt(dy), h = Math.sqrt(Math.max(0, 1 - (dy / (rb * s)) ** 2));
      x = ra * s * h * Math.cos(phi); z = rc * s * h * Math.sin(phi);
      N.set(x / (ra * ra), dy / (rb * rb), z / (rc * rc)).normalize();
    }
    return P.set(cx + x, cy + dy, cz + z).addScaledVector(N, out);
  };
  return { at, yTop };
}

function buildPhotoHair(head, look, face) {
  const hp = hairPlan(face, look);
  const { ipd, eyeY, top } = face;
  const Y = (v) => (typeof v === 'string' ? top + ipd * Number(v.slice(1) || 0) : eyeY + ipd * v);
  const surf = hairSurface(face, hp);
  const rnd = mulberry(Math.round(face.ipd * 1e6 + face.top * 1e5));
  const bottom = -(hp.len || 0);
  // 덮개 가장자리(헤어라인): 머리 다발이 그 아래로 삐져나와 가장자리를 덮는다
  const line = hp.style === 'short'
    ? curve([[0, 'T+0.2'], [30, 'T+0.1'], [52, 0.6], [68, 0.2], [80, 0.1], [92, 0.45], [115, 0.05], [180, -0.95]].map(([a, v]) => [a, Y(v)]))
    : curve([[0, hp.fringe > 0.35 ? 'T-0.15' : 'T+0.1'], [35, 'T-0.05'], [55, 0.25], [70, bottom + 0.3], [180, bottom + 0.1]].map(([a, v]) => [a, Y(v)]));
    const mat = new THREE.MeshStandardMaterial({ color: hp.color, roughness: 0.7, map: strandTexture(), side: THREE.DoubleSide });
  mat.userData.envIntensity = 0.25;   // 실내 반사광이 세면 머리가 회색으로 들떠 보임
  const P = new THREE.Vector3(), N = new THREE.Vector3();

  // 1) 덮개: 방위각 × 높이 격자(가장자리가 헤어라인과 정확히 일치)
  {
    const NA = 96, NY = 28, pos = [], nrm = [], uv = [], idx = [];
    for (let i = 0; i <= NA; i++) {
      const phi = -Math.PI + (2 * Math.PI * i) / NA;
      const y0 = line(phi);
      for (let j = 0; j <= NY; j++) {
        const t = j / NY, y = y0 + (surf.yTop - y0) * (1 - (1 - t) ** 1.6);
        surf.at(phi, y, 0, P, N);
        pos.push(P.x, P.y, P.z); nrm.push(N.x, N.y, N.z); uv.push((i / NA) * 8, t * 2.5);
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NY; j++) {
      const a = i * (NY + 1) + j, b = a + NY + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const shell = new THREE.Mesh(g, mat);
    shell.name = 'photoHair';
    head.add(shell);
  }

  // 2) 머리 다발: 정수리 근처에서 시작해 헤어라인 너머까지, 끝이 뾰족한 띠
  const pos = [], nrm = [], uv = [], idx = [];
  const T = new THREE.Vector3(), S = new THREE.Vector3(), Pn = new THREE.Vector3(), Nn = new THREE.Vector3();
  // ctrl = [[phi, y], ...] 경유점(정수리 → 끝). 구간마다 부드럽게 잇는다
  const pathAt = (ctrl, t) => {
    const f = t * (ctrl.length - 1), i = Math.min(ctrl.length - 2, Math.floor(f)), u = f - i, e = u * u * (3 - 2 * u);
    return [ctrl[i][0] + (ctrl[i + 1][0] - ctrl[i][0]) * e, ctrl[i][1] + (ctrl[i + 1][1] - ctrl[i][1]) * u];
  };
  const lock = (ctrl, w0, bulge = 0.05) => {
    const M = 6 * (ctrl.length - 1) + 6, base = pos.length / 3;
    for (let k = 0; k <= M; k++) {
      const t = k / M;
      const out = ipd * (0.05 + bulge * Math.sin(Math.PI * t) + 0.04 * t * t);
      const [phi, y] = pathAt(ctrl, t);
      surf.at(phi, y, out, P, N);
      const [phn, yn] = pathAt(ctrl, Math.min(1, (k + 1) / M));
      surf.at(phn, yn, out, Pn, Nn);
      T.subVectors(Pn, P); if (T.lengthSq() < 1e-12) T.set(0, -1, 0);
      S.crossVectors(T, N).normalize();
      const w = w0 * ipd * Math.pow(Math.min(1, (1 - t) / 0.35), 0.8) * (0.8 + 0.2 * Math.sin(Math.PI * t));
      pos.push(P.x - S.x * w / 2, P.y - S.y * w / 2, P.z - S.z * w / 2, P.x + S.x * w / 2, P.y + S.y * w / 2, P.z + S.z * w / 2);
      nrm.push(N.x, N.y, N.z, N.x, N.y, N.z);
      uv.push(0, t * 2, 0.35, t * 2);
      if (k < M) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  };  const crown = surf.yTop - 0.3 * ipd;
  const R = (a, b) => a + (b - a) * rnd();
  const D = Math.PI / 180;
  if (hp.style === 'short') {
    const n = 36;
    for (let i = 0; i < n; i++) {
      const phi = -Math.PI + (2 * Math.PI * (i + R(0.2, 0.8))) / n;
      const front = Math.abs(phi) < 1.0;
      const lean = front ? hp.sweep * 0.28 : 0;
      const open = front && hp.fringe < 0.08;                    // 이마가 드러난 머리: 앞쪽 다발은 헤어라인에서 짧게 멈춤
      const past = open ? R(0.0, 0.07) : R(0.12, 0.26);
      lock([[phi - lean * 0.4, crown], [phi + lean, line(phi + lean) - past * ipd]], front ? (open ? R(0.7, 0.85) : R(0.5, 0.65)) : R(0.6, 0.8), 0.05);
    }
  } else {
    const n = 34;                                                // 옆·뒷머리 커튼(얼굴 옆 70°부터 뒤까지)
    for (let i = 0; i < n; i++) {
      const a = (70 + 110 * (i + R(0.1, 0.9)) / n) * D;
      for (const sgn of [-1, 1]) lock([[sgn * a * 0.55, crown], [sgn * a, Y(0.4)], [sgn * a * 1.02, Y(bottom - R(0, 0.35))]], R(0.75, 0.95), 0.1);
    }
    const sw = hp.sweep || 1;
    if (hp.fringe > 0.35) {                                      // 일자 앞머리(눈썹 위까지)
      for (let i = 0; i < 12; i++) {
        const phi = (-50 + 100 * (i + 0.5) / 12) * D;
        lock([[phi * 0.5, crown], [phi, Y('T-0.3') - R(0, 0.1) * ipd]], R(0.55, 0.7), 0.04);
      }
    } else {                                                     // 옆으로 넘긴 앞머리: 이마 위를 지나 관자놀이에서 얼굴 옆으로 내려옴
      for (let i = 0; i < 8; i++) {
        lock([[-sw * 0.3, crown + 0.1 * ipd], [sw * (0.35 + 0.05 * i), Y('T+0.05')], [sw * (62 + 2 * i) * D, Y(0.35)], [sw * (68 + 2 * i) * D, Y(bottom * R(0.5, 0.9))]], R(0.7, 0.85), 0.08);
      }
      for (let i = 0; i < 5; i++) {                              // 가르마 쪽: 귀 뒤로 넘긴 옆머리
        lock([[-sw * 0.3, crown + 0.1 * ipd], [-sw * (0.6 + 0.05 * i), Y('T+0.05')], [-sw * (68 + 3 * i) * D, Y(0.5)], [-sw * (78 + 3 * i) * D, Y(bottom * R(0.5, 0.9))]], R(0.6, 0.75), 0.06);
      }
    }
    for (const sgn of [-1, 1]) {                                 // 얼굴 옆을 감싸는 다발
      for (let i = 0; i < 3; i++) lock([[sgn * 0.5, crown], [sgn * (64 + 3 * i) * D, Y(0.45)], [sgn * (66 + 3 * i) * D, Y(bottom * R(0.6, 0.95))]], R(0.7, 0.85), 0.12);
    }
  }  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const locks = new THREE.Mesh(g, mat);
  locks.name = 'photoHairLocks';
  head.add(locks);
}

// 만화 머리(공)·눈·입·머리카락을 숨기고 사진 얼굴 + 사람 머리 + 맞춘 머리카락 + 귀를 붙인다. 반환: 얼굴 메시
export function applyFace(root, face) {
  const rig = root.userData.rig;
  const look = root.userData.look || {};
  const head = rig.head;
  const mesh = new THREE.Mesh(face.geometry, new THREE.MeshStandardMaterial({ map: face.texture, roughness: 0.62 }));
  mesh.name = 'photoFace';
  head.add(mesh);
  rig.faceMesh = mesh;
  rig.skin.color.set(face.skin);
  const skinMesh = new THREE.Mesh(face.headGeometry, rig.skin);
  skinMesh.name = 'photoHead';
  head.add(skinMesh);
  rig.skull.visible = false;
  for (const c of rig.normalFace) c.visible = false;
  for (const c of rig.shyCartoon) c.visible = false;
  head.children.filter((c) => c.userData.hair).forEach((c) => { c.visible = false; });
  buildPhotoHair(head, look, face);
  const [cx, , ] = face.cranium.c;
  const [ra, , rc] = face.cranium.r;
  for (const z of [-1, 1]) {                                // 귀
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.38 * face.ipd, 14, 10), rig.skin);
    ear.scale.set(0.75, 1.05, 0.4);
    ear.position.set(cx - 0.05 * ra, face.eyeY - 0.3 * face.ipd, z * rc * 0.97);
    head.add(ear);
  }
  // 안경은 사진 얼굴(눈두덩) 앞으로 옮긴다
  const p = face.geometry.attributes.position;
  let front = -1;
  for (let i = 0; i < p.count; i++) {
    const az = Math.abs(p.getZ(i));
    if (Math.abs(p.getY(i) - face.eyeY) < 0.25 * face.ipd && az > 0.2 * face.ipd && az < 0.8 * face.ipd) front = Math.max(front, p.getX(i));
  }
  head.children.forEach((c) => {
    if (!c.userData.glasses) return;
    c.position.x = front + 0.008 + (c.geometry.type === 'BoxGeometry' ? 0.004 : 0);
    c.position.y = face.eyeY + 0.03 * face.ipd;
    if (c.geometry.type === 'TorusGeometry') { c.position.z = Math.sign(c.position.z) * face.ipd / 2; c.scale.multiplyScalar(0.36 * face.ipd / 0.038); }
  });
  return mesh;
}
