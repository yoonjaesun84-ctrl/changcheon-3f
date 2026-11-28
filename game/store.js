// 기록 저장소. 지금은 이 기기(브라우저 localStorage)에만 저장한다.
// 나중에 사내 서버(Cloudflare Workers 등)로 바꿀 때 같은 모양(all/add/getMe/setMe, 모두 Promise)으로
// ServerStore를 만들어 game.js 의 new LocalStore() 한 줄만 바꾸면 된다.
export class LocalStore {
  constructor(key = 'cc3f.game.v1') {
    this.key = key;
  }
  _read() {
    try { return JSON.parse(localStorage.getItem(this.key)) || { me: null, events: [] }; } catch { return { me: null, events: [] }; }
  }
  _write(d) { localStorage.setItem(this.key, JSON.stringify(d)); }
  async all() { return this._read().events; }
  async add(ev) {
    const d = this._read();
    const e = { ...ev, eid: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString() };
    d.events.push(e);
    this._write(d);
    return e;
  }
  async getMe() { return this._read().me; }
  async setMe(name) { const d = this._read(); d.me = name; this._write(d); }
}
