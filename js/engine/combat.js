/* 回合制战斗 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G;
  const C = (DS.Combat = {});

  function allyUnit(m, team) {
    const w = G.gearOf(m, '武器'); const sh = G.gearOf(m, '鞋子');
    const mul = G.statMul(m);
    const wAtk = w ? w.atk * 3 * (1 + G.teamSkill('改装达人', team)) : 0;
    const atk = (6 + G.stat(m, '力量') * 1.4 + G.stat(m, '灵巧') * 0.6 + wAtk + m.lv * 1.5) * (m.statuses.濒死 ? 0.2 : 1);
    return {
      uid: m.id, m, side: 'a', name: m.name, hp: Math.max(1, m.hp), maxHp: G.maxHp(m),
      atk: atk * (1 + G.skillVal(m, '拳王')),
      def: G.stat(m, '防御') + m.lv * 0.5,
      spd: (G.stat(m, '速度') + G.stat(m, '灵巧') * 0.4) * (1 + G.teamSkill('效率优化', team)) * mul,
      crit: 0.05 + G.stat(m, '灵巧') * 0.004 + G.stat(m, '运气') * 0.003 + G.skillVal(m, '致命'),
      dodge: Math.min(0.4, 0.03 + G.stat(m, '灵巧') * 0.003 + (sh && sh.dodge ? sh.dodge : 0)),
      trait: w ? w.trait || {} : {}, weapon: w ? w.name : null,
      twice: G.skillVal(m, '偷袭'), stunP: G.skillVal(m, '猛击'), exec: G.skillVal(m, '狙击手'),
      st: {}, alive: true, dmgTaken: 0,
    };
  }
  function foeUnit(type, lv, idx) {
    const B = DS.ENEMIES[type]; const k = 1 + B.grow * (lv - 1);
    return {
      uid: 'f' + idx, side: 'f', type, name: type, icon: B.icon, lv, boss: !!B.boss,
      hp: Math.round(B.hp * k), maxHp: Math.round(B.hp * k), atk: B.atk * (1 + B.grow * 0.8 * (lv - 1)), def: B.def * (1 + 0.5 * (k - 1)),
      spd: B.spd * (1 + 0.25 * (k - 1)), crit: B.crit, dodge: 0.03, poison: B.poison || 0, bleed: B.bleed || 0, rad: !!B.rad,
      drop: B.drop, trait: {}, st: {}, alive: true,
    };
  }

  // opts: { lvBase, ctx:'home'|'explore'|'event', ram, team }
  C.create = function (tplId, members, opts) {
    opts = opts || {};
    const S = G.S;
    let T, foes;
    if (typeof tplId === 'object') { T = tplId; foes = T.foes.map(([type, lv], i) => foeUnit(type, lv, i)); tplId = 'custom'; }
    else {
      T = DS.BATTLES[tplId] || DS.BATTLES.dog;
      const base = T.fixedLv || opts.lvBase || G.threat();
      foes = T.foes.map(([type, off], i) => foeUnit(type, Math.max(1, base + off + (T.fixedLv || G.S.day < 30 ? 0 : U.ri(0, 1))), i));
    }
    const team = members.slice(0, 5);
    const allies = team.map((m) => allyUnit(m, team));
    // 光环
    const auraDef = G.teamSkill('不怒自威', team), auraAtk = G.teamSkill('强效镇静', team);
    foes.forEach((f) => { f.def *= 1 - auraDef; f.atk *= 1 - auraAtk; });
    const b = { tpl: tplId, name: T.name, allies, foes, round: 0, order: [], ptr: 0, over: false, win: null, log: [], focus: null, items: 0, opts, adren: false, boss: foes.some((f) => f.boss) };
    // 战斗压制
    if (S.perks.includes('suppress')) foes.forEach((f) => (f.hp = Math.ceil(f.hp / 2)));
    // 防御工事
    if (opts.ctx === 'home') {
      const k = Math.min(0.4, G.hstat('def') / 250);
      if (k > 0.02) { foes.forEach((f) => (f.hp = Math.max(1, Math.round(f.hp * (1 - k))))); b.log.push({ t: `防御工事让来犯者吃了苦头（敌人生命 -${Math.round(k * 100)}%）` }); }
    }
    // 载具冲撞
    if (opts.ram && Math.random() < opts.ram) {
      const n = Math.min(foes.length, opts.ramN || 1);
      U.shuffle(foes).slice(0, n).forEach((f) => { const d = Math.round(f.maxHp * 0.2); f.hp = Math.max(1, f.hp - d); });
      b.log.push({ t: `开车冲撞！${n} 个敌人受到重创` });
    }
    return b;
  };

  function alive(list) { return list.filter((u) => u.alive); }
  function newRound(b) {
    b.round++;
    const all = alive(b.allies).concat(alive(b.foes));
    b.order = all.map((u) => ({ u, k: u.spd * U.rf(0.85, 1.15) * (u.st.slow ? 0.8 : 1) })).sort((a, b2) => b2.k - a.k).map((x) => x.u);
    b.ptr = 0;
  }
  function dealDamage(b, att, tgt, mult, rec) {
    if (!tgt.alive) return 0;
    if (Math.random() < tgt.dodge * (tgt.st.stun ? 0 : 1)) { rec.hits.push({ uid: tgt.uid, miss: true }); return 0; }
    let raw = att.atk * U.rf(0.85, 1.15) * (mult || 1);
    const def = tgt.def * (tgt.st.ab ? 0.75 : 1);
    let dmg = raw * 50 / (50 + def);
    if (tgt.st.ab) dmg *= 1.2;
    let crit = false;
    if (Math.random() < att.crit) { crit = true; dmg *= 1.6; }
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp -= dmg; tgt.dmgTaken = (tgt.dmgTaken || 0) + dmg;
    rec.hits.push({ uid: tgt.uid, dmg, crit });
    if (tgt.hp <= 0) kill(b, tgt, rec);
    return dmg;
  }
  function kill(b, u, rec) {
    if (u.side === 'a' && u.m && u.m.id === 'me' && !b.adren && G.qty('肾上腺素') > 0) {
      G.removeItem('肾上腺素', 1); b.adren = true;
      u.hp = Math.round(u.maxHp * 0.35);
      rec.notes.push('一针肾上腺素扎进大腿——你又站了起来！');
      return;
    }
    u.hp = 0; u.alive = false;
    rec.notes.push(`${u.name}倒下了`);
    if (u.side === 'f') G.S.kills++;
  }

  // 执行一个单位的行动，返回动作记录供界面播放
  C.step = function (b) {
    if (b.over) return null;
    if (!b.order.length || b.ptr >= b.order.length) newRound(b);
    let u = b.order[b.ptr++];
    while (u && !u.alive) { if (b.ptr >= b.order.length) { newRound(b); } u = b.order[b.ptr++]; }
    if (!u) return null;
    const rec = { actor: u.uid, side: u.side, hits: [], notes: [], text: '' };
    // 持续伤害
    if (u.st.poison) { const d = Math.max(1, Math.round(u.maxHp * 0.05)); u.hp -= d; rec.hits.push({ uid: u.uid, dmg: d, dot: '毒' }); if (u.hp <= 0) { kill(b, u, rec); checkOver(b); return finishRec(b, rec, `${u.name}毒发倒地`); } }
    if (u.st.bleed) { const d = Math.max(1, Math.round(u.maxHp * 0.04)); u.hp -= d; rec.hits.push({ uid: u.uid, dmg: d, dot: '血' }); u.st.bleed--; if (u.hp <= 0) { kill(b, u, rec); checkOver(b); return finishRec(b, rec, `${u.name}失血倒地`); } }
    if (u.st.stun) { u.st.stun--; return finishRec(b, rec, `${u.name}晕头转向，无法行动`); }
    if (u.st.knock) { u.st.knock = 0; return finishRec(b, rec, `${u.name}被击退，错过了这次行动`); }
    const enemies = alive(u.side === 'a' ? b.foes : b.allies);
    if (!enemies.length) { checkOver(b); return finishRec(b, rec, ''); }
    let tgt;
    if (u.side === 'a') {
      tgt = b.focus && enemies.find((e) => e.uid === b.focus) || enemies.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    } else {
      tgt = U.wpick(enemies, (e) => 1 + (1 - e.hp / e.maxHp) * 0.8);
    }
    const tr = u.trait || {};
    let mult = 1; let txt = `${u.name}${u.side === 'a' ? (u.weapon ? '挥动' + u.weapon : '出拳') : '扑向'}${tgt.name}`;
    // 处决
    const execP = Math.max(u.exec || 0, tr.execute || 0);
    if (execP && tgt.hp / tgt.maxHp < 0.25 && Math.random() < execP && !tgt.boss) {
      rec.hits.push({ uid: tgt.uid, dmg: tgt.hp, crit: true }); tgt.hp = 0; kill(b, tgt, rec);
      checkOver(b); return finishRec(b, rec, `${u.name}一击毙命${tgt.name}！`);
    }
    if (tr.double && Math.random() < tr.double) { mult = 2; txt += '（双倍伤害）'; }
    const d = dealDamage(b, u, tgt, mult, rec);
    if (d > 0) {
      if ((tr.stun && Math.random() < tr.stun) || (u.stunP && Math.random() < u.stunP)) { tgt.st.stun = 1; rec.notes.push(`${tgt.name}被击晕`); }
      if (tr.armorBreak && Math.random() < tr.armorBreak) { tgt.st.ab = 1; rec.notes.push(`${tgt.name}破甲`); }
      if (tr.knock && Math.random() < tr.knock) { tgt.st.knock = 1; rec.notes.push(`${tgt.name}被击退`); }
      if (u.side === 'f') {
        if (u.poison && Math.random() < u.poison) { tgt.st.poison = 1; tgt.poisoned = true; rec.notes.push(`${tgt.name}中毒了`); }
        if (u.bleed && Math.random() < u.bleed) { tgt.st.bleed = 3; tgt.bled = true; rec.notes.push(`${tgt.name}开始流血`); }
        if (u.rad) tgt.radHit = true;
      }
    }
    const others = alive(u.side === 'a' ? b.foes : b.allies).filter((e) => e !== tgt);
    if (others.length) {
      if ((tr.bounce && Math.random() < tr.bounce) || (tr.splash && Math.random() < tr.splash)) { const o = U.pick(others); dealDamage(b, u, o, 0.5, rec); rec.notes.push('波及' + o.name); }
      if (tr.sweep && Math.random() < tr.sweep) { others.forEach((o) => dealDamage(b, u, o, 0.4, rec)); rec.notes.push('火力扫射！'); }
    }
    const again = Math.max(u.twice || 0, tr.twice || 0);
    if (again && Math.random() < again) { const t2 = alive(u.side === 'a' ? b.foes : b.allies); if (t2.length) { dealDamage(b, u, U.pick(t2), 0.8, rec); rec.notes.push('连击！'); } }
    checkOver(b);
    return finishRec(b, rec, txt);
  };
  function finishRec(b, rec, text) { rec.text = text; b.log.push(rec); if (b.log.length > 60) b.log.shift(); return rec; }
  function checkOver(b) {
    if (!alive(b.foes).length) { b.over = true; b.win = true; }
    else if (!alive(b.allies).length) { b.over = true; b.win = false; }
  }
  C.resolveAll = function (b) { let n = 0; while (!b.over && n++ < 600) C.step(b); if (!b.over) { b.over = true; b.win = false; } };

  C.retreat = function (b) {
    const as = alive(b.allies), fs = alive(b.foes);
    const avg = (l) => l.reduce((s, u) => s + u.spd, 0) / Math.max(1, l.length);
    let p = U.clamp(0.45 + (avg(as) - avg(fs)) * 0.025, 0.15, 0.85);
    if (b.boss) p = Math.min(p, 0.3);
    if (Math.random() < p) { b.over = true; b.win = false; b.fled = true; return { ok: true }; }
    // 失败：敌人各打一下
    const rec = { actor: null, side: 'f', hits: [], notes: ['撤退失败！'], text: '撤退失败，敌人趁机追击' };
    fs.forEach((f) => { const t = alive(b.allies); if (t.length) dealDamage(b, f, U.pick(t), 1, rec); });
    checkOver(b); b.log.push(rec);
    return { ok: false, rec };
  };

  C.useItem = function (b, uid, name) {
    const u = b.allies.find((x) => x.uid === uid); if (!u || !u.alive) return null;
    if (b.items >= 3) return '每场战斗最多使用 3 次道具';
    const it = DS.ITEMS[name]; if (!it || !G.qty(name)) return '没有' + name;
    const e = it.eat || {};
    if (e.hp) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * e.hp * (1 + G.teamSkill('药物专精'))));
    if (it.cure) { if (it.cure.includes('*') || it.cure.includes('中毒')) u.st.poison = 0; if (it.cure.includes('*') || it.cure.includes('流血')) u.st.bleed = 0; }
    G.removeItem(name, 1); b.items++;
    b.log.push({ actor: uid, side: 'a', hits: [{ uid, heal: true }], notes: [], text: `${u.name}使用了${name}` });
    return null;
  };

  // 战斗结算：把战果写回成员与仓库
  C.finish = function (b, opts) {
    opts = opts || {};
    const S = G.S; const out = { win: b.win, fled: !!b.fled, crystal: 0, loot: {}, exp: {}, ups: [], hurt: [], down: [], meDead: false };
    const team = b.allies.map((u) => u.m);
    S.battles++;
    b.allies.forEach((u) => {
      const m = u.m; if (!G.S.members.includes(m)) return;
      m.hp = Math.max(0, Math.round(u.hp));
      m.energy = U.clamp(m.energy - 8, 0, 100); m.hunger = U.clamp(m.hunger - 3, 0, 100); m.thirst = U.clamp(m.thirst - 3, 0, 100);
      m.battles = (m.battles || 0) + 1;
      if (!u.alive) {
        if (m.id === 'me') {
          if (b.win) { m.hp = 1; DS.Sim.addStatus(m, '重伤'); out.down.push(m.name + '（被同伴拖了回来）'); return; }
          out.meDead = true; return;
        }
        m.hp = 1; DS.Sim.addStatus(m, '濒死'); out.down.push(m.name);
        return;
      }
      const mx = u.maxHp;
      if (u.hp < mx * 0.25 && Math.random() < 0.4) { if (DS.Sim.addStatus(m, '重伤')) out.hurt.push(`${m.name}重伤`); }
      else if (u.dmgTaken > mx * 0.3 && Math.random() < 0.3) { if (DS.Sim.addStatus(m, '轻伤')) out.hurt.push(`${m.name}轻伤`); }
      if (u.poisoned && Math.random() < 0.5) { if (DS.Sim.addStatus(m, '中毒')) out.hurt.push(`${m.name}中毒`); }
      if (u.bled && Math.random() < 0.3) { if (DS.Sim.addStatus(m, '流血')) out.hurt.push(`${m.name}流血`); }
      if (u.radHit && Math.random() < 0.2) { if (DS.Sim.addStatus(m, '轻度辐射')) out.hurt.push(`${m.name}受到辐射`); }
    });
    if (out.meDead) return out;
    if (b.win) {
      const exK = opts.explore ? 1 + G.teamSkill('搜寻晶核', team) : 1;
      b.foes.forEach((f) => {
        const d = f.drop || {};
        if (d.crystal) out.crystal += Math.round(U.ri(d.crystal[0], d.crystal[1]) * (1 + (f.lv - 1) * 0.08) * exK);
        if (d.meat) out.loot.变异肉 = (out.loot.变异肉 || 0) + U.ri(1, d.meat);
        if (d.loot && Math.random() < d.loot) { const cat = U.pick(['食物', '食物', '医疗', '材料']); const n = U.pick(DS.LOOT_POOLS[cat].slice(0, 6)); out.loot[n] = (out.loot[n] || 0) + U.ri(1, 2); }
      });
      if (S.perks.includes('loot')) { const cat = U.pick(['食物', '医疗', '材料']); const n = U.pick(DS.LOOT_POOLS[cat]); out.loot[n] = (out.loot[n] || 0) + 1; }
      if (S.phase !== 'apoc') out.crystal = 0;
      const exp = b.foes.reduce((s, f) => s + f.lv * (f.boss ? 45 : 12), 0);
      const live = b.allies.filter((u) => u.alive);
      live.forEach((u) => { const g = Math.round(exp / Math.max(1, live.length) * 1.2); out.exp[u.m.name] = g; const ups = G.gainExp(u.m, g); if (ups.length) out.ups.push(`${u.m.name} 升到 ${u.m.lv} 级`); });
      // 战地急救
      const heal = G.teamSkill('战地急救', team);
      if (heal) live.forEach((u) => (u.m.hp = Math.min(G.maxHp(u.m), u.m.hp + Math.round(G.maxHp(u.m) * heal))));
      S.crystal += out.crystal;
      Object.keys(out.loot).forEach((k) => { const got = opts.explore ? DS.Events.bagAdd(opts.explore, k, out.loot[k]) : G.addItem(k, out.loot[k]); out.loot[k] = got; if (!got) delete out.loot[k]; });
    }
    // 重生系统
    const me = G.me();
    if (team.includes(me)) {
      S.meBattles = (S.meBattles || 0) + 1;
      if (S.meBattles % 5 === 0) {
        if (S.perks.includes('battle')) { G.levelUp(me); out.ups.push(`战斗爽！${me.name} 升到 ${me.lv} 级`); }
        if (S.perks.includes('strong')) { me.stats.力量 += 3; out.ups.push('力大无穷：力量 +3'); }
      }
    }
    if (!b.win && opts.home) {
      const loss = Math.round(U.ri(12, 22) * (1 - G.teamSkill('守夜人')));
      S.house.integrity = Math.max(0, S.house.integrity - loss); out.integrity = -loss;
      const foods = Object.keys(S.inv).filter((n) => ['食物', '医疗'].includes(DS.ITEMS[n].cat));
      out.lost = [];
      U.shuffle(foods).slice(0, 3).forEach((n) => { const k = G.removeItem(n, Math.ceil(G.qty(n) * 0.25)); if (k) out.lost.push(`${n}×${k}`); });
    }
    return out;
  };
})();
