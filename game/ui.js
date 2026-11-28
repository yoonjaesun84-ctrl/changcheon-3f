// 생활 기능 화면: 상단 생활 표시줄, 오른쪽 생활 창(임무·출석·칭찬·꾸미기), 나 고르기, 칭찬 스티커 고르기, 알림
import { ICON, STICKERS } from './icons.js?v=20261128101832';
import { RULES } from './rules.js?v=20261128101832';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const sticker = (k, small = false) => {
  const s = STICKERS[k];
  return `<span class="stk${small ? ' sm' : ''}" style="--c:${s.color}">${ICON.star}<b>${s.text}</b></span>`;
};
const nextBonus = (streak) => {
  const n = Object.keys(RULES.BONUS).map(Number).sort((a, b) => a - b).find((x) => x > streak);
  return n ? { at: n, left: n - streak, stars: RULES.BONUS[n] } : null;
};

export function createUI(h) {
  const $ = (s, r = document) => r.querySelector(s);
  document.body.insertAdjacentHTML('beforeend', `
<div id="life-hud" class="card hud"></div>
<aside id="life" class="card life" hidden>
  <header><b id="life-title">사무실 생활</b><button class="x" aria-label="닫기">×</button></header>
  <nav class="tabs">
    <button data-tab="mission">${ICON.list}임무</button>
    <button data-tab="attend">${ICON.stamp}출석</button>
    <button data-tab="praise">${ICON.heart}칭찬</button>
    <button data-tab="shop">${ICON.desk}꾸미기</button>
  </nav>
  <div class="body"></div>
</aside>
<div id="who-pick" class="modal" hidden><div class="sheet">
  <b class="t">나는 누구인가요?</b>
  <p class="s">로그인이 생기기 전까지 임시로 고릅니다. 기록은 이 기기에만 저장돼요.</p>
  <div class="names"></div>
  <button class="ghost close">나중에</button>
</div></div>
<div id="praise-pick" class="modal" hidden><div class="sheet">
  <b class="t"></b>
  <div class="stks"></div>
  <input class="msg" type="text" maxlength="30" placeholder="한마디 (선택, 30자)">
  <div class="row2"><span class="left"></span><button class="ghost close">취소</button><button class="go">보내기</button></div>
</div></div>
<div id="toast" hidden></div>`);

  const hud = $('#life-hud'), life = $('#life'), body = $('#life .body');
  let tab = 'mission', S = null, praiseTo = null, praiseSel = 'best';

  const place = () => {   // 브랜드 카드 바로 아래에 붙인다
    const b = $('.brand')?.getBoundingClientRect();
    if (b) hud.style.top = `${Math.round(b.bottom + 10)}px`;
  };
  window.addEventListener('resize', place);
  setTimeout(place, 0);

  // ---- 상단 생활 표시줄
  function renderHud() {
    if (!S.me) {
      hud.innerHTML = `<button class="who pick">${ICON.heart}<b>나는 누구? 고르기</b></button><span class="hint2">고르면 임무·출석·꾸미기를 할 수 있어요</span>`;
      return;
    }
    const s = S.sum;
    const mine = S.list.filter((x) => x.assignee === S.me);
    const left = S.preview ? 0 : mine.filter((x) => !s.doneToday.has(x.id)).length;
    hud.innerHTML = `
      <button class="who" title="다른 사람으로 바꾸기"><i>${esc(S.me.slice(-2))}</i><b>${esc(S.me)}</b></button>
      <span class="stat star" title="모은 별">${ICON.star}<b>${s.stars}</b></span>
      <span class="stat streak${s.streak ? '' : ' zero'}" title="연속 출석(근무일)">${ICON.flame}<b>${s.streak}</b>일</span>
      <span class="sep"></span>
      <button class="hb${s.attendedToday ? '' : ' glow'}" data-tab="attend">${ICON.stamp}${s.attendedToday ? '출석 완료' : '출석하기'}</button>
      <button class="hb" data-tab="mission">${ICON.list}임무${left ? `<em>${left}</em>` : ''}</button>
      <button class="hb" data-tab="praise">${ICON.heart}칭찬</button>
      <button class="hb" data-tab="shop">${ICON.desk}꾸미기</button>`;
  }
  hud.addEventListener('click', (e) => {
    if (e.target.closest('.who')) return openWho();
    const b = e.target.closest('[data-tab]');
    if (b) open(b.dataset.tab);
  });

  // ---- 생활 창
  function open(t) { tab = t; life.hidden = false; renderLife(); }
  $('#life .x').onclick = () => { life.hidden = true; };
  $('#life .tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderLife(); } });
  function renderLife() {
    if (life.hidden || !S) return;
    for (const b of life.querySelectorAll('.tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    if (!S.me) { body.innerHTML = `<p class="empty">먼저 '나는 누구'를 골라 주세요.</p><button class="go wide pick">나 고르기</button>`; return; }
    body.innerHTML = ({ mission: missionTab, attend: attendTab, praise: praiseTab, shop: shopTab })[tab]();
  }
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('pick')) return openWho();
    const a = b.dataset.a, v = b.dataset.v;
    if (a === 'go') { if (window.innerWidth < 720) life.hidden = true; h.onGo(v); }
    if (a === 'attend') h.onAttend();
    if (a === 'buy') h.onBuy(v);
    if (a === 'toggle') h.onToggle(v);
    if (a === 'praise') openPraise(v);
  });
  body.addEventListener('change', (e) => { if (e.target.matches('select.to') && e.target.value) openPraise(e.target.value); });

  function missionTab() {
    const s = S.sum;
    const mine = S.list.filter((x) => x.assignee === S.me), others = S.list.filter((x) => x.assignee !== S.me);
    const card = (x, isMine) => {
      const done = !S.preview && isMine && s.doneToday.has(x.id);
      const btn = !isMine ? `<span class="who2">${esc(x.assignee)}</span>`
        : S.preview ? `<span class="who2">${esc(x.dayLabel)}</span>`
        : done ? `<span class="ok">${ICON.check}완료</span>`
        : `<button class="go sm" data-a="go" data-v="${x.id}">가서 하기</button>`;
      return `<li class="mi${done ? ' done' : ''}${isMine ? ' mine' : ''}"><i>${ICON[x.icon] || ICON.sparkle}</i><div><b>${esc(x.title)}</b><small>${ICON.star}${x.stars}개</small></div>${btn}</li>`;
    };
    return `
      ${S.preview ? `<p class="note">오늘은 쉬는 날이에요. <b>${esc(S.previewLabel)}</b> 임무를 미리 보여 드려요.</p>` : ''}
      <h4>${S.preview ? '다음 근무일' : '오늘'} 내 임무</h4>
      <ul class="ml">${mine.length ? mine.map((x) => card(x, true)).join('') : '<li class="empty">맡은 임무가 없어요. 오늘은 여유롭게!</li>'}</ul>
      <p class="tip">임무 장소의 빛나는 고리까지 걸어가면 아래 막대에 <b>임무 완료</b> 버튼이 나타나요.</p>
      <h4>다른 분들의 임무</h4>
      <ul class="ml">${others.map((x) => card(x, false)).join('') || '<li class="empty">없어요</li>'}</ul>`;
  }

  function attendTab() {
    const s = S.sum, [y, m] = S.day.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let cells = DOW.map((d, i) => `<span class="dw${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</span>`).join('');
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const w = (first + d - 1) % 7;
      const got = s.attended.has(key);
      cells += `<span class="dc${key === S.day ? ' today' : ''}${w === 0 || w === 6 ? ' wk' : ''}${got ? ' got' : ''}"><em>${d}</em>${got ? `<i class="seal${key === S.justStamped ? ' pop' : ''}">출석</i>` : ''}</span>`;
    }
    const nb = nextBonus(s.streak);
    const cnt = [...s.attended].filter((k) => k.startsWith(`${y}-${String(m).padStart(2, '0')}`)).length;
    return `
      <div class="att-head"><b>${y}년 ${m}월 도장판</b><span>이번 달 ${cnt}번</span></div>
      <div class="cal">${cells}</div>
      <div class="att-foot">
        <div><span class="big">${ICON.flame}${s.streak}일</span> 연속 출석${nb ? `<small>${nb.left}일 더 오면 ${nb.at}일 연속 보너스 ★${nb.stars}</small>` : '<small>최고 단계 달성!</small>'}</div>
        <button class="go" data-a="attend" ${s.attendedToday ? 'disabled' : ''}>${s.attendedToday ? '오늘 도장 완료' : '오늘 출석 도장 찍기'}</button>
      </div>
      <p class="tip">출석 ★1 · 주말은 연속 출석 계산에서 빠져요(쉬어도 끊기지 않아요).</p>`;
  }

  function praiseTab() {
    const s = S.sum;
    const left = Math.max(0, RULES.PRAISE_PER_DAY - s.sentToday);
    const opts = S.names.filter((n) => n !== S.me).map((n) => `<option>${esc(n)}</option>`).join('');
    return `
      <h4>받은 칭찬 스티커</h4>
      <div class="stk-row">${Object.keys(STICKERS).map((k) => `<div class="stk-c">${sticker(k)}<b>${s.stickers[k] || 0}</b></div>`).join('')}</div>
      <h4>칭찬 보내기 <small>오늘 ${left}장 남음</small></h4>
      <select class="to" ${left ? '' : 'disabled'}><option value="">누구에게 보낼까요?</option>${opts}</select>
      <p class="tip">지도에서 사람을 눌러 프로필 카드에서도 보낼 수 있어요. 받은 사람은 ★1을 받아요.</p>
      <h4>최근 받은 칭찬</h4>
      <ul class="pl">${s.praiseLog.slice(0, 12).map((e) => `<li>${sticker(e.sticker, true)}<div><b>${esc(e.from)}</b>${e.msg ? `<p>${esc(e.msg)}</p>` : ''}</div><small>${e.day.slice(5).replace('-', '.')}</small></li>`).join('') || '<li class="empty">아직 받은 칭찬이 없어요</li>'}</ul>`;
  }

  function shopTab() {
    const s = S.sum;
    const card = (x) => {
      const own = s.owned.has(x.item), on = s.desk.includes(x.item);
      const act = own
        ? `<button class="tg${on ? ' on' : ''}" data-a="toggle" data-v="${x.item}">${on ? '책상에 있음' : '꺼내 놓기'}</button>`
        : `<button class="go sm" data-a="buy" data-v="${x.item}" ${s.stars < x.price ? 'disabled' : ''}>${ICON.star}${x.price} 사기</button>`;
      return `<li class="si${own ? ' own' : ''}">${x.img ? `<img src="${x.img}" alt="">` : ''}<b>${esc(x.name)}</b>${act}</li>`;
    };
    const cats = [...new Set(S.shop.map((x) => x.cat || '소품'))];
    const groups = cats.map((c) => `<h5 class="shop-cat">${esc(c)}</h5><ul class="shop">${S.shop.filter((x) => (x.cat || '소품') === c).map(card).join('')}</ul>`).join('');
    const owned = S.shop.filter((x) => s.owned.has(x.item)).length;
    return `
      <div class="att-head"><b>내 자리 꾸미기</b><span class="stat star">${ICON.star}<b>${s.stars}</b></span></div>
      <p class="tip">출석·임무·칭찬으로 모은 별로 소품을 사서 내 책상에 올려 보세요. 모은 소품 <b>${owned}/${S.shop.length}</b> · 책상 위 <b>${s.desk.length}/${S.deskMax}</b></p>
      ${groups}`;
  }

  // ---- 나 고르기
  const who = $('#who-pick');
  function openWho() {
    $('.names', who).innerHTML = S.names.map((n) => `<button class="${n === S.me ? 'on' : ''}" data-n="${esc(n)}">${esc(n)}</button>`).join('');
    who.hidden = false;
  }
  who.addEventListener('click', (e) => {
    if (e.target === who || e.target.closest('.close')) { who.hidden = true; return; }
    const b = e.target.closest('[data-n]');
    if (b) { who.hidden = true; h.onChoose(b.dataset.n); }
  });

  // ---- 칭찬 스티커 고르기
  const pp = $('#praise-pick');
  function openPraise(to) {
    if (!S.me) return openWho();
    if (to === S.me) return toast('나에게는 보낼 수 없어요');
    const left = RULES.PRAISE_PER_DAY - S.sum.sentToday;
    if (left <= 0) return toast('오늘 보낼 수 있는 스티커를 다 썼어요(하루 3장)');
    praiseTo = to; praiseSel = 'best';
    $('.t', pp).textContent = `${to} 님께 칭찬 스티커`;
    $('.left', pp).textContent = `오늘 ${left}장 남음`;
    $('.msg', pp).value = '';
    renderStk();
    pp.hidden = false;
  }
  const renderStk = () => { $('.stks', pp).innerHTML = Object.keys(STICKERS).map((k) => `<button class="${k === praiseSel ? 'on' : ''}" data-k="${k}">${sticker(k)}</button>`).join(''); };
  pp.addEventListener('click', (e) => {
    if (e.target === pp || e.target.closest('.close')) { pp.hidden = true; return; }
    const k = e.target.closest('[data-k]');
    if (k) { praiseSel = k.dataset.k; renderStk(); return; }
    if (e.target.closest('.go')) { pp.hidden = true; h.onPraise(praiseTo, praiseSel, $('.msg', pp).value.trim()); }
  });
  for (const el of [pp, who, life]) el.addEventListener('keydown', (e) => e.stopPropagation());

  // ---- 알림
  const tEl = $('#toast');
  let tTimer = null;
  function toast(html, ms = 2600) {
    tEl.innerHTML = html;
    tEl.hidden = false;
    tEl.classList.remove('show'); void tEl.offsetWidth; tEl.classList.add('show');
    clearTimeout(tTimer);
    tTimer = setTimeout(() => { tEl.hidden = true; }, ms);
  }

  // ---- 프로필 카드 안 칭찬 줄
  function renderCard(el, name, stickers) {
    if (!el) return;
    const total = Object.values(stickers).reduce((a, b) => a + b, 0);
    const chips = Object.entries(stickers).map(([k, n]) => `<span class="mini" style="--c:${STICKERS[k].color}">${STICKERS[k].text} ${n}</span>`).join('');
    const can = S?.me && S.me !== name;
    el.innerHTML = `${total ? `<div class="chips">${chips}</div>` : ''}${can ? `<button class="praise-btn">${ICON.heart}칭찬 스티커</button>` : ''}`;
    const b = el.querySelector('.praise-btn');
    if (b) b.onclick = () => openPraise(name);
  }

  return {
    render(state) { S = state; renderHud(); renderLife(); },
    open, openWho, toast, renderCard, place,
  };
}
