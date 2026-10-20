/* 探索：格子地图生成、移动、敌人行动、拾取、撤离 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G;
  const X = (DS.Explore = {});

  X.loc = (id) => DS.LOCATIONS.find((l) => l.id === id);
  X.unlocked = (id) => G.S.explore.locs.includes(id);
  X.routeDone = (id, i) => !!G.S.explore.done[id + '_' + i];
  X.locDone = (id) => [0, 1, 2].every((i) => X.routeDone(id, i));
  X.reachable = (loc) => DS.VEHICLES[G.S.vehicle].range >= loc.dist;
  X.canGo = function (m) {
    if (Object.keys(m.statuses).some((s) => DS.STATUS[s].noExplore)) return '伤病无法出行';
    if (m.energy < 15) return '体力不足';
    return null;
  };

  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function inb(map, x, y) { return x >= 0 && y >= 0 && x < map.w && y < map.h; }
  function bfs(map, sx, sy, passable) {
    const dist = Array.from({ length: map.h }, () => Array(map.w).fill(-1));
    const q = [[sx, sy]]; dist[sy][sx] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      DIRS.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (inb(map, nx, ny) && dist[ny][nx] < 0 && passable(nx, ny)) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } });
    }
    return dist;
  }

  X.generate = function (loc, routeIdx, team) {
    const R = DS.ROUTE_SIZES[routeIdx];
    const w = R.w, h = R.h;
    let map, tries = 0;
    do {
      map = { w, h, cells: [] };
      for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push({ wall: Math.random() < 0.17, seen: false, obj: null }); map.cells.push(row); }
      map.sx = Math.floor(w / 2); map.sy = h - 1;
      map.cells[map.sy][map.sx].wall = false;
      DIRS.forEach(([dx, dy]) => { const nx = map.sx + dx, ny = map.sy + dy; if (inb(map, nx, ny)) map.cells[ny][nx].wall = false; });
      const d = bfs(map, map.sx, map.sy, (x, y) => !map.cells[y][x].wall);
      let reach = 0, total = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!map.cells[y][x].wall) { total++; if (d[y][x] >= 0) reach++; }
      if (reach === total && reach >= w * h * 0.7) { map.dist = d; break; }
    } while (++tries < 40);
    if (!map.dist) { map.cells.forEach((r) => r.forEach((c) => (c.wall = false))); map.dist = bfs(map, map.sx, map.sy, () => true); }
    const free = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!map.cells[y][x].wall && map.dist[y][x] >= 2) free.push([x, y, map.dist[y][x]]);
    free.sort((a, b) => b[2] - a[2]);
    const take = (pred) => { const i = free.findIndex(pred || (() => true)); if (i < 0) return null; return free.splice(i, 1)[0]; };
    map.cells[map.sy][map.sx].obj = { k: 'exit' };
    // 线路事件放在最远处
    const first = !X.routeDone(loc.id, routeIdx);
    if (first && DS.EVENT_BY_ID[`exp_${loc.id}_${routeIdx}`]) { const c = take(); if (c) map.cells[c[1]][c[0]].obj = { k: 'event' }; }
    U.shuffle(free);
    // 遭遇
    const spots = routeIdx === 0 ? 1 : U.ri(1, 2);
    for (let i = 0; i < spots; i++) { const c = take(); if (c) map.cells[c[1]][c[0]].obj = { k: 'spot' }; }
    // 物资
    let nLoot = U.ri(R.loot[0], R.loot[1]) + Math.round(G.teamSkill('敏锐嗅觉', team)) + (first ? 0 : 1);
    const cats = Object.keys(loc.loot);
    for (let i = 0; i < nLoot; i++) {
      const c = take(); if (!c) break;
      let cat = U.wpick(cats, (k) => loc.loot[k] + (k === '医疗' ? G.teamSkill('医药知识', team) * 4 : 0));
      map.cells[c[1]][c[0]].obj = { k: 'loot', cat };
    }
    // 敌人（离出口至少 3 格）
    const nFoe = U.ri(R.foes[0], R.foes[1]);
    for (let i = 0; i < nFoe; i++) {
      const c = take((f) => f[2] >= 3); if (!c) break;
      const size = U.ri(1, Math.min(3, 1 + routeIdx));
      const lv = loc.lv + routeIdx;
      const foes = []; for (let j = 0; j < size; j++) foes.push([U.pick(loc.foes), Math.max(1, lv + U.ri(-1, 0))]);
      map.cells[c[1]][c[0]].obj = { k: 'foe', foes, id: U.uid(), icon: DS.ENEMIES[foes[0][0]].icon };
    }
    map.px = map.sx; map.py = map.sy;
    reveal(map);
    return map;
  };
  function reveal(map) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = map.px + dx, y = map.py + dy; if (inb(map, x, y)) map.cells[y][x].seen = true; }
    // 直线视野 2 格
    DIRS.forEach(([dx, dy]) => { for (let k = 1; k <= 2; k++) { const x = map.px + dx * k, y = map.py + dy * k; if (!inb(map, x, y)) break; map.cells[y][x].seen = true; if (map.cells[y][x].wall) break; } });
  }

  // 开始探索
  X.start = function (locId, routeIdx, teamIds) {
    const S = G.S; const loc = X.loc(locId); const V = DS.VEHICLES[S.vehicle];
    const team = teamIds.map((id) => G.byId(id)).filter(Boolean);
    // 主角带队
    team.sort((a, b) => (a.id === 'me' ? -1 : b.id === 'me' ? 1 : 0));
    S.intel -= loc.intel;
    if (V.fuel) G.removeItem('汽油', V.fuel);
    const notes = [];
    team.forEach((m) => {
      m.away = true; m.task = null;
      m.energy = U.clamp(m.energy - 10, 0, 100); m.hunger = U.clamp(m.hunger - 5, 0, 100); m.thirst = U.clamp(m.thirst - 5, 0, 100);
      if (S.env.outT < -30 && Math.random() < 0.15 * (1 - G.coldResist(m))) { if (DS.Sim.addStatus(m, '失温')) notes.push(`${m.name}在路上冻得失温了`); }
      if (S.env.rad > 0 && Math.random() < (S.env.rad / 400) * (1 - G.radResist(m))) { if (DS.Sim.addStatus(m, '轻度辐射')) notes.push(`${m.name}吸入了辐射尘`); }
    });
    const map = X.generate(loc, routeIdx, team);
    S.exploring = { loc: locId, route: routeIdx, team: team.map((m) => m.id), bag: {}, cap: V.bag, map, steps: 0, found: [], fights: 0, eventDone: false };
    S.explore.runs++; S.stats.explored++;
    return { notes };
  };
  X.ctx = function () {
    const E = G.S.exploring; if (!E) return null;
    return { loc: E.loc, team: E.team.map((id) => G.byId(id)).filter(Boolean), bag: E.bag, cap: E.cap };
  };
  X.bagVol = function () { const E = G.S.exploring; let v = 0; for (const k in E.bag) v += (DS.ITEMS[k].vol || 1) * E.bag[k]; return v; };

  // 移动：返回 { moved, trigger: null|{k:'foe',cell}|{k:'loot'}|{k:'spot'}|{k:'event'}|{k:'exit'}, msg }
  X.move = function (dx, dy) {
    const E = G.S.exploring; const map = E.map;
    const nx = map.px + dx, ny = map.py + dy;
    if (!inb(map, nx, ny) || map.cells[ny][nx].wall) return { moved: false };
    const c = map.cells[ny][nx];
    if (c.obj && c.obj.k === 'foe') return { moved: false, trigger: { k: 'foe', x: nx, y: ny, obj: c.obj } };
    map.px = nx; map.py = ny; E.steps++;
    reveal(map);
    // 拾取 / 触发
    let trig = null;
    if (c.obj) {
      if (c.obj.k === 'loot') trig = { k: 'loot', x: nx, y: ny, obj: c.obj };
      else if (c.obj.k === 'spot') trig = { k: 'spot', x: nx, y: ny };
      else if (c.obj.k === 'event') trig = { k: 'event', x: nx, y: ny };
      else if (c.obj.k === 'exit') trig = { k: 'exit' };
    }
    // 敌人行动（拾取类触发不打断敌人）
    const hit = foesAct(map);
    if (hit && (!trig || trig.k === 'loot' || trig.k === 'exit')) return { moved: true, trigger: hit, after: trig };
    return { moved: true, trigger: trig };
  };
  function foesAct(map) {
    const foes = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const o = map.cells[y][x].obj; if (o && o.k === 'foe') foes.push({ x, y, o }); }
    let hit = null;
    foes.forEach((f) => {
      if (hit) return;
      const dist = Math.abs(f.x - map.px) + Math.abs(f.y - map.py);
      let step = null;
      const free = (x, y) => inb(map, x, y) && !map.cells[y][x].wall && (!map.cells[y][x].obj || (x === map.px && y === map.py));
      if (dist <= 3 && map.cells[f.y][f.x].seen) {
        const d = bfs(map, map.px, map.py, (x, y) => !map.cells[y][x].wall && (!map.cells[y][x].obj || map.cells[y][x].obj.k === 'foe' && x === f.x && y === f.y || map.cells[y][x].obj.k === 'exit'));
        let best = d[f.y][f.x];
        DIRS.forEach(([dx, dy]) => { const nx = f.x + dx, ny = f.y + dy; if (inb(map, nx, ny) && d[ny][nx] >= 0 && d[ny][nx] < best && free(nx, ny)) { best = d[ny][nx]; step = [nx, ny]; } });
      } else if (Math.random() < 0.35) {
        const opts = DIRS.map(([dx, dy]) => [f.x + dx, f.y + dy]).filter(([x, y]) => free(x, y) && !(x === map.px && y === map.py));
        if (opts.length) step = U.pick(opts);
      }
      if (step) {
        if (step[0] === map.px && step[1] === map.py) { hit = { k: 'foe', x: f.x, y: f.y, obj: f.o }; return; }
        map.cells[f.y][f.x].obj = null; map.cells[step[1]][step[0]].obj = f.o;
      }
    });
    return hit;
  }
  X.clearCell = function (x, y) { const E = G.S.exploring; if (E) E.map.cells[y][x].obj = null; };

  // 拾取物资箱
  X.openLoot = function (x, y) {
    const E = G.S.exploring; const c = E.map.cells[y][x]; const loc = X.loc(E.loc); const ctx = X.ctx();
    const cat = c.obj.cat;
    let poolKey = cat;
    if (['武器', '防具', '鞋子'].includes(cat)) poolKey = cat + U.ri(1, Math.min(3, 1 + Math.floor(loc.lv / 6)));
    const pool = DS.LOOT_POOLS[poolKey] || DS.LOOT_POOLS.食物;
    const got = []; let full = false;
    const kinds = /\d$/.test(poolKey) ? 1 : U.ri(1, 2);
    U.shuffle(pool).slice(0, kinds).forEach((name) => {
      let n = /\d$/.test(poolKey) ? 1 : U.ri(1, 3);
      if (cat === '食物' || cat === '食材') n = Math.round(n * (1 + G.teamSkill('后勤保障', ctx.team)));
      if (cat === '材料') n = Math.round(n * (1 + G.teamSkill('就地取材', ctx.team)));
      const k = DS.Events.bagAdd(ctx, name, Math.max(1, n));
      if (k) got.push(`${name}×${k}`); else full = true;
    });
    // 晶核
    let cr = 0;
    if (G.S.phase === 'apoc' && Math.random() < 0.6) { cr = Math.round(U.ri(10, 30) * (1 + loc.lv * 0.12) * (1 + G.teamSkill('搜寻晶核', ctx.team))); G.S.crystal += cr; }
    if (!full || got.length) c.obj = null;
    E.found.push(...got);
    return { got, cr, full };
  };

  // 结束探索：带回物资
  X.finish = function (lost) {
    const S = G.S; const E = S.exploring; if (!E) return null;
    const res = { got: [], dropped: [], lost: !!lost };
    const team = E.team.map((id) => G.byId(id)).filter(Boolean);
    team.forEach((m) => (m.away = false));
    if (!lost) {
      Object.keys(E.bag).forEach((k) => { const n = E.bag[k]; const got = G.addItem(k, n); if (got) res.got.push(`${k}×${got}`); if (got < n) res.dropped.push(`${k}×${n - got}`); });
      // 线路完成 → 解锁下一个地点
      if (E.eventDone) {
        S.explore.done[E.loc + '_' + E.route] = true;
        if (X.locDone(E.loc)) {
          const idx = DS.LOCATIONS.findIndex((l) => l.id === E.loc);
          const nxt = DS.LOCATIONS[idx + 1];
          if (nxt && !S.explore.locs.includes(nxt.id)) { S.explore.locs.push(nxt.id); res.unlocked = nxt.name; }
        }
      }
    }
    res.loc = E.loc; res.route = E.route;
    S.exploring = null;
    return res;
  };
})();
