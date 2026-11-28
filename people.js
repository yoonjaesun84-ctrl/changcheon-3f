// 얼굴 없는 마네킹형 인물: 앉은 자세 / 걷기 애니메이션.
// 로컬 좌표: +X = 정면, Y = 위. 바닥 기준 원점.
import * as THREE from 'three';

const SKIN = new THREE.MeshStandardMaterial({ color: 0xe9e4db, roughness: 0.55, metalness: 0.0 });
const OUTFITS = [0x1f2a3a, 0x2d2f33, 0x4a4f57, 0x6b5a48, 0x8a8f96, 0x24324a, 0x3b3f45, 0xb9b2a6];
const PANTS = [0x1c1f24, 0x2a2d31, 0x3a3d42, 0x4b4740];

function capsule(r, len, mat) {
  const g = new THREE.CapsuleGeometry(r, len, 6, 14);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = false;
  return m;
}

function limb(r, len, mat) {
  // 피벗이 위쪽 끝(관절)에 오도록
  const pivot = new THREE.Group();
  const c = capsule(r, len, mat);
  c.position.y = -len / 2 - r * 0.2;
  pivot.add(c);
  pivot.userData.len = len;
  return pivot;
}

export function createPerson(seed = 0) {
  const outfit = new THREE.MeshStandardMaterial({ color: OUTFITS[seed % OUTFITS.length], roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS[(seed * 7 + 3) % PANTS.length], roughness: 0.85 });
  const root = new THREE.Group();
  const body = new THREE.Group();           // 골반 기준
  root.add(body);

  const torso = capsule(0.17, 0.42, outfit);
  torso.scale.set(0.78, 1, 1.15);
  torso.position.y = 0.33;
  body.add(torso);
  const neck = capsule(0.05, 0.06, SKIN);
  neck.position.y = 0.64;
  body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), SKIN);
  head.scale.set(0.9, 1.15, 0.85);
  head.position.y = 0.8;
  body.add(head);

  const mk = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.55, side * 0.21);
    const upper = limb(0.048, 0.25, outfit);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    upper.add(elbow);
    const fore = limb(0.042, 0.23, SKIN);
    elbow.add(fore);
    body.add(shoulder);
    const hip = new THREE.Group();
    hip.position.set(0, 0.0, side * 0.1);
    const thigh = limb(0.07, 0.34, pants);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    thigh.add(knee);
    const shin = limb(0.055, 0.36, pants);
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.09), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 }));
    foot.position.set(0.06, -0.45, 0);
    shin.add(foot);
    body.add(hip);
    return { shoulder, upper, elbow, hip, thigh, knee };
  };
  const L = mk(-1), R = mk(1);
  root.userData = { body, L, R, head };
  return root;
}

export function poseSit(p) {
  const { body, L, R } = p.userData;
  body.position.set(-0.05, 0.52, 0);
  for (const s of [L, R]) {
    s.hip.rotation.z = Math.PI / 2 - 0.05;    // 허벅지 앞으로
    s.knee.rotation.z = -Math.PI / 2 + 0.05;  // 정강이 아래로
    s.shoulder.rotation.z = 0.55;             // 팔 앞으로
    s.elbow.rotation.z = 0.95;
  }
  L.shoulder.rotation.x = 0.08;
  R.shoulder.rotation.x = -0.08;
}

export function poseWalk(p, phase) {
  const { body, L, R } = p.userData;
  const s = Math.sin(phase);
  body.position.set(0, 0.93 + Math.abs(Math.cos(phase)) * 0.025, 0);
  L.hip.rotation.z = s * 0.42;
  R.hip.rotation.z = -s * 0.42;
  L.knee.rotation.z = -Math.max(0, -s) * 0.7 - 0.05;
  R.knee.rotation.z = -Math.max(0, s) * 0.7 - 0.05;
  L.shoulder.rotation.z = -s * 0.35;
  R.shoulder.rotation.z = s * 0.35;
  L.elbow.rotation.z = 0.25;
  R.elbow.rotation.z = 0.25;
  L.shoulder.rotation.x = 0.06;
  R.shoulder.rotation.x = -0.06;
}

// 경로 위 위치 계산(닫힌 폴리라인, plan 좌표 → three: x=plan.x, z=plan.y)
export class PathWalker {
  constructor(points, speed, offset) {
    this.pts = points.map(([x, y]) => new THREE.Vector3(x, 0, y));
    this.seg = [];
    let total = 0;
    for (let i = 0; i < this.pts.length - 1; i++) {
      const l = this.pts[i].distanceTo(this.pts[i + 1]);
      this.seg.push(l);
      total += l;
    }
    this.total = total;
    this.speed = speed;
    this.d = offset * total;
    this.dir = new THREE.Vector3(1, 0, 0);
    this.pos = new THREE.Vector3();
  }
  update(dt) {
    this.d = (this.d + dt * this.speed) % this.total;
    let d = this.d;
    for (let i = 0; i < this.seg.length; i++) {
      if (d <= this.seg[i]) {
        const t = d / this.seg[i];
        this.pos.lerpVectors(this.pts[i], this.pts[i + 1], t);
        const target = new THREE.Vector3().subVectors(this.pts[i + 1], this.pts[i]).normalize();
        // 모퉁이에서 부드럽게 돌기
        const remain = this.seg[i] - d;
        if (remain < 0.6 && i + 1 < this.seg.length) {
          const next = new THREE.Vector3().subVectors(this.pts[i + 2] ?? this.pts[1], this.pts[i + 1]).normalize();
          target.lerp(next, (0.6 - remain) / 1.2).normalize();
        }
        this.dir.lerp(target, Math.min(1, dt * 6)).normalize();
        return;
      }
      d -= this.seg[i];
    }
  }
}
