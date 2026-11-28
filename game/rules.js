// 사무실 생활 규칙 — 화면·저장과 무관한 순수 함수.
// 모든 기록은 사건(event) 목록이고, 별·연속 출석·완료 여부는 여기서 계산한다.
//   {t:'welcome', who, day}                       첫 방문 선물
//   {t:'attend',  who, day}                       출석 도장
//   {t:'mission', who, id, stars, day}            임무 완료
//   {t:'praise',  from, to, sticker, msg, day}    칭찬 스티커
//   {t:'buy',     who, item, price, day}          꾸미기 소품 구매
//   {t:'desk',    who, items:[...], day}          내 책상 배치(마지막 것이 유효)
// 날짜(day)는 한국 시간 'YYYY-MM-DD'.

export const RULES = { ATTEND: 1, WELCOME: 0, PRAISE: 1, PRAISE_PER_DAY: 3, BONUS: { 5: 3, 10: 5, 20: 10 } };

const DAY_MS = 86400000;
const toUTC = (day) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fromUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const dow = (day) => new Date(toUTC(day)).getUTCDay();   // 0=일 … 6=토
export const addDays = (day, n) => fromUTC(toUTC(day) + n * DAY_MS);

export function today(date = new Date()) {
  return fromUTC(date.getTime() + 9 * 3600000);
}
export function isWorkday(day) { const w = dow(day); return w >= 1 && w <= 5; }
export function prevWorkday(day) {
  let d = addDays(day, -1);
  while (!isWorkday(d)) d = addDays(d, -1);
  return d;
}
export function isoWeek(day) {
  const t = toUTC(day);
  const w = (dow(day) + 6) % 7;                // 월=0
  const thu = t + (3 - w) * DAY_MS;            // 그 주의 목요일
  const y = new Date(thu).getUTCFullYear();
  return 1 + Math.floor((thu - Date.UTC(y, 0, 1)) / (7 * DAY_MS));
}

const DOW_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export function dueOn(mission, day) {
  const d = mission.days ?? 'weekdays';
  if (d === 'daily') return true;
  if (d === 'weekdays') return isWorkday(day);
  return Array.isArray(d) && d.includes(DOW_KEY[dow(day)]);
}
export function assigneeOn(mission, day) {
  const w = mission.who;
  if (!Array.isArray(w)) return w;
  return w[isoWeek(day) % w.length];
}
export function todaysMissions(missions, day) {
  return missions.filter((m) => dueOn(m, day)).map((m) => ({ ...m, assignee: assigneeOn(m, day) }));
}

export function summarize(events, me, day, opts = {}) {
  let stars = 0;
  const attended = new Set();
  const doneKeys = new Set();
  const doneToday = new Set();
  const stickers = {};
  const praiseLog = [];
  let sentToday = 0;
  const owned = new Set(opts.baseDesk || []);
  let desk = null;
  for (const e of events) {
    if (e.t === 'welcome' && e.who === me) stars += RULES.WELCOME;
    else if (e.t === 'attend' && e.who === me) attended.add(e.day);
    else if (e.t === 'mission' && e.who === me) {
      const k = `${e.id}|${e.day}`;
      if (doneKeys.has(k)) continue;
      doneKeys.add(k);
      stars += e.stars || 0;
      if (e.day === day) doneToday.add(e.id);
    } else if (e.t === 'praise') {
      if (e.to === me) { stars += RULES.PRAISE; stickers[e.sticker] = (stickers[e.sticker] || 0) + 1; praiseLog.push(e); }
      if (e.from === me && e.day === day) sentToday++;
    } else if (e.t === 'buy' && e.who === me) { stars -= e.price || 0; owned.add(e.item); }
    else if (e.t === 'desk' && e.who === me) desk = e.items.slice();
  }
  // 출석 별 + 연속 출석 보너스(근무일만 연속으로 센다)
  let run = 0, last = null;
  for (const d of [...attended].sort()) {
    stars += RULES.ATTEND;
    if (!isWorkday(d)) continue;
    run = last && last === prevWorkday(d) ? run + 1 : 1;
    last = d;
    stars += RULES.BONUS[run] || 0;
  }
  let streak = 0;
  let d = isWorkday(day) && attended.has(day) ? day : prevWorkday(day);
  while (attended.has(d)) { streak++; d = prevWorkday(d); }
  return {
    stars, streak, attendedToday: attended.has(day), attended, doneToday, stickers,
    praiseLog: praiseLog.reverse(), sentToday, owned,
    desk: desk ?? [...(opts.baseDesk || [])],
  };
}
