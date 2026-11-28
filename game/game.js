// 사무실 생활(임무·출석·칭찬·꾸미기)을 3D 지도에 연결한다.
// ctx: { scene, label, P, nav, persons, missions, shop, deskItems(name), setDesk(name, items),
//        goTo(per, xy, onArrive), startControl(per), ctrl }
import * as R from './rules.js?v=20261128101832';
import { LocalStore } from './store.js?v=20261128101832';
import { createMissionMarkers } from './world.js?v=20261128101832';
import { createUI } from './ui.js?v=20261128101832';
import { STICKERS, ICON } from './icons.js?v=20261128101832';
import { DESK_MAX } from '../desk_props.js?v=20261128101832';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
// 받침 있으면 '을', 없으면 '를'
const josa = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '을' : '를'; };

export async function initGame(ctx) {
  const { persons, missions, shop, deskItems, setDesk, goTo, startControl, ctrl } = ctx;
  const store = new LocalStore();
  const dayParam = new URLSearchParams(location.search).get('day');   // 확인용: ?day=2026-11-27
  const day = () => (dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : R.today());
  const names = persons.map((p) => p.name);
  const personOf = (n) => persons.find((p) => p.name === n);
  let me = await store.getMe();
  if (me && !personOf(me)) me = null;
  let events = await store.all();
  const markers = createMissionMarkers(ctx, missions);
  let S = null;

  function compute() {
    const d = day();
    let list = R.todaysMissions(missions, d), preview = false, previewLabel = '';
    if (!list.length && !R.isWorkday(d)) {
      let n = R.addDays(d, 1);
      while (!R.isWorkday(n)) n = R.addDays(n, 1);
      const w = new Date(`${n}T00:00:00Z`).getUTCDay();
      previewLabel = `${DOW_KO[w]}요일(${n.slice(5).replace('-', '.')})`;
      list = R.todaysMissions(missions, n).map((x) => ({ ...x, dayLabel: `${DOW_KO[w]}요일` }));
      preview = true;
    }
    const sum = R.summarize(events, me, d, { baseDesk: me ? deskItems(me) : [] });
    S = { me, day: d, list, preview, previewLabel, sum, shop, names, deskMax: DESK_MAX, justStamped: S?.justStamped };
    markers.setState(list, me, sum.doneToday, preview);
    ui.render(S);
    if (cardName) ui.renderCard(document.querySelector('#card .praise-row'), cardName, R.summarize(events, cardName, d).stickers);
  }
  async function add(ev) { const e = await store.add({ day: day(), ...ev }); events.push(e); return e; }
  const gained = (before) => S.sum.stars - before;
  const cheer = (name, text, emote = 'praise') => {
    const p = personOf(name);
    if (!p) return;
    if (emote && (p.controlled || p.actor.mode === 'stand')) p.actor.doEmote(emote);
    p.actor.say(text, 4);
  };

  // 이 기기에 저장된 책상 배치를 모두 다시 꾸민다
  function applyDesks() {
    const last = {};
    for (const e of events) if (e.t === 'desk') last[e.who] = e.items;
    for (const [n, items] of Object.entries(last)) if (personOf(n)) setDesk(n, items);
  }

  let cardName = null;
  const ui = createUI({
    async onChoose(name) {
      me = name;
      await store.setMe(name);
      const first = !events.some((e) => e.t === 'welcome' && e.who === name);
      if (first) await add({ t: 'welcome', who: name });
      compute();
      ui.toast(first ? `<b>${name}</b> 님 환영해요! 출석·임무·칭찬으로 ${ICON.star}별을 모아 보세요` : `<b>${name}</b> 님으로 바꿨어요`);
      cheer(name, '안녕하세요!', 'wave');
    },
    async onAttend() {
      if (!me || S.sum.attendedToday) return;
      const before = S.sum.stars;
      await add({ t: 'attend', who: me });
      S.justStamped = day();
      compute();
      const g = gained(before), bonus = g > R.RULES.ATTEND;
      ui.toast(`출석 도장 쾅! ${ICON.star}<b>+${g}</b>${bonus ? ` · ${S.sum.streak}일 연속 보너스!` : ''}`);
      cheer(me, bonus ? `${S.sum.streak}일 연속 출석!` : '출석!', 'wave');
    },
    onGo(id) {
      const it = markers.items.get(id), per = personOf(me);
      if (!it || !per) return;
      if (ctrl.per !== per) startControl(per);
      setTimeout(() => {
        goTo(per, it.stand, () => {
          per.actor.setMode('stand');
          per.obj.rotation.y = Math.atan2(-(it.m.spot[1] - per.obj.position.z), it.m.spot[0] - per.obj.position.x);
          ctx.lookAt?.(it.m.spot[0], it.m.spot[1]);
        });
      }, 60);
    },
    async onPraise(to, sticker, msg) {
      if (!me || to === me || S.sum.sentToday >= R.RULES.PRAISE_PER_DAY) return;
      await add({ t: 'praise', from: me, to, sticker, msg: msg.slice(0, 30) });
      compute();
      ui.toast(`<b>${to}</b> 님께 '${STICKERS[sticker].text}' 스티커를 보냈어요`);
      cheer(to, `${STICKERS[sticker].text}! (${me})`, null);
      cheer(me, '칭찬해요!', 'praise');
    },
    async onBuy(item) {
      const x = shop.find((s) => s.item === item);
      if (!me || !x || S.sum.owned.has(item) || S.sum.stars < x.price) return;
      await add({ t: 'buy', who: me, item, price: x.price });
      const room = S.sum.desk.length < DESK_MAX;
      if (room) await add({ t: 'desk', who: me, items: [...S.sum.desk, item] });
      compute();
      setDesk(me, S.sum.desk);
      ui.toast(`${x.name}${josa(x.name)} 샀어요! ${room ? '내 책상에 올려 두었어요' : `책상이 꽉 찼어요(최대 ${DESK_MAX}개). 다른 소품을 치우고 꺼내 놓으세요`}`);
    },
    async onToggle(item) {
      if (!me) return;
      const on = S.sum.desk.includes(item);
      if (!on && S.sum.desk.length >= DESK_MAX) { ui.toast(`책상이 꽉 찼어요(최대 ${DESK_MAX}개). 다른 소품을 먼저 치워 주세요`); return; }
      const desk = on ? S.sum.desk.filter((i) => i !== item) : [...S.sum.desk, item];
      await add({ t: 'desk', who: me, items: desk });
      compute();
      setDesk(me, S.sum.desk);
    },
  });

  applyDesks();
  compute();

  // 조종 막대의 '임무 완료' 버튼
  const btn = document.querySelector('#mission-btn');
  let near = null, chk = 0;
  async function completeNear() {
    if (!near || !me || S.preview) return;
    const m = near.m;
    if (S.sum.doneToday.has(m.id)) return;
    const before = S.sum.stars;
    await add({ t: 'mission', who: me, id: m.id, stars: m.stars });
    compute();
    ui.toast(`${m.title} 완료! ${ICON.star}<b>+${gained(before)}</b>`);
    cheer(me, '임무 완료!', 'praise');
  }
  // 날짜가 바뀌면(자정) 다시 계산
  let lastDay = day();
  setInterval(() => { if (day() !== lastDay) { lastDay = day(); compute(); } }, 60000);

  return {
    update(dt, { visible }) {
      markers.update(dt);
      markers.setVisible(visible);
      chk -= dt;
      if (chk > 0) return;
      chk = 0.2;
      const per = ctrl.per;
      near = per && me && per.name === me && !S.preview ? markers.nearest(per.obj.position) : null;
      btn.hidden = !near;
      if (near) btn.innerHTML = `${ICON.check}임무 완료: ${near.m.title} <small>★${near.m.stars}</small>`;
    },
    completeNear,
    onCard(name) { cardName = name; ui.renderCard(document.querySelector('#card .praise-row'), name, R.summarize(events, name, day()).stickers); },
    get me() { return me; },
    ui,
  };
}
