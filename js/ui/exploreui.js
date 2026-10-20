/* 探索界面：城市地图、地点详情、选择队伍、格子地图 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art, X = DS.Explore;
  const XU = (DS.ExploreUI = {});

  XU.map = function () {
    const S = G.S;
    if (S.exploring) return XU.resume();
    const V = DS.VEHICLES[S.vehicle];
    const sh = UI.sheet({
      title: '临川市', sub: `${V.icon} ${S.vehicle}：可达距离 ${V.range}，${V.seats} 人，背包 ${V.bag}${V.fuel ? '，每次油耗 ' + V.fuel : ''}　⛽${G.qty('汽油')}　📡${S.intel}`, full: true,
      render(body) {
        body.style.padding = '0'; body.style.display = 'flex'; body.style.flexDirection = 'column';
        const wrap = h('div', { class: 'citymap', html: A.cityMap(S.phase === 'apoc') });
        const [hx, hy] = A.HOME_POS;
        wrap.appendChild(h('div', { class: 'pin', style: { left: hx + '%', top: hy + '%' } }, h('div', { class: 'ic', style: { background: 'linear-gradient(135deg,#4ea4ff,#2b5fae)' } }, h('span', null, '🏠')), h('div', { class: 'lb' }, '安全屋')));
        DS.LOCATIONS.forEach((loc) => {
          const [x, y] = A.PIN_POS[loc.id];
          const un = X.unlocked(loc.id); const reach = X.reachable(loc); const done = X.locDone(loc.id);
          const n = [0, 1, 2].filter((i) => X.routeDone(loc.id, i)).length;
          const pin = h('div', { class: 'pin' + (!un ? ' lock' : !reach ? ' far' : done ? ' done' : ''), style: { left: x + '%', top: y + '%' }, onclick: () => { DS.Audio.tap(); if (!un) { UI.toast('尚未解锁：完成上一个地点的全部线路，或通过剧情获得线索'); return; } locSheet(loc, sh); } },
            h('div', { class: 'ic' }, h('span', null, un ? loc.icon : '🔒')), h('div', { class: 'lb' }, un ? loc.name : '???'), un ? h('div', { class: 'rt' }, `${n}/3　Lv${loc.lv}`) : null);
          wrap.appendChild(pin);
        });
        body.appendChild(wrap);
        body.appendChild(h('div', { class: 'small muted', style: { padding: '8px 12px calc(10px + var(--safe-b))', lineHeight: 1.6 } }, '每个地点有 3 条线路，走到“❗”处完成线路；完成一个地点的全部线路会解锁下一个地点。灰色图钉表示当前载具到不了。'));
      },
    });
  };

  function locSheet(loc, parentSheet) {
    const S = G.S;
    UI.sheet({
      title: loc.icon + ' ' + loc.full, sub: `敌人等级 ${loc.lv}+　距离 ${loc.dist}`,
      render(body, tab, sh) {
        body.appendChild(h('div', { class: 'scene', html: A.scene(loc.id === 'hospital' ? 'hospital' : loc.id === 'market' ? 'market' : loc.id === 'pharma' ? 'lab' : 'ruin', loc.id, { hour: G.hour(), apoc: true }) }));
        body.appendChild(h('div', { class: 'evtext', style: { fontSize: '14px', minHeight: 0 } }, loc.desc));
        body.appendChild(h('div', { class: 'row small muted', style: { flexWrap: 'wrap', marginTop: '8px', gap: '6px' } },
          h('span', { class: 'pill' }, '可能出现：' + loc.foes.join('、')), h('span', { class: 'pill' }, '物资：' + Object.keys(loc.loot).join('、'))));
        const reach = X.reachable(loc);
        const V = DS.VEHICLES[S.vehicle];
        const night = G.isNight();
        const problems = [];
        if (!reach) problems.push(`${S.vehicle}到不了这么远（需要更好的载具）`);
        if (S.intel < loc.intel) problems.push(`情报不足（需要 ${loc.intel}）`);
        if (V.fuel && G.qty('汽油') < V.fuel) problems.push(`汽油不足（需要 ${V.fuel}）`);
        if (night) problems.push('天已经黑了，明天再出发');
        body.appendChild(h('h3', { class: 'sec' }, '线路'));
        const list = h('div', { class: 'list' });
        DS.ROUTE_SIZES.forEach((R, i) => {
          const done = X.routeDone(loc.id, i);
          const prevDone = i === 0 || X.routeDone(loc.id, i - 1);
          list.appendChild(h('div', { class: 'li' }, h('div', { class: 'itm', style: { '--ic': done ? '#2f8a4c' : '#3b5878' } }, done ? '✔' : ['①', '②', '③'][i]),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, R.name + (done ? '（已完成，可再次搜刮）' : '')), h('div', { class: 'ds' }, `${R.w}×${R.h} 区域　敌人等级 ${loc.lv + i}　消耗情报 ${loc.intel}`), !prevDone ? h('div', { class: 'tiny bad' }, '先完成上一条线路') : null),
            h('button', { class: 'btn small primary' + (problems.length || !prevDone ? ' disabled' : ''), onclick: () => { sh.close(); teamSelect(loc, i, parentSheet); } }, '出发')));
        });
        body.appendChild(list);
        if (problems.length) body.appendChild(h('div', { class: 'small bad', style: { marginTop: '8px', lineHeight: 1.7 } }, problems.map((p) => h('div', null, '· ' + p))));
        body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: 1.7 } }, `出发时每名队员体力 -10、饱腹 -5、饮水 -5。室外 ${UI.fmtTemp(S.env.outT)}${S.env.outT < -30 ? '，没有防寒装备可能失温' : ''}；辐射 ${S.env.rad}${S.env.rad > 0 ? '，可能吸入辐射尘（防护服可降低）' : ''}。探索结束后时间推进 3 小时。`));
      },
    });
  }

  function teamSelect(loc, route, parentSheet) {
    const S = G.S; const V = DS.VEHICLES[S.vehicle];
    const pick = new Set(['me']);
    if (X.canGo(G.me())) pick.delete('me');
    UI.sheet({
      title: '选择出行队伍', sub: `${V.icon} ${S.vehicle}：最多 ${V.seats} 人`,
      render(body, tab, sh) {
        sh.keepScroll = true;
        const list = h('div', { class: 'list' });
        S.members.forEach((m) => {
          const why = X.canGo(m); const on = pick.has(m.id);
          const mx = G.maxHp(m);
          list.appendChild(h('div', { class: 'li click', style: why ? { opacity: 0.45 } : null, onclick: () => {
            if (why) { UI.toast(m.name + '：' + why); return; }
            if (on) pick.delete(m.id); else { if (pick.size >= V.seats) { UI.toast('载具坐不下了'); return; } pick.add(m.id); }
            DS.Audio.tap(); sh.refresh();
          } }, h('div', { style: { width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, m.name + (m.id === 'me' ? '（你）' : ''), h('span', { class: 'tiny muted' }, `　Lv${m.lv} ${m.job}　战力 ${G.power(m)}`)),
              h('div', { class: 'ds' }, `生命 ${m.hp}/${mx}　体力 ${Math.round(m.energy)}　${m.gear.武器 || '空手'}`), why ? h('div', { class: 'tiny bad' }, why) : UI.statusTags(m)),
            h('span', { class: on ? 'ok' : 'dim', style: { fontSize: '20px' } }, on ? '✔' : '○')));
        });
        body.appendChild(list);
        const team = Array.from(pick).map((id) => G.byId(id));
        const pw = team.reduce((s, m) => s + G.power(m), 0);
        body.appendChild(h('div', { class: 'card small', style: { marginTop: '10px', lineHeight: 1.7 } }, `队伍战力 ${pw}　建议 ≥ ${Math.round((loc.lv + route) * 35 + 60)}`, pick.has('me') ? h('div', { class: 'tiny warn' }, '⚠ 如果全队战败而主角也倒下，这一世就结束了（仓库里的肾上腺素能救一次命）') : null));
        body.appendChild(h('button', { class: 'btn primary block', style: { marginTop: '10px' }, disabled: pick.size ? null : true, onclick: () => {
          if (!pick.size) return;
          const r = X.start(loc.id, route, Array.from(pick));
          sh.close(); if (parentSheet) parentSheet.close();
          r.notes.forEach((n) => UI.toast(n, 'bad'));
          G.save();
          XU.resume();
        } }, `出发（情报 -${loc.intel}${V.fuel ? '，汽油 -' + V.fuel : ''}）`));
      },
    });
  }

  // ---------------- 格子地图 ----------------
  let crawl = null;
  XU.resume = function () {
    const S = G.S; if (!S.exploring) return;
    if (crawl) crawl.layer.remove();
    const layer = UI.layer();
    const scr = h('div', { class: 'screen crawl', style: { position: 'absolute' } });
    layer.appendChild(scr);
    const head = h('div', { class: 'crawl-h' });
    const gridWrap = h('div', { class: 'grid-wrap' });
    const msg = h('div', { class: 'small muted', style: { textAlign: 'center', padding: '0 12px', minHeight: '20px' } });
    const dpad = h('div', { class: 'dpad' });
    scr.append(head, gridWrap, msg, dpad);
    crawl = { layer, head, gridWrap, msg, busy: false };
    const btn = (t, fn, cls) => h('button', { class: cls || '', onclick: fn }, t);
    dpad.append(h('div', { class: 'c' }), btn('▲', () => step(0, -1)), h('div', { class: 'c' }), btn('◀', () => step(-1, 0)), btn('🎒', () => bagView()), btn('▶', () => step(1, 0)), h('div', { class: 'c' }), btn('▼', () => step(0, 1)), h('div', { class: 'c' }));
    const off = UI.pushKeys((e) => {
      const k = e.key;
      const map = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] };
      if (map[k]) { e.preventDefault(); step(...map[k]); }
      return;
    });
    crawl.off = off;
    // 滑动
    let sx = 0, sy = 0;
    gridWrap.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    gridWrap.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? 1 : -1, 0); else step(0, dy > 0 ? 1 : -1); });
    render();
    crawl.msg.textContent = '找到 ❗ 完成线路，走回 🚪 撤离。滑动 / 方向键移动。';
  };

  function render() {
    const S = G.S; const E = S.exploring; if (!E || !crawl) return;
    const loc = X.loc(E.loc); const ctx = X.ctx();
    U.clear(crawl.head);
    const vol = X.bagVol();
    crawl.head.append(
      h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { style: { fontWeight: 800, fontSize: '16px' } }, `${loc.icon} ${loc.name} · ${DS.ROUTE_SIZES[E.route].name}`), h('div', { class: 'tiny muted' }, `第 ${E.steps} 步　💎${U.num(S.crystal)}　${E.eventDone ? '✔ 线路已完成' : X.routeDone(E.loc, E.route) ? '再次搜刮' : '❗ 未完成'}`)),
        h('button', { class: 'btn small danger', onclick: () => leave() }, '撤离')),
      h('div', { class: 'row', style: { marginTop: '6px' } }, ctx.team.map((m) => h('div', { class: 'row', style: { gap: '4px', flex: 1, minWidth: 0 } }, h('div', { style: { width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }), h('div', { class: 'grow' }, UI.mini(m.hp, G.maxHp(m), m.statuses.濒死 ? '#555' : '#3ec46d'))))),
      h('div', { class: 'row tiny muted', style: { marginTop: '6px' } }, '🎒', h('div', { class: 'bagbar grow' }, h('i', { style: { width: Math.min(100, vol / E.cap * 100) + '%' } })), `${vol}/${E.cap}`));
    U.clear(crawl.gridWrap);
    const map = E.map;
    const rect = crawl.gridWrap.getBoundingClientRect();
    const cs = Math.max(30, Math.floor(Math.min((Math.min(rect.width || 360, 460) - 24) / map.w, ((rect.height || 360) - 20) / map.h, 58)));
    const grid = h('div', { class: 'cgrid', style: { gridTemplateColumns: `repeat(${map.w}, ${cs}px)`, gridAutoRows: cs + 'px' } });
    const me = ctx.team[0];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const c = map.cells[y][x];
      const near = Math.abs(x - map.px) + Math.abs(y - map.py) === 1;
      const el = h('div', { class: 'cell' + (!c.seen ? ' fog' : '') + (c.wall ? ' wall' : '') + (c.seen && near && !c.wall ? ' near' : '') + (c.obj && c.obj.k === 'exit' ? ' exit' : ''), style: { fontSize: Math.round(cs * 0.5) + 'px' }, onclick: () => { if (near) step(x - map.px, y - map.py); } });
      if (c.seen && c.obj) {
        const o = c.obj;
        const ic = o.k === 'exit' ? '🚪' : o.k === 'loot' ? { 食物: '🥫', 食材: '🥬', 材料: '🔩', 医疗: '💊', 武器: '🗡️', 防具: '🦺', 百货: '🎁', 鞋子: '👟' }[o.cat] || '📦' : o.k === 'foe' ? o.icon : o.k === 'spot' ? '❓' : o.k === 'event' ? '❗' : '';
        el.appendChild(h('span', { class: 'o' + (o.k === 'event' ? ' ev' : '') }, ic));
        if (o.k === 'foe' && o.foes.length > 1) el.appendChild(h('span', { style: { position: 'absolute', right: '2px', bottom: '0', fontSize: '10px', color: '#ff9b92', fontWeight: 800 } }, '×' + o.foes.length));
      }
      if (x === map.px && y === map.py) el.appendChild(h('div', { class: 'player', html: A.avatar(me) }));
      grid.appendChild(el);
    }
    crawl.gridWrap.appendChild(grid);
  }

  async function step(dx, dy) {
    const S = G.S; const E = S.exploring; if (!E || !crawl || crawl.busy) return;
    crawl.busy = true;
    try {
      const r = X.move(dx, dy);
      if (!r.moved && !r.trigger) { crawl.busy = false; return; }
      if (r.moved) DS.Audio.step();
      render();
      await handle(r.trigger);
      if (G.S.exploring && r.after) await handle(r.after);
    } catch (e) { console.error(e); UI.toast('出错：' + e.message, 'bad'); }
    if (crawl) crawl.busy = false;
    if (G.S.ending) { closeCrawl(); return DS.Game.showEnding(); }
    if (G.S.exploring) { G.save(); render(); }
  }

  async function handle(t) {
    const S = G.S; const E = S.exploring; if (!t || !E) return;
    const ctx = X.ctx();
    if (t.k === 'loot') {
      const r = X.openLoot(t.x, t.y);
      if (r.got.length || r.cr) { DS.Audio.coin(); crawl.msg.textContent = '捡到：' + r.got.join('、') + (r.cr ? `　💎+${r.cr}` : ''); UI.toast('📦 ' + (r.got.join('、') || '') + (r.cr ? ` 💎+${r.cr}` : ''), 'good'); }
      if (r.full) { UI.toast('背包满了！打开 🎒 丢掉一些东西', 'bad'); crawl.msg.textContent = '背包满了，箱子里还有东西'; }
      render();
    } else if (t.k === 'foe') {
      const o = t.obj;
      const out = await DS.BattleUI.run({ name: o.foes.map((f) => f[0]).filter((v, i, a) => a.indexOf(v) === i).join('、'), foes: o.foes }, { explore: ctx });
      if (S.ending) return;
      E.fights++;
      if (out.win) { X.clearCell(t.x, t.y); crawl.msg.textContent = '敌人被消灭了。'; }
      else if (!out.fled) return wipe();
      render();
    } else if (t.k === 'spot') {
      X.clearCell(t.x, t.y);
      const pool = DS.EVENTS.filter((ev) => ev.pool === 'explore_spot' && DS.Events.eligible(ev, { explore: ctx }));
      const ev = U.pick(pool);
      if (ev) await DS.Game.runEvent(DS.Events.instance(ev, { explore: ctx }));
      checkWipe();
    } else if (t.k === 'event') {
      const ev = DS.EVENT_BY_ID[`exp_${E.loc}_${E.route}`];
      X.clearCell(t.x, t.y);
      if (ev) await DS.Game.runEvent(DS.Events.instance(ev, { explore: ctx }));
      if (S.ending || !S.exploring) return;
      if (!checkWipe()) { E.eventDone = true; UI.toast('✔ 线路完成！回到 🚪 撤离即可带回物资', 'good'); DS.Audio.win(); }
    } else if (t.k === 'exit') {
      if (await UI.confirm('回到车上，带着背包里的东西返回安全屋？', '撤离')) leave(true);
    }
  }
  function checkWipe() {
    const ctx = X.ctx(); if (!ctx) return true;
    if (ctx.team.every((m) => m.statuses.濒死)) { wipe(); return true; }
    return false;
  }
  async function wipe() {
    UI.toast('队伍全员倒下了……', 'bad', 3);
    await U.sleep(600);
    return finishTrip(true);
  }
  async function leave(confirmed) {
    const S = G.S; const E = S.exploring; if (!E) return;
    if (!confirmed) {
      const map = E.map; let adj = false;
      [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => { const x = map.px + dx, y = map.py + dy; if (x >= 0 && y >= 0 && x < map.w && y < map.h && map.cells[y][x].obj && map.cells[y][x].obj.k === 'foe') adj = true; });
      if (adj) { UI.toast('敌人就在旁边，没法撤离！', 'bad'); return; }
      if (!(await UI.confirm(E.eventDone || X.routeDone(E.loc, E.route) ? '撤离返回安全屋？' : '线路还没完成（没走到 ❗），确定现在撤离吗？', '撤离'))) return;
    }
    finishTrip(false);
  }
  function closeCrawl() { if (crawl) { crawl.off && crawl.off(); crawl.layer.remove(); crawl = null; } }
  async function finishTrip(lost) {
    const S = G.S;
    const E = S.exploring;
    const found = E ? E.found.slice() : [];
    const res = X.finish(lost);
    closeCrawl();
    const chips = [];
    res.got.forEach((t) => { const [n, q] = t.split('×'); chips.push({ icon: n, label: n, v: +q, good: true }); });
    res.dropped.forEach((t) => chips.push({ icon: '📦', label: '仓库放不下：' + t, v: '', good: false }));
    if (res.unlocked) chips.push({ icon: '🗺️', label: '解锁新地点：' + res.unlocked, v: '', good: true });
    const body = h('div', null, h('div', { class: 'result-text' }, lost ? '队伍被打散了，大家拖着伤残的身体逃回安全屋，背包丢在了路上。' : '你们满身寒霜地回到了安全屋。'), UI.chipsRow(chips));
    await UI.modal({ title: lost ? '探索失败' : '探索归来', cat: '探索', catColor: lost ? '#a03030' : '#2c6e8f', body });
    // 时间推进
    const r = DS.Sim.advance();
    r.notes.forEach((n) => UI.toast(n));
    if (S.ending) return DS.Game.showEnding();
    DS.Game.render();
    const inst = DS.Events.pickSlot();
    if (inst) await DS.Game.runEvent(inst);
    if (S.ending) return DS.Game.showEnding();
    G.save(); DS.Game.render();
  }

  function bagView() {
    const S = G.S; const E = S.exploring; if (!E) return;
    UI.sheet({
      title: '背包', sub: `${X.bagVol()}/${E.cap}`,
      render(body, tab, sh) {
        sh.setSub(`${X.bagVol()}/${E.cap}`);
        const keys = Object.keys(E.bag);
        if (!keys.length) { body.appendChild(h('div', { class: 'muted small' }, '背包是空的。')); return; }
        const list = h('div', { class: 'list' });
        keys.forEach((n) => list.appendChild(h('div', { class: 'li' }, A.item(n, { count: E.bag[n] }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, n), h('div', { class: 'ds' }, '体积 ' + DS.ITEMS[n].vol + ' / 个')),
          h('button', { class: 'btn small', onclick: () => { E.bag[n]--; if (!E.bag[n]) delete E.bag[n]; sh.refresh(); render(); } }, '丢 1'),
          DS.ITEMS[n].eat ? h('button', { class: 'btn small', onclick: () => { DS.Panels.pickMember((m) => { G.S.inv[n] = (G.S.inv[n] || 0) + 1; DS.Sim.useItem(m, n); E.bag[n]--; if (!E.bag[n]) delete E.bag[n]; UI.toast(m.name + '使用了' + n); sh.refresh(); render(); }); } }, '用') : null)));
        body.appendChild(list);
      },
    });
  }
})();
