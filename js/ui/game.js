/* 主界面：HUD、安全屋俯视图、导航、行动与夜晚流程、事件弹窗 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art;
  const Game = (DS.Game = {});
  let root, hudEl, stageEl, roomWrap, navEl, actBtn, snow, busy = false;

  Game.start = function () {
    const S = G.S;
    root = h('div', { class: 'screen game' });
    hudEl = h('div', { class: 'hud' });
    stageEl = h('div', { class: 'stage' });
    navEl = h('div', { class: 'nav' });
    root.append(hudEl, stageEl, navEl);
    UI.screen(root);
    const outside = h('div', { class: 'outside' }, h('canvas'));
    roomWrap = h('div', { class: 'room-wrap' });
    stageEl.append(outside, roomWrap, sideButtons());
    snow = Snow(outside.querySelector('canvas'));
    buildNav();
    UI.baseKeys = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); Game.act(); }
      else if (e.key === 'p' || e.key === 'P') DS.Panels.members();
      else if (e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') DS.Panels.inventory();
      else if (e.key === 's' || e.key === 'S') Game.openShop();
      else if (e.key === 'e' || e.key === 'E') Game.openExplore();
      else if (e.key === 'h' || e.key === 'H') DS.Panels.house();
      else if (e.key === 'l' || e.key === 'L') DS.Panels.phone();
    };
    if (!S.queue) DS.Events.planDay();
    if (!S.bubbles || !S.bubbles.length) DS.Events.spawnBubbles();
    Game.render();
    window.addEventListener('resize', () => Game.renderRoom());
    DS.Audio.ambient();
    if (S.exploring) setTimeout(() => DS.ExploreUI.resume(), 100);
    else if (S.pendingRecruit) setTimeout(() => Game.recruitCard(), 300);
  };

  Game.render = function () { if (!root || !G.S) return; renderHud(); Game.renderRoom(); renderNav(); };

  // ---------------- HUD ----------------
  function renderHud() {
    const S = G.S; const me = G.me(); U.clear(hudEl);
    const mx = G.maxHp(me);
    const ava = h('div', { class: 'hud-ava', onclick: () => DS.Panels.memberDetail(me) }, h('div', { style: { width: '100%', height: '100%' }, html: A.avatar(me) }), h('div', { class: 'lv' }, 'Lv.' + me.lv));
    const bars = h('div', { class: 'bars' },
      UI.bar('❤', me.hp, mx, 'linear-gradient(90deg,#ff4d5e,#ff8a6a)', me.hp < mx * 0.3),
      UI.bar('🍖', me.hunger, 100, 'linear-gradient(90deg,#e9884a,#f6c071)', me.hunger < 20),
      UI.bar('⚡', me.energy, 100, 'linear-gradient(90deg,#e6b422,#ffe066)', me.energy < 15),
      UI.bar('💧', me.thirst, 100, 'linear-gradient(90deg,#2b8bdc,#6fcfff)', me.thirst < 20));
    const W = DS.Sim.WEATHER[S.weather ? S.weather.type : '晴'];
    const apoc = S.phase === 'apoc';
    const cd = S.daily ? `每日挑战 ${S.day}/${DS.Daily.LEN}` : apoc ? (S.endless ? '无尽模式' : (S.chapter || 1) >= 2 ? '春天篇 · 目标 160 天' : `目标 100 天`) : `距末日 ${15 - S.day} 天`;
    const day = h('div', { class: 'daycard' + (apoc ? ' apoc' : ''), onclick: () => Game.envInfo() },
      h('div', { class: 'w' }, W ? W.icon : ''), h('div', { class: 'd' }, `第${S.day}天`), h('div', { class: 't' }, `${G.dateStr(S.day)} ${G.timeStr()}`), h('div', { class: 'cd' }, cd));
    hudEl.appendChild(h('div', { class: 'hud-top' }, ava, bars, day));
    const env = S.env;
    const chips = [];
    if (!apoc || S.money > 0 && S.day <= 15) chips.push(h('div', { class: 'chip', onclick: () => UI.toast('末日前的货币。第 15 天之后作废。') }, '💴', h('b', null, U.money(S.money))));
    if (apoc || S.crystal > 0) chips.push(h('div', { class: 'chip', onclick: () => UI.toast('晶核：末日后的硬通货') }, '💎', h('b', null, U.num(S.crystal))));
    chips.push(h('div', { class: 'chip', onclick: () => UI.toast('情报：探索地点需要消耗') }, '📡', h('b', null, S.intel)));
    chips.push(h('div', { class: 'chip ' + (me.mood < 25 ? 'warnc' : ''), onclick: () => UI.toast('心情降到 0 会精神崩溃') }, me.mood >= 60 ? '😊' : me.mood >= 30 ? '😐' : '😣', h('b', null, me.mood)));
    chips.push(h('div', { class: 'chip ' + (env.outT < 0 ? 'cold' : 'hot'), onclick: () => Game.envInfo() }, '🌡', '室外', h('b', null, UI.fmtTemp(env.outT))));
    chips.push(h('div', { class: 'chip ' + (env.inT < 5 ? 'cold warnc' : env.inT < 12 ? 'cold' : 'hot'), onclick: () => Game.envInfo() }, '🏠', h('b', null, UI.fmtTemp(env.inT))));
    if (env.rad > 0) chips.push(h('div', { class: 'chip radc ' + (env.inRad >= 30 ? 'warnc' : ''), onclick: () => Game.envInfo() }, '☢', h('b', null, env.inRad), h('span', { class: 'dim' }, '/' + env.rad)));
    if (S.house.type !== '旧公寓' || apoc) chips.push(h('div', { class: 'chip ' + (S.house.integrity < 40 ? 'warnc' : ''), onclick: () => DS.Panels.house() }, '🧱', h('b', null, S.house.integrity + '%')));
    chips.push(h('div', { class: 'chip', onclick: () => DS.Panels.inventory() }, '📦', h('b', null, G.invVol() + '/' + (G.hstat('cap') > 99999 ? '∞' : G.hstat('cap')))));
    if (S.disaster) { const D = DS.DISASTERS[S.disaster.type]; chips.unshift(h('div', { class: 'chip warnc dis-chip', onclick: () => DS.Panels.house() }, D.icon, h('b', null, S.disaster.active ? S.disaster.type + '中' : `${S.disaster.type} ${S.disaster.start - S.day}天后`), S.disaster.prepared ? '✓' : '')); }
    hudEl.appendChild(h('div', { class: 'hud-chips' }, chips));
  }

  Game.envInfo = function () {
    const S = G.S; const env = S.env; const W = DS.Sim.WEATHER[S.weather.type];
    const lines = [
      ['天气', `${W.icon} ${S.weather.type}`],
      ['室外温度', UI.fmtTemp(env.outT)],
      ['室内温度', UI.fmtTemp(env.inT) + (env.inT < 10 && S.day >= 11 ? '（寒冷，易感冒）' : '')],
      ['保温', U.pct(G.hstat('insul')) + `　壁炉 ${G.hasFurn('壁炉') ? (S.fireOn && !env.fireOut ? '+' + DS.Sim.heat() + '℃' : '熄灭') : '无'}`],
      ['室外辐射', env.rad],
      ['室内辐射', env.inRad + (env.inRad >= 30 ? '（危险，易得辐射病）' : '')],
      ['防辐射', U.pct(G.hstat('antirad'))],
      ['完整度', S.house.integrity + '%'],
    ];
    UI.modal({ title: '环境', body: h('div', { class: 'report' }, lines.map(([a, b]) => h('div', { class: 'line' }, h('span', { class: 'muted', style: { width: '76px' } }, a), h('b', null, b))),
      h('div', { class: 'small muted', style: { marginTop: '8px', lineHeight: 1.6 } }, '室内温度 ≈ 室外温度 ×（1 - 保温）+ 壁炉 + 人体热量。保温和防辐射可以通过【安全屋 → 改造】提升。')), dismiss: true });
  };

  // ---------------- 安全屋俯视图 ----------------
  Game.renderRoom = function () {
    if (!roomWrap || !G.S) return;
    const S = G.S; U.clear(roomWrap);
    const cols = G.hstat('cols'), rows = G.hstat('rows');
    const rect = stageEl.getBoundingClientRect();
    const c = Math.max(22, Math.floor(Math.min((rect.width - 90) / cols, (rect.height - 30) / rows, 54)));
    const H = DS.HOUSES[S.house.type];
    const room = h('div', { class: 'room', style: { width: cols * c + 'px', height: rows * c + 'px', '--c': c + 'px' } });
    room.appendChild(h('div', { class: 'floor ' + H.floor, style: { '--c': c + 'px' } }));
    room.appendChild(h('div', { class: 'light' }));
    room.appendChild(h('div', { class: 'door', style: { left: (Math.floor(cols / 2) * c + 4) + 'px', width: (c - 8) + 'px' } }));
    // 家具
    const L = Game.layout;
    S.house.furn.forEach((f) => {
      const F = DS.FURNITURE[f.type];
      const [fw, fh] = G.fdim(f);
      const state = {};
      if (f.type === '壁炉') state.lit = S.fireOn && !S.env.fireOut && S.env.outT < 12 || S.fireOn && S.day >= 11 && !S.env.fireOut;
      if (f.type === '种植箱') state.plots = (f.plots || []).map((p) => ({ prog: p.prog, t: DS.RECIPES.find((r) => r.id === p.rid).t, cold: p.cold }));
      if (f.type === '工作台') state.busy = !!f.job;
      if (f.type === '电脑桌') state.on = G.home().some((m) => m.task && m.task.fid === f.id);
      if (f.type === '监控警报') state.blink = true;
      const svg = A.furniture(f.type, f.lv, state);
      const el = h('div', { class: 'furn' + (L && L.sel === f.id ? ' sel' : '') + (L ? ' editing' : ''), style: { left: f.x * c + 'px', top: f.y * c + 'px', width: fw * c + 'px', height: fh * c + 'px' }, onclick: (e) => { e.stopPropagation(); DS.Audio.tap(); if (L) { L.sel = L.sel === f.id ? null : f.id; Game.renderRoom(); return; } DS.Panels.furniture(f); }, html: f.rot ? `<div class="rot" style="width:${F.w * c}px;height:${F.h * c}px">${svg}</div>` : svg, title: F.name });
      if (f.type === '壁炉' && state.lit) el.insertBefore(h('div', { class: 'fire-glow' }), el.firstChild);
      if (f.lv > 1) el.appendChild(h('div', { class: 'flv' }, 'Lv' + f.lv));
      if (f.type === '工作台' && f.job) { const r = DS.RECIPES.find((x) => x.id === f.job.rid); el.appendChild(h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, f.job.prog / r.t * 100) + '%' } }))); }
      room.appendChild(el);
    });
    // 布置模式：空格子可点击
    if (L) {
      const g = G.grid();
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (g[y][x] && g[y][x] !== L.sel) continue;
        room.appendChild(h('div', { class: 'cell-hit', style: { left: x * c + 'px', top: y * c + 'px', width: c + 'px', height: c + 'px' }, onclick: (e) => { e.stopPropagation(); Game.layoutMove(x, y); } }));
      }
    }
    // 成员
    const grid = G.grid();
    const used = new Set();
    const home = G.home();
    if (!L) home.forEach((m, i) => {
      let x, y;
      const f = m.task && S.house.furn.find((ff) => ff.id === m.task.fid);
      if (f) {
        const F = DS.FURNITURE[f.type];
        const k = home.filter((o, j) => j < i && o.task && o.task.fid === f.id).length;
        x = (f.x + F.w / 2) * c - 15 + (k % 2 ? 12 : -4) * (k ? 1 : 0); y = (f.y + F.h / 2) * c - 15 + (k ? 8 : 0);
      } else {
        const r = A.rng(m.id + S.day + ':' + S.slot);
        let tries = 0, gx, gy;
        do { gx = Math.floor(r() * cols); gy = Math.floor(r() * rows); tries++; } while ((grid[gy][gx] || used.has(gx + ',' + gy)) && tries < 60);
        used.add(gx + ',' + gy);
        x = gx * c + c / 2 - 15; y = gy * c + c / 2 - 15;
      }
      const sick = Object.keys(m.statuses).length > 0;
      const tk = h('div', { class: 'token' + (m.id === 'me' ? ' me' : '') + (sick ? ' sick' : ''), style: { left: x + 'px', top: y + 'px' }, html: A.avatar(m), onclick: (e) => { e.stopPropagation(); DS.Audio.tap(); DS.Panels.memberDetail(m); } });
      room.appendChild(tk);
      room.appendChild(h('div', { class: 'token-label', style: { left: x + 15 + 'px', top: y + 31 + 'px' } }, m.name + (m.statuses.濒死 ? '💀' : sick ? '🤒' : '')));
    });
    // 伙伴
    if (S.pet && !L && !(S.exploring && S.exploring.pet)) {
      const r = A.rng('pet' + S.day + ':' + S.slot);
      let tries = 0, gx, gy;
      do { gx = Math.floor(r() * cols); gy = Math.floor(r() * rows); tries++; } while ((grid[gy][gx] || used.has(gx + ',' + gy)) && tries < 60);
      const px = gx * c + c / 2 - 13, py = gy * c + c / 2 - 13;
      room.appendChild(h('div', { class: 'pet-token' + (S.pet.hurt ? ' sick' : ''), style: { left: px + 'px', top: py + 'px' }, onclick: (e) => { e.stopPropagation(); DS.Audio.tap(); DS.ExtUI.pet(); } }, '🐕'));
      room.appendChild(h('div', { class: 'token-label', style: { left: px + 13 + 'px', top: py + 26 + 'px' } }, S.pet.name));
    }
    // 气泡
    if (!L) (S.bubbles || []).forEach((b) => {
      let x, y;
      if (b.anchor.startsWith('furn:')) { const f = S.house.furn.find((ff) => ff.id === b.anchor.slice(5)); if (!f) return; x = (f.x + DS.FURNITURE[f.type].w) * c - 14; y = f.y * c - 14; }
      else if (b.anchor.startsWith('member:')) { const tk = Array.from(room.querySelectorAll('.token')); const idx = home.findIndex((m) => m.id === b.mid); if (idx < 0 || !tk[idx]) return; x = parseFloat(tk[idx].style.left) + 18; y = parseFloat(tk[idx].style.top) - 18; }
      else { x = cols * c - 18; y = -16; }
      room.appendChild(h('div', { class: 'bubble', style: { left: x + 'px', top: y + 'px' }, onclick: (e) => { e.stopPropagation(); Game.openBubble(b); } }, '!'));
    });
    // 昼夜色调
    const hr = G.hour();
    const tint = hr >= 21 || hr < 5 ? 'rgba(40,55,120,.5)' : hr <= 7 ? 'rgba(255,170,120,.22)' : hr >= 18 ? 'rgba(255,140,90,.28)' : 'transparent';
    room.appendChild(h('div', { class: 'tint', style: { background: tint } }));
    roomWrap.appendChild(room);
    if (L) roomWrap.appendChild(DS.ExtUI.layoutBar());
    else if (S.phase !== 'apoc' && S.day <= 14) { const [a, b] = DS.Checklist.progress(); roomWrap.appendChild(h('button', { class: 'checklist-btn' + (a >= b ? ' done' : ''), onclick: () => { DS.Audio.tap(); DS.ExtUI.checklist(); } }, `📋 备战 ${a}/${b}`)); }
    if (snow) snow.setMode(S);
  };
  // 布置模式：把选中的家具移到 (x,y)
  Game.layout = null;
  Game.layoutMove = function (x, y) {
    const L = Game.layout; const S = G.S; if (!L || !L.sel) { UI.toast('先点一件家具选中它'); return; }
    const f = S.house.furn.find((ff) => ff.id === L.sel); if (!f) return;
    const [w, hh] = G.fdim(f);
    if (G.fits(x, y, w, hh, f.id)) { f.x = x; f.y = y; DS.Audio.confirm(); }
    else if (G.fits(x - w + 1, y, w, hh, f.id)) { f.x = x - w + 1; f.y = y; DS.Audio.confirm(); }
    else if (G.fits(x, y - hh + 1, w, hh, f.id)) { f.x = x; f.y = y - hh + 1; DS.Audio.confirm(); }
    else { UI.toast('放不下（会挡住门口或和别的家具重叠）'); return; }
    DS.Sim.refreshEnv(); Game.render();
  };

  // ---------------- 侧边按钮 & 导航 ----------------
  let sideEl;
  function sideButtons() {
    sideEl = h('div', { class: 'side-btns' });
    return sideEl;
  }
  function renderSide() {
    const S = G.S; U.clear(sideEl);
    const btn = (ic, lb, fn, dot) => h('button', { class: 'sbtn', onclick: () => { DS.Audio.tap(); fn(); } }, h('div', { class: 'ic' }, ic, dot ? h('span', { class: 'dot' }) : null), h('div', { class: 'lb' }, lb));
    sideEl.append(
      btn('🏠', '安全屋', () => DS.Panels.house(), S.house.integrity < 50 || (S.house.stored || []).length),
      btn('📱', S.unlocked.phone ? '手机' : '日志', () => DS.Panels.phone()),
      btn('⚡', '安排', () => DS.ExtUI.autoAssign()),
      btn('⚙️', '设置', () => DS.Panels.settings()),
    );
  }
  function buildNav() {
    U.clear(navEl);
    const nb = (id, ic, lb, fn) => h('button', { class: 'nb', 'data-id': id, onclick: () => { DS.Audio.tap(); fn(); } }, h('div', { class: 'ic' }, ic), h('div', null, lb));
    actBtn = h('button', { class: 'act-btn', onclick: () => Game.act() });
    navEl.append(
      nb('mem', '👥', '人员', () => DS.Panels.members()),
      nb('inv', '🎒', '仓库', () => DS.Panels.inventory()),
      h('div', { class: 'act' }, actBtn),
      nb('shop', '🛒', '商店', () => Game.openShop()),
      nb('exp', '🧭', '探索', () => Game.openExplore()),
    );
  }
  function renderNav() {
    const S = G.S;
    const night = G.isNight();
    actBtn.className = 'act-btn' + (night ? ' night' : '') + (busy ? ' busy' : '');
    U.clear(actBtn);
    actBtn.append(h('div', { class: 'chev' }, night ? '☾' : '»'), h('div', null, night ? '就寝' : '行动'));
    const hint = night ? '结束这一天' : `→ ${G.SLOTS[S.slot + 1] !== undefined ? String(G.SLOTS[S.slot + 1]).padStart(2, '0') + ':00' : ''}`;
    actBtn.appendChild(h('div', { class: 'act-hint' }, hint));
    const exp = navEl.querySelector('[data-id=exp]');
    exp.classList.toggle('locked', !S.unlocked.explore);
    const mem = navEl.querySelector('[data-id=mem]');
    const sickDot = S.members.some((m) => Object.keys(m.statuses).length);
    mem.querySelector('.dot') && mem.querySelector('.dot').remove();
    if (sickDot) mem.appendChild(h('span', { class: 'dot' }));
    renderSide();
  }
  Game.openShop = function () {
    const S = G.S;
    if (S.phase !== 'apoc' && S.house.type === '旧公寓' && S.day < 2) { UI.toast('先想办法筹钱、找到安全屋吧'); }
    DS.Panels.shop();
  };
  Game.openExplore = function () {
    const S = G.S;
    if (!S.unlocked.explore) { UI.toast(S.phase === 'apoc' ? '还不知道该去哪里搜索……（剧情解锁）' : '末日降临之后才需要出门搜刮'); return; }
    DS.ExploreUI.map();
  };

  // ---------------- 行动 ----------------
  Game.act = async function () {
    const S = G.S; if (busy || !S || S.ending) return;
    DS.Audio.unlock();
    busy = true; renderNav();
    try {
      if (G.isNight()) await Game.night();
      else {
        const res = DS.Sim.advance();
        res.notes.forEach((n) => UI.toast(n));
        const used = Object.keys(res.used || {});
        if (used.length) UI.toast('自动补给：' + used.map((k) => k + (res.used[k] > 1 ? '×' + res.used[k] : '')).join('、'), '', 1.6);
        if (S.ending) return Game.showEnding();
        Game.render();
        if (S.pendingRecruit) await Game.recruitCard();
        const inst = DS.Events.pickSlot();
        if (inst) await Game.runEvent(inst);
        else quietToast();
      }
    } catch (e) { console.error(e); UI.toast('出错了：' + e.message, 'bad', 4); }
    busy = false;
    if (G.S.ending) return Game.showEnding();
    G.save();
    Game.render();
  };
  const QUIET = ['三个小时平静地过去了。', '窗外的风声一阵紧过一阵。', '你整理了一会儿物资。', '什么也没发生，这就是好消息。', '你听见远处有零星的枪声。', '水管里传来咕噜咕噜的声音。', '你靠在墙边打了个盹。'];
  const QUIET_PRE = ['街上车水马龙，没人知道两周后会发生什么。', '手机里推送着明星八卦。', '你在清单上又划掉了一项。', '楼下的烧烤摊飘来香味。', '你盯着日历发了一会儿呆。'];
  function quietToast() { UI.toast(`${G.timeStr()}　${U.pick(G.S.phase === 'apoc' ? QUIET : QUIET_PRE)}`); }

  // ---------------- 夜晚 ----------------
  Game.night = async function () {
    const S = G.S;
    // 先处理当天剩余的剧情
    let guard = 6;
    while (S.queue && S.queue.some((id) => (DS.EVENT_BY_ID[id] || {}).slot !== 'night') && guard-- > 0) {
      const inst = DS.Events.pickSlot(); if (!inst) break; await Game.runEvent(inst); if (S.ending) return;
    }
    DS.Audio.night();
    const inst = DS.Events.pickNight();
    if (inst) { inst.night = true; await Game.runEvent(inst, { night: true }); if (S.ending) return; }
    const rep1 = DS.Sim.sleep();
    if (S.ending) return;
    await dayTransition(S.day + 1);
    const rep = DS.Sim.newDay();
    if (S.ending) return;
    DS.Events.planDay();
    G.save();
    Game.render();
    DS.Audio.morning();
    DS.Audio.ambient();
    await Game.morningReport(rep, rep1);
    if (S.pendingReports && S.pendingReports.length) await DS.ExtUI.dispatchReports();
    if (S.pendingRecruit) await Game.recruitCard();
  };
  function dayTransition(day) {
    return new Promise((res) => {
      const layer = UI.layer();
      const S = G.S;
      const t = h('div', { style: { position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .5s' } },
        h('div', { style: { fontFamily: 'var(--title)', fontSize: '44px', color: '#ffe1b0', letterSpacing: '6px' } }, `第 ${day} 天`),
        h('div', { style: { color: '#8ea3bd', marginTop: '6px', letterSpacing: '3px' } }, G.dateStr(day) + (day === 15 ? '　末日降临' : day > 15 ? '　末日第 ' + (day - 14) + ' 天' : '')));
      layer.appendChild(t);
      requestAnimationFrame(() => (t.style.opacity = 1));
      setTimeout(() => { t.style.opacity = 0; setTimeout(() => { layer.remove(); res(); }, 450); }, 1100);
    });
  }
  Game.morningReport = function (rep, rep1) {
    const S = G.S; const W = DS.Sim.WEATHER[S.weather.type];
    const body = h('div', { class: 'report' });
    body.appendChild(h('div', { class: 'scene', html: A.scene(S.weather.type === '暴雪' || S.weather.type === '狂风' ? 'storm' : 'city', 'd' + S.day, { hour: 7, apoc: S.day >= 11 }) }));
    const line = (ic, t, cls) => body.appendChild(h('div', { class: 'line ' + (cls || '') }, h('span', null, ic), h('span', null, t)));
    line(W.icon, `${S.weather.type}　室外 ${UI.fmtTemp(S.env.outT)}　室内 ${UI.fmtTemp(S.env.inT)}`);
    if (S.env.rad > 0) line('☢', `室外辐射 ${S.env.rad}　室内 ${S.env.inRad}`, S.env.inRad >= 30 ? 'bad' : '');
    if (S.day === 11) line('❄', '气温断崖式下跌——寒潮来了。', 'warn');
    (rep1 && rep1.warn || []).forEach((t) => line('⚠', t, 'warn'));
    rep.lines.forEach((t) => line('·', t));
    rep.good.forEach((t) => line('✓', t, 'ok'));
    rep.warn.forEach((t) => line('⚠', t, 'bad'));
    if (S.phase !== 'apoc' && S.day < 15) line('⏳', `距离末日还有 ${15 - S.day} 天`, 'warn');
    const story = DS.Events.storyLeft();
    return UI.modal({ title: `第 ${S.day} 天 · ${G.dateStr(S.day)}`, cat: S.phase === 'apoc' ? '末日' : '备战', catColor: S.phase === 'apoc' ? '#8a2f3a' : '#2e6da4', body, buttons: [{ t: story ? '开始新的一天（有新动态）' : '开始新的一天', cls: 'primary', v: true }] });
  };

  // ---------------- 事件 ----------------
  Game.runEvent = async function (inst, opts) {
    opts = opts || {};
    const S = G.S; const ev = inst.ev;
    if (ev.cat === '战斗') DS.Audio.alert();
    const choice = await eventModal(inst, opts);
    if (choice === null) return;
    const res = DS.Events.choose(inst, choice);
    if (res.chips.some((c) => c.label === '晶核' && c.v > 0)) DS.Audio.coin();
    Game.render();
    if (res.text || res.chips.length) await resultModal(ev, res.text, res.chips, inst);
    await Game.handleActions(res.actions, inst);
  };
  Game.handleActions = async function (act, inst) {
    const S = G.S;
    if (act.battle) {
      const raid = ['战斗', '完整度'].includes(inst.ev.cat) || inst.ev.slot === 'night';
      const defense = (inst.night || inst.ev.slot === 'night') && raid && !inst.ctx.explore && S.phase === 'apoc';
      const out = defense ? await DS.Defense.run(act.battle.id) : await DS.BattleUI.run(act.battle.id, { ctx: inst.ctx, raid });
      if (S.ending) return;
      const br = out.win ? act.battle.win : act.battle.lose;
      if (br) {
        const r2 = DS.Events.applyBranch(br, inst.ctx);
        Game.render();
        if (r2.text || r2.chips.length) await resultModal(inst.ev, r2.text, r2.chips, inst, out.win ? '胜利' : '失败');
        await Game.handleActions(r2.actions, inst);
      }
    }
    if (S.ending) return;
    if (act.recruit && S.pendingRecruit) await Game.recruitCard();
    if (act.shop) await DS.Panels.shop(act.shop, true);
    if (act.ending) { DS.Sim.ending(act.ending); return; }
    if (act.next) {
      const ev = DS.EVENT_BY_ID[act.next];
      if (ev) await Game.runEvent(DS.Events.instance(ev, inst.ctx.explore ? { explore: inst.ctx.explore } : { member: inst.ctx.member }));
    }
  };

  function eventModal(inst, opts) {
    const S = G.S; const ev = inst.ev; const ctx = inst.ctx;
    return new Promise((resolve) => {
      const layer = UI.layer();
      const cat = ev.cat || '剧情';
      const sceneKey = ev.scene || (opts.night ? 'night' : cat === '战斗' ? 'fight' : cat === '交易' ? 'trade' : cat === '完整度' ? 'storm' : cat === '人员' || cat === '维护' ? 'room' : 'city');
      const scene = h('div', { class: 'scene', html: A.scene(sceneKey, ev.id, { hour: G.hour(), apoc: S.day >= 11 }) });
      const who = ev.who && (DS.CONTACTS[ev.who] || DS.STORY_RECRUITS[ev.who]);
      if (ev.who) {
        const sr = DS.STORY_RECRUITS[ev.who];
        const cg = (DS.CONTACTS[ev.who] && DS.CONTACTS[ev.who].gender) || (/姑|芳|妈|婶|姐|姥/.test(ev.who) ? '女' : '男');
        const fake = sr ? { name: ev.who, gender: sr.gender, job: sr.job, look: Object.assign(G.randomLook(sr.gender), sr.look) } : { name: ev.who, gender: cg, job: '拾荒者', look: G.randomLook(cg) };
        if (!ev._look) ev._look = fake.look;
        fake.look = ev._look;
        scene.appendChild(h('div', { class: 'speaker' }, h('div', { class: 'av', html: A.avatar(fake) }), h('b', null, ev.who), who && who.role ? h('span', { class: 'muted' }, who.role) : null));
      } else if (ctx.member && /\{member\}|\{m他\}|"m\./.test(JSON.stringify(ev))) {
        scene.appendChild(h('div', { class: 'speaker' }, h('div', { class: 'av', html: A.avatar(ctx.member) }), h('b', null, ctx.member.name), h('span', { class: 'muted' }, ctx.member.job)));
      }
      const txt = h('div', { class: 'evtext' });
      const optsEl = h('div', { class: 'opts' });
      const body = h('div', { class: 'modal-b' }, scene, txt, optsEl);
      const title = ev.title || (ev.pool === 'explore_route' ? '探索 · 关键地点' : ev.pool === 'explore_spot' ? '探索 · 遭遇' : UI.CAT_TITLE[cat] || '事件');
      const m = h('div', { class: 'modal' }, h('div', { class: 'modal-h' }, h('span', { class: 'catchip', style: { background: UI.CAT_COLOR[cat] || '#3b5578' } }, cat), h('div', { class: 'ttl' }, title), h('span', { class: 'small muted' }, `第${S.day}天 ${G.timeStr()}`)), body);
      layer.append(h('div', { class: 'backdrop' }), m);
      const text = DS.Events.text(ev.text, ctx);
      const tw = UI.typewriter(txt, text);
      let shown = false;
      const showOpts = () => {
        if (shown) return; shown = true; tw.skip();
        ev.opts.forEach((o, i) => {
          const st = DS.Events.optState(inst, o);
          const meta = [];
          if (o.cost) DS.Events.costLabel(o.cost).forEach((c) => meta.push(h('span', { class: 'cost' }, '消耗 ' + c)));
          if (o.req) o.req.forEach((c) => { const ok = DS.Events.evalCond(c, ctx); meta.push(h('span', { class: 'req', style: ok ? { color: '#6fd08c' } : null }, (ok ? '✓ ' : '✗ ') + DS.Events.condLabel(c))); });
          if (st.danger && S.perks.includes('memory')) meta.push(h('span', { class: 'dg' }, '⚠ 前世记忆：这里埋着隐患'));
          if (o.battle) meta.push(h('span', { class: 'req' }, '⚔ 战斗'));
          const hg = (o.fx || []).map((f) => (f.match(/^house:get:(.+)$/) || [])[1]).find(Boolean);
          if (hg && DS.HOUSES[hg] && DS.HOUSES[hg].pro) { const H = DS.HOUSES[hg]; meta.push(h('span', { style: { color: '#9fd0f5' } }, `👍 ${H.pro}`), h('span', { style: { color: '#ffb0a8' } }, `👎 ${H.con}`)); }
          const b = h('button', { class: 'opt' + (st.ok ? '' : ' disabled'), onclick: () => { if (!st.ok) return; DS.Audio.confirm(); off(); layer.remove(); resolve(i); } },
            h('span', { class: 'num' }, i + 1), DS.Events.text(o.t, ctx), meta.length ? h('div', { class: 'meta' }, meta) : null);
          optsEl.appendChild(b);
        });
        if (!ev.opts.some((o) => DS.Events.optState(inst, o).ok)) {
          optsEl.appendChild(h('button', { class: 'opt', onclick: () => { off(); layer.remove(); G.S.fired[ev.id] = G.S.day; resolve(null); } }, '（无能为力，只能离开）'));
        }
      };
      tw.done.then(showOpts);
      txt.addEventListener('click', showOpts);
      scene.addEventListener('click', showOpts);
      const off = UI.pushKeys((e) => {
        if (!shown && (e.key === ' ' || e.key === 'Enter')) { showOpts(); e.preventDefault(); return; }
        const n = parseInt(e.key, 10);
        if (shown && n >= 1 && n <= ev.opts.length) { const b = optsEl.children[n - 1]; if (b && !b.classList.contains('disabled')) b.click(); }
      });
    });
  }
  function resultModal(ev, text, chips, inst, tag) {
    const body = h('div', null);
    if (text) body.appendChild(h('div', { class: 'result-text' }, text));
    if (chips.length) body.appendChild(UI.chipsRow(chips));
    const cat = ev.cat || '剧情';
    return UI.modal({ title: tag || '结果', cat: tag || cat, catColor: tag === '胜利' ? '#2f8a4c' : tag === '失败' ? '#a03030' : UI.CAT_COLOR[cat], body, buttons: [{ t: '确定', cls: 'primary', v: true }] });
  }
  Game.resultModal = resultModal;

  Game.openBubble = async function (b) {
    const S = G.S; if (busy) return;
    S.bubbles = S.bubbles.filter((x) => x !== b);
    const inst = DS.Events.bubbleInstance(b);
    Game.renderRoom();
    if (!inst) return;
    busy = true;
    try { await Game.runEvent(inst); } finally { busy = false; }
    if (S.ending) return Game.showEnding();
    G.save(); Game.render();
  };

  // ---------------- 招募卡 ----------------
  Game.recruitCard = async function () {
    const S = G.S; const m = S.pendingRecruit; if (!m) return;
    S.pendingRecruit = null;
    const full = !G.canRecruit();
    const body = h('div', null,
      h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { style: { width: '84px', height: '84px', borderRadius: '12px', overflow: 'hidden', flex: 'none', border: '2px solid #4a6386' }, html: A.avatar(m) }),
        h('div', { class: 'grow' }, h('div', { style: { fontSize: '18px', fontWeight: 800 } }, m.name, ' ', h('span', { class: 'small muted' }, `${m.gender} · ${m.age}岁`)),
          h('div', { class: 'small', style: { color: 'var(--amber)' } }, `${DS.JOBS[m.job].icon} ${m.title}（${m.job}） Lv.${m.lv}`),
          h('div', { class: 'small muted', style: { marginTop: '4px', lineHeight: 1.6 } }, m.bio))),
      h('div', { class: 'statgrid', style: { marginTop: '10px' } }, ['力量', '灵巧', '学识', '运气', '速度', '防御'].map((s) => h('div', { class: 's' }, s, h('b', null, m.stats[s])))),
      h('div', { class: 'col', style: { marginTop: '10px' } }, m.skills.map(([s, q]) => DS.Panels.skillRow(m, s, q))),
      full ? h('div', { class: 'small bad', style: { marginTop: '8px' } }, `安全屋人员栏位已满（${G.memberSlots()}人）。扩建或遣散队员后才能收留。`) : null);
    const v = await UI.modal({ title: m.story ? '有人想加入' : '幸存者', cat: '招募', catColor: '#16a085', body, buttons: full && S.members.length > 1 ? [{ t: '拒绝', v: false }, { t: '换掉一名队员', cls: 'primary', v: 'swap' }] : [{ t: '拒绝', v: false }, { t: full ? '栏位已满' : '收留', cls: 'primary' + (full ? ' disabled' : ''), v: true }] });
    if (v === 'swap') {
      const old = await DS.ExtUI.pickReplace(m);
      if (old) { DS.Sim.removeMember(old); G.log(`${old.name}离开了安全屋，${m.name}住了进来。`); UI.toast(`${old.name} 离开了`); }
      else { if (m.story) G.log(`你拒绝了${m.name}。`); Game.render(); return; }
    }
    if (v && G.canRecruit()) { S.members.push(m); m.joined = S.day; G.log(`${m.name}加入了安全屋。`, 'good'); UI.toast(`${m.name} 加入了安全屋`, 'good'); DS.Audio.win(); if (S.contacts[m.name] === undefined && DS.CONTACTS[m.name]) S.contacts[m.name] = 30; }
    else if (m.story) { G.log(`你拒绝了${m.name}。`); }
    Game.render();
  };

  // ---------------- 结局 ----------------
  Game.showEnding = function () {
    const S = G.S; const info = S.endingInfo || {};
    busy = false;
    UI.baseKeys = null;
    if (S.daily) return DS.ExtUI.dailyEnd();
    const E = DS.ENDINGS.find((e) => e.id === S.ending);
    const ch = S.chapter || 1;
    const el = h('div', { class: 'screen ending' },
      h('div', { class: 'big' }, E.icon),
      h('div', { class: 'small muted', style: { letterSpacing: '4px' } }, E.good ? '— 结局达成 —' : '— 你死了 —'),
      h('h2', null, E.id),
      h('div', { class: 'etxt' }, E.text),
      h('div', { class: 'stats' }, h('div', null, h('b', null, S.day), h('span', { class: 'small muted' }, '生存天数')), h('div', null, h('b', null, S.kills), h('span', { class: 'small muted' }, '击败敌人')), h('div', null, h('b', null, S.members.length), h('span', { class: 'small muted' }, '幸存成员'))),
      h('div', { class: 'pill', style: { fontSize: '14px', padding: '6px 14px', margin: '6px auto' } }, '🔁 重生点 +' + (info.pts || 0) + (info.first ? '（首次达成翻倍）' : '')),
      h('div', { class: 'small muted', style: { margin: '6px 0 16px' } }, '累计重生点：' + G.meta.points),
      h('div', { class: 'col', style: { width: '100%', maxWidth: '300px', margin: '0 auto' } },
        E.good && ch === 1 && S.day >= 100 ? h('button', { class: 'btn block spring-btn', onclick: () => { DS.Spring.start(); G.save(); Game.start(); DS.Audio.win(); } }, '🌱 继续：春天篇（第 101–160 天）') : null,
        E.good && ch >= 2 && !S.endless ? h('button', { class: 'btn block', onclick: () => { S.endless = true; S.ending = null; S.endingInfo = null; G.save(); Game.start(); } }, '继续生存（无尽模式）') : null,
        h('button', { class: 'btn primary block', onclick: () => DS.Title.create() }, '重生，再来一次'),
        h('button', { class: 'btn block', onclick: () => DS.Title.show() }, '返回标题')));
    UI.screen(el);
    if (E.good) DS.Audio.win(); else DS.Audio.lose();
  };

  // ---------------- 窗外的雪 ----------------
  function Snow(canvas) {
    const ctx = canvas.getContext('2d'); let parts = [], mode = { n: 0, wind: 0, rain: false, sun: false };
    function resize() { const r = canvas.getBoundingClientRect(); canvas.width = r.width * (window.devicePixelRatio || 1); canvas.height = r.height * (window.devicePixelRatio || 1); }
    resize(); window.addEventListener('resize', resize);
    function spawn() { return { x: Math.random() * canvas.width, y: -10, r: (0.6 + Math.random() * 2) * (window.devicePixelRatio || 1), vy: 0.6 + Math.random() * 1.4, vx: 0 }; }
    function frame() {
      const W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
      const S = G.S;
      // 背景：天空色
      const hr = S ? G.hour() : 12; const apoc = S && S.day >= 11;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      if (hr >= 21 || hr < 6) { g.addColorStop(0, '#060b18'); g.addColorStop(1, '#0f1a2e'); }
      else if (S && (S.chapter || 1) >= 2 && S.env.outT > -40) { g.addColorStop(0, '#6f8fa8'); g.addColorStop(1, '#3d5a48'); }
      else if (apoc) { g.addColorStop(0, '#5d6b80'); g.addColorStop(1, '#2b3546'); }
      else { g.addColorStop(0, '#5c8ec4'); g.addColorStop(1, '#2d4a6e'); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (apoc) { ctx.fillStyle = '#ffffff10'; for (let i = 0; i < 6; i++) ctx.fillRect(0, H - (i + 1) * 6, W, 6); }
      while (parts.length < mode.n) parts.push(Object.assign(spawn(), { y: Math.random() * H }));
      if (parts.length > mode.n) parts.length = mode.n;
      ctx.fillStyle = mode.rain ? '#9fc4e8aa' : '#ffffffcc';
      parts.forEach((p) => {
        p.y += p.vy * (mode.rain ? 6 : 1) * (window.devicePixelRatio || 1); p.x += (mode.wind + Math.sin(p.y / 40) * 0.3) * (window.devicePixelRatio || 1);
        if (p.y > H + 5 || p.x < -10 || p.x > W + 10) Object.assign(p, spawn(), { x: Math.random() * W });
        if (mode.rain) { ctx.fillRect(p.x, p.y, 1, 8); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return {
      setMode(S) {
        const w = S.weather ? S.weather.type : '晴';
        if (S.day < 11 || ((S.chapter || 1) >= 2 && S.env.outT > -5)) mode = { n: w === '雨' ? 90 : w === '小雪' ? 40 : 0, wind: 0, rain: w === '雨' };
        else mode = { n: w === '暴雪' ? 220 : w === '狂风' ? 160 : w === '小雪' ? 90 : w === '晴' ? 20 : 50, wind: w === '狂风' ? 3 : w === '暴雪' ? 1.5 : 0.3, rain: false };
      },
    };
  }
})();
