/* 自动试玩（在浏览器里 eval）：DS_AUTO.run({days, smart, seedJob}) → 汇总
 * 只用于测试平衡与报错，不随游戏发布加载。 */
(function () {
  const DS = window.DS; const G = DS.G, Sim = DS.Sim, E = DS.Events, U = DS.U;
  const A = (window.DS_AUTO = {});

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  A.run = function (o) {
    o = Object.assign({ days: 100, smart: true, job: '格斗家', perks: [], explore: true, verbose: false, diff: '标准', spring: false, daily: false, dispatch: true }, o || {});
    const errors = [];
    const trace = [];
    const t0 = Date.now();
    if (o.daily) {
      const cfg = DS.Daily.config(o.daily === true ? undefined : o.daily);
      DS.Ext.withRng(DS.Ext.mulberry(cfg.seed), () => G.newGame({ name: '测试员', gender: cfg.gender, job: cfg.job, perks: cfg.perks.slice(), skills: G.rollSkills(cfg.job, false), diff: '标准', seed: cfg.seed, daily: { date: cfg.date }, mutators: cfg.mutators.slice() }));
      o.days = 40;
    } else G.newGame({ name: '测试员', gender: '男', job: o.job, perks: o.perks, diff: o.diff });
    E.planDay();
    const S = G.S;
    let events = 0, battles = 0, wins = 0, explores = 0, guards = 0, guardWins = 0, dispatches = 0, disasters = {}, springAt = null;
    const seen = {};
    function team() { const me = G.me(); const others = G.home().filter((m) => m !== me && !m.statuses.濒死).sort((a, b) => G.power(b) - G.power(a)).slice(0, 4); return [me, ...others]; }
    function fight(b, noRetreat) {
      let n = 0;
      while (!b.over && n++ < 600) {
        DS.Combat.step(b);
        const me = b.allies.find((u) => u.m && u.m.id === 'me');
        if (me && me.alive && me.hp < me.maxHp * 0.35) {
          const med = ['中级医疗包', '初级医疗包', '止血绷带', '高级医疗包'].find((x) => G.qty(x));
          if (med && b.items < 3) DS.Combat.useItem(b, me.uid, med);
          else if (!noRetreat && (b.tries || 0) < 2) { b.tries = (b.tries || 0) + 1; DS.Combat.retreat(b); }
        }
      }
      if (!b.over) { b.over = true; b.win = false; }
    }
    function battle(id, ctx, br, raid, night) {
      battles++; const inst0Raid = !!raid;
      const ex = ctx && ctx.explore;
      let out;
      if (night && raid && !ex && S.phase === 'apoc') {
        guards++;
        out = DS.Defense.headless(id, (b) => fight(b, true));
        if (out.win) guardWins++;
      } else {
        const b = DS.Combat.create(id, ex ? ex.team : team(), { lvBase: ex ? DS.Explore.loc(ex.loc).lv : G.threat(), ctx: ex ? 'explore' : 'home', pet: ex ? !!(S.exploring && S.exploring.pet) : true });
        fight(b);
        out = DS.Combat.finish(b, { home: !ex && inst0Raid, explore: ex });
      }
      if (out.win) wins++;
      if (out.meDead) { Sim.kill(G.me(), 'battle'); return out; }
      if (br) { const b2 = out.win ? br.win : br.lose; if (b2) { const r2 = E.applyBranch(b2, ctx); handle(r2.actions, { ctx }); } }
      return out;
    }
    function chooseOpt(inst) {
      const ev = inst.ev;
      const ok = ev.opts.map((op, i) => [op, i]).filter(([op]) => E.optState(inst, op).ok);
      if (!ok.length) { S.fired[ev.id] = S.day; return; }
      let choice;
      if (o.smart) {
        // 偏好：不埋隐患、不打必输的仗、优先有 req 的（通常更好）
        const score = ([op]) => {
          let s = Math.random();
          const all = JSON.stringify(op);
          if (/隐患_/.test(all)) s -= 1.2;
          if (/ending:/.test(all)) s -= 10;
          if (op.req) s += 0.4;
          if (/recruit:/.test(all)) s += 0.8;
          if (/军方联络|互助会/.test(all)) s += 1;
          if (/house:get:/.test(all)) { const m = all.match(/house:get:(\W+?)"/); s += { 地下堡垒: 4, 独栋别墅: 3, 小区民房: 2.5, 烂尾楼: 1 }[m && m[1]] || 0; }
          if (op.battle && G.power(G.me()) < 60) s -= 0.5;
          return s;
        };
        choice = ok.sort((a, b) => score(b) - score(a))[0];
      } else choice = pick(ok);
      events++; seen[ev.id] = (seen[ev.id] || 0) + 1; A.lastEv = ev.id + '#' + choice[1];
      let res;
      try { res = E.choose(inst, choice[1]); } catch (e) { errors.push(`${ev.id}#${choice[1]}: ${e.message}`); return; }
      if (o.verbose) trace.push(`D${S.day} ${G.timeStr()} [${ev.id}] → ${choice[0].t}`);
      handle(res.actions, inst);
    }
    function handle(act, inst) {
      if (S.ending) return;
      if (act.battle) battle(act.battle.id, inst.ctx, act.battle, inst.ev && (['战斗','完整度'].includes(inst.ev.cat) || inst.ev.slot === 'night'), inst.night || (inst.ev && inst.ev.slot === 'night'));
      if (S.ending) return;
      if (act.recruit && S.pendingRecruit) { if (G.canRecruit()) S.members.push(S.pendingRecruit); S.pendingRecruit = null; }
      if (act.shop && o.smart) shop(act.shop);
      if (act.ending) Sim.ending(act.ending);
      if (act.next) { const ev = DS.EVENT_BY_ID[act.next]; if (!ev) errors.push('next 不存在 ' + act.next); else chooseOpt(E.instance(ev, inst.ctx.explore ? { explore: inst.ctx.explore } : { member: inst.ctx.member })); }
    }
    function buy(name, n, cur) {
      const it = DS.ITEMS[name]; const price = cur === 'money' ? it.price : it.cprice; if (!price) return 0;
      let k = 0;
      while (k < n && S[cur] >= price && G.freeVol() >= it.vol) { S[cur] -= price; G.addItem(name, 1); k++; }
      return k;
    }
    function buyFurn(t, cur) { const F = DS.FURNITURE[t]; const p = cur === 'money' ? F.price : F.cprice; if (!p || S[cur] < p) return false; if (!G.placeFurniture(t)) return false; S[cur] -= p; return true; }
    function shop() {
      if (S.phase !== 'apoc') prepShop();
    }
    function prepShop() {
      if (S.house.type === '旧公寓') return;
      const reserve = 0;
      ['壁炉', '灶台'].forEach((t) => { if (!G.hasFurn(t) && S.money > DS.FURNITURE[t].price + 10000) buyFurn(t, 'money'); });
      if (G.qty('木柴') < 60) buy('木柴', 60 - G.qty('木柴'), 'money');
      if (G.qty('矿泉水') < 60) buy('矿泉水', 60 - G.qty('矿泉水'), 'money');
      if (G.qty('压缩饼干') < 30) buy('压缩饼干', 30 - G.qty('压缩饼干'), 'money');
      ['豪华床', '种植箱', '工作台', '储物柜', '储物柜', '收音机', '医疗床', '沙发'].forEach((t) => { if (G.furnOf(t).length < (t === '储物柜' ? 2 : 1) && S.money > 200000) buyFurn(t, 'money'); });
      [['保温', 3], ['防辐射', 2], ['仓储', 2], ['防御', 1]].forEach(([k, lv]) => { while ((S.house.mods[k] || 0) < lv && S.money >= DS.MODS[k].money[S.house.mods[k] || 0] + 300000) { S.money -= DS.MODS[k].money[S.house.mods[k] || 0]; S.house.mods[k]++; } });
      if (!S.vehicles.includes('轿车') && S.money > 500000) { S.money -= DS.VEHICLES.轿车.price; S.vehicles.push('轿车'); S.vehicle = '轿车'; }
      if (S.unlocked.blackmarket && !G.qty('手枪') && !G.me().gear.武器 && S.money > 300000) buy('手枪', 1, 'money');
      if (!G.me().gear.防具) buy('羽绒服', 2, 'money');
      if (!G.qty('消防斧') && S.money > 20000) buy('消防斧', 2, 'money');
      const want = [['木柴', 200], ['矿泉水', 150], ['压缩饼干', 60], ['食物供给包', 50], ['大米', 30], ['青菜种子', 20], ['化肥', 20], ['土豆', 10], ['初级医疗包', 6], ['感冒药', 8], ['抗生素', 6], ['止血绷带', 10], ['塑料纤维', 20], ['铁板', 20], ['木头', 30], ['汽油', 10], ['滤芯', 20], ['抗辐射药', 4], ['肾上腺素', 2]];
      want.forEach(([n, q]) => { const have = G.qty(n); if (have < q) buy(n, q - have, 'money'); });
      equip();
    }
    function equip() {
      ['武器', '防具', '鞋子'].forEach((sl) => {
        const best = Object.keys(S.inv).filter((n) => DS.ITEMS[n].cat === sl).sort((a, b) => (DS.ITEMS[b].tier || 0) - (DS.ITEMS[a].tier || 0));
        S.members.forEach((m) => { if (!m.gear[sl] && best.length) { const n = best.shift(); if (G.removeItem(n, 1)) m.gear[sl] = n; } });
      });
    }
    function dailyManage() {
      // 指派：一键安排
      DS.AutoAssign();
      // 天灾防备
      if (S.disaster && !S.disaster.prepared && DS.DISASTERS[S.disaster.type].prep && G.canPay(DS.DISASTERS[S.disaster.type].prep.cost)) DS.Disaster.prepare();
      if (S.disaster) disasters[S.disaster.type] = 1;
      // 伙伴：煮狗粮
      if (S.pet && G.qty('狗粮') < 3 && G.hasFurn('灶台')) { const r = DS.RECIPES.find((x) => x.id === 'kibble'); if (G.canPay(r.in.map((x) => 'item:' + x))) { G.pay(r.in.map((x) => 'item:' + x)); G.addItem('狗粮', r.n, true); } }
      // 远征
      if (o.dispatch && S.phase === 'apoc' && S.day % 4 === 0) {
        const locs = DS.Dispatch.locs().filter((l) => l.lv <= G.threat() + 4);
        const cand = S.members.filter((m) => !DS.Dispatch.canSend(m) && Object.keys(m.statuses).length === 0).sort((a, b) => G.power(b) - G.power(a));
        if (locs.length && cand.length >= 2 && S.members.length >= 4) { const loc = locs[locs.length - 1]; if (!DS.Dispatch.send(loc.id, cand.slice(0, 2).map((m) => m.id))) dispatches++; }
      }
      // 远征报告
      if (S.pendingReports) S.pendingReports = [];
      // 强化主角武器
      const w = G.me().gear.武器; if (w && S.phase === 'apoc' && S.crystal > 3000) { const r = DS.Armory.rec(w); if (!r || r.lv < 5) DS.Armory.upgrade(w); }
      // 用药
      G.home().forEach((m) => Object.keys(m.statuses).forEach((s) => {
        const cure = Object.keys(S.inv).find((n) => DS.ITEMS[n].cure && (DS.ITEMS[n].cure.includes(s)));
        if (cure) Sim.useItem(m, cure);
      }));
      // 烧雪水 / 做饭
      if (G.hasFurn('灶台')) {
        const water = G.qty('矿泉水') + G.qty('净水');
        let guard = 6;
        while (water < S.members.length * 6 && G.qty('木柴') > 6 && guard-- > 0) { if (S.env.rad >= 60) { if (!G.qty('滤芯')) break; G.removeItem('滤芯', 1); } G.removeItem('木柴', 1); G.addItem('净水', 4, true); }
        ['什锦炒饭', '炒饭', '炖肉汤', '米饭', '烤土豆'].forEach((out) => { const r = DS.RECIPES.find((x) => x.out === out && x.job === 'cook'); let g = 3; while (g-- > 0 && G.canPay(r.in.map((x) => 'item:' + x))) { G.pay(r.in.map((x) => 'item:' + x)); G.addItem(r.out, r.n, true); } });
      }
      // 种植
      G.furnOf('种植箱').forEach((f) => { f.plots = f.plots || []; while (f.plots.length < 2 + f.lv - 1) { const r = ['veg', 'meat', 'tater', 'seed'].map((id) => DS.RECIPES.find((x) => x.id === id)).find((x) => G.canPay(x.in.map((y) => 'item:' + y))); if (!r) break; G.pay(r.in.map((y) => 'item:' + y)); f.plots.push({ rid: r.id, prog: 0 }); } });
      // 制造
      G.furnOf('工作台').forEach((f) => { if (f.job) return; const want = G.qty('木柴') < 30 && G.qty('木头') > 2 ? 'wood' : G.qty('滤芯') < 6 && G.qty('塑料纤维') > 2 ? 'filter' : G.qty('尖刺陷阱') < 2 && G.qty('铁板') > 6 && G.qty('木头') > 4 ? 'spike' : null; if (want) { const r = DS.RECIPES.find((x) => x.id === want); if (G.canPay(r.in.map((y) => 'item:' + y))) { G.pay(r.in.map((y) => 'item:' + y)); f.job = { rid: r.id, prog: 0, n: 1 }; } } });
      // 修房
      for (let rr = 0; rr < 5 && S.house.integrity < 80 && S.house.type !== '旧公寓'; rr++) { const c = ['item:木头:3', 'item:铁板:1', S.phase === 'apoc' ? 'crystal:120' : 'money:30000']; const c2 = ['item:木头:2', S.phase === 'apoc' ? 'crystal:30' : 'money:5000']; if (G.canPay(c)) { G.pay(c); S.house.integrity = Math.min(100, S.house.integrity + 10); } else if (S.house.integrity < 50 && G.canPay(c2)) { G.pay(c2); S.house.integrity += 5; } }
      // 末日后：集市买燃料和水
      if (S.phase === 'apoc' && S.market) {
        const foodU = Object.keys(S.inv).reduce((a, n) => a + ((DS.ITEMS[n].eat || {}).hunger || 0) * S.inv[n], 0);
        if (foodU < S.members.length * 150) S.market.offers.forEach((of) => { const e = DS.ITEMS[of.item].eat; if (DS.ITEMS[of.item].cat === '食物' && e && e.hunger >= 20) while (of.qty > 0 && S.crystal >= of.price && G.freeVol() > 2) { S.crystal -= of.price; G.addItem(of.item, 1, true); of.qty--; } });
        S.market.offers.forEach((of) => { if (['木柴', '矿泉水', '食物供给包', '压缩饼干', '抗辐射药', '木头', '铁板', '滤芯'].includes(of.item) && S.crystal > of.price + 300) { while (of.qty > 0 && S.crystal > of.price + 300 && G.freeVol() > 5) { S.crystal -= of.price; G.addItem(of.item, 1); of.qty--; } } });
        // 改造
        [['保温', 4], ['防辐射', 4], ['防御', 2]].forEach(([k, lv]) => { const cur = S.house.mods[k] || 0; if (cur < lv) { const c = DS.MODS[k].cost[cur]; const l = ['crystal:' + c[0], ...c.slice(1).map((x) => 'item:' + x)]; if (G.canPay(l) && S.crystal > c[0] + 500) { G.pay(l); S.house.mods[k]++; } } });
      }
      equip();
      Sim.refreshEnv();
    }
    function exploreOnce() {
      const locs = DS.LOCATIONS.filter((l) => S.explore.locs.includes(l.id) && DS.Explore.reachable(l) && S.intel >= l.intel);
      if (!locs.length) return;
      const loc = locs.find((l) => !DS.Explore.locDone(l.id)) || locs[locs.length - 1];
      const route = [0, 1, 2].find((i) => !DS.Explore.routeDone(loc.id, i)) ?? 0;
      const V = DS.VEHICLES[S.vehicle];
      if (V.fuel && G.qty('汽油') < V.fuel) return;
      const cand = S.members.filter((m) => !DS.Explore.canGo(m)).sort((a, b) => G.power(b) - G.power(a));
      // 主角留家，派最强的人；只有主角时主角自己去
      let tm = cand.filter((m) => m.id !== 'me').slice(0, V.seats);
      if (!tm.length) tm = cand.slice(0, 1);
      if (!tm.length) return;
      explores++;
      DS.Explore.start(loc.id, route, tm.map((m) => m.id));
      const ctx = DS.Explore.ctx();
      const map = S.exploring.map;
      // 简化：直接把所有格子里的东西过一遍
      for (let y = 0; y < map.h && S.exploring && !S.ending; y++) for (let x = 0; x < map.w && S.exploring && !S.ending; x++) {
        const c = map.cells[y][x]; if (!c.obj) continue;
        if (c.obj.k === 'loot') DS.Explore.openLoot(x, y);
        else if (c.obj.k === 'foe') { const out = battle({ name: 'x', foes: c.obj.foes }, { explore: ctx }); if (S.ending) return; if (!out.win) { DS.Explore.finish(true); return; } c.obj = null; }
        else if (c.obj.k === 'spot') { c.obj = null; const pool = DS.EVENTS.filter((ev) => ev.pool === 'explore_spot' && E.eligible(ev, { explore: ctx })); if (pool.length) chooseOpt(E.instance(pick(pool), { explore: ctx })); }
        else if (c.obj.k === 'event') { c.obj = null; const ev = DS.EVENT_BY_ID[`exp_${loc.id}_${route}`]; if (ev) chooseOpt(E.instance(ev, { explore: ctx })); if (S.exploring && !ctx.team.every((m) => m.statuses.濒死)) S.exploring.eventDone = true; }
        if (S.exploring && ctx.team.every((m) => m.statuses.濒死)) { DS.Explore.finish(true); return; }
      }
      if (S.exploring) DS.Explore.finish(false);
    }

    let guard = 0;
    while (!S.ending && S.day <= o.days && guard++ < 5000) {
      try {
        if (S.slot === -1 && o.smart) { dailyManage(); if (S.house.type !== '旧公寓' && S.phase !== 'apoc') prepShop(); }
        if (G.isNight()) {
          let g2 = 6; while (S.queue && S.queue.some((id) => (DS.EVENT_BY_ID[id] || {}).slot !== 'night') && g2-- > 0) { const inst = E.pickSlot(); if (!inst) break; chooseOpt(inst); if (S.ending) break; }
          if (S.ending) break;
          const ni = E.pickNight(); if (ni) { ni.night = true; chooseOpt(ni); }
          if (S.ending) break;
          Sim.sleep(); if (S.ending) break;
          Sim.newDay();
          if (S.ending && o.spring && (S.chapter || 1) === 1 && S.day >= 100 && (DS.ENDINGS.find((e) => e.id === S.ending) || {}).good) { springAt = S.ending; DS.Spring.start(); o.days = Math.max(o.days, 160); }
          if (S.ending) break;
          E.planDay();
          if (S.pendingRecruit) { if (G.canRecruit()) S.members.push(S.pendingRecruit); S.pendingRecruit = null; }
          if (o.verbose) trace.push(`--- D${S.day} 外${S.env.outT} 内${S.env.inT} 火${S.fireOn && !S.env.fireOut ? DS.Sim.heat() : 0} 柴${G.qty('木柴')}/${G.qty('木头')} 保温${G.hstat('insul').toFixed(2)} 辐${S.env.inRad} 人${S.members.length} 晶${S.crystal} 完${S.house.integrity} 心${G.me().mood} HP${G.me().hp} 容${G.invVol()}/${G.hstat('cap')} 粮${Object.keys(S.inv).reduce((a, n) => a + ((DS.ITEMS[n].eat || {}).hunger || 0) * S.inv[n], 0)} 水${Object.keys(S.inv).reduce((a, n) => a + ((DS.ITEMS[n].eat || {}).thirst || 0) * S.inv[n], 0)} 材${['大米', '青菜', '土豆', '红薯', '合成肉', '变异肉'].map((n) => G.qty(n)).join('/')} 种${G.furnOf('种植箱').length}`);
          continue;
        }
        if (o.explore && S.unlocked.explore && S.slot === 1 && S.phase === 'apoc' && S.day % 2 === 0) { exploreOnce(); if (S.ending) break; }
        const r = Sim.advance(); if (S.ending) break;
        if (S.pendingRecruit) { if (G.canRecruit()) S.members.push(S.pendingRecruit); S.pendingRecruit = null; }
        const inst = E.pickSlot(); if (inst) chooseOpt(inst);
      } catch (e) { errors.push(`D${S.day} ${e.message} ${e.stack.split('\n')[1]}`); if (errors.length > 20) break; }
    }
    return {
      ending: S.ending, day: S.day, house: S.house.type, members: S.members.length, crystal: S.crystal, money: S.money,
      events, battles, wins, explores, locs: S.explore.locs.length, done: Object.keys(S.explore.done).length,
      flags: Object.keys(S.flags).filter((f) => /军方|互助|钱万山|白霜|周恪/.test(f)),
      me: { hp: G.me().hp, lv: G.me().lv, mood: G.me().mood, away: G.me().away, hunger: G.me().hunger, thirst: G.me().thirst, st: Object.keys(G.me().statuses).join(','), exploring: !!S.exploring }, cause: S.deathCause, inT: S.env.inT, inRad: S.env.inRad,
      mods: S.house.mods, ms: Date.now() - t0, errors, trace: trace.slice(-o.traceN || -60), uniqueEvents: Object.keys(seen).length,
      diff: S.diff, chapter: S.chapter, lastEv: A.lastEv, springAt, guards, guardWins, dispatches, disasters: Object.keys(disasters), pet: S.pet ? `${S.pet.name} Lv${S.pet.lv} 忠${S.pet.loyal}` : (S.flags.伙伴离开 ? '离开了' : null),
      bondMax: Math.max(0, ...Object.values(S.bonds || {})), daily: S.daily ? (S.endingInfo || {}).score : null, armory: Object.keys(S.armory || {}).length,
    };
  };
})();
