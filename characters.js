// 창천 전용 친근한 3D 캐릭터(큰 머리 사무직 캐릭터) + 일하는 동작.
// 로컬 좌표: +X = 정면, +Y = 위, +Z = 캐릭터의 오른쪽. root 원점 = 바닥.
import * as THREE from 'three';

const S = 1.25;                         // 전체 크기 배율(서 있을 때 약 1.35m)
const _mats = new Map();
function mat(color, rough = 0.7, metal = 0) {
  const key = `${color}|${rough}|${metal}`;
  if (!_mats.has(key)) _mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return _mats.get(key);
}
const SKIN = '#f6d9c4';
const DEFAULT_HAIR = '#1d1814';

function capsule(r, len, m) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), m);
}
function limb(r, len, m) {
  const pivot = new THREE.Group();
  const c = capsule(r, len, m);
  c.position.y = -len / 2 - r * 0.3;
  pivot.add(c);
  return pivot;
}
function sphere(r, m, ws = 24, hs = 18) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), m);
}

function buildHair(head, look) {
  const hm = mat(look.hairColor || DEFAULT_HAIR, 0.6);
  const style = look.hair || 'short';
  const R = 0.165;
  const cap = (thetaLen, tilt, rs = 1.06) => {
    const g = new THREE.SphereGeometry(R * rs, 28, 18, 0, Math.PI * 2, 0, thetaLen);
    const m = new THREE.Mesh(g, hm);
    m.rotation.z = tilt;
    head.add(m);
    return m;
  };
  if (style === 'bob' || style === 'long') {
    cap(1.85, 0.78, 1.08);
    const fringe = sphere(0.09, hm);
    fringe.scale.set(0.55, 0.45, 1.5);
    fringe.position.set(0.11, 0.1, 0);
    head.add(fringe);
    if (style === 'long') {
      const back = capsule(0.12, 0.2, hm);
      back.scale.set(0.55, 1, 1.25);
      back.position.set(-0.08, -0.17, 0);
      head.add(back);
    }
  } else {
    cap(1.18, 0.62);
    if (style === 'quiff') {
      const q = sphere(0.08, hm);
      q.scale.set(1.0, 0.62, 1.55);
      q.position.set(0.075, 0.15, 0.0);
      head.add(q);
    } else if (style === 'side') {
      const sw = sphere(0.085, hm);
      sw.scale.set(1.0, 0.5, 1.35);
      sw.position.set(0.08, 0.13, -0.05);
      sw.rotation.x = 0.25;
      head.add(sw);
    }
  }
}

function buildGlasses(head, kind) {
  if (!kind) return;
  const thick = kind === 'thick' ? 0.009 : 0.005;
  const m = mat(kind === 'thick' ? '#151515' : '#3a3633', 0.4, 0.3);
  for (const z of [-0.056, 0.056]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.038, thick, 8, 24), m);
    t.rotation.y = Math.PI / 2;
    if (kind === 'rect' || kind === 'thick') t.scale.set(1, 0.78, 1.15);
    t.position.set(0.158, 0.012, z);
    t.userData.glasses = true;
    head.add(t);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, 0.04), m);
  bridge.position.set(0.162, 0.02, 0);
  bridge.userData.glasses = true;
  head.add(bridge);
}

export function createCharacter(look = {}) {
  const skin = new THREE.MeshStandardMaterial({ color: look.skin || SKIN, roughness: 0.55 });   // 캐릭터별(사진 얼굴 피부색 적용)
  const suit = look.suit || null;
  const innerColor = look.innerColor || (look.inner === 'blouse' ? '#f5f3ef' : '#f3f4f6');
  const top = suit ? mat(suit, 0.78) : mat(innerColor, 0.88);
  const pants = mat(suit || '#2c2f36', 0.82);

  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(S);
  root.add(rig);
  const pelvis = new THREE.Group();
  rig.add(pelvis);
  const spine = new THREE.Group();
  pelvis.add(spine);

  const torso = capsule(0.13, 0.15, top);
  torso.scale.set(0.82, 1, 1.12);
  torso.position.y = 0.17;
  spine.add(torso);
  if (suit) {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, look.inner === 'blouse' ? 0.09 : 0.07), mat(innerColor, 0.8));
    shirt.position.set(0.108, 0.255, 0);
    spine.add(shirt);
    if (look.tie) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.032), mat(look.tie, 0.6));
      tie.position.set(0.112, 0.205, 0);
      spine.add(tie);
    }
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 14), skin);
  neck.position.y = 0.335;
  spine.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.49;
  spine.add(head);
  const skull = sphere(0.165, skin, 32, 24);
  skull.scale.set(0.96, 1, 0.98);
  head.add(skull);
  const eyeM = mat('#1b1b1f', 0.3);
  for (const z of [-0.056, 0.056]) {
    const e = sphere(0.017, eyeM, 12, 10);
    e.scale.set(0.6, 1.15, 1);
    e.position.set(0.154, 0.008, z);
    head.add(e);
    const cheek = sphere(0.022, mat('#f0a89a', 0.7), 12, 8);
    cheek.scale.set(0.3, 0.6, 1);
    cheek.position.set(0.148, -0.04, z * 1.55);
    head.add(cheek);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 14, Math.PI), mat('#8c4a44', 0.6));
  mouth.rotation.set(0, Math.PI / 2, Math.PI);
  mouth.position.set(0.158, -0.052, 0);
  head.add(mouth);
  // 칭찬받았을 때: 새빨간 볼, ^ ^ 눈, /// 홍조선, 오물오물 입
  const shy = new THREE.Group();
  shy.visible = false;
  head.add(shy);
  const blushM = new THREE.MeshBasicMaterial({ color: '#ff5f7a', transparent: true, opacity: 0.85, depthWrite: false });
  const lineM = new THREE.MeshBasicMaterial({ color: '#b3122f' });
  const shyCartoon = [];   // 만화 얼굴 전용(^ ^ 눈, 오물오물 입) — 사진 얼굴이면 숨김
  for (const z of [-1, 1]) {
    const bl = sphere(0.04, blushM, 16, 10);
    bl.scale.set(0.25, 0.55, 1.1);
    bl.position.set(0.146, -0.035, z * 0.088);
    shy.add(bl);
    for (let k = 0; k < 3; k++) {
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.032, 0.005), lineM);
      ln.position.set(0.164, -0.03, z * 0.088 + (k - 1) * 0.017);
      ln.rotation.x = -0.5;
      shy.add(ln);
    }
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 14, Math.PI), mat('#1b1b1f', 0.3));
    arc.rotation.set(0, Math.PI / 2, 0);
    arc.position.set(0.157, 0.0, z * 0.056);
    shy.add(arc);
    shyCartoon.push(arc);
  }
  const wavy = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0045, 6, 12, Math.PI), mat('#8c4a44', 0.6));
  wavy.rotation.set(0, Math.PI / 2, Math.PI);
  wavy.position.set(0.159, -0.058, 0);
  shy.add(wavy);
  shyCartoon.push(wavy);
  const normalFace = [];
  head.children.forEach((c) => { if (c !== skull && c !== shy) normalFace.push(c); });
  const nBeforeHair = head.children.length;
  buildHair(head, look);
  head.children.slice(nBeforeHair).forEach((c) => { c.userData.hair = true; });
  buildGlasses(head, look.glasses);

  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(0, 0.265, side * 0.152);
    spine.add(sh);
    const upper = limb(0.046, 0.12, top);
    sh.add(upper);
    const el = new THREE.Group();
    el.position.y = -0.17;
    sh.add(el);
    const fore = limb(0.041, 0.1, top);
    el.add(fore);
    const hand = new THREE.Group();
    hand.position.y = -0.155;
    el.add(hand);
    hand.add(sphere(0.042, skin, 14, 10));
    return { sh, el, hand };
  };
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(0, 0.0, side * 0.068);
    pelvis.add(hip);
    hip.add(limb(0.056, 0.11, pants));
    const kn = new THREE.Group();
    kn.position.y = -0.18;
    hip.add(kn);
    kn.add(limb(0.05, 0.11, pants));
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.075), mat('#141518', 0.45));
    shoe.position.set(0.035, -0.18, 0);
    kn.add(shoe);
    return { hip, kn };
  };
  const L = arm(-1), R = arm(1), LL = leg(-1), LR = leg(1);
  const hips = capsule(0.11, 0.02, pants);
  hips.scale.set(0.85, 0.9, 1.15);
  hips.position.y = 0.01;
  pelvis.add(hips);

  // 소품
  const props = {
    paper: new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.28), mat('#f7f7f4', 0.8)),
    cup: new THREE.Group(),
    phone: new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.072), mat('#18191c', 0.3, 0.4)),
    folder: new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.3, 0.23), mat('#1b365d', 0.6)),
  };
  const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.095, 16), mat('#f2f0ec', 0.4));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), mat('#4a2c1c', 0.3));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.04;
  props.cup.add(cupBody, coffee);
  props.paper.position.set(0.02, -0.03, -0.12);
  props.paper.rotation.set(0.0, 0, Math.PI / 2 - 0.3);
  R.hand.add(props.paper);
  props.cup.position.set(0.035, -0.02, 0);
  R.hand.add(props.cup);
  props.phone.position.set(0.03, -0.02, -0.02);
  R.hand.add(props.phone);
  props.folder.position.set(0.04, 0, 0.06);
  L.hand.add(props.folder);
  for (const p of Object.values(props)) p.visible = false;

  // 하트(칭찬받았을 때 머리 위로)
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, 0.025);
  heartShape.bezierCurveTo(0, 0.05, 0.05, 0.05, 0.05, 0.02);
  heartShape.bezierCurveTo(0.05, -0.005, 0.02, -0.025, 0, -0.045);
  heartShape.bezierCurveTo(-0.02, -0.025, -0.05, -0.005, -0.05, 0.02);
  heartShape.bezierCurveTo(-0.05, 0.05, 0, 0.05, 0, 0.025);
  const heartGeo = new THREE.ShapeGeometry(heartShape);
  const hearts = [];
  for (let k = 0; k < 3; k++) {
    const h = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: '#ff4d6d', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    h.visible = false;
    root.add(h);
    hearts.push(h);
  }
  root.userData.rig = { pelvis, spine, head, skull, L, R, LL, LR, props, shy, normalFace, hearts, skin, shyCartoon, faceMesh: null };
  root.userData.look = look;
  root.traverse((o) => { if (o.isMesh) o.userData.charRoot = root; });
  return root;
}

// ------------------------------------------------------------------ 동작
const JOINTS = ['spine', 'head', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR'];
function jointObj(rig, j) {
  return { spine: rig.spine, head: rig.head, shL: rig.L.sh, shR: rig.R.sh, elL: rig.L.el, elR: rig.R.el,
    hipL: rig.LL.hip, hipR: rig.LR.hip, knL: rig.LL.kn, knR: rig.LR.kn }[j];
}
const zero = () => Object.fromEntries(JOINTS.map((j) => [j, [0, 0, 0]]));

// 앉은 자세 공통(다리)
function sitBase(p) {
  p.hipL = [0.05, 0, Math.PI / 2 - 0.05];
  p.hipR = [-0.05, 0, Math.PI / 2 - 0.05];
  p.knL = [0, 0, -Math.PI / 2 + 0.1];
  p.knR = [0, 0, -Math.PI / 2 + 0.1];
  return p;
}
const restDesk = (p, side) => {           // 팔을 책상 위에
  const k = side === 'L' ? -1 : 1;
  p[`sh${side}`] = [-0.12 * k, 0, 0.95];
  p[`el${side}`] = [0, 0, 0.7];
};

const SIT_ACTIONS = {
  type: { w: 34, props: [], pose(p, t) {
    restDesk(p, 'L'); restDesk(p, 'R');
    p.elL[2] += 0.07 * Math.sin(t * 15);
    p.elR[2] += 0.07 * Math.sin(t * 15 + 1.9);
    p.head = [0, 0.06 * Math.sin(t * 0.6), -0.06];
  } },
  mouse: { w: 14, props: [], pose(p, t) {
    restDesk(p, 'L');
    p.shR = [0.2, 0, 0.82 + 0.04 * Math.sin(t * 2.6)];
    p.elR = [0, 0, 0.62];
    p.head = [0, 0.04 * Math.sin(t * 0.9), -0.02];
  } },
  read: { w: 12, props: ['paper'], pose(p, t) {
    p.shL = [0.25, 0, 0.75]; p.shR = [-0.25, 0, 0.75];
    p.elL = [0, 0, 1.45]; p.elR = [0, 0, 1.45];
    p.head = [0, 0, -0.32 + 0.03 * Math.sin(t * 0.5)];
  } },
  phone: { w: 8, props: ['phone'], pose(p, t) {
    restDesk(p, 'L');
    p.elL[2] += 0.25 * Math.max(0, Math.sin(t * 1.3));
    p.shR = [-0.55, 0, 0.45]; p.elR = [0, 0, 2.45];
    p.head = [0.16, 0.12 * Math.sin(t * 0.5), 0.02];
  } },
  coffee: { w: 10, props: ['cup'], pose(p, t) {
    restDesk(p, 'L');
    const k = Math.max(0, Math.sin(t * 0.9)) ** 2;
    p.shR = [0.1, 0, 0.65 + 0.45 * k]; p.elR = [0, 0, 1.15 + 1.15 * k];
    p.head = [0, 0, 0.12 * k - 0.03];
  } },
  look: { w: 9, props: [], pose(p, t) {
    restDesk(p, 'L'); restDesk(p, 'R');
    p.head = [0, 0.55 * Math.sin(t * 0.7), 0.04];
    p.spine = [0, 0.15 * Math.sin(t * 0.7), 0];
  } },
  think: { w: 8, props: [], pose(p, t) {
    restDesk(p, 'L');
    p.shR = [-0.05, 0, 1.15]; p.elR = [0, 0, 2.25];
    p.head = [0.05, 0, -0.04 + 0.03 * Math.sin(t * 0.8)];
  } },
  stretch: { w: 3, props: [], pose(p, t) {
    p.shL = [0.18, 0, 2.85]; p.shR = [-0.18, 0, 2.85];
    p.elL = [0, 0, 0.2]; p.elR = [0, 0, 0.2];
    p.spine = [0, 0, 0.14 + 0.04 * Math.sin(t * 2)];
    p.head = [0, 0, 0.2];
  } },
};

function pick(rng) {
  const tot = Object.values(SIT_ACTIONS).reduce((a, b) => a + b.w, 0);
  let r = rng() * tot;
  for (const [k, v] of Object.entries(SIT_ACTIONS)) { if ((r -= v.w) <= 0) return k; }
  return 'type';
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Actor {
  constructor(char, mode, seed = 1, carry = null) {
    this.char = char;
    this.rig = char.userData.rig;
    this.mode = mode;
    this.rng = mulberry(seed * 7919 + 13);
    this.t = this.rng() * 100;
    this.carry = carry;
    this.cur = zero();
    this.action = mode === 'sit' ? pick(this.rng) : 'walk';
    this.left = 2 + this.rng() * 8;
    this.speedJitter = 0.85 + this.rng() * 0.3;
    if (mode === 'sit') {
      this.rig.pelvis.position.set(-0.045, 0.5 / S, 0);
    }
    this.applyProps();
  }
  setMode(mode) {
    this.mode = mode;
    if (mode === 'sit') {
      this.rig.pelvis.position.set(-0.045, 0.5 / S, 0);
      this.action = pick(this.rng);
      this.left = 3 + this.rng() * 6;
    } else {
      this.rig.pelvis.position.set(0, 0.385, 0);
    }
    this.emote = null;
    this.applyProps();
  }
  say(text, sec = 4.5) {   // 말풍선
    this.sayText = text;
    this.sayT = sec;
  }
  doEmote(name) {
    this.emote = name;
    this.emoteT = 0;
    this.applyProps();
  }
  applyProps() {
    let want = this.mode === 'sit' ? SIT_ACTIONS[this.action].props : (this.carry ? [this.carry] : []);
    if (this.mode !== 'sit' && this.emote === 'coffee') want = ['cup'];
    for (const [k, m] of Object.entries(this.rig.props)) m.visible = want.includes(k);
  }
  update(dt, walkPhase = 0) {
    this.t += dt * this.speedJitter;
    const target = zero();
    if (this.mode === 'sit') {
      this.left -= dt;
      if (this.left <= 0) {
        this.action = pick(this.rng);
        this.left = (this.action === 'stretch' ? 2.5 : 4) + this.rng() * 8;
        this.applyProps();
      }
      sitBase(target);
      SIT_ACTIONS[this.action].pose(target, this.t);
    } else if (this.mode === 'stand') {
      this.rig.pelvis.position.set(0, 0.385, 0);
      target.shL = [0.1, 0, 0.04]; target.shR = [-0.1, 0, 0.04];
      target.elL = [0, 0, 0.15]; target.elR = [0, 0, 0.15];
      target.head = [0, 0.08 * Math.sin(this.t * 0.6), 0];
      target.knL = [0, 0, -0.04]; target.knR = [0, 0, -0.04];
      if (this.emote) {
        this.emoteT += dt;
        const t = this.emoteT;
        if (this.emote === 'wave') {
          target.shR = [-0.35 - 0.3 * Math.sin(t * 9), 0, 2.55]; target.elR = [0, 0, 0.35];
          target.head = [0.1, 0, 0.05];
        } else if (this.emote === 'bow') {
          const k = Math.sin(Math.min(1, t / 2.2) * Math.PI);
          target.spine = [0, 0, -0.75 * k]; target.head = [0, 0, -0.3 * k];
          target.shL = [0.05, 0, 0.25 * k]; target.shR = [-0.05, 0, 0.25 * k];
          target.hipL = [0, 0, 0.15 * k]; target.hipR = [0, 0, 0.15 * k];
        } else if (this.emote === 'cheer') {
          const b = Math.abs(Math.sin(t * 6));
          target.shL = [0.35, 0, 2.7 + 0.2 * b]; target.shR = [-0.35, 0, 2.7 + 0.2 * b];
          target.elL = [0, 0, 0.2]; target.elR = [0, 0, 0.2];
          this.rig.pelvis.position.y = 0.385 + 0.06 * b;
          target.head = [0, 0, 0.15];
        } else if (this.emote === 'praise' && t > 2.3) {
          // 응원받고 힘내기: 오른 주먹을 위로 불끈불끈, 왼 주먹은 가슴 앞
          const pump = Math.abs(Math.sin((t - 2.3) * 6.5));
          target.shR = [-0.25, 0, 2.25 + 0.4 * pump]; target.elR = [0, 0, 0.9 - 0.5 * pump];
          target.shL = [-0.35, 0, 0.95]; target.elL = [0, 0, 2.1];
          target.head = [0, 0, 0.2];
          target.spine = [0, 0, 0.06];
          this.rig.pelvis.position.y = 0.385 + 0.05 * pump;
        } else if (this.emote === 'praise') {
          // 두 손으로 볼 감싸고, 고개 숙이고, 몸을 배배 꼼
          const w = Math.sin(t * 4.5);
          target.shL = [-0.55, 0, 1.25]; target.shR = [0.55, 0, 1.25];
          target.elL = [0, 0, 2.2]; target.elR = [0, 0, 2.2];
          target.head = [0.18 * w, 0.15 * w, -0.16];
          target.spine = [0.08 * w, 0.28 * w, -0.06];
          target.hipL = [0, 0, 0.05 * Math.max(0, w)]; target.hipR = [0, 0, 0.05 * Math.max(0, -w)];
          this.rig.pelvis.position.y = 0.385 + 0.012 * Math.abs(Math.sin(t * 9));
        } else if (this.emote === 'coffee') {
          const k = Math.max(0, Math.sin(t * 1.1)) ** 2;
          target.shR = [-0.05, 0, 0.55 + 0.5 * k]; target.elR = [0, 0, 1.3 + 1.0 * k];
          target.head = [0, 0, 0.12 * k];
        }
        if (this.emote !== 'coffee' && t > ({ bow: 2.3, praise: 5.4 }[this.emote] ?? 2.8)) { this.emote = null; this.applyProps(); }
      }
    } else {
      const s = Math.sin(walkPhase);
      this.rig.pelvis.position.set(0, 0.385 + Math.abs(Math.cos(walkPhase)) * 0.018, 0);
      target.hipL = [0, 0, s * 0.5];
      target.hipR = [0, 0, -s * 0.5];
      target.knL = [0, 0, -Math.max(0, -s) * 0.8 - 0.05];
      target.knR = [0, 0, -Math.max(0, s) * 0.8 - 0.05];
      target.shL = [0.08, 0, -s * 0.4]; target.shR = [-0.08, 0, s * 0.4];
      target.elL = [0, 0, 0.3]; target.elR = [0, 0, 0.3];
      target.spine = [0, 0.05 * s, 0];
      if (this.carry === 'cup') { target.shR = [-0.05, 0, 0.55]; target.elR = [0, 0, 1.3]; }
      if (this.carry === 'folder') { target.shL = [0.35, 0, 0.45]; target.elL = [0, 0, 1.75]; }
      if (this.carry === 'phone') { target.shR = [-0.55, 0, 0.45]; target.elR = [0, 0, 2.45]; target.head = [0.14, 0, 0]; }
    }
    const k = Math.min(1, dt * (this.mode === 'sit' ? 5 : 14));
    for (const j of JOINTS) {
      const c = this.cur[j], tg = target[j];
      for (let i = 0; i < 3; i++) c[i] += (tg[i] - c[i]) * k;
      const o = jointObj(this.rig, j);
      o.rotation.set(c[0], c[1], c[2]);
    }
    const cup = this.rig.props.cup;
    if (cup.visible) {   // 손이 어느 방향이든 컵은 똑바로(살짝 입쪽으로 기울임)
      cup.parent.updateWorldMatrix(true, false);
      cup.parent.getWorldQuaternion(_q).invert();
      cup.quaternion.copy(_q);
    }
    // 칭찬 반응: 표정·하트
    const shyOn = this.emote === 'praise' && (this.emoteT || 0) <= 2.3;
    if (this.sayT > 0) this.sayT -= dt;
    this.bubble = this.emote === 'praise' && (this.emoteT || 0) > 2.3 ? '화이팅!' : (this.sayT > 0 ? this.sayText : null);
    if (this.rig.shy.visible !== shyOn) {
      this.rig.shy.visible = shyOn;
      if (!this.rig.faceMesh) for (const c of this.rig.normalFace) c.visible = !shyOn;
    }
    // 사진 얼굴: 눈 깜빡임(2.5~5초마다 0.14초) + 웃음(인사·응원 등에서 활짝)
    const fm = this.rig.faceMesh;
    if (fm) {
      if (this.blinkT === undefined) this.blinkT = 1 + this.rng() * 3;
      this.blinkT -= dt;
      let blink = 0;
      if (this.blinkT < 0) {
        const p = -this.blinkT / 0.14;
        if (p < 1) blink = Math.sin(p * Math.PI);
        else this.blinkT = 2.5 + this.rng() * 2.5;
      }
      let smile = this.emote ? 0.85 : 0.15;
      if (shyOn) { blink = 0.8; smile = 1; }
      const inf = fm.morphTargetInfluences;
      inf[0] = blink;
      inf[1] += (smile - inf[1]) * Math.min(1, dt * 6);
    }
    this.rig.hearts.forEach((h, i) => {
      if (!shyOn) { h.visible = false; return; }
      const ph = ((this.emoteT || 0) * 0.55 + i / 3) % 1;
      h.visible = true;
      h.position.set(0.05 * Math.sin(ph * 9 + i), 1.5 + ph * 0.55, (i - 1) * 0.16);
      h.rotation.set(0, Math.PI / 2, 0);
      h.scale.setScalar(0.8 + ph * 0.7);
      h.material.opacity = Math.sin(ph * Math.PI);
    });
  }
}

export const CHAR_SCALE = S;
const _q = new THREE.Quaternion();
