/* 模拟：时间推进、环境、生理需求、伤病、心情、指派任务、种植制造、夜晚与晨报 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G;
  const Sim = (DS.Sim = {});

  // ---------------- 环境 ----------------
  function baseOutT(day) {
    if (day <= 7) return 27 + (day % 3) - 1;
    const pre = { 8: 19, 9: 13, 10: 7, 11: -8, 12: -18, 13: -26, 14: -33, 15: -42 };
    if (pre[day] !== undefined) return pre[day];
    if (day <= 30) return -42 + ((day - 15) / 15) * -38;
    if (day < 60) return -80 + ((day - 30) / 30) * -15;
    if (day <= 75) return -108 - Math.sin(((day - 60) / 15) * Math.PI) * 10;
    return -95 + Math.sin(day * 0.7) * 4;
  }
  function baseRad(day) { if (day < 18) return 0; return Math.min(160, 15 + (day - 18) * 1.5); }
  const WEATHER = {
    晴: { icon: '☀️', t: 4, r: 0 }, 阴: { icon: '☁️', t: -2, r: 0 }, 雨: { icon: '🌧️', t: -3, r: 0 }, 雾: { icon: '🌫️', t: -3, r: 5 },
    小雪: { icon: '🌨️', t: -4, r: 6 }, 暴雪: { icon: '❄️', t: -8, r: 12 }, 狂风: { icon: '🌬️', t: -6, r: 8 },
  };
  Sim.WEATHER = WEATHER;
  function rollWeather(day) {
    let tbl;
    if (day <= 9) tbl = { 晴: 55, 阴: 30, 雨: 15 };
    else if (day <= 14) tbl = { 阴: 35, 小雪: 35, 狂风: 20, 雾: 10 };
    else if (day >= 60 && day <= 75) tbl = { 暴雪: 50, 狂风: 25, 阴: 15, 小雪: 10 };
    else tbl = { 晴: 22, 阴: 26, 雾: 10, 小雪: 16, 暴雪: 14, 狂风: 12 };
    return U.wpick(Object.keys(tbl), (k) => tbl[k]);
  }
  Sim.computeEnv = function (newDay) {
    const S = G.S;
    if (newDay || !S.weather) {
      const w = rollWeather(S.day);
      S.weather = { type: w, noise: U.ri(-3, 3) };
    }
    const w = WEATHER[S.weather.type];
    const outT = Math.round(baseOutT(S.day) + w.t + S.weather.noise);
    const rad = S.day < 18 ? 0 : Math.round(baseRad(S.day) + w.r);
    S.env.outT = outT; S.env.rad = rad;
    S.env.inT = Sim.indoorTemp(); S.env.inRad = Math.round(rad * (1 - G.hstat('antirad')));
  };
  Sim.heat = function () {
    const S = G.S; if (!S.fireOn || S.env.fireOut) return 0;
    let h = 0;
    G.furnOf('壁炉').slice(0, 2).forEach((f) => { const F = DS.FURNITURE.壁炉; h += F.passive.heat + (f.lv - 1) * F.lv.heat; });
    return h;
  };
  Sim.indoorTemp = function () {
    const S = G.S; const out = S.env.outT;
    if (S.day < 11 && out > 5) return Math.min(26, out - 2);
    const insul = G.hstat('insul');
    let t = out * (1 - insul) + Sim.heat() + Math.min(6, G.home().length * 1.5);
    if (S.house.integrity < 60) t -= (60 - S.house.integrity) * 0.35;
    return Math.round(Math.min(28, t));
  };
  Sim.refreshEnv = () => { const S = G.S; S.env.inT = Sim.indoorTemp(); S.env.inRad = Math.round(S.env.rad * (1 - G.hstat('antirad'))); };

  // ---------------- 进食与物品使用 ----------------
  Sim.useItem = function (m, name, opts) {
    const it = DS.ITEMS[name]; if (!it) return null;
    const S = G.S; const notes = [];
    const e = it.eat || {};
    const tableBonus = (G.furnOf('餐桌')[0] ? DS.FURNITURE.餐桌.passive.food + (G.furnOf('餐桌')[0].lv - 1) : 0) + Math.round(G.teamSkill('美食家'));
    const isFood = it.cat === '食物';
    const healK = 1 + G.teamSkill('药物专精');
    const targets = it.team ? G.home() : [m];
    targets.forEach((t) => {
      ['hunger', 'thirst', 'energy'].forEach((k) => { if (e[k]) t[k] = U.clamp(t[k] + e[k] + (isFood && e[k] > 0 ? tableBonus : 0), 0, 100); });
      if (e.mood) t.mood = U.clamp(t.mood + e.mood + (isFood && tableBonus > 0 ? 1 : 0), 0, 100);
      if (e.hp) t.hp = Math.min(G.maxHp(t), t.hp + Math.round(G.maxHp(t) * e.hp * (it.cat === '医疗' ? healK : 1)));
    });
    if (it.cure) {
      Object.keys(m.statuses).forEach((s) => { if (it.cure.includes('*') || it.cure.includes(s)) { delete m.statuses[s]; notes.push(`治愈了${s}`); } });
    }
    if (it.read) { m.stats[it.read.stat] += it.read.v; notes.push(`${it.read.stat}+${it.read.v}`); }
    if (it.risk && U.chance(it.risk.p)) { Sim.addStatus(m, it.risk.status); notes.push(`出现了${it.risk.status}`); }
    if (!opts || !opts.free) G.removeItem(name, 1);
    return notes;
  };
  // 物品对某人是否有用（用于自动补给与按钮置灰）
  Sim.itemUseful = function (m, name) {
    const it = DS.ITEMS[name]; if (!it) return false;
    if (it.cure && Object.keys(m.statuses).some((s) => it.cure.includes('*') || it.cure.includes(s))) return true;
    const e = it.eat || {};
    if (e.hp && m.hp < G.maxHp(m)) return true;
    if (e.hunger > 0 && m.hunger < 95) return true;
    if (e.thirst > 0 && m.thirst < 95) return true;
    if (e.energy > 0 && m.energy < 95) return true;
    if (e.mood > 0 && !e.hunger && !e.thirst) return true;
    if (it.read) return true;
    return false;
  };

  function foodValue(name, need) {
    const it = DS.ITEMS[name]; const e = it.eat || {};
    if (it.cat !== '食物' || !(e[need] > 0)) return -1;
    const cost = it.cprice || it.price || 50;
    let v = e[need] / Math.max(10, cost);
    if (it.risk) v *= 0.2; // 尽量不自动吃有风险的
    return v;
  }
  Sim.autoSupply = function () {
    const S = G.S;
    const used = {};
    // 末日前：自来水和外卖
    if (S.day <= 15) {
      G.home().forEach((m) => {
        const hasWater = Object.keys(S.inv).some((n) => foodValue(n, 'thirst') > 0);
        if (m.thirst < 30 && !hasWater) { m.thirst = Math.min(100, m.thirst + 40); used.自来水 = (used.自来水 || 0) + 1; }
        const hasFood = Object.keys(S.inv).some((n) => foodValue(n, 'hunger') > 0);
        if (m.hunger < 30 && !hasFood && S.day <= 14) {
          if (S.money >= 40) { S.money -= 40; m.hunger = Math.min(100, m.hunger + 40); used.外卖 = (used.外卖 || 0) + 1; }
          else { m.hunger = Math.min(100, m.hunger + 25); m.mood = Math.max(0, m.mood - 2); used.蹭饭 = (used.蹭饭 || 0) + 1; }
        }
      });
    }
    if (!G.meta.settings.autoSupply) return used;
    // 没水喝时自动烧雪水
    if (S.day >= 11 && G.hasFurn('灶台') && G.home().some((m) => m.thirst < 40) && !Object.keys(S.inv).some((n) => foodValue(n, 'thirst') > 0 && !DS.ITEMS[n].risk)) {
      let k = 0;
      while (k < 2 && G.qty('木柴') > 0) {
        G.removeItem('木柴', 1);
        if (S.env.rad >= 60) { if (G.qty('滤芯')) { G.removeItem('滤芯', 1); G.addItem('净水', 6, true); } else G.addItem('雪水', 6, true); }
        else G.addItem('净水', 6, true);
        k++;
      }
      if (k) used.烧雪水 = k;
    }
    G.home().forEach((m) => {
      [['thirst', 40], ['hunger', 40]].forEach(([need, th]) => {
        let guard = 6;
        while (m[need] < th && guard-- > 0) {
          const cands = Object.keys(S.inv).filter((n) => S.inv[n] > 0 && foodValue(n, need) > 0);
          if (!cands.length) break;
          cands.sort((a, b) => foodValue(b, need) - foodValue(a, need));
          Sim.useItem(m, cands[0]); used[cands[0]] = (used[cands[0]] || 0) + 1;
        }
      });
    });
    return used;
  };

  // ---------------- 伤病 ----------------
  Sim.addStatus = function (m, s) {
    if (!DS.STATUS[s]) return false;
    if (m.statuses[s]) { m.statuses[s].days = Math.max(m.statuses[s].days, DS.STATUS[s].days || 0); return false; }
    if (s === '轻伤' && m.statuses.重伤) return false;
    if (s === '重伤') delete m.statuses.轻伤;
    if (s === '肺炎') delete m.statuses.感冒;
    if (s === '重度辐射') delete m.statuses.轻度辐射;
    m.statuses[s] = { days: DS.STATUS[s].days || 0, age: 0 };
    return true;
  };

  // ---------------- 消耗 ----------------
  function drain(m, h, t, e) {
    const k = 1 - G.skillVal(m, '耐力');
    let extra = 0; Object.keys(m.statuses).forEach((s) => { extra += (DS.STATUS[s].extra || 0) / 6; });
    m.hunger = U.clamp(m.hunger - h - extra * (h > 0 ? 1 : 0), 0, 100);
    m.thirst = U.clamp(m.thirst - t - extra * (t > 0 ? 1 : 0), 0, 100);
    m.energy = U.clamp(m.energy - e * k - extra * 0.5, 0, 100);
  }
  function needDamage(m, notes) {
    const mx = G.maxHp(m); let cause = null;
    if (m.hunger <= 0) { m.hp -= Math.round(mx * 0.06); m.mood -= 2; cause = 'starve'; }
    if (m.thirst <= 0) { m.hp -= Math.round(mx * 0.08); m.mood -= 2; cause = 'thirst'; }
    if (m.energy <= 0) { m.hp -= Math.round(mx * 0.03); m.mood -= 1; cause = cause || 'exhaust'; }
    if (cause && notes && !m._warned) { notes.push(`${m.name}${m.hunger <= 0 ? '饿' : m.thirst <= 0 ? '渴' : '累'}得撑不住了！`); m._warned = true; }
    if (!cause) m._warned = false;
    if (m.hp <= 0) return cause;
    return null;
  }

  // ---------------- 指派任务（每时段） ----------------
  function processTasks(notes) {
    const S = G.S;
    G.home().forEach((m) => {
      if (!m.task) return;
      const f = S.house.furn.find((x) => x.id === m.task.fid);
      if (!f) { m.task = null; return; }
      const F = DS.FURNITURE[f.type];
      if (m.statuses.濒死 && f.type !== '医疗床') { m.task = null; return; }
      if (F.use) {
        const u = F.use; const L = F.lv || {};
        const eCost = u.energy < 0 ? -u.energy : 0;
        if (eCost && m.energy < eCost + 5) { if (!m._tired) notes.push(`${m.name}太累了，${F.verb}不动了`); m._tired = true; return; }
        m._tired = false;
        if (F.cost && !G.canPay([`item:${F.cost}`])) { if (!m._nofuel) notes.push(`${F.name}需要${F.cost.split(':')[0]}`); m._nofuel = true; return; }
        m._nofuel = false;
        if (F.cost) G.pay([`item:${F.cost}`]);
        if (u.energy) m.energy = U.clamp(m.energy + u.energy + (u.energy > 0 ? (f.lv - 1) * (L.energy || 0) : 0), 0, 100);
        if (u.mood) m.mood = U.clamp(m.mood + u.mood + (f.lv - 1) * (L.mood || 0), 0, 100);
        if (u.hunger) m.hunger = U.clamp(m.hunger + u.hunger, 0, 100);
        if (u.hp) m.hp = Math.min(G.maxHp(m), m.hp + Math.round(G.maxHp(m) * (u.hp + (f.lv - 1) * (L.hp || 0)) * (1 + G.teamSkill('药物专精'))));
        if (u.intel && U.chance(0.4)) { Sim.gainIntel(u.intel); notes.push(`${m.name}从广播里听到了有用的消息（情报+1）`); }
        if (f.type === '收音机' && G.S.unlocked.recruit && U.chance(0.04)) { S.pendingRecruit = G.randomRecruit(); notes.push('收音机里有幸存者在呼叫……'); }
        if (u.heal) {
          const curable = Object.keys(m.statuses).filter((s) => s !== '肺炎' && s !== '重度辐射');
          if (curable.length && U.chance(u.heal + (f.lv - 1) * (L.heal || 0))) { const s = U.pick(curable); delete m.statuses[s]; notes.push(`${m.name}的${s}好了`); }
        }
        if (u.train) {
          const [st, base] = u.train; const prog = base + (f.lv - 1) * (L.train || 0);
          m.train[st] = (m.train[st] || 0) + prog;
          if (m.train[st] >= 100) { m.train[st] -= 100; m.stats[st] += 1; notes.push(`${m.name}的${st}提升了！（${m.stats[st]}）`); }
        }
      }
    });
    // 种植
    const cold = S.env.inT < 5;
    G.furnOf('种植箱').forEach((f) => {
      const worker = G.home().find((m) => m.task && m.task.fid === f.id);
      const boost = 1 + (worker ? 0.5 + (worker.job === '种植者' ? 0.25 : 0) : 0);
      f.plots = f.plots || [];
      f.plots.forEach((p) => {
        if (cold) { p.cold = true; return; }
        p.cold = false; p.prog += boost;
        const r = DS.RECIPES.find((x) => x.id === p.rid);
        if (p.prog >= r.t) {
          let n = r.n * (1 + G.teamSkill('绿手指'));
          if (S.perks.includes('farmer')) n *= 2;
          n = Math.max(1, Math.round(n));
          const got = G.addItem(r.out, n);
          p.done = true; S.stats.harvested += got;
          notes.push(`种植箱收获：${r.out}×${got}${got < n ? '（仓库满了）' : ''}`);
        }
      });
      f.plots = f.plots.filter((p) => !p.done);
      if (cold && f.plots.length && !f._coldNote) { notes.push('室温太低，种植箱里的作物停止生长'); f._coldNote = true; }
      if (!cold) f._coldNote = false;
    });
    // 制造
    G.furnOf('工作台').forEach((f) => {
      if (!f.job) return;
      const worker = G.home().find((m) => m.task && m.task.fid === f.id);
      f.job.prog += worker ? 1 + (worker.job === '工程师' ? 0.5 : 0) : 0.5;
      const r = DS.RECIPES.find((x) => x.id === f.job.rid);
      if (f.job.prog >= r.t) {
        const out = Sim.craftOutput(r, f.job.n || 1);
        notes.push('工作台完成：' + out.join('、'));
        S.stats.crafted++;
        f.job = null;
      }
    });
  }
  Sim.craftOutput = function (r, times) {
    const res = [];
    for (let i = 0; i < times; i++) {
      if (r.out.startsWith('@装备')) {
        const tier = r.out.slice(-1);
        const pool = U.pick(['武器', '防具', '鞋子']) + tier;
        const name = U.pick(DS.LOOT_POOLS[pool]);
        G.addItem(name, 1, true); res.push(name);
      } else {
        const n = r.nOut || r.n; const got = G.addItem(r.out, n); res.push(`${r.out}×${got}`);
      }
    }
    return res;
  };

  // ---------------- 情报 / 资源 ----------------
  Sim.gainIntel = function (n) { const S = G.S; if (n > 0) n += Math.round(G.teamSkill('刺探')); S.intel = Math.max(0, S.intel + n); return n; };

  // ---------------- 行动（推进一个时段）----------------
  Sim.advance = function () {
    const S = G.S; const notes = [];
    processTasks(notes);
    const me = G.me();
    G.home().forEach((m) => drain(m, 2.4, 3.4, 1.2));
    drain(me, 2, 3, 3);
    S.slot++;
    Sim.refreshEnv();
    const used = Sim.autoSupply();
    const deaths = [];
    G.home().forEach((m) => { const c = needDamage(m, notes); if (c) deaths.push([m, c]); });
    deaths.forEach(([m, c]) => Sim.kill(m, c));
    return { notes, used };
  };

  // ---------------- 夜晚 ----------------
  Sim.sleep = function () {
    const S = G.S; const rep = { lines: [], deaths: [], warn: [] };
    // 床位分配
    const beds = [];
    S.house.furn.forEach((f) => {
      if (f.type === '豪华床') for (let i = 0; i < 2; i++) beds.push(20 + (f.lv - 1) * 3);
      else if (f.type === '床') beds.push(10);
      else if (f.type === '沙发') for (let i = 0; i < 2; i++) beds.push(5);
    });
    beds.sort((a, b) => b - a);
    const order = G.home().slice().sort((a, b) => (a.id === 'me' ? -1 : b.id === 'me' ? 1 : Object.keys(b.statuses).length - Object.keys(a.statuses).length));
    const inT = S.env.inT;
    let floor = 0;
    order.forEach((m, i) => {
      const bonus = beds[i];
      let rest = 38 + (bonus || 0);
      if (bonus === undefined) { floor++; m.mood = U.clamp(m.mood - 1, 0, 100); }
      if (inT < 0) rest -= 10;
      if (inT < -15) rest -= 12;
      m.energy = U.clamp(m.energy + rest, 0, 100);
      drain(m, 9, 13, 0);
    });
    if (floor && S.day > 3) rep.warn.push(`${floor} 人只能打地铺`);
    Sim.autoSupply();
    order.forEach((m) => { const c = needDamage(m, rep.warn); if (c) rep.deaths.push([m, c]); });
    rep.deaths.forEach(([m, c]) => Sim.kill(m, c));
    return rep;
  };

  // 新的一天（晨报）
  Sim.newDay = function () {
    const S = G.S; const rep = { day: S.day + 1, lines: [], warn: [], good: [] };
    S.day++; S.slot = -1;
    S.env.fireOut = false;
    Sim.computeEnv(true);
    // 末日降临
    if (S.day >= 15 && S.phase !== 'apoc') Sim.apocalypse(rep);
    // 壁炉燃料
    const fires = G.furnOf('壁炉');
    if (fires.length && S.fireOn && S.env.outT < 12) {
      const need = fires.slice(0, 2).length * DS.FURNITURE.壁炉.fuel;
      let have = G.qty('木柴'), wood = G.qty('木头');
      if (have >= need) { G.removeItem('木柴', need); rep.lines.push(`壁炉烧掉 ${need} 木柴`); }
      else if (have + wood * 2 >= need) { const w = Math.ceil((need - have) / 2); G.removeItem('木柴', have); G.removeItem('木头', w); rep.lines.push(`木柴不够，劈了 ${w} 根木头烧火`); }
      else { S.env.fireOut = true; rep.warn.push('燃料耗尽，壁炉熄灭了！'); }
      Sim.refreshEnv();
    }
    const inT = S.env.inT, inRad = S.env.inRad;
    // 天气对完整度
    if (S.weather.type === '狂风' && S.phase === 'apoc') { const d = U.ri(1, 3); S.house.integrity = Math.max(0, S.house.integrity - d); rep.lines.push(`狂风刮了一夜，完整度 -${d}%`); }
    if (S.weather.type === '暴雪' && S.phase === 'apoc' && U.chance(0.5)) { S.house.integrity = Math.max(0, S.house.integrity - 1); rep.lines.push('积雪压得房梁咯吱作响，完整度 -1%'); }
    const rep2 = Math.round(G.teamSkill('修缮专家')) + (S.phase === 'apoc' && S.house.type !== '旧公寓' ? 1 : 0);
    if (rep2 && S.house.integrity < 100) { S.house.integrity = Math.min(100, S.house.integrity + rep2); rep.good.push(`修缮完整度 +${rep2}%`); }
    // 成员
    const comfort = G.hstat('comfort');
    const sickK = 1 - G.teamSkill('白衣天使');
    const sleepingBags = G.qty('羽绒睡袋');
    const cheer = Math.round(G.teamSkill('乐天派')) + (G.hasFurn('马桶') ? 1 : 0);
    const dead = [];
    G.home().forEach((m, idx) => {
      const mx = G.maxHp(m); const sts = Object.keys(m.statuses);
      // 伤病发展
      sts.forEach((s) => {
        const st = DS.STATUS[s]; const o = m.statuses[s];
        if (!o) return;
        o.age++;
        if (st.hpd) m.hp -= Math.round(mx * st.hpd);
        if (st.death && U.chance(st.death * (1 - G.teamSkill('药物专精') * 0.5))) { if (s === '濒死' && o.age < 2) return; dead.push([m, 'status:' + s]); return; }
        if (st.next[1] && U.chance(st.next[0] * sickK)) { delete m.statuses[s]; Sim.addStatus(m, st.next[1]); rep.warn.push(`${m.name}的${s}恶化成了${st.next[1]}`); return; }
        if (o.days > 0) { o.days--; if (o.days <= 0) { delete m.statuses[s]; rep.good.push(`${m.name}的${s}自愈了`); } }
      });
      if (m.statuses.濒死 && m.statuses.濒死.age >= 4 && !dead.find((d) => d[0] === m)) dead.push([m, 'status:濒死']);
      // 温暖时失温自愈
      if (m.statuses.失温 && inT >= 5) { delete m.statuses.失温; rep.good.push(`${m.name}在暖和的屋里缓过来了`); }
      // 寒冷
      const cr = G.coldResist(m) + (idx < sleepingBags ? 0.25 : 0);
      if (S.day >= 11) {
        if (inT < 10 && U.chance((inT < 0 ? 0.14 : 0.07) * (1 - cr) * sickK)) { if (Sim.addStatus(m, '感冒')) rep.warn.push(`${m.name}着凉感冒了`); }
        if (inT < -5 && U.chance((inT < -20 ? 0.45 : 0.15) * (1 - cr))) { if (Sim.addStatus(m, '失温')) rep.warn.push(`${m.name}出现了失温症状`); }
        if (inT < -25) { m.hp -= Math.round(mx * 0.1 * (1 - cr)); }
      }
      // 辐射
      if (inRad >= 30) {
        const rr = G.radResist(m);
        const p = ((inRad - 30) / 160) * (1 - rr) * sickK;
        if (inRad >= 75 && U.chance(p * 0.5)) { if (Sim.addStatus(m, '重度辐射')) rep.warn.push(`${m.name}出现了严重的辐射病症状`); }
        else if (U.chance(p)) { if (Sim.addStatus(m, '轻度辐射')) rep.warn.push(`${m.name}开始头晕乏力——辐射病`); }
      }
      // 自然恢复
      const injured = Object.keys(m.statuses).some((s) => DS.STATUS[s].hpd > 0);
      if (!injured && m.hunger > 30 && m.thirst > 30 && !m.statuses.濒死) m.hp = Math.min(mx, m.hp + Math.round(mx * 0.08));
      // 心情
      let d = 0;
      d += m.hunger >= 80 ? 2 : m.hunger >= 55 ? 1 : m.hunger < 10 ? -8 : m.hunger < 30 ? -4 : 0;
      d += m.thirst >= 80 ? 2 : m.thirst >= 55 ? 1 : m.thirst < 10 ? -8 : m.thirst < 30 ? -4 : 0;
      if (m.hp < mx * 0.3) d -= 4;
      d -= Math.min(8, Object.keys(m.statuses).length * 2);
      if (S.day >= 11) { if (inT < -10) d -= 4; else if (inT < 0) d -= 3; else if (inT < 8) d -= 1; else if (inT >= 15) d += 1; }
      d += Math.floor(comfort / 25);
      d += cheer;
      if (S.house.type === '地下堡垒' && comfort < 50) d -= 2;
      if (S.house.type === '烂尾楼' && comfort < 20) d -= 1;
      if (m.id === 'me' && G.S.members.length === 1 && S.day > 20) d -= 1;
      d += U.ri(-1, 1);
      m.mood = U.clamp(m.mood + d, 0, 100);
      if (m.hp <= 0 && !dead.find((x) => x[0] === m)) dead.push([m, 'status:' + (Object.keys(m.statuses)[0] || '伤病')]);
    });
    dead.forEach(([m, c]) => { if (G.S.members.includes(m)) { Sim.kill(m, c); rep.warn.push(`${m.name}没能熬过这一夜……`); } });
    if (S.ending) return rep;
    // 离队
    G.S.members.slice(1).forEach((m) => {
      if (m.mood < 12 && !m.story && U.chance(0.3)) {
        const food = Object.keys(S.inv).filter((n) => DS.ITEMS[n].cat === '食物');
        let taken = [];
        food.slice(0, 2).forEach((n) => { const k = G.removeItem(n, U.ri(1, 3)); if (k) taken.push(n + '×' + k); });
        Sim.removeMember(m);
        rep.warn.push(`${m.name}心灰意冷，趁夜离开了${taken.length ? '，还带走了' + taken.join('、') : ''}`);
      }
    });
    // 收音机被动
    if (G.hasFurn('收音机') && U.chance(0.25)) { Sim.gainIntel(1); rep.good.push('收音机里断断续续的广播：情报 +1'); }
    // 集市刷新
    if (S.phase === 'apoc') Sim.refreshMarket();
    // 气泡
    DS.Events.spawnBubbles();
    // 心情 / 完整度 结局
    if (G.me().mood <= 0) { S.breakdown = (S.breakdown || 0) + 1; if (S.breakdown >= 2) Sim.ending('精神崩溃'); else rep.warn.push('你的精神已经到了崩溃边缘！再这样下去就撑不住了——吃点好的、泡个澡、看看电影，或者和同伴说说话。'); }
    else { S.breakdown = 0; if (G.me().mood < 15) rep.warn.push('你的心情很糟（' + G.me().mood + '）。心情归零会精神崩溃。'); }
    if (S.phase === 'apoc' && S.house.integrity < 10) { S.breach = (S.breach || 0) + 1; if (S.breach >= 2) Sim.ending('安全屋告破'); else rep.warn.push('安全屋的防线摇摇欲坠（完整度低于 10%）！今天之内必须修好，否则就守不住了。'); } else S.breach = 0;
    if (!S.ending && S.day >= 100 && !S.endless) Sim.checkFinal();
    // 新手提示
    if (S.day >= 10 && S.day <= 16 && !G.hasFurn('壁炉')) rep.warn.push('屋里没有壁炉！寒潮会把室温拉到零下——去【商店→家具城】买一个，再囤些木柴。');
    else if (S.day >= 11 && G.hasFurn('壁炉') && G.qty('木柴') + G.qty('木头') * 2 < 6) rep.warn.push(`燃料只够烧 ${Math.floor((G.qty('木柴') + G.qty('木头') * 2) / 2)} 天了，记得补充木柴/木头。`);
    if (S.day === 14) rep.warn.push('明天就是末日：水管会冻住、外卖不再送达。确认仓库里有足够的水和食物！');
    if (S.day === 19 && G.hstat('antirad') < 0.7) rep.warn.push('“蓝辉”辐射开始升高。防辐射改造不足的话，室内辐射会让人生病。');
    rep.inT = inT; rep.inRad = inRad;
    return rep;
  };

  Sim.apocalypse = function (rep) {
    const S = G.S; if (S.phase === 'apoc') return;
    S.phase = 'apoc';
    S.unlocked.market = true;
    if (S.house.type === '旧公寓' && S.money >= 3000000) { Sim.ending('末日首富'); return; }
    if (rep) rep.warn.push('末日降临。从今天起，钞票只是废纸，晶核才是硬通货。');
    G.log('末日降临。', 'story');
    if (S.money > 0) G.log(`账户里还剩 ${U.money(S.money)} 元，已经没有意义了。`, 'info');
  };

  // ---------------- 死亡 / 离队 ----------------
  Sim.removeMember = function (m) {
    const S = G.S; S.members = S.members.filter((x) => x !== m);
    S.bubbles = S.bubbles.filter((b) => b.anchor !== 'member:' + m.id);
    ['武器', '防具', '鞋子'].forEach((sl) => { if (m.gear[sl]) { G.addItem(m.gear[sl], 1, true); m.gear[sl] = null; } });
  };
  Sim.kill = function (m, cause) {
    const S = G.S;
    if (m.id === 'me') {
      let end = '死于疾病';
      if (cause === 'battle') end = '战斗死亡';
      else if (cause === 'starve' || cause === 'thirst' || cause === 'exhaust') end = '资源匮乏';
      else if (cause === 'status:失温' || cause === 'status:冻伤' || cause === 'cold') end = '冰封';
      S.deathCause = cause;
      Sim.ending(end);
      return;
    }
    Sim.removeMember(m);
    S.deadList.push(m.name);
    G.log(`${m.name}死了。`, 'bad');
    G.home().forEach((x) => (x.mood = U.clamp(x.mood - (m.story ? 12 : 7), 0, 100)));
  };

  // ---------------- 结局 ----------------
  Sim.ending = function (id) {
    const S = G.S; if (S.ending) return;
    const E = DS.ENDINGS.find((e) => e.id === id) || DS.ENDINGS[0];
    S.ending = E.id;
    const first = !G.meta.endings[E.id];
    G.meta.endings[E.id] = (G.meta.endings[E.id] || 0) + 1;
    const pts = E.pts + (first ? E.pts : 0) + Math.floor(S.day / 20);
    G.meta.points += pts;
    G.meta.runs++;
    G.meta.best = Math.max(G.meta.best || 0, S.day);
    S.endingInfo = { id: E.id, pts, first, day: S.day };
    G.saveMeta();
    G.clearSave();
  };
  Sim.checkFinal = function () {
    const S = G.S; const t = S.house.type; const md = S.house.mods;
    let id = '苟活';
    if (S.flags.军方联络) id = '官方据点';
    else if (t === '地下堡垒') id = '地下安居';
    else if (t === '小区民房' && S.flags.互助会) id = '社区共生';
    else if (t === '独栋别墅' && S.members.length >= 5) id = '雪中暖巢';
    else if (t === '烂尾楼' && md.保温 >= 3 && md.防辐射 >= 3 && md.防御 >= 3) id = '钢铁丛林';
    Sim.ending(id);
  };

  // ---------------- 集市 ----------------
  Sim.refreshMarket = function () {
    const S = G.S;
    if (S.market && S.market.day === S.day) return;
    const tier = S.day < 35 ? 1 : S.day < 65 ? 2 : 3;
    const pools = ['食物', '食物', '食材', '材料', '材料', '医疗', '医疗', '百货'];
    const offers = [];
    const used = new Set();
    for (let i = 0; i < 9; i++) {
      const cat = U.pick(pools);
      const list = Object.values(DS.ITEMS).filter((it) => it.cat === cat && it.cprice > 0);
      const it = U.pick(list); if (!it || used.has(it.name)) continue; used.add(it.name);
      offers.push({ item: it.name, price: Math.round(it.cprice * U.rf(0.9, 1.35)), qty: it.vol >= 4 ? U.ri(2, 5) : U.ri(4, 12) });
    }
    // 装备
    const gearPool = ['武器', '防具', '鞋子'].map((c) => c + U.ri(1, tier));
    for (let i = 0; i < 2; i++) { const name = U.pick(DS.LOOT_POOLS[U.pick(gearPool)]); if (!used.has(name)) { used.add(name); offers.push({ item: name, price: Math.round(DS.ITEMS[name].cprice * U.rf(1, 1.3)), qty: 1 }); } }
    S.market = { day: S.day, offers };
  };
  Sim.sellPrice = (name) => Math.max(1, Math.round((DS.ITEMS[name].cprice || DS.ITEMS[name].price / 50 || 10) * 0.4));
  Sim.discount = () => 1 - G.teamSkill('精打细算');
})();
