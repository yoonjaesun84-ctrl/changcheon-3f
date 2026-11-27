// 평면(plan.json)으로 이동 가능 격자를 만들고 A* 로 길을 찾는다. 좌표는 plan 미터(x 동, y 남).
const RES = 0.12;          // 격자 크기(m)
const AGENT_R = 0.22;      // 사람 반지름(m)
const BLOCK_TYPES = new Set(['desk', 'open_desk_block', 'cabinet', 'tall_cabinet', 'counter', 'vanity', 'round_table',
  'fridge', 'shelf_desk', 'pier', 'stall', 'printer', 'plant', 'locker_wall']);

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.hypot(qx, qy);
}
function inPoly(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

export class NavGrid {
  constructor(plan) {
    const xs = plan.outline.map((p) => p[0]), ys = plan.outline.map((p) => p[1]);
    this.x0 = Math.min(...xs); this.y0 = Math.min(...ys);
    this.w = Math.ceil((Math.max(...xs) - this.x0) / RES) + 1;
    this.h = Math.ceil((Math.max(...ys) - this.y0) / RES) + 1;
    this.free = new Uint8Array(this.w * this.h);
    const segs = [];
    for (const w of plan.walls) segs.push([w.a, w.b, w.t / 2]);
    for (const g of plan.glass) segs.push([g.a, g.b, 0.02]);
    segs.push([plan.facade_glass[0], plan.facade_glass[1], 0.08]);
    const rects = [];
    for (const [a, b] of plan.columns) rects.push({ cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, hw: Math.abs(b[0] - a[0]) / 2, hd: Math.abs(b[1] - a[1]) / 2, rot: 0 });
    for (const f of plan.furniture) {
      if (!BLOCK_TYPES.has(f.type)) continue;
      const size = f.size || (f.type === 'plant' ? [0.45, 0.45] : f.type === 'printer' ? [0.55, 0.5] : null);
      if (!size) continue;
      // 가구 로컬: x = rot 방향. desk/open_desk_block 은 size[0] 이 로컬 x, cabinet 계열은 size[0] 이 로컬 y(폭)
      const widthAlongY = ['cabinet', 'tall_cabinet', 'vanity', 'fridge', 'shelf_desk', 'pier', 'locker_wall'].includes(f.type);
      const hw = (widthAlongY ? (size[1] || 0.4) : size[0]) / 2;
      const hd = (widthAlongY ? size[0] : (size[1] || size[0])) / 2;
      rects.push({ cx: f.pos[0], cy: f.pos[1], hw, hd, rot: (f.rot || 0) * Math.PI / 180 });
    }
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.x0 + i * RES, y = this.y0 + j * RES;
        let ok = inPoly(x, y, plan.outline);
        if (ok) for (const [a, b, ht] of segs) {
          if (segDist(x, y, a[0], a[1], b[0], b[1]) < ht + AGENT_R) { ok = false; break; }
        }
        if (ok) for (const r of rects) {
          const dx = x - r.cx, dy = y - r.cy;
          const c = Math.cos(-r.rot), s = Math.sin(-r.rot);
          const lx = dx * c - dy * s, ly = dx * s + dy * c;
          if (Math.abs(lx) < r.hw + AGENT_R * 0.8 && Math.abs(ly) < r.hd + AGENT_R * 0.8) { ok = false; break; }
        }
        this.free[j * this.w + i] = ok ? 1 : 0;
      }
    }
  }
  cell(x, y) { return [Math.round((x - this.x0) / RES), Math.round((y - this.y0) / RES)]; }
  pos(i, j) { return [this.x0 + i * RES, this.y0 + j * RES]; }
  isFree(x, y) {
    const [i, j] = this.cell(x, y);
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.free[j * this.w + i] === 1;
  }
  nearestFree(x, y, maxR = 2.5) {
    const [ci, cj] = this.cell(x, y);
    const R = Math.ceil(maxR / RES);
    let best = null, bd = Infinity;
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= this.w || j >= this.h || !this.free[j * this.w + i]) continue;
      const d = di * di + dj * dj;
      if (d < bd) { bd = d; best = [i, j]; }
    }
    return best ? this.pos(...best) : null;
  }
  lineFree(a, b) {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (RES * 0.5));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (!this.isFree(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
    }
    return true;
  }
  // A* → 매끄럽게 다듬은 경로(plan 좌표 배열). 실패 시 null
  find(from, to) {
    const s = this.nearestFree(...from, 1.5), g = this.nearestFree(...to, 2.5);
    if (!s || !g) return null;
    const [si, sj] = this.cell(...s), [gi, gj] = this.cell(...g);
    const W = this.w, N = W * this.h;
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfun = (i, j) => Math.hypot(i - gi, j - gj);
    const sk = sj * W + si, gk = gj * W + gi;
    gScore[sk] = 0;
    push(sk, hfun(si, sj));
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (heap.length) {
      const [, k] = pop();
      if (closed[k]) continue;
      if (k === gk) { found = true; break; }
      closed[k] = 1;
      const i = k % W, j = (k / W) | 0;
      for (const [di, dj, c] of D) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= this.h) continue;
        const nk = nj * W + ni;
        if (!this.free[nk] || closed[nk]) continue;
        if (di && dj && (!this.free[j * W + ni] || !this.free[nj * W + i])) continue;
        const ng = gScore[k] + c;
        if (ng < gScore[nk]) { gScore[nk] = ng; came[nk] = k; push(nk, ng + hfun(ni, nj)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = gk; k !== -1; k = came[k]) cells.push(this.pos(k % W, (k / W) | 0));
    cells.reverse();
    // 시야가 트인 점은 건너뛰어 직선화
    const out = [cells[0]];
    let a = 0;
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      while (b > a + 1 && !this.lineFree(cells[a], cells[b])) b--;
      out.push(cells[b]);
      a = b;
    }
    return out;
  }
}
