// 생활 기능 아이콘(창천 고유, 24×24 선 그림)
const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  coffee: I('<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M11 3v2M14 3v2"/>'),
  sparkle: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  recycle: I('<path d="M7 19H4.5a1.5 1.5 0 0 1-1.3-2.2L6 12"/><path d="M11 19h8.5a1.5 1.5 0 0 0 1.3-2.2L19 14"/><path d="M9 6.5l1.7-2.8a1.5 1.5 0 0 1 2.6 0L16 8"/><path d="M8 15l3 4-3 4M14 10l2-2 2.5 1M4 13l2-1 1 2.5"/>'),
  fridge: I('<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12M9 6v2M9 13v3"/>'),
  printer: I('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>'),
  broom: I('<path d="M19 3l-7 7"/><path d="M12 10l2 2-5 8H4l1-5z"/><path d="M7 15l2 2"/>'),
  rice: I('<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M8 12c0-3 2-5 4-5s4 2 4 5"/><path d="M15 3l-2 4M18 4l-3 3.5"/>'),
  plant: I('<path d="M7 14h10l-1.3 6.2a1 1 0 0 1-1 .8H9.3a1 1 0 0 1-1-.8z"/><path d="M12 14V9"/><path d="M12 10c-3.5 0-5-2.2-5-5 3 0 5 1.8 5 5z"/><path d="M12 11c0-3 1.8-5 5-5 0 3-1.8 5-5 5z"/>'),
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 3.5 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.5-5 .1 1.6.8 2.8 2 3.4C10.6 8.6 11 5.3 12 2z"/></svg>',
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  stamp: I('<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.4 2.4 4.8-5"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  desk: I('<path d="M3 10h18M5 10v9M19 10v9M9 10V7h6v3"/>'),
  list: I('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
};
// 칭찬 스티커 4종(색과 문구)
export const STICKERS = {
  best: { text: '최고예요', color: '#e8a33c' },
  thanks: { text: '고마워요', color: '#e06f8b' },
  done: { text: '수고했어요', color: '#4f86e8' },
  rely: { text: '든든해요', color: '#3fa37a' },
};
