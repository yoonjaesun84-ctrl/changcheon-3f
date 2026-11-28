// 3D 임무 표지: 바닥의 빛나는 고리 + 떠 있는 이름표. 내 임무는 남색, 완료는 회색 체크.
import * as THREE from 'three';
import { ICON } from './icons.js?v=20261128101832';

const COLORS = { mine: 0x2f6fe0, other: 0xffffff, done: 0x9aa6b5, preview: 0xc9d2de };

// 임무 자리에 놓는 소품(지금은 화분). 코드로 만든 창천 고유 모양.
function makePlant() {
  const g = new THREE.Group();
  const pot = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.6 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x1b365d, roughness: 0.5 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const leafA = new THREE.MeshStandardMaterial({ color: 0x4f8f4a, roughness: 0.7 });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x6aa85e, roughness: 0.7 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.21, 0.16, 0.46, 28), pot, 0, 0.23, 0);
  add(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 28), rim, 0, 0.47, 0);
  add(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24), soil, 0, 0.49, 0);
  add(new THREE.CylinderGeometry(0.018, 0.025, 0.5, 8), soil, 0, 0.72, 0);
  const leaves = new THREE.Group();
  leaves.position.y = 0.5;
  g.add(leaves);
  const blob = new THREE.SphereGeometry(1, 18, 14);
  for (const [x, y, z, r, m] of [[0, 0.62, 0, 0.24, leafA], [0.14, 0.45, 0.06, 0.18, leafB], [-0.15, 0.48, -0.04, 0.19, leafB],
    [0.04, 0.4, -0.15, 0.17, leafA], [-0.05, 0.36, 0.15, 0.16, leafA], [0.1, 0.78, -0.05, 0.14, leafB]]) {
    const o = new THREE.Mesh(blob, m);
    o.position.set(x, y, z); o.scale.setScalar(r); o.castShadow = true;
    leaves.add(o);
  }
  g.userData.leaves = leaves;
  return g;
}

export function createMissionMarkers({ scene, label, P, nav }, missions) {
  const items = new Map();   // id → {m, group, ring, tag, stand}
  const ringGeo = new THREE.RingGeometry(0.32, 0.42, 40);
  const dotGeo = new THREE.CircleGeometry(0.3, 40);
  for (const m of missions) {
    const group = new THREE.Group();
    group.position.copy(P(m.spot[0], m.spot[1], 0.025));
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COLORS.other, transparent: true, opacity: 0.9, depthWrite: false }));
    const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: COLORS.other, transparent: true, opacity: 0.18, depthWrite: false }));
    ring.rotation.x = dot.rotation.x = -Math.PI / 2;
    ring.renderOrder = dot.renderOrder = 3;
    group.add(dot, ring);
    const tag = label('', 'mission', new THREE.Vector3(0, 1.45, 0));
    group.add(tag);
    group.visible = false;
    scene.add(group);
    let prop = null;
    if (m.prop === 'plant') {
      prop = makePlant();
      prop.position.copy(P(m.spot[0], m.spot[1], 0));
      scene.add(prop);   // 화분은 임무가 없는 날에도 늘 그 자리에 있다
    }
    const stand = m.stand || nav.nearestFree(m.spot[0], m.spot[1], 1.6) || m.spot;
    items.set(m.id, { m, group, ring, dot, tag, stand, prop, state: 'other' });
  }
  let t = 0;
  return {
    items,
    // list: 오늘(또는 미리 보기) 임무 [{...m, assignee}], done: Set(내가 오늘 끝낸 id), preview: 주말 미리 보기 여부
    setState(list, me, done, preview = false) {
      const today = new Map(list.map((x) => [x.id, x]));
      for (const [id, it] of items) {
        const x = today.get(id);
        it.group.visible = !!x;
        if (!x) continue;
        const mine = x.assignee === me;
        const st = preview ? 'preview' : mine && done.has(id) ? 'done' : mine ? 'mine' : 'other';
        it.state = st;
        it.assignee = x.assignee;
        it.ring.material.color.setHex(COLORS[st]);
        it.dot.material.color.setHex(COLORS[st]);
        const el = it.tag.element;
        el.className = `lbl mission ${st}`;
        el.innerHTML = `<i>${st === 'done' ? ICON.check : ICON[x.icon] || ICON.sparkle}</i><span>${x.title}</span><em>${preview ? `${x.dayLabel} · ` : ''}${mine ? '내 임무' : x.assignee}</em>`;
      }
    },
    // 내 캐릭터 위치(Vector3) 가까이에 있는, 아직 안 끝낸 내 임무
    nearest(pos) {
      let best = null, bd = 1.15;
      for (const it of items.values()) {
        if (!it.group.visible || it.state !== 'mine') continue;
        const d = Math.min(Math.hypot(pos.x - it.stand[0], pos.z - it.stand[1]), Math.hypot(pos.x - it.m.spot[0], pos.z - it.m.spot[1]) - 0.5);
        if (d < bd) { bd = d; best = it; }
      }
      return best;
    },
    setVisible(on) { for (const it of items.values()) it.tag.visible = on && it.group.visible; },
    update(dt) {
      t += dt;
      for (const it of items.values()) {
        if (!it.group.visible) continue;
        const k = it.state === 'mine' ? 1 + 0.12 * Math.sin(t * 3.2) : 1;
        it.ring.scale.setScalar(k);
        it.ring.material.opacity = it.state === 'mine' ? 0.75 + 0.25 * Math.sin(t * 3.2) : 0.7;
      }
      // 화분 잎은 살랑살랑, 물 준 날은 조금 더 싱싱하게
      for (const it of items.values()) {
        const lv = it.prop?.userData.leaves;
        if (!lv) continue;
        lv.rotation.z = 0.04 * Math.sin(t * 1.3);
        lv.rotation.x = 0.03 * Math.sin(t * 0.9 + 1);
        const k = it.state === 'done' ? 1.06 : 1;
        lv.scale.x += (k - lv.scale.x) * 0.05; lv.scale.z = lv.scale.x; lv.scale.y += (k - lv.scale.y) * 0.05;
      }
    },
  };
}
