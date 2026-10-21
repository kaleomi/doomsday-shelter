/* 夜袭守卫战：布防站位、陷阱、分波次战斗 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art, C = DS.Combat;
  const D = (DS.Defense = {});
  const POS = ['正门', '窗口', '屋顶', '后备'];
  const CAP = { 正门: 2, 窗口: 2, 屋顶: 1, 后备: 99 };
  const TRAPS = ['尖刺陷阱', '燃烧瓶', '绊线雷'];

  // 把战斗模板拆成 2–3 波
  D.plan = function (tpl) {
    const T = DS.BATTLES[tpl] || DS.BATTLES.raiders;
    const base = T.fixedLv || G.threat();
    const foes = T.foes.map(([t, off]) => [t, Math.max(1, base + off)]);
    const waves = [];
    if (foes.length >= 3) {
      const k = Math.ceil(foes.length / 2);
      waves.push(foes.slice(0, k));
      const w2 = foes.slice(k); w2.push([foes[0][0], Math.max(1, foes[0][1] - 1)]);
      waves.push(w2);
    } else {
      waves.push(foes);
      const last = foes[foes.length - 1];
      waves.push([[last[0], Math.max(1, last[1] - 1)]]);
    }
    let leaderWave = -1;
    if (G.threat() >= 8) {
      const strongest = foes.slice().sort((a, b) => DS.ENEMIES[b[0]].hp - DS.ENEMIES[a[0]].hp)[0];
      waves.push([[strongest[0], strongest[1] + 1]]);
      leaderWave = waves.length - 1;
    }
    return { name: T.name, waves, leaderWave };
  };

  D.fighterPool = () => G.home().filter((m) => !m.statuses.濒死);
  // 自动站位：防御高的守门，远程武器守窗，暴击高的上屋顶
  D.autoPos = function (list) {
    const pos = {}; const cnt = { 正门: 0, 窗口: 0, 屋顶: 0 };
    const put = (m, p) => { pos[m.id] = p; cnt[p] = (cnt[p] || 0) + 1; };
    const sorted = list.slice().sort((a, b) => G.power(b) - G.power(a));
    const fighters = sorted.slice(0, 5); sorted.slice(5).forEach((m) => (pos[m.id] = '后备'));
    const ranged = fighters.filter((m) => C.isRanged(G.gearOf(m, '武器')));
    ranged.forEach((m) => { if (cnt.窗口 < CAP.窗口) put(m, '窗口'); });
    fighters.filter((m) => !pos[m.id]).sort((a, b) => (G.stat(b, '防御') + G.maxHp(b) / 20) - (G.stat(a, '防御') + G.maxHp(a) / 20)).forEach((m) => {
      if (cnt.正门 < CAP.正门) put(m, '正门');
      else if (cnt.屋顶 < CAP.屋顶) put(m, '屋顶');
      else if (cnt.窗口 < CAP.窗口) put(m, '窗口');
      else pos[m.id] = '后备';
    });
    return pos;
  };
  D.warning = () => {
    const S = G.S; const w = [];
    if (S.pet && DS.Pet.canFight()) w.push(`🐕 ${S.pet.name}狂吠示警`);
    if (G.hasFurn('监控警报') && !DS.Disaster.devicesOff()) w.push('📹 监控提前拍到了来人');
    if (DS.Disaster.hit('冰雾') && S.disaster.prepared) w.push('🧨 绊线警报响了');
    return w;
  };
  function applyTraps(b, traps, wave) {
    const notes = [];
    const alive = () => b.foes.filter((f) => f.alive);
    TRAPS.forEach((t) => {
      const n = traps[t] || 0; if (wave >= n) return;
      if (!G.qty(t)) return;
      G.removeItem(t, 1);
      const it = DS.ITEMS[t].trap;
      if (it.kind === 'spike') { const f = U.pick(alive()); if (f) { const d = Math.round(f.maxHp * it.v); f.hp = Math.max(1, f.hp - d); notes.push(`${f.name}踩中了尖刺陷阱（-${d}）`); } }
      if (it.kind === 'fire') { alive().forEach((f) => { f.hp = Math.max(1, f.hp - Math.round(f.maxHp * it.v)); }); notes.push('燃烧瓶在来犯者脚下炸开，火舌卷过一片'); }
      if (it.kind === 'stun') { U.shuffle(alive()).slice(0, it.v).forEach((f) => (f.st.stun = 1)); notes.push('绊线雷炸响，有人被震得晕头转向'); }
    });
    return notes;
  }

  // 核心流程（生成器）：每一波 yield 战斗对象，由调用方打完再继续
  function* core(tpl, plan) {
    const S = G.S; const P = D.plan(tpl);
    const fighters = plan.fighters;
    const master = {}; const allFoes = [];
    let win = true, fled = false, waveWon = 0;
    for (let i = 0; i < P.waves.length; i++) {
      const alive = fighters.filter((m) => S.members.includes(m) && (!master[m.id] || master[m.id].alive));
      if (!alive.length) { win = false; break; }
      const b = C.create({ name: `${P.name}`, foes: P.waves[i] }, alive, { ctx: 'home', pos: plan.pos, wave: i + 1, pet: !(master.pet && !master.pet.alive) });
      b.foes.forEach((f, j) => (f.uid = 'w' + i + 'f' + j));
      if (i === P.leaderWave) b.foes.forEach((f) => { f.name = '头目·' + f.type; f.maxHp = Math.round(f.maxHp * 1.3); f.hp = f.maxHp; f.atk *= 1.1; });
      if (i === 0 && plan.warn) { b.foes.forEach((f) => (f.st.knock = 1)); b.log.push({ t: '提前发现了来人：敌人第一轮来不及动手' }); }
      applyTraps(b, plan.traps || {}, i).forEach((t) => b.log.push({ t }));
      b.wave = i; b.waves = P.waves.length;
      yield b;
      b.allies.forEach((u) => { master[u.uid] = u; if (u.m) u.m.hp = Math.max(1, Math.round(u.hp)); if (u.pet && S.pet && u.alive) S.pet.hp = Math.round(u.hp); });
      allFoes.push(...b.foes);
      if (!b.win) { win = false; fled = !!b.fled; break; }
      waveWon++;
      // 喘口气：回复 10%，清除持续伤害
      b.allies.forEach((u) => { if (!u.alive) return; u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.1)); if (u.m) u.m.hp = Math.round(u.hp); if (u.pet && S.pet) S.pet.hp = Math.round(u.hp); });
    }
    const fb = { allies: Object.values(master), foes: allFoes, win, fled, boss: allFoes.some((f) => f.boss), log: [] };
    const out = C.finish(fb, { home: true, defense: true });
    out.waves = waveWon; out.total = P.waves.length;
    if (win && !out.meDead) {
      const bonus = S.phase === 'apoc' ? Math.round(G.threat() * 20 * waveWon * DS.Ext.k('crystal')) : 0;
      S.crystal += bonus; out.crystal += bonus;
      S.guardWins = (S.guardWins || 0) + 1;
      if (S.guardWins >= 5) DS.Ach.unlock('guard5');
    }
    return out;
  }
  D.execute = async function (tpl, plan, playWave) {
    const it = core(tpl, plan); let r = it.next();
    while (!r.done) { await playWave(r.value, r.value.wave, r.value.waves); r = it.next(); }
    return r.value;
  };
  D.executeSync = function (tpl, plan, playWave) {
    const it = core(tpl, plan); let r = it.next();
    while (!r.done) { playWave(r.value); r = it.next(); }
    return r.value;
  };

  // 不打直接认输
  D.surrender = function () { return C.finish({ allies: [], foes: [], win: false, fled: true, log: [] }, { home: true }); };

  // 无界面结算（自动测试用）：play(b) 同步打完一波
  D.headless = function (tpl, play) {
    const list = D.fighterPool();
    if (!list.length) return D.surrender();
    const pos = D.autoPos(list);
    const traps = {}; TRAPS.forEach((t) => (traps[t] = Math.min(1, G.qty(t))));
    const fighters = list.filter((m) => pos[m.id] !== '后备');
    return D.executeSync(tpl, { fighters, pos, traps, warn: D.warning().length > 0 }, play || ((b) => C.resolveAll(b)));
  };

  // ---------------- 界面 ----------------
  function setup(tpl) {
    const S = G.S; const P = D.plan(tpl);
    const list = D.fighterPool();
    const pos = D.autoPos(list);
    const traps = {}; TRAPS.forEach((t) => (traps[t] = Math.min(1, G.qty(t))));
    const body = h('div', { class: 'defense' });
    const warn = D.warning();
    function count(p) { return list.filter((m) => pos[m.id] === p).length; }
    function render() {
      U.clear(body);
      body.appendChild(h('div', { class: 'evtext', style: { marginBottom: '8px' } }, `夜里有人摸到了门外——${P.name}！听动静，他们分成了 ${P.waves.length} 拨。`));
      body.appendChild(h('div', { class: 'wave-row' }, P.waves.map((w, i) => h('div', { class: 'wave' + (i === P.leaderWave ? ' boss' : '') }, h('b', null, `第${i + 1}波`), w.map(([t, lv]) => h('span', null, `${DS.ENEMIES[t].icon}${i === P.leaderWave ? '头目·' : ''}${t} Lv${lv}`))))));
      if (warn.length) body.appendChild(h('div', { class: 'small ok', style: { margin: '6px 0' } }, warn.join('　') + '　→ 敌人第一轮无法行动'));
      body.appendChild(h('h3', { class: 'sec' }, '布防站位'));
      body.appendChild(h('div', { class: 'tiny muted', style: { marginBottom: '6px' } }, Object.keys(DS.DEF_POS).map((k) => `${DS.DEF_POS[k].icon}${k}：${DS.DEF_POS[k].desc}`).join('　') + '　后备：不参战'));
      list.forEach((m) => {
        body.appendChild(h('div', { class: 'li def-mem' },
          h('div', { style: { width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }),
          h('div', { class: 'grow' }, h('div', { class: 'nm' }, m.name, h('span', { class: 'tiny muted' }, `　战力 ${G.power(m)}`)), h('div', { class: 'ds' }, `❤ ${m.hp}/${G.maxHp(m)}${C.isRanged(G.gearOf(m, '武器')) ? '　🏹 远程' : ''}`)),
          h('div', { class: 'seg pos-seg' }, POS.map((p) => h('button', { class: pos[m.id] === p ? 'on' : '', onclick: () => {
            if (pos[m.id] === p) return;
            if (p !== '后备' && count(p) >= CAP[p]) { UI.toast(`${p}最多 ${CAP[p]} 人`); return; }
            if (p !== '后备' && list.filter((x) => pos[x.id] !== '后备').length >= 5 && pos[m.id] === '后备') { UI.toast('最多 5 人参战'); return; }
            pos[m.id] = p; DS.Audio.tap(); render();
          } }, p.slice(0, 1))))));
      });
      if (S.pet) body.appendChild(h('div', { class: 'small muted', style: { margin: '6px 0' } }, DS.Pet.canFight() ? `🐕 ${S.pet.name}会和你们一起守门` : `🐕 ${S.pet.name}还没恢复，这次让它躲在里屋`));
      body.appendChild(h('h3', { class: 'sec' }, '陷阱'));
      const any = TRAPS.some((t) => G.qty(t));
      if (!any) body.appendChild(h('div', { class: 'tiny muted' }, '没有陷阱。可以在工作台制造尖刺陷阱、燃烧瓶、绊线雷。'));
      TRAPS.forEach((t) => {
        if (!G.qty(t)) return;
        const max = Math.min(2, G.qty(t));
        body.appendChild(h('div', { class: 'li' }, A.item(t, { count: G.qty(t) }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, t), h('div', { class: 'ds' }, DS.ITEMS[t].desc.replace('守卫战：', '') + (traps[t] > 1 ? '（第二个用在第二波）' : ''))),
          h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { traps[t] = Math.max(0, traps[t] - 1); render(); } }, '−'), h('b', { style: { width: '18px', textAlign: 'center' } }, traps[t]), h('button', { class: 'btn small', onclick: () => { traps[t] = Math.min(max, traps[t] + 1); render(); } }, '+'))));
      });
    }
    render();
    return UI.modal({ title: '夜袭 · 守卫战', cat: '战斗', catColor: '#c0392b', body, buttons: [{ t: '躲进里屋', v: 'give' }, { t: '守住这里！', cls: 'primary', v: 'go' }] }).then((v) => {
      if (v !== 'go') return null;
      const fighters = list.filter((m) => pos[m.id] !== '后备');
      if (!fighters.length) return null;
      return { fighters, pos, traps, warn: warn.length > 0 };
    });
  }

  function summary(out) {
    const chips = [];
    if (out.crystal) chips.push({ icon: '💎', label: '晶核', v: out.crystal, good: true });
    Object.keys(out.loot || {}).forEach((k) => chips.push({ icon: k, label: k, v: out.loot[k], good: true }));
    Object.keys(out.exp || {}).forEach((k) => chips.push({ icon: '✨', label: k + ' 经验', v: out.exp[k], good: true }));
    (out.ups || []).forEach((t) => chips.push({ icon: '⬆️', label: t, v: '', good: true }));
    (out.hurt || []).forEach((t) => chips.push({ icon: '🩸', label: t, v: '', good: false }));
    (out.down || []).forEach((t) => chips.push({ icon: '💀', label: t + ' 濒死', v: '', good: false }));
    if (out.integrity) chips.push({ icon: '🧱', label: '完整度', v: out.integrity + '%', good: false });
    (out.lost || []).forEach((t) => chips.push({ icon: '📦', label: '被抢走 ' + t, v: '', good: false }));
    const txt = out.win ? `守住了！打退了全部 ${out.total} 波来犯者。` : out.waves ? `顶住了 ${out.waves} 波，最后还是没守住……` : '没能守住安全屋……';
    return UI.modal({ title: out.win ? '守卫成功' : '防线失守', cat: '守卫战', catColor: out.win ? '#2f8a4c' : '#a03030', body: h('div', null, h('div', { class: 'result-text' }, txt), UI.chipsRow(chips)) });
  }

  // 返回 { win, ... } 与 BattleUI.run 相同
  D.run = async function (tpl) {
    const S = G.S;
    if (!D.fighterPool().length) { const out = D.surrender(); await summary(out); return out; }
    const plan = await setup(tpl);
    if (!plan) { const out = D.surrender(); out.total = D.plan(tpl).waves.length; out.waves = 0; await summary(out); return out; }
    const out = await D.execute(tpl, plan, (b, i, n) => DS.BattleUI.run(null, { prebuilt: b, noFinish: true, noRetreat: true, title: `守卫战 · 第${i + 1}/${n}波`, intro: i === 0 ? '守住安全屋！点击敌人可以集火。' : `第 ${i + 1} 波来了！大家喘口气（回复 10% 生命）` }));
    if (out.meDead) { DS.Sim.kill(G.me(), 'battle'); return out; }
    if (S.ending) return out;
    await summary(out);
    return out;
  };
})();
