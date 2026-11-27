// 창천 3층 3D 지도 뷰어
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PathWalker } from './people.js?v=20261127172937';
import { createCharacter, Actor } from './characters.js?v=20261127172937';
import { NavGrid } from './nav.js?v=20261127172937';

const $ = (s) => document.querySelector(s);
const state = { mode: 'guide', ready: false, follow: null, flying: null, showNames: true };

// ------------------------------------------------------------------ renderer / scene
const canvas = $('#c');
// logarithmicDepthBuffer: 먼 도시와 가까운 실내를 함께 볼 때 면이 겹쳐 깜빡이는 현상 방지
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'labels';
document.body.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2500);
const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 0.6;
controls.maxDistance = 900;
controls.screenSpacePanning = false;

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ helpers
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function flyTo(pos, target, dur = 1.6) {
  state.follow = null;
  state.flying = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
}
const P = (x, y, h = 0) => new THREE.Vector3(x, h, y);   // plan(m) → three
function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
  }
  a *= 0.5;
  return Math.abs(a) < 1e-6 ? poly[0] : [cx / (6 * a), cy / (6 * a)];
}
function inPoly([x, y], poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function label(text, cls, pos) {
  const el = document.createElement('div');
  el.className = `lbl ${cls}`;
  el.innerHTML = text;
  const o = new CSS2DObject(el);
  o.position.copy(pos);
  return o;
}
const setProgress = (t) => { const el = $('#loading .bar i'); if (el) el.style.width = `${Math.round(t * 100)}%`; };

// ------------------------------------------------------------------ load
const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

const fetchJSON = (u) => fetch(u).then((r) => r.json());
const [plan, people, lmMeta, cityMeta, profiles] = await Promise.all([
  fetchJSON('./data/plan.json?v=20261127172937'), fetchJSON('./data/people.json?v=20261127172937'),
  fetchJSON('./assets/lightmaps.json?v=20261127172937'), fetchJSON('./assets/city.json?v=20261127172937'),
  fetchJSON('./data/profiles.json?v=20261127172937').catch(() => ({})),
]);

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const hdr = await texLoader.loadAsync('./assets/sky.jpg?v=20261127172937');
hdr.colorSpace = THREE.SRGBColorSpace;
hdr.mapping = THREE.EquirectangularReflectionMapping;
const skyEnv = pmrem.fromEquirectangular(hdr).texture;
scene.background = hdr;
scene.backgroundRotation.y = THREE.MathUtils.degToRad(-130);
scene.environment = skyEnv;
scene.environmentRotation.y = THREE.MathUtils.degToRad(-130);
setProgress(0.15);

const [office, city] = await Promise.all([
  loader.loadAsync('./assets/office.glb?v=20261127172937', (e) => e.total && setProgress(0.15 + 0.6 * (e.loaded / e.total))),
  loader.loadAsync('./assets/city.glb?v=20261127172937'),
]);
setProgress(0.8);

// 라이트맵
const lmTex = {};
await Promise.all(lmMeta.maps.map(async (name) => {
  const t = await texLoader.loadAsync(`./assets/lm/${name}.jpg?v=20261127172937`);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.channel = 1;
  t.anisotropy = 4;
  lmTex[name] = t;
}));
setProgress(0.95);

const ceilings = [];
const glassMats = {
  GL_frosted: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f5, roughness: 0.4, transparent: true, opacity: 0.62, depthWrite: false, envMap: roomEnv, envMapIntensity: 0.6, side: THREE.DoubleSide }),
  GL_clear: new THREE.MeshPhysicalMaterial({ color: 0xe8f0f2, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.0, side: THREE.DoubleSide }),
  GL_window: new THREE.MeshPhysicalMaterial({ color: 0xcfe0e8, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.1, depthWrite: false, envMapIntensity: 1.2, side: THREE.DoubleSide }),
};
const lmOf = (obj) => { let o = obj; while (o) { if (lmTex[o.name]) return o.name; o = o.parent; } return null; };
const topName = (obj) => { let o = obj; while (o.parent && o.parent !== office.scene) o = o.parent; return o.name; };
const K = lmMeta.K * Math.PI;

office.scene.traverse((o) => {
  if (!o.isMesh) return;
  const top = topName(o);
  if (top.startsWith('CEIL_')) ceilings.push(o);
  // 반투명 유리는 종류별로 그리는 순서를 고정(시점을 돌릴 때 순서가 바뀌며 번쩍이는 현상 방지)
  if (glassMats[top]) { o.material = glassMats[top]; o.renderOrder = { GL_window: 1, GL_clear: 2, GL_frosted: 3 }[top]; return; }
  const lm = lmOf(o);
  const m = o.material.clone();
  if (lm) {
    m.lightMap = lmTex[lm];
    m.lightMapIntensity = K;
    m.envMap = roomEnv;
    m.envMapIntensity = 0.12;
  } else {
    m.envMap = roomEnv;
    m.envMapIntensity = 0.7;
  }
  o.material = m;
});
scene.add(office.scene);

// 도시
const ourUpper = [];
city.scene.traverse((o) => {
  if (!o.isMesh) return;
  if (o.name.startsWith('OUR_upper') || o.parent?.name === 'OUR_upper') {
    o.material = new THREE.MeshPhysicalMaterial({ color: 0x9fb6c4, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false, envMapIntensity: 1.2 });
    o.renderOrder = 5;
    ourUpper.push(o);
  } else if (o.name.startsWith('OUR_slab_top') || o.parent?.name === 'OUR_slab_top') {
    ceilings.push(o);
  } else {
    o.material.envMapIntensity = 1.0;
    if (o.name.startsWith('CITY_buildings') || o.parent?.name === 'CITY_buildings') addFacadeWindows(o.material);
  }
});
scene.add(city.scene);

// 주변 건물 외벽에 층별 창문 띠를 셰이더로 그린다(지면 = y -8m)
function addFacadeWindows(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.66 + 0.4 * max(dot(normalize(vWNrm), normalize(vec3(0.45, 0.8, 0.35))), 0.0);
        if (abs(vWNrm.y) < 0.5) {
          float h = vWPos.y + ${(-cityMeta.ground).toFixed(2)};
          vec2 t = normalize(vec2(-vWNrm.z, vWNrm.x));
          float u = dot(vWPos.xz, t);
          float fl = fract(h / 3.4);
          float c = fract(u / 1.7);
          float win = step(0.32, fl) * step(fl, 0.86) * step(0.1, c) * step(c, 0.9) * step(3.6, h);
          float shop = step(h, 3.6) * step(0.15, fract(h / 3.6)) * step(0.08, c) * step(c, 0.92);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.21, 0.26), max(win * 0.82, shop * 0.7));
        }`);
  };
}

// ------------------------------------------------------------------ rooms / labels
const rooms = plan.rooms;
const seats = Object.fromEntries(plan.seats.map((s) => [s.id, s]));
const seatName = Object.fromEntries(people.seated.map((p) => [p.seat, p.name]));
const officeOwner = {};
for (const r of rooms) if (r.kind === 'office') officeOwner[r.id] = seatName[`S${r.number}`] || people.rooms?.[r.id] || '';

const roomLabels = new THREE.Group();     // 내부 안내 모드
const facilityLabels = new THREE.Group(); // 두 모드 공통
const LABEL_SKIP = new Set(['CORR_T', 'CORR_L', 'CORR_B', 'CORR_E', 'PS', 'EPS', 'WC_V', 'ELEV']);
for (const r of rooms) {
  if (LABEL_SKIP.has(r.id)) continue;
  const [cx, cy] = r.id === 'OPEN' ? [17.2, 2.6] : centroid(r.poly);
  if (r.kind === 'office') {
    // 사람 이름표(남색)에 방 번호를 붙이므로, 비어 있는 방만 따로 표시
    const who = officeOwner[r.id];
    if (!who || who === '미정') roomLabels.add(label(`<b>${r.number}</b>${who || ''}`, 'person empty', P(cx, cy, 1.6)));
  } else {
    facilityLabels.add(label(r.label, 'fac', P(cx, cy, r.kind === 'open' || r.kind === 'team' ? 2.5 : 2.2)));
  }
}
scene.add(roomLabels, facilityLabels);

// ------------------------------------------------------------------ people
const blobTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.45)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
})();
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
function addBlob(p, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), blobMat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  p.add(m);
}
const persons = [];     // {name, obj, actor, seat|walker, tag}
const charMeshes = [];
const envify = (o) => o.traverse((m) => { if (m.isMesh) { m.material.envMap = roomEnv; m.material.envMapIntensity = 1.7; charMeshes.push(m); } });
let seed = 1;
for (const { name, seat, look } of people.seated) {
  const s = seats[seat];
  if (!s) continue;
  const p = createCharacter(look || {});
  const actor = new Actor(p, 'sit', seed++);
  p.position.copy(P(s.pos[0], s.pos[1]));
  p.rotation.y = -THREE.MathUtils.degToRad(s.face);
  envify(p);
  scene.add(p);
  const room = rooms.find((r) => r.id === s.room);
  const tag = label(room?.kind === 'office' ? `<b>${room.number}</b>${name}` : name, 'person', new THREE.Vector3(0, 1.62, 0));
  p.add(tag);
  const per = { name, obj: p, actor, seat: s, tag };
  p.userData.person = per;
  persons.push(per);
}
for (const w of people.walking) {
  const route = plan.routes[w.route];
  if (!route) continue;
  const p = createCharacter(w.look || {});
  const actor = new Actor(p, 'walk', seed++, w.carry || null);
  envify(p);
  scene.add(p);
  addBlob(p, 0.9);
  const walker = new PathWalker(route, w.speed, w.offset);
  const tag = label(`${w.name}<em>이동 중</em>`, 'person walking', new THREE.Vector3(0, 1.85, 0));
  p.add(tag);
  const per = { name: w.name, obj: p, actor, walker, tag, phase: Math.random() * 6 };
  p.userData.person = per;
  persons.push(per);
}

// 사진카드(내부 안내 모드)
function roomNameOf(per) {
  if (per.walker) return '사무실 안 이동 중';
  const r = rooms.find((x) => x.id === per.seat.room);
  return r ? r.name : '';
}
function showCard(name, where) {
  state.cardPerson = persons.find((x) => x.name === name) || null;
  $('#card .drive').hidden = !state.cardPerson;
  const pr = profiles[name];
  const card = $('#card');
  card.querySelector('.photo').innerHTML = pr?.photo
    ? `<img src="./${pr.photo}" alt="${name} 프로필 사진">`
    : `<div class="initial">${name.slice(-2)}</div>`;
  card.querySelector('.name').textContent = name;
  card.querySelector('.title').textContent = pr?.title || people.staffTitle || '';
  card.querySelector('.fields').textContent = pr?.fields || '';
  card.querySelector('.where').textContent = where || '';
  card.hidden = false;
}
$('#card .close').onclick = () => { $('#card').hidden = true; };

// ------------------------------------------------------------------ 조종(내 화면에서만)
const nav = new NavGrid(plan);
const ctrl = { per: null, keys: new Set() };
const NAV_SPEED = 1.25;
const planOf = (per) => [per.obj.position.x, per.obj.position.z];
function face(per, dx, dy) { if (Math.hypot(dx, dy) > 1e-4) per.obj.rotation.y = Math.atan2(-dy, dx); }
function goTo(per, xy, onArrive) {
  const path = nav.find(planOf(per), xy);
  if (!path) return false;
  per.nav = { path, idx: 1, onArrive };
  if (per.actor.mode !== 'walk') per.actor.setMode('walk');
  return true;
}
function standUp(per) {
  if (per.actor.mode === 'sit') {
    const f = nav.nearestFree(...planOf(per), 1.5);
    if (f) per.obj.position.set(f[0], 0, f[1]);
  }
  per.actor.setMode('stand');
}
function returnHome(per) {
  per.controlled = false;
  if (per.seat) {
    const ok = goTo(per, per.seat.pos, () => {
      per.obj.position.copy(P(per.seat.pos[0], per.seat.pos[1]));
      per.obj.rotation.y = -THREE.MathUtils.degToRad(per.seat.face);
      per.actor.setMode('sit');
    });
    if (!ok) { per.obj.position.copy(P(per.seat.pos[0], per.seat.pos[1])); per.actor.setMode('sit'); }
  } else if (per.walker) {
    const ok = goTo(per, [per.walker.pos.x, per.walker.pos.z], () => { per.actor.setMode('walk'); });
    if (!ok) per.actor.setMode('walk');
  }
}
function startControl(per) {
  if (ctrl.per && ctrl.per !== per) returnHome(ctrl.per);
  ctrl.per = per;
  per.controlled = true;
  per.nav = null;
  state.follow = null;
  standUp(per);
  $('#ctrl-name').textContent = per.name;
  $('#ctrlbar').hidden = false;
  $('#card').hidden = true;
  const w = per.obj.position;
  flyTo(new THREE.Vector3(w.x + 2.2, 5.6, w.z + 4.2), new THREE.Vector3(w.x, 0.6, w.z), 1.0);
}
function endControl() {
  if (!ctrl.per) return;
  returnHome(ctrl.per);
  ctrl.per = null;
  $('#ctrlbar').hidden = true;
}
$('#card .drive').onclick = () => { if (state.cardPerson) startControl(state.cardPerson); };
$('#ctrlbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b || !ctrl.per) return;
  const per = ctrl.per, act = b.dataset.act;
  if (act === 'end') return endControl();
  if (act === 'home') { endControl(); return; }
  per.nav = null;
  per.actor.setMode('stand');
  per.actor.doEmote(act);
});
const isTyping = () => document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
window.addEventListener('keydown', (e) => {
  if (!ctrl.per || isTyping()) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { ctrl.keys.add(k); e.preventDefault(); }
  if (k === 'escape') endControl();
});
window.addEventListener('keyup', (e) => ctrl.keys.delete(e.key.toLowerCase()));
const camFwd = new THREE.Vector3();
function updateNav(per, dt) {
  const before = per.obj.position.clone();
  let moving = false;
  if (per === ctrl.per && ctrl.keys.size) {
    camera.getWorldDirection(camFwd);
    camFwd.y = 0; camFwd.normalize();
    const right = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
    const k = ctrl.keys;
    const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const r = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const mv = camFwd.clone().multiplyScalar(f).add(right.multiplyScalar(r));
    if (mv.lengthSq() > 0) {
      per.nav = null;
      mv.normalize().multiplyScalar(NAV_SPEED * 1.15 * dt);
      const nx = per.obj.position.x + mv.x, nz = per.obj.position.z + mv.z;
      if (nav.isFree(nx, nz)) per.obj.position.set(nx, 0, nz);
      else if (nav.isFree(nx, per.obj.position.z)) per.obj.position.x = nx;
      else if (nav.isFree(per.obj.position.x, nz)) per.obj.position.z = nz;
      face(per, mv.x, mv.z);
      moving = true;
    }
  }
  if (!moving && per.nav) {
    const n = per.nav, tgt = n.path[n.idx];
    const dx = tgt[0] - per.obj.position.x, dy = tgt[1] - per.obj.position.z;
    const d = Math.hypot(dx, dy), step = NAV_SPEED * dt;
    if (d <= step) {
      per.obj.position.set(tgt[0], 0, tgt[1]);
      n.idx++;
      if (n.idx >= n.path.length) {
        per.nav = null;
        if (n.onArrive) n.onArrive(); else per.actor.setMode('stand');
      }
    } else {
      per.obj.position.x += (dx / d) * step;
      per.obj.position.z += (dy / d) * step;
      face(per, dx, dy);
    }
    moving = !!per.nav;
  }
  if (moving && per.actor.mode !== 'walk') per.actor.setMode('walk');
  if (!moving && per === ctrl.per && per.actor.mode === 'walk') per.actor.setMode('stand');
  per.phase = (per.phase || 0) + dt * NAV_SPEED * 6.5;
  per.actor.update(dt, per.phase);
  // 말풍선(응원하기 → "화이팅!")
  if (per.actor.bubble && !per.bubbleTag) {
    per.bubbleTag = label('', 'bubble', new THREE.Vector3(0, 1.88, 0));
    per.obj.add(per.bubbleTag);
  }
  if (per.bubbleTag) {
    per.bubbleTag.visible = !!per.actor.bubble;
    if (per.actor.bubble) per.bubbleTag.element.textContent = per.actor.bubble;
  }
  if (per === ctrl.per) {   // 카메라가 같은 거리로 따라감
    const delta = per.obj.position.clone().sub(before);
    camera.position.add(delta);
    controls.target.add(delta);
  }
}

// ------------------------------------------------------------------ views
const outline = plan.outline;
const C = centroid(outline);
const center = P(C[0], C[1], 0);
const VIEW_DOLL = { pos: P(C[0] + 9, C[1] + 19, 21), target: P(C[0] + 0.5, C[1], 0) };
const VIEW_CITY = { pos: P(C[0] + 150, C[1] + 210, 150), target: P(C[0], C[1], -6) };

function setMode(mode) {          // 단일 모드(소개+내부 안내 통합). 외부 호출 호환용
  state.mode = 'guide';
}
function setNames(on) {
  state.showNames = on;
  const b = $('#btn-names');
  b.classList.toggle('on', on);
  b.textContent = on ? '이름표 켜짐' : '이름표 꺼짐';
  if (!on) $('#card').hidden = true;
}

// ------------------------------------------------------------------ interaction
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function roomAt(ev) {
  ptr.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, hit)) return null;
  const pt = [hit.x, hit.z];
  return rooms.find((r) => !r.id.startsWith('CORR') && inPoly(pt, r.poly)) || null;
}
const tip = $('#tip');
const marker = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 32), new THREE.MeshBasicMaterial({ color: 0x1b365d, transparent: true, opacity: 0.85, depthWrite: false }));
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);
function showMarker(p) { marker.position.set(p.x, 0.02, p.z); marker.visible = true; marker.userData.t = 1.2; }
let down = null;
labelRenderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
labelRenderer.domElement.addEventListener('pointermove', (e) => {
  if (!state.ready || camera.position.y > 120) { tip.hidden = true; return; }
  const r = roomAt(e);
  if (!r || ['PS', 'EPS', 'ELEV', 'WC_V'].includes(r.id)) { tip.hidden = true; return; }
  const who = state.mode === 'guide' && r.kind === 'office' ? officeOwner[r.id] : '';
  tip.innerHTML = `${r.name}${who ? ` · <b>${who}</b>` : ''}`;
  tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
  tip.hidden = false;
});
labelRenderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  if (state.mode === 'guide') {
    ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(charMeshes, false)[0];
    const per = hit?.object.userData.charRoot?.userData.person;
    if (per) { focusPerson(per); return; }
  }
  if (ctrl.per) {
    ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hp = new THREE.Vector3();
    if (ray.ray.intersectPlane(floorPlane, hp)) {
      if (goTo(ctrl.per, [hp.x, hp.z], null)) showMarker(hp);
    }
    return;
  }
  const r = roomAt(e);
  if (!r) return;
  if (state.mode === 'guide' && r.kind === 'office' && officeOwner[r.id] && officeOwner[r.id] !== '미정') {
    showCard(officeOwner[r.id], r.name);
  }
  const [cx, cy] = centroid(r.poly);
  const xs = r.poly.map((p) => p[0]), ys = r.poly.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const d = Math.max(4.5, span * 1.15);
  flyTo(P(cx + d * 0.35, cy + d * 0.75, d * 0.95 + 1.5), P(cx, cy, 0.4));
});

$('#btn-names').onclick = () => setNames(!state.showNames);
$('#btn-home').onclick = () => flyTo(VIEW_DOLL.pos, VIEW_DOLL.target);
$('#btn-city').onclick = () => flyTo(VIEW_CITY.pos, VIEW_CITY.target, 2.2);
$('#btn-eye').onclick = () => flyTo(P(14.2, 8.7, 1.6), P(18.6, 2.2, 1.15), 1.8);

// 검색
const q = $('#q'), results = $('#results');
q.addEventListener('input', () => {
  const s = q.value.trim();
  results.innerHTML = '';
  if (!s) return;
  const hits = persons.filter((p) => p.name.includes(s)).slice(0, 8);
  const roomHits = Object.entries(officeOwner).filter(([, n]) => n && n.includes(s)).map(([id]) => id);
  for (const p of hits) {
    const li = document.createElement('li');
    const where = p.walker ? '사무실 안 이동 중' : (rooms.find((r) => r.id === p.seat.room)?.name ?? '');
    li.innerHTML = `<b>${p.name}</b><span>${where}</span>`;
    li.onclick = () => focusPerson(p);
    results.appendChild(li);
  }
  if (!hits.length && !roomHits.length) results.innerHTML = '<li class="none">찾는 이름이 없습니다</li>';
});
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') results.querySelector('li:not(.none)')?.click(); });

function focusPerson(p) {
  persons.forEach((x) => {
    x.tag.element.classList.remove('hl');
    x.tag.userData.picked = false;
  });
  p.tag.element.classList.add('hl');
  p.tag.userData.picked = true;
  if (!state.showNames) setNames(true);
  if (state.mode === 'guide') showCard(p.name, roomNameOf(p));
  if (p.walker) {
    state.follow = p;
    state.flying = null;
    return;
  }
  const pos = p.obj.position;
  const r = rooms.find((x) => x.id === p.seat.room);
  if (r?.kind === 'office') {
    const [cx, cy] = centroid(r.poly);
    flyTo(P(cx + 0.5, cy + 1.6, 5.4), P(pos.x, pos.z, 0.6));
  } else {
    // 어깨 뒤 비스듬한 시점(사람 뒤 1.7m, 옆 1.5m, 높이 2.2m)
    const f = THREE.MathUtils.degToRad(p.seat.face);
    const fx = Math.cos(f), fz = Math.sin(f);
    flyTo(P(pos.x - fx * 1.7 - fz * 1.5, pos.z - fz * 1.7 + fx * 1.5, 2.2), P(pos.x + fx * 0.6, pos.z + fz * 0.6, 0.9));
  }
}

// ------------------------------------------------------------------ loop
const clock = new THREE.Timer();
const tmp = new THREE.Vector3();
function tick() {
  clock.update();
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  if (state.flying) {
    const f = state.flying;
    f.t += Math.min(rawDt, 0.5) / f.dur;
    const k = ease(Math.min(1, f.t));
    camera.position.lerpVectors(f.p0, f.p1, k);
    controls.target.lerpVectors(f.t0, f.t1, k);
    if (f.t >= 1) state.flying = null;
  }
  if (marker.visible) { marker.userData.t -= dt; marker.material.opacity = Math.max(0, marker.userData.t) * 0.7; if (marker.userData.t <= 0) marker.visible = false; }
  for (const p of persons) {
    if (p.controlled || p.nav) { updateNav(p, dt); continue; }
    if (!p.walker) { p.actor.update(dt); continue; }
    p.walker.update(dt);
    p.phase += dt * p.walker.speed * 6.5;
    p.actor.update(dt, p.phase);
    p.obj.position.copy(p.walker.pos);
    p.obj.rotation.y = Math.atan2(-p.walker.dir.z, p.walker.dir.x);
  }
  if (state.follow) {
    const w = state.follow.obj.position;
    tmp.set(w.x, 1.0, w.z);
    controls.target.lerp(tmp, Math.min(1, dt * 3));
    const back = state.follow.walker.dir.clone().multiplyScalar(-3.2);
    camera.position.lerp(new THREE.Vector3(w.x + back.x + 0.6, 2.4, w.z + back.z + 0.6), Math.min(1, dt * 2));
  }
  controls.update();
  // 천장: 카메라가 천장보다 높으면 숨김(돌하우스)
  const above = camera.position.y > 2.6;
  for (const c of ceilings) c.visible = !above;
  // 우리 건물 윗층 유리: 가까워지면 사라짐
  const dist = camera.position.distanceTo(center);
  const op = THREE.MathUtils.clamp((dist - 45) / 80, 0, 1) * 0.28;
  for (const m of ourUpper) { m.material.opacity = op; m.visible = op > 0.01; }
  const near = dist < 90 && state.ready && !state.intro;
  facilityLabels.visible = near && above;
  roomLabels.visible = near && state.showNames;
  for (const p of persons) {
    p.tag.visible = near && state.showNames && (!p.tag.userData.onlyWhenPicked || p.tag.userData.picked);
  }
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ start
camera.position.copy(VIEW_CITY.pos);
controls.target.copy(VIEW_CITY.target);
setMode('guide');
setNames(true);
state.ready = true;
state.intro = true;
$('#loading').classList.add('done');
tick();
setTimeout(() => { flyTo(VIEW_DOLL.pos, VIEW_DOLL.target, 4.5); setTimeout(() => { state.intro = false; }, 3800); }, 600);
window.__office = { scene, camera, controls, flyTo, setMode, persons, P, startControl, endControl, goTo, nav };
