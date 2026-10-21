/* 游戏状态：新建、存读档、派生属性、仓库、家具摆放、成员生成 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U;
  const G = (DS.G = DS.G || {});

  const META_KEY = 'ds_meta_v1';
  // 存档位：1/2/3 + 每日挑战（第 1 格沿用旧版的键，老存档不会丢）
  G.SLOT_KEYS = { 1: 'ds_save_v1', 2: 'ds_save_v1_s2', 3: 'ds_save_v1_s3', daily: 'ds_save_daily' };
  G.SLOTS = [6, 9, 12, 15, 18, 21];
  G.START_DATE = new Date(2049, 7, 1); // 2049-08-01

  // ---------------- 元数据（跨周目） ----------------
  G.meta = U.store.get(META_KEY, null) || { points: 0, endings: {}, runs: 0, best: 0, settings: {} };
  G.meta.settings = Object.assign({ sound: true, music: true, textSpeed: 1, autoSupply: true, battleSpeed: 1 }, G.meta.settings || {});
  G.saveMeta = () => U.store.set(META_KEY, G.meta);

  // ---------------- 存读档 ----------------
  G.slot = G.meta.lastSlot || 1;
  const key = (slot) => G.SLOT_KEYS[slot || G.slot] || G.SLOT_KEYS[1];
  G.useSlot = (slot) => { G.slot = slot; if (slot !== 'daily') { G.meta.lastSlot = slot; G.saveMeta(); } };
  G.hasSave = (slot) => !!U.store.get(key(slot), null);
  G.anySave = () => [1, 2, 3].some((k) => G.hasSave(k));
  G.save = () => { if (G.S && !G.S.ending) { G.S.savedAt = Date.now(); if (!U.store.set(key(), G.S)) { trimForSpace(G.S); U.store.set(key(), G.S); } } };
  G.load = (slot) => { if (slot) G.useSlot(slot); const s = U.store.get(key(), null); if (s) { G.S = migrate(s); return true; } return false; };
  G.clearSave = (slot) => U.store.del(key(slot));
  G.slotInfo = function (slot) {
    const s = U.store.get(key(slot), null); if (!s || !s.members || !s.members[0]) return null;
    return { name: s.members[0].name, job: s.members[0].job, day: s.day, house: s.house.type, diff: s.diff || '标准', chapter: s.chapter || 1, members: s.members.length, savedAt: s.savedAt || 0, daily: s.daily ? s.daily.date : null };
  };
  function trimForSpace(s) { s.log = s.log.slice(-120); s.chats = s.chats.slice(-40); }
  function migrate(s) {
    s.flags = s.flags || {}; s.sched = s.sched || []; s.bubbles = s.bubbles || []; s.chats = s.chats || [];
    s.explore = s.explore || { done: {}, locs: [], runs: 0 };
    s.diff = s.diff || '标准'; s.chapter = s.chapter || 1; s.bonds = s.bonds || {}; s.armory = s.armory || {}; s.dispatch = s.dispatch || [];
    if (s.seed === undefined) s.seed = Math.floor(Math.random() * 1e9);
    if (s.endless && s.day <= 100 && s.chapter === 1) s.endless = true;
    return s;
  }
  G.migrate = migrate;

  // 存档码：gzip + base64（浏览器不支持压缩时退回纯 base64）
  const b64enc = (bytes) => { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const b64dec = (str) => { const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
  async function pipe(bytes, stream) { const s = new Blob([bytes]).stream().pipeThrough(stream); return new Uint8Array(await new Response(s).arrayBuffer()); }
  G.exportCode = async function (slot) {
    const s = U.store.get(key(slot), null); if (!s) return null;
    const bytes = new TextEncoder().encode(JSON.stringify(s));
    if (typeof CompressionStream !== 'undefined') { try { return 'DSZ1:' + b64enc(await pipe(bytes, new CompressionStream('gzip'))); } catch (e) { /* fallthrough */ } }
    return 'DSJ1:' + b64enc(bytes);
  };
  G.importCode = async function (code, slot) {
    code = String(code || '').trim().replace(/\s+/g, '');
    let json;
    try {
      if (code.startsWith('DSZ1:')) { if (typeof DecompressionStream === 'undefined') return '这个浏览器不支持压缩存档码'; json = new TextDecoder().decode(await pipe(b64dec(code.slice(5)), new DecompressionStream('gzip'))); }
      else if (code.startsWith('DSJ1:')) json = new TextDecoder().decode(b64dec(code.slice(5)));
      else if (code.startsWith('{')) json = code;
      else return '存档码格式不对';
      const s = JSON.parse(json);
      if (!s || !Array.isArray(s.members) || !s.members.length || typeof s.day !== 'number' || !s.house) return '存档内容不完整';
      if (!U.store.set(key(slot), s)) return '浏览器存储空间不足';
      return null;
    } catch (e) { return '存档码损坏或不完整，请检查是否复制全了'; }
  };

  // ---------------- 日期 ----------------
  G.dateStr = (day) => { const d = new Date(G.START_DATE.getTime() + (day - 1) * 86400000); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  G.hour = () => { const S = G.S; return S.slot < 0 ? 5 : S.slot >= G.SLOTS.length ? 24 : G.SLOTS[S.slot]; };
  G.timeStr = () => { const h = G.hour(); return h >= 24 ? '深夜' : h === 5 ? '05:30' : String(h).padStart(2, '0') + ':00'; };
  G.isNight = () => G.S.slot >= G.SLOTS.length - 1;

  // ---------------- 成员 ----------------
  G.me = () => G.S.members[0];
  G.byId = (id) => G.S.members.find((m) => m.id === id);
  G.home = () => G.S.members.filter((m) => !m.away);

  G.gearOf = (m, slot) => (m.gear[slot] ? (DS.Armory ? DS.Armory.eff(m.gear[slot]) : DS.ITEMS[m.gear[slot]]) : null);
  G.skillVal = (m, name) => {
    let best = 0;
    (m.skills || []).forEach(([s, q]) => { if (s === name) { const sk = DS.SKILLS[s]; best = Math.max(best, sk.v * DS.QUALITY[q] * (1 + (m.lv - 1) * 0.05)); } });
    return best;
  };
  // 队伍/全屋最高技能值
  G.teamSkill = (name, list) => (list || G.home()).reduce((b, m) => Math.max(b, G.skillVal(m, name)), 0);
  G.statMul = (m) => { let k = 1; Object.keys(m.statuses || {}).forEach((s) => { const st = DS.STATUS[s]; if (st && st.stat !== undefined) k = Math.min(k, st.stat); }); return k; };
  G.stat = (m, s) => {
    let v = m.stats[s] || 0;
    ['武器', '防具', '鞋子'].forEach((sl) => { const g = G.gearOf(m, sl); if (!g) return; const map = { 力量: 'str', 灵巧: 'agi', 学识: 'int', 速度: 'spd', 运气: 'luck', 防御: 'def' }; v += g[map[s]] || 0; });
    if (s === '运气' && m.id === 'me' && DS.Ext) v += DS.Ext.mut('luck', 0);
    return Math.round(v * (s === '运气' ? 1 : G.statMul(m)));
  };
  G.maxHp = (m) => {
    const j = DS.JOBS[m.job];
    let hp = j.base.hp + (m.lv - 1) * j.grow.hp + (m.hpBonus || 0);
    ['防具', '鞋子'].forEach((sl) => { const g = G.gearOf(m, sl); if (g && g.hp) hp += g.hp; });
    hp *= 1 + G.skillVal(m, '健壮') + (m.id === 'me' ? 0.25 + (DS.Ext ? DS.Ext.mut('meHp', 0) : 0) : 0);
    return Math.round(hp);
  };
  G.coldResist = (m) => { let r = 0; ['防具', '鞋子'].forEach((sl) => { const g = G.gearOf(m, sl); if (g && g.cold) r += g.cold; }); return Math.min(0.8, r); };
  G.radResist = (m) => { let r = 0; ['防具'].forEach((sl) => { const g = G.gearOf(m, sl); if (g && g.rad) r += g.rad; }); return Math.min(0.85, r); };
  G.power = (m) => {
    const w = G.gearOf(m, '武器');
    return Math.round(G.stat(m, '力量') * 3 + G.stat(m, '灵巧') * 2 + G.stat(m, '速度') + (w ? w.atk * 6 : 0) + G.maxHp(m) / 5 + m.lv * 4);
  };
  G.expNeed = (lv) => 30 + lv * 25;

  function rollQuality(forceS) {
    if (forceS) return 'S';
    return U.wpick(Object.keys(DS.QUALITY_W), (q) => DS.QUALITY_W[q]);
  }
  function rollSkills(job, leader) {
    const exp = Object.keys(DS.SKILLS).filter((k) => DS.SKILLS[k].type === '探索' && DS.SKILLS[k].jobs.includes(job));
    const sur = Object.keys(DS.SKILLS).filter((k) => DS.SKILLS[k].type === '生存' && (DS.SKILLS[k].jobs.includes(job) || DS.SKILLS[k].jobs.includes('*')));
    const sOn = leader ? U.ri(0, 1) : -1;
    return [[U.pick(exp), rollQuality(sOn === 0)], [U.pick(sur), rollQuality(sOn === 1)]];
  }
  G.rollSkills = rollSkills;

  function randomLook(gender) {
    return {
      skin: U.ri(0, 3),
      hair: gender === '女' ? U.pick([2, 3, 4, 8, 9]) : U.pick([0, 1, 5, 6, 7]),
      hairColor: U.pick(['#1a1a1a', '#2b1d16', '#3a2a1a', '#4a2f1d', '#1d1d2a', '#5b4636', '#8a8a8a']),
      eyes: U.ri(0, 2),
      acc: U.chance(0.25) ? U.ri(1, 3) : 0,
    };
  }
  G.randomLook = randomLook;
  G.randomName = (gender) => {
    const P = DS.NAME_POOL; const xing = P.姓[U.ri(0, P.姓.length - 1)];
    const pool = P[gender]; const n = U.chance(0.45) ? U.pick(pool) + U.pick(pool) : U.pick(pool);
    return xing + n;
  };

  G.makeMember = function (o) {
    const j = DS.JOBS[o.job];
    const stats = {};
    ['力量', '灵巧', '学识', '运气', '速度', '防御'].forEach((s) => { stats[s] = Math.max(1, (j.base[s] || 3) + (o.jitter === false ? 0 : U.ri(-1, 1))); });
    const m = {
      id: o.id || U.uid(), name: o.name, gender: o.gender, job: o.job, title: o.title || o.job, age: o.age || U.ri(19, 48),
      lv: 1, exp: 0, story: !!o.story, look: o.look || randomLook(o.gender), stats,
      hp: 0, energy: 90, hunger: 80, thirst: 80, mood: o.mood || 62, statuses: {},
      skills: o.skills || rollSkills(o.job, false), gear: { 武器: null, 防具: null, 鞋子: null },
      task: null, train: {}, away: false, battles: 0, bio: o.bio || '', joined: G.S ? G.S.day : 1,
    };
    const lv = o.lv || 1;
    for (let i = 1; i < lv; i++) levelUp(m, true);
    m.hp = G.maxHp(m);
    return m;
  };
  function levelUp(m, silent) {
    const g = DS.JOBS[m.job].grow;
    m.lv++;
    ['力量', '灵巧', '学识', '运气', '速度', '防御'].forEach((s) => { if (g[s]) { m._frac = m._frac || {}; m._frac[s] = (m._frac[s] || 0) + g[s]; const add = Math.floor(m._frac[s]); m._frac[s] -= add; m.stats[s] += add; } });
    if (!silent) m.hp = Math.min(G.maxHp(m), m.hp + Math.round(G.maxHp(m) * 0.3));
  }
  G.levelUp = levelUp;
  G.gainExp = function (m, n) {
    const ups = [];
    m.exp += n;
    while (m.lv < 20 && m.exp >= G.expNeed(m.lv)) { m.exp -= G.expNeed(m.lv); levelUp(m); ups.push(m.lv); }
    return ups;
  };

  G.randomRecruit = function (job, lvHint) {
    const S = G.S;
    const pool = (DS.RECRUIT_BIOS || []).filter((b) => !job || b.job === job);
    const bio = pool.length ? U.pick(pool) : null;
    const gender = bio ? bio.gender : U.pick(['男', '女']);
    const jb = job || (bio ? bio.job : U.pick(Object.keys(DS.JOBS)));
    const leader = S && S.perks && S.perks.includes('leader');
    const lv = U.clamp(Math.round((lvHint || G.threat()) * 0.7 + U.ri(-1, 1)), 1, 15);
    return G.makeMember({ name: G.randomName(gender), gender, job: jb, title: bio ? bio.title : jb, bio: bio ? bio.bio : '一路逃难过来的幸存者，话不多。', skills: rollSkills(jb, leader), lv });
  };
  G.storyRecruit = function (name) {
    const r = DS.STORY_RECRUITS[name];
    return G.makeMember({ name, gender: r.gender, age: r.age, job: r.job, title: r.title, skills: r.skills.map((x) => x.slice()), story: true, bio: r.bio, look: Object.assign(randomLook(r.gender), r.look), lv: U.clamp(Math.round(G.threat() * 0.8), 1, 12), mood: 70 });
  };
  G.memberSlots = () => { const S = G.S; const H = DS.HOUSES[S.house.type]; return Math.max(0, H.slots + (S.house.mods.扩建 || 0) + (DS.Ext ? DS.Ext.mut('slots', 0) : 0)); };
  G.canRecruit = () => G.S.members.length - 1 < G.memberSlots();

  // ---------------- 安全屋派生属性 ----------------
  G.houseDef = () => DS.HOUSES[G.S.house.type];
  G.hstat = function (key) {
    const S = G.S; const H = DS.HOUSES[S.house.type]; const md = S.house.mods; const b = S.house.bonus || {};
    if (key === 'insul') return U.clamp(H.insul + (md.保温 || 0) * DS.MODS.保温.eff.insul + (b.insul || 0), 0, 0.96);
    if (key === 'antirad') return U.clamp(H.antirad + (md.防辐射 || 0) * DS.MODS.防辐射.eff.antirad + (b.antirad || 0), 0, 0.97);
    if (key === 'def') {
      let d = H.def + (md.防御 || 0) * DS.MODS.防御.eff.def + (b.def || 0);
      const off = DS.Disaster && DS.Disaster.devicesOff();
      S.house.furn.forEach((f) => { const F = DS.FURNITURE[f.type]; if (F.passive && F.passive.def && !(off && f.type === '监控警报')) d += F.passive.def + (f.lv - 1) * ((F.lv && F.lv.def) || 0); });
      if (DS.Layout) d += DS.Layout.sum('def');
      return Math.max(0, Math.round(d));
    }
    if (key === 'cap') {
      if (S.perks && S.perks.includes('space')) return 999999;
      let c = H.cap + (md.仓储 || 0) * DS.MODS.仓储.eff.cap + (b.cap || 0);
      S.house.furn.forEach((f) => { const F = DS.FURNITURE[f.type]; if (F.passive && F.passive.cap) c += F.passive.cap + (f.lv - 1) * ((F.lv && F.lv.cap) || 0); });
      c *= 1 + G.teamSkill('生存专家');
      return Math.round(c);
    }
    if (key === 'comfort') {
      let c = H.comfort;
      S.house.furn.forEach((f) => { const F = DS.FURNITURE[f.type]; c += (F.comfort || 0) * (1 + 0.2 * (f.lv - 1)); });
      if (DS.Layout) c += DS.Layout.sum('comfort');
      return Math.round(c);
    }
    if (key === 'rows') return H.h + (md.扩建 || 0);
    if (key === 'cols') return H.w;
    return 0;
  };

  // ---------------- 仓库 ----------------
  G.qty = (name) => G.S.inv[name] || 0;
  G.invVol = () => { let v = 0; for (const k in G.S.inv) { const it = DS.ITEMS[k]; if (it) v += (it.vol || 1) * G.S.inv[k]; } return v; };
  G.freeVol = () => G.hstat('cap') - G.invVol();
  // 返回实际放入的数量
  G.addItem = function (name, n, force) {
    const it = DS.ITEMS[name]; if (!it || n <= 0) return 0;
    let can = n;
    if (!force) { const free = G.freeVol(); can = Math.max(0, Math.min(n, Math.floor(free / (it.vol || 1)))); }
    if (can > 0) { G.S.inv[name] = (G.S.inv[name] || 0) + can; if (DS.Ach) DS.Ach.seeItem(name); }
    return can;
  };
  G.removeItem = function (name, n) {
    const have = G.S.inv[name] || 0; const r = Math.min(have, n);
    if (r > 0) { G.S.inv[name] = have - r; if (!G.S.inv[name]) delete G.S.inv[name]; }
    return r;
  };
  G.parseCostList = (list) => (list || []).map((c) => { const p = c.split(':'); return p.length === 3 ? { item: p[1], n: +p[2] } : { res: p[0], n: +p[1] }; });
  G.canPay = function (list) {
    return G.parseCostList(list).every((c) => (c.item ? G.qty(c.item) >= c.n : (G.S[c.res] || 0) >= c.n));
  };
  G.pay = function (list) { G.parseCostList(list).forEach((c) => { if (c.item) G.removeItem(c.item, c.n); else G.S[c.res] -= c.n; }); };

  // ---------------- 家具摆放 ----------------
  G.grid = function () {
    const S = G.S; const cols = G.hstat('cols'), rows = G.hstat('rows');
    const g = Array.from({ length: rows }, () => Array(cols).fill(null));
    S.house.furn.forEach((f) => { const [fw, fh] = G.fdim(f); for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (g[f.y + y] && f.x + x < cols) g[f.y + y][f.x + x] = f.id; });
    return g;
  };
  G.fdim = (f) => { const F = DS.FURNITURE[f.type]; return f.rot ? [F.h, F.w] : [F.w, F.h]; };
  // 能否把家具（宽 w 高 h）放在 x,y；ignore = 正在移动的那件
  G.fits = function (x, y, w, h, ignore) {
    const g = G.grid(); const rows = g.length, cols = g[0].length;
    if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const c = g[y + yy][x + xx]; if (c && c !== ignore) return false; }
    // 留出一条通道：不占满最后一排的门口格
    if (y + h === rows && x <= Math.floor(cols / 2) && x + w > Math.floor(cols / 2)) return false;
    return true;
  };
  G.findSpot = function (type, rot) {
    const F = DS.FURNITURE[type]; const w = rot ? F.h : F.w, hh = rot ? F.w : F.h; const rows = G.hstat('rows'), cols = G.hstat('cols');
    for (let y = 0; y + hh <= rows; y++) for (let x = 0; x + w <= cols; x++) if (G.fits(x, y, w, hh)) return { x, y };
    return null;
  };
  G.placeFurniture = function (type) {
    let rot = false; let spot = G.findSpot(type);
    if (!spot && DS.FURNITURE[type].w !== DS.FURNITURE[type].h) { spot = G.findSpot(type, true); rot = true; }
    if (!spot) return null;
    const f = { id: U.uid(), type, x: spot.x, y: spot.y, lv: 1 }; if (rot) f.rot = true;
    if (DS.FURNITURE[type].job === 'farm') f.plots = [];
    if (DS.FURNITURE[type].job === 'craft') f.job = null;
    G.S.house.furn.push(f);
    return f;
  };
  G.hasFurn = (type) => G.S.house.furn.some((f) => f.type === type);
  G.furnOf = (type) => G.S.house.furn.filter((f) => f.type === type);
  G.relayout = function () {
    // 换房/扩建后重新排布（大件优先）
    const S = G.S; const old = S.house.furn.slice().sort((a, b) => DS.FURNITURE[b.type].w * DS.FURNITURE[b.type].h - DS.FURNITURE[a.type].w * DS.FURNITURE[a.type].h);
    S.house.furn = []; const lost = [];
    old.forEach((f) => { let spot = G.findSpot(f.type, !!f.rot); if (!spot) { spot = G.findSpot(f.type, !f.rot); if (spot) f.rot = !f.rot; } if (spot) { f.x = spot.x; f.y = spot.y; S.house.furn.push(f); } else lost.push(f); });
    return lost;
  };

  // ---------------- 威胁等级 ----------------
  G.threat = () => { const d = G.S ? G.S.day : 1; return d <= 15 ? 1 : U.clamp(1 + Math.floor((d - 15) / 8), 1, G.S && G.S.chapter >= 2 ? 17 : 14); };

  // ---------------- 新游戏 ----------------
  G.newGame = function (o) {
    G.S = null;
    const S = {
      v: 1, day: 1, slot: -1, phase: 'prep', money: 0, crystal: 0, intel: 0,
      inv: { 矿泉水: 6, 泡面: 4, 压缩饼干: 2 },
      members: [],
      house: { type: '旧公寓', mods: { 保温: 0, 防辐射: 0, 防御: 0, 仓储: 0, 扩建: 0 }, integrity: 100, bonus: {}, furn: [] },
      fireOn: true, vehicle: '步行', vehicles: ['步行'],
      flags: {}, unlocked: {}, contacts: {}, chats: [], log: [], fired: {}, sched: [], bubbles: [],
      explore: { done: {}, locs: [], runs: 0 },
      env: {}, weather: null, market: null, deadList: [], perks: o.perks || [], kills: 0, battles: 0,
      stats: { events: 0, crafted: 0, cooked: 0, harvested: 0, explored: 0 },
      ending: null, endless: false, rebirth: G.meta.runs, lastNight: null,
      diff: o.diff || '标准', chapter: 1, seed: o.seed !== undefined ? o.seed : Math.floor(Math.random() * 1e9), daily: o.daily || null, mutators: o.mutators || [],
      bonds: {}, armory: {}, dispatch: [], pet: null, disaster: null,
    };
    G.S = S;
    const me = G.makeMember({ id: 'me', name: o.name, gender: o.gender, job: o.job, title: o.title || '重生者', skills: o.skills, look: o.look, jitter: false, mood: 72 });
    if (o.stats) Object.assign(me.stats, o.stats);
    if (S.perks.includes('strong')) me.stats.力量 += 3;
    me.hp = G.maxHp(me);
    me.energy = 100; me.hunger = 90; me.thirst = 90;
    S.members.push(me);
    if (S.perks.includes('fund')) S.money += 500000;
    G.placeFurniture('床'); G.placeFurniture('餐桌');
    DS.Sim.computeEnv(true);
    G.log('你在熟悉的出租屋里醒来。手机屏幕亮着：2049年8月1日 05:50。', 'story');
    return S;
  };

  G.log = function (text, type) {
    const S = G.S; if (!S) return;
    S.log.push({ d: S.day, t: G.timeStr(), text, type: type || 'info' });
    if (S.log.length > 400) S.log.splice(0, S.log.length - 400);
  };
})();
