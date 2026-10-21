/* 扩展系统：难度 / 词条、种子随机、天灾、伙伴、羁绊、远征、军械改装、成就图鉴、每日挑战、春天篇、排行榜、布局加成、备战清单、一键安排 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G;

  // =====================================================================
  // 难度 & 每日挑战词条
  // =====================================================================
  const Ext = (DS.Ext = {});
  const ADD_KEYS = ['temp', 'luck', 'slots', 'meHp'];
  Ext.diff = () => DS.DIFFS[(G.S && G.S.diff) || '标准'] || DS.DIFFS.标准;
  Ext.muts = () => ((G.S && G.S.mutators) || []).map((k) => DS.MUTATORS[k]).filter(Boolean);
  // 词条：乘法键返回乘积，加法键返回和
  Ext.mut = function (key, base) {
    const add = ADD_KEYS.includes(key);
    let v = base === undefined ? (add ? 0 : 1) : base;
    Ext.muts().forEach((m) => { if (m[key] !== undefined) v = add ? v + m[key] : v * m[key]; });
    return v;
  };
  // 难度 × 词条
  Ext.k = function (key) {
    const D = Ext.diff();
    switch (key) {
      case 'consume': return (D.consume || 1) * Ext.mut('consume', 1);
      case 'enemy': return D.enemy || 1;
      case 'integ': return (D.integ || 1) * Ext.mut('integ', 1);
      case 'money': return D.money || 1;
      case 'rad': return D.rad || 1;
      case 'pts': return D.pts || 1;
      case 'temp': return (D.temp || 0) + Ext.mut('temp', 0);
      case 'shop': return Ext.mut('shop', 1);
      case 'crystal': return Ext.mut('crystal', 1);
      case 'farm': return Ext.mut('farm', 1);
    }
    return 1;
  };

  // =====================================================================
  // 种子随机（每日挑战用：同一天所有人天气、天灾、开局相同）
  // =====================================================================
  Ext.hash = function (str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  Ext.mulberry = function (a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  Ext.rng = (key) => Ext.mulberry(Ext.hash(String((G.S && G.S.seed) || 0) + ':' + key));
  // 在 fn 执行期间用种子随机替换 Math.random
  Ext.withRng = function (rng, fn) { const old = Math.random; Math.random = rng; try { return fn(); } finally { Math.random = old; } };
  Ext.wpickR = function (rng, list, wfn) { const ws = list.map(wfn); const tot = ws.reduce((s, w) => s + Math.max(0, w), 0); let r = rng() * tot; for (let i = 0; i < list.length; i++) { r -= Math.max(0, ws[i]); if (r <= 0) return list[i]; } return list[list.length - 1]; };

  // =====================================================================
  // 天灾
  // =====================================================================
  const Dis = (DS.Disaster = {});
  Dis.cur = () => (G.S && G.S.disaster) || null;
  Dis.active = (type) => { const d = Dis.cur(); return !!(d && d.active && (!type || d.type === type)); };
  Dis.hit = (type) => { const d = Dis.cur(); return !!(d && d.active && d.type === type); };
  Dis.devicesOff = () => { const d = Dis.cur(); return !!(d && d.active && d.type === '太阳风暴' && !d.prepared); };
  Dis.tempOff = () => { const d = Dis.cur(); return d && d.active && d.type === '超级寒潮' ? (d.prepared ? -10 : -25) : 0; };
  Dis.radMul = () => { const d = Dis.cur(); if (!d || !d.active) return 1; if (d.type === '辐射尘暴') return d.prepared ? 1.3 : 2; return 1; };
  Dis.radAdd = () => { const d = Dis.cur(); return d && d.active && d.type === '极光夜' ? 30 : 0; };
  function disPool() {
    const ch = G.S.chapter || 1;
    return Object.keys(DS.DISASTERS).filter((k) => { const c = DS.DISASTERS[k].chapter; return c === 0 || c === ch; });
  }
  Dis.prepare = function () {
    const S = G.S; const d = Dis.cur(); if (!d || d.prepared) return false;
    const D = DS.DISASTERS[d.type]; if (!D.prep) return false;
    if (!G.canPay(D.prep.cost)) return false;
    G.pay(D.prep.cost);
    d.prepared = true; S.prepCount = (S.prepCount || 0) + 1;
    G.log(`为${d.type}做好了防备：${D.prep.name}。`, 'good');
    if (S.prepCount >= 3) DS.Ach.unlock('prepared');
    return true;
  };
  function integHit(v) {
    const S = G.S; const k = (1 - Math.min(0.5, G.hstat('def') / 200)) * Ext.k('integ');
    const loss = Math.max(1, Math.round(v * k));
    S.house.integrity = Math.max(0, S.house.integrity - loss);
    return loss;
  }
  // 每天早上结算（在环境计算之后调用）
  Dis.tick = function (rep) {
    const S = G.S; if (S.phase !== 'apoc') return;
    let d = S.disaster;
    // 结束
    if (d && d.active && S.day > d.end) {
      rep.good.push(`${DS.DISASTERS[d.type].icon} ${d.type}过去了。`);
      S.disaster = null; d = null;
      const r = Ext.rng('gap' + S.day);
      S.nextDis = S.day + Math.round((8 + r() * 7) / Ext.mut('disaster', 1));
    }
    // 开始
    if (d && !d.active && S.day >= d.start) {
      d.active = true;
      const D = DS.DISASTERS[d.type];
      rep.warn.push(`${D.icon} ${d.type}来了！${d.prepared ? '（已防备，损失会小很多）' : D.prep ? '（没来得及防备）' : ''}`);
      G.log(`${d.type}来了。`, 'bad');
      if (d.type === '极光夜') { G.home().forEach((m) => (m.mood = U.clamp(m.mood + 8, 0, 100))); rep.good.push('漫天绿光在头顶翻涌，所有人都看呆了（全员心情 +8）'); }
    }
    // 当天效果
    if (d && d.active) {
      const P = d.prepared;
      if (d.type === '雪崩' && !d.hitDone) { d.hitDone = true; const l = integHit(P ? 6 : 25); rep.warn.push(`积雪轰然砸在屋顶上，完整度 -${l}%`); }
      if (d.type === '冰雹' && !d.hitDone) { d.hitDone = true; const l = integHit(P ? 3 : 12); rep.warn.push(`冰雹砸了一整夜，完整度 -${l}%`); }
      if (d.type === '洪水') {
        const l = integHit(P ? 3 : 10); rep.warn.push(`融水漫过了门槛，完整度 -${l}%`);
        if (!P) {
          const foods = Object.keys(S.inv).filter((n) => ['食物', '食材'].includes(DS.ITEMS[n].cat));
          const lost = [];
          U.shuffle(foods).slice(0, 3).forEach((n) => { const k = G.removeItem(n, Math.ceil(G.qty(n) * 0.15)); if (k) lost.push(`${n}×${k}`); });
          if (lost.length) rep.warn.push('泡坏了：' + lost.join('、'));
        }
      }
      if (d.type === '孢子雨') {
        G.home().forEach((m) => {
          if (U.chance(P ? 0.06 : 0.3) && DS.Sim.addStatus(m, '恶心')) rep.warn.push(`${m.name}吸进了孢子，恶心反胃`);
          else if (U.chance(P ? 0.02 : 0.1) && DS.Sim.addStatus(m, '中毒')) rep.warn.push(`${m.name}孢子中毒了`);
        });
      }
      if (d.type === '太阳风暴' && !P) rep.warn.push('电磁风暴：收音机、电脑和监控都失灵了，工作台进度减半');
    }
    // 预警
    const ch = S.chapter || 1;
    const lastDay = ch >= 2 ? 157 : 97;
    if (!S.disaster && S.day >= 20 && S.day >= (S.nextDis || 22) && S.day <= lastDay && !S.endless) {
      const r = Ext.rng('dis' + S.day);
      if (r() < 0.55 * Ext.mut('disaster', 1)) {
        const pool = disPool();
        const type = pool[Math.floor(r() * pool.length)];
        const D = DS.DISASTERS[type];
        S.disaster = { type, start: S.day + 2, end: S.day + 1 + D.days, prepared: false, active: false };
        rep.warn.push(`${D.icon} 天灾预警：${D.warn}${D.prep ? `（可以在【安全屋】里“${D.prep.name}”）` : ''}`);
        G.log(`天灾预警：${type}，${D.days} 天。`, 'story');
      }
    }
  };

  // =====================================================================
  // 末日伙伴（狗）
  // =====================================================================
  const Pet = (DS.Pet = {});
  Pet.maxHp = (p) => Math.round(DS.PET.hp * (1 + DS.PET.grow * ((p || G.S.pet).lv - 1)));
  Pet.expNeed = (lv) => 30 + lv * 30;
  Pet.adopt = function (name) {
    const S = G.S;
    const used = new Set(S.members.map((m) => m.name));
    const nm = name || U.pick(DS.PET.names.filter((n) => !used.has(n)));
    S.pet = { name: nm, lv: 1, exp: 0, hp: 0, hunger: 60, loyal: 35, look: U.ri(0, 4), hurt: 0, starve: 0, day: S.day };
    S.pet.hp = Pet.maxHp(S.pet);
    G.log(`一只狗跟着你回了家。你给它起名叫${nm}。`, 'good');
    DS.Ach.unlock('dog');
    return S.pet;
  };
  Pet.leave = function () { const S = G.S; if (!S.pet) return; G.log(`${S.pet.name}离开了。`, 'bad'); S.flags.伙伴离开 = true; S.pet = null; };
  Pet.change = function (key, v, pct) {
    const p = G.S.pet; if (!p) return 0;
    if (key === 'hp') { const d = pct ? Math.round(Pet.maxHp(p) * v / 100) : v; p.hp = U.clamp(p.hp + d, 1, Pet.maxHp(p)); return d; }
    p[key] = U.clamp((p[key] || 0) + v, 0, 100);
    return v;
  };
  Pet.canFight = () => { const p = G.S.pet; return !!(p && !p.hurt && p.hp > Pet.maxHp(p) * 0.2 && p.loyal >= 20); };
  Pet.unit = function () {
    const p = G.S.pet; const P = DS.PET; const k = 1 + P.grow * (p.lv - 1);
    return { uid: 'pet', side: 'a', pet: true, name: p.name, icon: '🐕', hp: Math.max(1, p.hp), maxHp: Pet.maxHp(p), atk: P.atk * (1 + P.grow * 0.8 * (p.lv - 1)) * (0.75 + p.loyal / 200), def: P.def * k, spd: P.spd * (1 + 0.2 * (k - 1)), crit: P.crit, dodge: P.dodge, trait: {}, st: {}, alive: true, dmgTaken: 0 };
  };
  Pet.gainExp = function (n) {
    const p = G.S.pet; if (!p) return false; let up = false;
    p.exp += n;
    while (p.lv < 10 && p.exp >= Pet.expNeed(p.lv)) { p.exp -= Pet.expNeed(p.lv); p.lv++; up = true; p.hp = Math.min(Pet.maxHp(p), p.hp + Math.round(Pet.maxHp(p) * 0.3)); }
    if (p.lv >= 5) DS.Ach.unlock('dog5');
    return up;
  };
  const PET_FOOD = [['狗粮', 30], ['变异肉', 25], ['烤变异肉', 25], ['合成肉', 35]];
  Pet.feedOnce = function (name) {
    const p = G.S.pet; if (!p || !G.qty(name)) return false;
    const f = PET_FOOD.find((x) => x[0] === name);
    const it = DS.ITEMS[name];
    const v = f ? f[1] : (it.eat && it.eat.hunger) || 10;
    G.removeItem(name, 1);
    p.hunger = U.clamp(p.hunger + v, 0, 100);
    p.loyal = U.clamp(p.loyal + (name === '狗粮' ? 2 : 1), 0, 100);
    return true;
  };
  Pet.foods = () => PET_FOOD.map((x) => x[0]).filter((n) => G.qty(n) > 0);
  Pet.daily = function (rep) {
    const S = G.S; const p = S.pet; if (!p) return;
    p.hunger = U.clamp(p.hunger - 22, 0, 100);
    let guard = 4, shared = false;
    while (p.hunger < 60 && guard-- > 0) {
      const f = Pet.foods()[0];
      if (f) { Pet.feedOnce(f); continue; }
      // 没有专门的狗粮时，饿急了才分一点人吃的（一天最多一份）
      if (G.meta.settings.autoSupply && p.hunger < 35 && !shared) {
        const c = Object.keys(S.inv).filter((n) => DS.ITEMS[n].cat === '食物' && DS.ITEMS[n].eat && DS.ITEMS[n].eat.hunger >= 20).sort((a, b) => (DS.ITEMS[a].cprice || 99) - (DS.ITEMS[b].cprice || 99))[0];
        if (c) { Pet.feedOnce(c); shared = true; continue; }
      }
      break;
    }
    // 自己逮老鼠
    if (p.hunger < 40 && S.phase === 'apoc' && U.chance(0.35)) { p.hunger = U.clamp(p.hunger + 25, 0, 100); rep.good.push(`${p.name}半夜逮了只变异鼠，自己吃饱了`); }
    if (p.hunger <= 0) {
      p.starve++; p.loyal = U.clamp(p.loyal - 6, 0, 100); p.hp = Math.max(1, p.hp - Math.round(Pet.maxHp(p) * 0.15));
      rep.warn.push(`${p.name}饿得直哼哼（仓库里没有它能吃的东西）`);
      if (p.starve >= 3 || p.loyal <= 0) { rep.warn.push(`${p.name}饿得受不了，趁夜从门缝钻了出去，再也没回来。`); Pet.leave(); return; }
    } else p.starve = 0;
    if (p.hurt > 0) { p.hurt--; if (!p.hurt) rep.good.push(`${p.name}的伤好了，又能跟着出门了`); }
    if (p.hunger > 30) p.hp = Math.min(Pet.maxHp(p), p.hp + Math.round(Pet.maxHp(p) * 0.15));
    p.loyal = U.clamp(p.loyal + (p.hunger >= 50 ? 1 : -2), 0, 100);
    if (p.loyal >= 50) G.home().forEach((m) => (m.mood = U.clamp(m.mood + 1, 0, 100)));
  };
  Pet.play = function () {
    const S = G.S; const p = S.pet; const me = G.me();
    const key = S.day * 10 + S.slot;
    if (p.played === key) return '刚刚才玩过，让它歇会儿吧';
    if (me.energy < 5) return '你太累了';
    p.played = key; me.energy -= 3;
    p.loyal = U.clamp(p.loyal + 4, 0, 100); me.mood = U.clamp(me.mood + 3, 0, 100);
    return null;
  };

  // =====================================================================
  // 队员羁绊
  // =====================================================================
  const Bond = (DS.Bond = {});
  Bond.key = (a, b) => [a.id, b.id].sort().join('|');
  Bond.get = (a, b) => { const S = G.S; return (S.bonds && S.bonds[Bond.key(a, b)]) || 0; };
  Bond.add = function (a, b, v) {
    const S = G.S; if (!a || !b || a === b) return 0;
    S.bonds = S.bonds || {};
    const k = Bond.key(a, b);
    S.bonds[k] = U.clamp((S.bonds[k] || 0) + v, -100, 100);
    if (S.bonds[k] >= 80) DS.Ach.unlock('bond80');
    return S.bonds[k];
  };
  Bond.list = function (m) {
    return G.S.members.filter((o) => o !== m && o.id !== 'me' && m.id !== 'me').map((o) => ({ m: o, v: Bond.get(m, o) })).sort((a, b) => b.v - a.v);
  };
  Bond.stage = (v) => (v >= 80 ? '生死之交' : v >= 50 ? '挚友' : v >= 20 ? '投缘' : v > -20 ? '普通' : v > -50 ? '不和' : '水火不容');
  // 共同干活的时段数（processTasks 里累计）
  Bond.together = function (furnUsers) {
    const S = G.S; S._bondTick = S._bondTick || {};
    furnUsers.forEach((list) => { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { if (list[i].id === 'me' || list[j].id === 'me') continue; const k = Bond.key(list[i], list[j]); S._bondTick[k] = (S._bondTick[k] || 0) + 1; } });
  };
  Bond.daily = function (rep) {
    const S = G.S; S.bonds = S.bonds || {};
    const tick = S._bondTick || {}; S._bondTick = {};
    Object.keys(tick).forEach((k) => { if (tick[k] >= 2) S.bonds[k] = U.clamp((S.bonds[k] || 0) + 1, -100, 75); });
    const home = G.home().filter((m) => m.id !== 'me');
    home.forEach((m) => {
      let best = -999, worst = 999;
      home.forEach((o) => { if (o === m) return; const v = Bond.get(m, o); best = Math.max(best, v); worst = Math.min(worst, v); });
      if (best >= 60) m.mood = U.clamp(m.mood + 1, 0, 100);
      if (worst <= -40) m.mood = U.clamp(m.mood - 1, 0, 100);
    });
    // 两人都心情很差时容易起摩擦
    for (let i = 0; i < home.length; i++) for (let j = i + 1; j < home.length; j++) if (home[i].mood < 25 && home[j].mood < 25) Bond.add(home[i], home[j], -1);
  };
  // 战斗中：同队挚友加攻
  Bond.atkBonus = function (m, team) { let k = 0; team.forEach((o) => { if (o !== m && o.id && m.id !== 'me' && o.id !== 'me' && Bond.get(m, o) >= 50) k += 0.05; }); return Math.min(0.1, k); };

  // =====================================================================
  // 远征（派遣队员离家数天）
  // =====================================================================
  const Dsp = (DS.Dispatch = {});
  Dsp.list = () => (G.S.dispatch = G.S.dispatch || []);
  Dsp.days = (loc) => 1 + Math.ceil(loc.dist / 3);
  Dsp.need = (loc) => loc.lv * 35 + 60;
  Dsp.canSend = function (m) {
    if (m.id === 'me') return '主角要留下看家';
    if (m.away) return '不在安全屋';
    if (m.statuses.濒死) return '濒死';
    if (Object.keys(m.statuses).some((s) => DS.STATUS[s].noExplore)) return '伤病无法出行';
    if (m.energy < 30) return '体力不足 30';
    return null;
  };
  Dsp.locs = () => DS.LOCATIONS.filter((l) => G.S.explore.locs.includes(l.id) && DS.Explore.routeDone(l.id, 0));
  function supplyFor(n, days) {
    const S = G.S; const need = n * days; const pick = (stat) => {
      const c = Object.keys(S.inv).filter((k) => { const it = DS.ITEMS[k]; return it.cat === '食物' && it.eat && it.eat[stat] >= 15 && !it.risk; }).sort((a, b) => (DS.ITEMS[a].cprice || 50) / DS.ITEMS[a].eat[stat] - (DS.ITEMS[b].cprice || 50) / DS.ITEMS[b].eat[stat]);
      const take = {}; let left = need;
      c.forEach((k) => { if (left <= 0) return; const q = Math.min(left, G.qty(k)); if (q > 0) { take[k] = q; left -= q; } });
      return { take, left };
    };
    return { food: pick('hunger'), water: pick('thirst'), need };
  }
  Dsp.supply = supplyFor;
  Dsp.estimate = function (loc, team) {
    const pw = team.reduce((s, m) => s + G.power(m), 0) * (team.length >= 2 ? 1 : 0.85);
    return pw / Dsp.need(loc);
  };
  Dsp.send = function (locId, ids) {
    const S = G.S; const loc = DS.Explore.loc(locId);
    const team = ids.map((id) => G.byId(id)).filter(Boolean);
    if (!team.length) return '请选择队员';
    const bad = team.map(Dsp.canSend).find(Boolean); if (bad) return bad;
    const days = Dsp.days(loc);
    const sup = supplyFor(team.length, days);
    if (sup.food.left > 0 || sup.water.left > 0) return `口粮不够：需要 ${sup.need} 份食物和 ${sup.need} 份水`;
    Object.keys(sup.food.take).forEach((k) => G.removeItem(k, sup.food.take[k]));
    Object.keys(sup.water.take).forEach((k) => G.removeItem(k, sup.water.take[k]));
    team.forEach((m) => { m.away = 'dispatch'; m.task = null; });
    Dsp.list().push({ id: U.uid(), loc: locId, ids: team.map((m) => m.id), start: S.day, ret: S.day + days, ratio: Dsp.estimate(loc, team) });
    G.log(`${team.map((m) => m.name).join('、')}出发去${loc.name}远征，预计 ${days} 天后回来。`, 'story');
    return null;
  };
  function fill(t, v) { return t.replace(/\{who\}/g, v.who).replace(/\{who2\}/g, v.who2).replace(/\{loc\}/g, v.loc).replace(/\{item\}/g, v.item || '一些物资').replace(/\{foe\}/g, v.foe || '变异兽'); }
  function logLine(cat, v) { const L = DS.EXPEDITION_LOGS || {}; const list = L[cat]; if (!list || !list.length) return null; return fill(U.pick(list), v); }
  Dsp.resolve = function (d) {
    const S = G.S; const loc = DS.Explore.loc(d.loc); const team = d.ids.map((id) => G.byId(id)).filter(Boolean);
    const days = d.ret - d.start;
    const r = d.ratio * U.rf(0.85, 1.15);
    const tier = r >= 1.3 ? 3 : r >= 0.9 ? 2 : r >= 0.6 ? 1 : 0;
    const rolls = Math.round(days * team.length * [0.5, 1, 1.5, 2][tier]);
    const cats = Object.keys(loc.loot);
    const loot = {};
    for (let i = 0; i < rolls; i++) {
      let cat = U.wpick(cats, (k) => loc.loot[k]);
      if (['武器', '防具', '鞋子'].includes(cat)) cat = cat + U.ri(1, Math.min(3, 1 + Math.floor(loc.lv / 6)));
      const pool = DS.LOOT_POOLS[cat] || DS.LOOT_POOLS.食物;
      const n = U.pick(pool); loot[n] = (loot[n] || 0) + (/\d$/.test(cat) ? 1 : U.ri(1, 3));
    }
    const got = []; const dropped = [];
    Object.keys(loot).forEach((k) => { const g = G.addItem(k, loot[k]); if (g) got.push(`${k}×${g}`); if (g < loot[k]) dropped.push(k); });
    let crystal = 0;
    if (S.phase === 'apoc') crystal = Math.round(loc.lv * U.ri(12, 26) * days * [0.3, 0.8, 1.2, 1.6][tier] * Ext.k('crystal'));
    S.crystal += crystal;
    const hurtP = [0.6, 0.3, 0.15, 0.05][tier];
    const hurt = [];
    const names = team.map((m) => m.name);
    team.forEach((m) => {
      m.away = false; m.energy = U.clamp(m.energy - 20, 10, 100); m.hunger = U.clamp(m.hunger, 45, 100); m.thirst = U.clamp(m.thirst, 45, 100);
      if (U.chance(hurtP)) {
        const st = tier === 0 && U.chance(0.4) ? '重伤' : (S.chapter || 1) >= 2 ? U.pick(['轻伤', '中毒', '流血']) : U.pick(['轻伤', '冻伤', '流血']);
        if (DS.Sim.addStatus(m, st)) hurt.push(`${m.name}${st}`);
        m.hp = Math.max(1, Math.round(m.hp - G.maxHp(m) * (tier === 0 ? 0.45 : 0.2)));
      }
      G.gainExp(m, Math.round(loc.lv * 8 * days * (tier ? 1 : 0.5)));
    });
    for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) if (Bond.get(team[i], team[j]) < 75) Bond.add(team[i], team[j], 2 + tier);
    // 日志
    const v = { who: names[0], who2: names[1] || names[0], loc: loc.name };
    const lines = [];
    const push = (cat, extra) => { const sh = U.shuffle(names); const t = logLine(cat, Object.assign({ who: sh[0], who2: sh[1] || sh[0], loc: v.loc }, extra || {})); if (t) lines.push(t); };
    push('depart', { who: names[0], who2: names[1] || names[0] });
    for (let i = 0; i < Math.min(days, 3); i++) push((S.chapter || 1) >= 2 ? 'spring' : 'day');
    const items = Object.keys(loot);
    if (items.length) { push('loot', { item: U.pick(items) }); if (items.length > 3) push('loot', { item: U.pick(items) }); }
    if (tier <= 2) push('fight', { foe: U.pick(loc.foes) });
    if (hurt.length) push('hurt', { who: hurt[0].replace(/(轻伤|重伤|冻伤|流血|中毒)$/, '') });
    push(tier >= 2 ? 'good' : 'bad');
    if (tier >= 1) { G.meta.dispatchOk = (G.meta.dispatchOk || 0) + 1; if (G.meta.dispatchOk >= 10) DS.Ach.unlock('dispatch10'); }
    if (dropped.length) lines.push(`仓库塞不下了，${dropped.slice(0, 3).join('、')}只好扔在门外。`);
    return { loc: loc.name, team: names, tier, got, crystal, hurt, lines, days };
  };
  Dsp.daily = function (rep) {
    const S = G.S; const out = [];
    S.dispatch = Dsp.list().filter((d) => {
      if (S.day >= d.ret) { const r = Dsp.resolve(d); out.push(r); rep.good.push(`🚩 ${r.team.join('、')}从${r.loc}远征归来`); return false; }
      return true;
    });
    if (out.length) S.pendingReports = (S.pendingReports || []).concat(out);
  };
  Dsp.awayOf = (m) => Dsp.list().find((d) => d.ids.includes(m.id));

  // =====================================================================
  // 军械改装（按型号强化：同型号装备共享强化等级和改装词条）
  // =====================================================================
  const Arm = (DS.Armory = {});
  const effCache = {};
  Arm.rec = (name) => (G.S && G.S.armory && G.S.armory[name]) || null;
  Arm.slots = (lv) => (lv >= 7 ? 2 : lv >= 3 ? 1 : 0);
  Arm.eff = function (name) {
    const base = DS.ITEMS[name]; const r = Arm.rec(name);
    if (!r || (!r.lv && !(r.aff || []).length)) return base;
    const key = name + ':' + r.lv + ':' + (r.aff || []).join(',');
    if (effCache[key]) return effCache[key];
    const it = Object.assign({}, base, { trait: Object.assign({}, base.trait || {}), up: r.lv, affixes: (r.aff || []).slice() });
    const k = 1 + 0.1 * r.lv;
    if (it.atk) it.atk = Math.round(it.atk * k * 10) / 10;
    if (it.def) it.def = Math.round(it.def * k);
    if (it.hp) it.hp = Math.round(it.hp * k);
    if (it.spd) it.spd = Math.round(it.spd * (1 + 0.05 * r.lv));
    const A = DS.AFFIXES[base.cat] || {};
    (r.aff || []).forEach((a) => {
      const x = A[a]; if (!x) return;
      if (x.atk) it.atk = Math.round((it.atk || 0) * (1 + x.atk) * 10) / 10;
      if (x.def) it.def = Math.round((it.def || 1) * (1 + x.def));
      if (x.hp) it.hp = Math.round((it.hp || 10) * (1 + x.hp));
      if (x.spd) it.spd = Math.round((it.spd || 2) * (1 + x.spd));
      if (x.crit) it.crit = (it.crit || 0) + x.crit;
      if (x.dodge) it.dodge = (it.dodge || 0) + x.dodge;
      if (x.cold) it.cold = (it.cold || 0) + x.cold;
      if (x.rad) it.rad = (it.rad || 0) + x.rad;
      if (x.twice) it.trait.twice = Math.max(it.trait.twice || 0, x.twice);
      if (x.ab) it.trait.armorBreak = Math.max(it.trait.armorBreak || 0, x.ab);
      if (x.drain) it.drain = (it.drain || 0) + x.drain;
    });
    effCache[key] = it;
    return it;
  };
  Arm.upCost = function (name) {
    const it = DS.ITEMS[name]; const r = Arm.rec(name) || { lv: 0 };
    const c = DS.gearUpCost(it, r.lv); const apoc = G.S.phase === 'apoc';
    const list = [apoc ? 'crystal:' + c.crystal : 'money:' + c.money, 'item:' + c.mat];
    if (c.parts) list.push('item:电子零件:' + c.parts);
    return list;
  };
  Arm.affCost = function (name) {
    const it = DS.ITEMS[name]; const c = DS.affixCost(it); const apoc = G.S.phase === 'apoc';
    return [apoc ? 'crystal:' + c.crystal : 'money:' + c.money, 'item:电子零件:' + c.parts];
  };
  Arm.upgrade = function (name) {
    const S = G.S; S.armory = S.armory || {};
    const r = (S.armory[name] = S.armory[name] || { lv: 0, aff: [] });
    if (r.lv >= DS.GEAR_MAX) return '已经强化到顶了';
    const cost = Arm.upCost(name); if (!G.canPay(cost)) return '材料不足';
    G.pay(cost); r.lv++;
    if (r.lv >= 10) DS.Ach.unlock('plus10');
    G.log(`${name}强化到 +${r.lv}。`, 'good');
    return null;
  };
  // 改装：在第 slot 个词条位上随机一个词条（已有则重洗）
  Arm.reroll = function (name, slot) {
    const S = G.S; const r = S.armory && S.armory[name]; const it = DS.ITEMS[name];
    if (!r || slot >= Arm.slots(r.lv)) return '强化等级不够';
    const cost = Arm.affCost(name); if (!G.canPay(cost)) return '材料不足';
    const pool = Object.keys(DS.AFFIXES[it.cat] || {}).filter((a) => !r.aff.includes(a) || r.aff[slot] === a);
    const cand = pool.filter((a) => a !== r.aff[slot]);
    G.pay(cost);
    r.aff[slot] = U.pick(cand.length ? cand : pool);
    return null;
  };
  // 拥有的装备型号（仓库 + 身上）
  Arm.owned = function () {
    const S = G.S; const set = {};
    Object.keys(S.inv).forEach((n) => { if (['武器', '防具', '鞋子'].includes(DS.ITEMS[n].cat)) set[n] = (set[n] || 0) + S.inv[n]; });
    S.members.forEach((m) => ['武器', '防具', '鞋子'].forEach((sl) => { if (m.gear[sl]) set[m.gear[sl]] = (set[m.gear[sl]] || 0) + 1; }));
    return set;
  };

  // =====================================================================
  // 成就 & 图鉴
  // =====================================================================
  const Ach = (DS.Ach = {});
  Ach.has = (id) => !!(G.meta.ach && G.meta.ach[id]);
  Ach.unlock = function (id) {
    G.meta.ach = G.meta.ach || {};
    if (G.meta.ach[id]) return false;
    const a = DS.ACHIEVEMENTS.find((x) => x.id === id); if (!a) return false;
    G.meta.ach[id] = Date.now();
    G.saveMeta();
    if (DS.UI && DS.UI.toast) DS.UI.toast(`🏆 成就解锁：${a.name}`, 'good', 3);
    return true;
  };
  Ach.codex = () => (G.meta.codex = G.meta.codex || { foes: {}, items: {}, people: {} });
  let codexDirty = false;
  Ach.seeItem = function (name) { const c = Ach.codex(); if (!c.items[name]) { c.items[name] = 1; codexDirty = true; } };
  Ach.seeFoe = function (type) { const c = Ach.codex(); c.foes[type] = (c.foes[type] || 0) + 1; G.meta.kills = (G.meta.kills || 0) + 1; codexDirty = true; };
  Ach.seePerson = function (name) { const c = Ach.codex(); if (!c.people[name]) { c.people[name] = 1; codexDirty = true; } };
  Ach.flush = () => { if (codexDirty) { codexDirty = false; G.saveMeta(); } };
  Ach.check = function () {
    const S = G.S; if (!S) return;
    const d = S.day;
    if (d >= 2) Ach.unlock('day1');
    if (d >= 15) Ach.unlock('apoc');
    if (d >= 30) Ach.unlock('d30');
    if (d >= 50) Ach.unlock('d50');
    if (d >= 100) Ach.unlock('d100');
    if (d >= 160) Ach.unlock('d160');
    if ((G.meta.kills || 0) >= 100) Ach.unlock('kill100');
    if (S.members.length >= 6) Ach.unlock('crowd');
    if (d >= 50 && S.members.length === 1 && !S.hadMate) Ach.unlock('lonewolf');
    if (S.members.length > 1) S.hadMate = true;
    if (S.stats.cooked >= 50) Ach.unlock('chef');
    if (S.stats.harvested >= 100) Ach.unlock('farmer');
    if (S.stats.crafted >= 20) Ach.unlock('crafter');
    if (G.hstat('comfort') >= 100) Ach.unlock('cozy');
    const md = S.house.mods; if (md.保温 >= 4 && md.防辐射 >= 4 && md.防御 >= 4) Ach.unlock('fortress');
    if (S.env.outT < -90 && S.env.inT > 20) Ach.unlock('warm');
    if (S.members.filter((m) => m.story).length >= 3) Ach.unlock('story3');
    if (DS.LOCATIONS.filter((l) => DS.Explore.locDone(l.id)).length >= 10) Ach.unlock('explorer');
    if ((S.guardWins || 0) >= 5) Ach.unlock('guard5');
    if (S.diff === '硬核' && d >= 100) Ach.unlock('hardcore');
    if (Object.keys(G.meta.endings).length >= 5) Ach.unlock('end5');
    if ((G.meta.runs || 0) >= 3) Ach.unlock('rebirth3');
    S.members.forEach((m) => { if (m.story) Ach.seePerson(m.name); });
    Ach.flush();
  };

  // =====================================================================
  // 每日挑战
  // =====================================================================
  const Daily = (DS.Daily = {});
  Daily.LEN = 30;
  Daily.today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  Daily.config = function (date) {
    date = date || Daily.today();
    const r = Ext.mulberry(Ext.hash('daily:' + date));
    const jobs = Object.keys(DS.JOBS);
    const job = jobs[Math.floor(r() * jobs.length)];
    const gender = r() < 0.5 ? '男' : '女';
    const perkPool = ['memory', 'fund', 'suppress', 'loot', 'farmer', 'strong', 'leader'];
    const perks = []; while (perks.length < 2) { const p = perkPool[Math.floor(r() * perkPool.length)]; if (!perks.includes(p)) perks.push(p); }
    const mk = Object.keys(DS.MUTATORS); const mutators = [];
    while (mutators.length < 2) { const m = mk[Math.floor(r() * mk.length)]; if (!mutators.includes(m)) mutators.push(m); }
    return { date, job, gender, perks, mutators, seed: Ext.hash('daily:' + date) };
  };
  Daily.score = function (S) {
    S = S || G.S;
    const mods = Object.values(S.house.mods).reduce((a, b) => a + b, 0);
    const alive = S.ending && !DS.ENDINGS.find((e) => e.id === S.ending && e.good) && S.ending !== '挑战完成' ? 0 : 1;
    const parts = {
      天数: Math.min(S.day, Daily.LEN) * 120,
      击败: S.kills * 15,
      成员: (alive ? S.members.length : 0) * 400,
      晶核: Math.floor(S.crystal / 4),
      完整度: alive ? S.house.integrity * 6 : 0,
      改造: mods * 200,
      家具: S.house.furn.length * 40,
      通关: S.ending === '挑战完成' ? 3000 : 0,
    };
    const total = Object.values(parts).reduce((a, b) => a + b, 0);
    return { total, parts };
  };
  Daily.best = (date) => ((G.meta.daily || {})[date || Daily.today()] || 0);
  Daily.record = function (score) {
    const S = G.S; G.meta.daily = G.meta.daily || {};
    const d = S.daily.date;
    G.meta.daily[d] = Math.max(G.meta.daily[d] || 0, score);
    // 只保留最近 30 天
    const keys = Object.keys(G.meta.daily).sort(); while (keys.length > 30) delete G.meta.daily[keys.shift()];
    DS.Ach.unlock('daily');
    G.saveMeta();
  };

  // =====================================================================
  // 排行榜客户端（Cloudflare Pages Function /api/scores）
  // =====================================================================
  const Board = (DS.Board = {});
  Board.pid = function () { if (!G.meta.pid) { G.meta.pid = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''); G.saveMeta(); } return G.meta.pid; };
  Board.available = () => location.protocol === 'http:' || location.protocol === 'https:';
  async function req(url, opt) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 6000) : null;
    try { const r = await fetch(url, Object.assign({ signal: ctl ? ctl.signal : undefined }, opt)); const j = await r.json().catch(() => ({})); return Object.assign({ status: r.status }, j); }
    finally { if (t) clearTimeout(t); }
  }
  Board.get = async function (board) {
    if (!Board.available()) return { error: 'offline' };
    try { return await req(`./api/scores?board=${encodeURIComponent(board || 'today')}&pid=${Board.pid()}`); } catch (e) { return { error: 'offline' }; }
  };
  Board.submit = async function (name, score, day) {
    if (!Board.available()) return { error: 'offline' };
    try { return await req('./api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, score, day, pid: Board.pid() }) }); } catch (e) { return { error: 'offline' }; }
  };

  // =====================================================================
  // 春天篇
  // =====================================================================
  const Spring = (DS.Spring = {});
  Spring.LAST = 160;
  Spring.start = function () {
    const S = G.S;
    S.chapter = 2; S.ending = null; S.endingInfo = null; S.endless = false; S.endlessOffered = true;
    S.disaster = null; S.nextDis = S.day + 6;
    if (!S.explore.locs.includes('riverbank')) S.explore.locs.push('riverbank');
    S.unlocked.explore = true;
    // 换季：大家缓了口气，重建会的物资车也开进了城
    S.members.forEach((m) => { m.mood = U.clamp(m.mood + 15, 0, 100); m.hp = Math.max(m.hp, Math.round(G.maxHp(m) * 0.6)); });
    G.addItem('食物供给包', 12, true); G.addItem('矿泉水', 12, true); G.addItem('青菜种子', 4, true); G.addItem('化肥', 4, true);
    S.house.integrity = Math.max(S.house.integrity, 60);
    G.log('积雪开始融化。一辆挂着“临川重建会”横幅的卡车停在门口，卸下几箱物资就开走了。', 'story');
  };
  Spring.outT = (day) => -95 + 110 * Math.sqrt(Math.max(0, day - 100) / 60) + Math.sin(day * 0.9) * 3;
  Spring.rad = (day) => Math.max(15, 160 - ((day - 100) / 60) * 140);
  Spring.checkFinal = function () { DS.Sim.ending(G.S.flags.新城奠基 ? '新城奠基' : '春回大地'); };

  // =====================================================================
  // 自由布置：布局加成
  // =====================================================================
  const Lay = (DS.Layout = {});
  Lay.dim = (f) => { const F = DS.FURNITURE[f.type]; return f.rot ? [F.h, F.w] : [F.w, F.h]; };
  function touch(a, b) {
    const [aw, ah] = Lay.dim(a), [bw, bh] = Lay.dim(b);
    const ox = a.x < b.x + bw && b.x < a.x + aw; const oy = a.y < b.y + bh && b.y < a.y + ah;
    const ax2 = a.x + aw, ay2 = a.y + ah, bx2 = b.x + bw, by2 = b.y + bh;
    return (ox && (ay2 === b.y || by2 === a.y)) || (oy && (ax2 === b.x || bx2 === a.x));
  }
  Lay.touch = touch;
  Lay.RULES = [
    { id: '暖炉旁', icon: '🔥', a: '壁炉', b: ['床', '豪华床', '沙发', '按摩椅'], desc: '壁炉紧挨着床/沙发/按摩椅：每处舒适 +4（最多 2 处）', comfort: 4, max: 2 },
    { id: '温室角', icon: '🌱', a: '种植箱', b: ['壁炉'], desc: '种植箱挨着壁炉：作物生长 +25%', farm: 0.25, max: 1 },
    { id: '学习角', icon: '📖', a: '书架', b: ['电脑桌', '沙发', '按摩椅'], desc: '书架挨着电脑桌/沙发/按摩椅：阅读、上网进度 +20%', train: 0.2, max: 1 },
    { id: '小厨房', icon: '🍽️', a: '餐桌', b: ['灶台'], desc: '餐桌挨着灶台：进食效果额外 +1', food: 1, max: 1 },
    { id: '影音区', icon: '📺', a: '电视柜', b: ['沙发'], desc: '电视柜挨着沙发：看碟、躺平心情 +1', mood: 1, max: 1 },
    { id: '恢复区', icon: '💪', a: '健身器械', b: ['按摩椅', '浴缸'], desc: '健身器械挨着按摩椅/浴缸：锻炼体力消耗 -4', gym: 4, max: 1 },
    { id: '门岗', icon: '📹', a: '监控警报', b: ['@door'], desc: '监控警报装在门口（下排中间附近）：防御 +6', def: 6, max: 1 },
  ];
  Lay.bonuses = function () {
    const S = G.S; if (!S) return [];
    if (S._layKey === layoutKey()) return S._layCache;
    const out = [];
    const furn = S.house.furn;
    const cols = G.hstat('cols'), rows = G.hstat('rows'); const doorX = Math.floor(cols / 2);
    Lay.RULES.forEach((R) => {
      let n = 0;
      furn.filter((f) => f.type === R.a).forEach((f) => {
        if (R.b[0] === '@door') { const [w, h] = Lay.dim(f); if (f.y + h >= rows - 1 && Math.abs(f.x + w / 2 - (doorX + 0.5)) <= 2) n++; return; }
        n += furn.filter((o) => o !== f && R.b.includes(o.type) && touch(f, o)).length;
      });
      n = Math.min(n, R.max);
      if (n > 0) out.push(Object.assign({ n }, R));
    });
    S._layKey = layoutKey(); S._layCache = out;
    return out;
  };
  function layoutKey() { const S = G.S; return S.house.type + ':' + (S.house.mods.扩建 || 0) + ':' + S.house.furn.map((f) => f.type + f.x + ',' + f.y + (f.rot ? 'r' : '')).join(';'); }
  Lay.sum = function (key) { return Lay.bonuses().reduce((s, b) => s + (b[key] ? b[key] * b.n : 0), 0); };

  // =====================================================================
  // 备战清单（第 1–14 天）
  // =====================================================================
  const CL = (DS.Checklist = {});
  const sumCat = (pred) => Object.keys(G.S.inv).reduce((s, n) => s + (pred(DS.ITEMS[n]) ? G.S.inv[n] : 0), 0);
  CL.items = function () {
    const S = G.S; const n = Math.max(1, S.members.length);
    const water = sumCat((it) => it.cat === '食物' && it.eat && it.eat.thirst >= 15);
    const food = sumCat((it) => it.cat === '食物' && it.eat && it.eat.hunger >= 15);
    const fuel = G.qty('木柴') + G.qty('木头') * 2;
    const meds = sumCat((it) => it.cat === '医疗');
    const weapon = Object.keys(S.inv).some((k) => DS.ITEMS[k].cat === '武器') || S.members.some((m) => m.gear.武器);
    return [
      { t: '筹集启动资金', ok: S.money >= 300000 || S.house.type !== '旧公寓', hint: '第 1 天的事件里可以贷款、卖房。钱只在末日前有用，别留着。' },
      { t: '选定安全屋', ok: S.house.type !== '旧公寓', hint: '第 2 天起会有中介带你看房。出租屋撑不过寒潮。' },
      { t: '买一个壁炉', ok: G.hasFurn('壁炉'), hint: '商店 → 家具城。没有壁炉，室温会跌到零下。' },
      { t: `囤燃料（${fuel}/30）`, ok: fuel >= 30, hint: '木柴每天烧 2 根，木头可以劈成 2 根木柴。建材店有卖。' },
      { t: '买一个灶台', ok: G.hasFurn('灶台'), hint: '末日后要靠灶台烧雪水、做饭。' },
      { t: `囤水（${water}/${25 * n}）`, ok: water >= 25 * n, hint: '矿泉水在食品店。末日后可以烧雪水，但前几天会很紧。' },
      { t: `囤食物（${food}/${25 * n}）`, ok: food >= 25 * n, hint: '压缩饼干最顶饿，罐头和泡面能提心情。' },
      { t: '保温改造 1 级', ok: (S.house.mods.保温 || 0) >= 1, hint: '安全屋 → 改造。保温越高，室内越暖。' },
      { t: `备药（${meds}/6）`, ok: meds >= 6, hint: '药店：感冒药、绷带、抗生素都会用得上。' },
      { t: '弄一件武器', ok: weapon, hint: '户外店或黑市。末日后外面不太平。' },
    ];
  };
  CL.progress = () => { const l = CL.items(); return [l.filter((x) => x.ok).length, l.length]; };

  // =====================================================================
  // 一键安排
  // =====================================================================
  DS.AutoAssign = function () {
    const S = G.S; const home = G.home();
    const free = {}; // fid -> 剩余人数
    S.house.furn.forEach((f) => { const F = DS.FURNITURE[f.type]; if (F.use || F.job === 'farm' || F.job === 'craft') free[f.id] = F.users || 1; });
    const keep = new Set();
    // 正在照料作物 / 制造的人不动
    home.forEach((m) => { if (!m.task) return; const f = S.house.furn.find((x) => x.id === m.task.fid); if (f && ((f.type === '种植箱' && (f.plots || []).length) || (f.type === '工作台' && f.job))) { keep.add(m); free[f.id]--; } });
    const take = (m, types, pred) => {
      for (const t of types) {
        const f = S.house.furn.filter((x) => x.type === t && free[x.id] > 0 && (!pred || pred(x)))[0];
        if (f) { free[f.id]--; m.task = { fid: f.id }; return DS.FURNITURE[f.type].verb; }
      }
      return null;
    };
    const res = [];
    const order = home.filter((m) => !keep.has(m)).sort((a, b) => (b.statuses.濒死 ? 2 : 0) + Object.keys(b.statuses).length - ((a.statuses.濒死 ? 2 : 0) + Object.keys(a.statuses).length));
    order.forEach((m) => {
      m.task = null;
      const sick = m.statuses.濒死 || Object.keys(m.statuses).some((s) => DS.STATUS[s].hpd > 0) || m.hp < G.maxHp(m) * 0.5;
      let v = null;
      if (sick) v = take(m, ['医疗床', '豪华床', '床', '沙发']);
      if (!v && m.energy < 35) v = take(m, ['按摩椅', '沙发', '豪华床', '床']);
      if (!v && m.mood < 35) v = take(m, ['电视柜', '浴缸', '沙发', '电脑桌'], (f) => f.type !== '浴缸' || G.qty('木柴') + G.qty('木头') * 2 > 40);
      if (!v && m.job === '种植者') v = take(m, ['种植箱'], (f) => (f.plots || []).length);
      if (!v && m.job === '工程师') v = take(m, ['工作台'], (f) => !!f.job);
      if (!v) v = take(m, ['种植箱'], (f) => (f.plots || []).length);
      if (!v) v = take(m, ['工作台'], (f) => !!f.job);
      if (!v && !G.furnOf('收音机').some((f) => free[f.id] <= 0) && G.hasFurn('收音机') && !res.some((r) => r[1] === '收听')) v = take(m, ['收音机']);
      if (!v && m.energy >= 25) {
        const fighter = ['格斗家', '退伍兵', '冒险家', '特工', '拾荒者'].includes(m.job);
        v = take(m, fighter ? ['健身器械', '电脑桌', '书架', '衣柜'] : ['书架', '电脑桌', '健身器械', '衣柜']);
      }
      if (!v) v = take(m, ['沙发', '按摩椅', '电视柜']);
      res.push([m.name, v || '空闲']);
    });
    keep.forEach((m) => { const f = S.house.furn.find((x) => x.id === m.task.fid); res.push([m.name, DS.FURNITURE[f.type].verb]); });
    return res;
  };
})();
