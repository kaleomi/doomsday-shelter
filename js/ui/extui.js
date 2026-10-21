/* 扩展界面：备战清单、一键安排、伙伴、远征、军械改装、电脑小游戏、自由布置、天灾防备、存档管理、每日挑战与排行榜、图鉴成就 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art;
  const X = (DS.ExtUI = {});
  const refresh = () => DS.Game && DS.Game.render && G.S && DS.Game.render();

  // ---------------- 备战清单 ----------------
  X.checklist = function () {
    UI.sheet({
      title: '📋 备战清单', sub: `距离末日还有 ${15 - G.S.day} 天`,
      render(body) {
        const items = DS.Checklist.items();
        body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px', lineHeight: 1.6 } }, '前世的记忆提醒你：这些东西，越早准备越好。'));
        const list = h('div', { class: 'list' });
        items.forEach((it) => list.appendChild(h('div', { class: 'li' + (it.ok ? ' done' : '') }, h('span', { style: { fontSize: '20px' } }, it.ok ? '✅' : '⬜'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, it.t), it.ok ? null : h('div', { class: 'ds' }, it.hint)))));
        body.appendChild(list);
      },
    });
  };

  // ---------------- 一键安排 ----------------
  X.autoAssign = function () {
    const res = DS.AutoAssign();
    if (!res.length) { UI.toast('没有可以安排的人'); return; }
    DS.Audio.confirm();
    UI.toast('⚡ ' + res.map(([n, v]) => `${n}→${v}`).join('　'), 'good', 3);
    refresh();
  };

  // ---------------- 招募时替换队员 ----------------
  X.pickReplace = function (nm) {
    return new Promise((resolve) => {
      let done = false;
      const sh = UI.sheet({
        title: '让谁离开？', sub: `为了收留 ${nm.name}`,
        onClose: () => { if (!done) resolve(null); },
        render(body) {
          const list = h('div', { class: 'list' });
          G.S.members.filter((m) => m.id !== 'me' && !m.away).forEach((m) => list.appendChild(h('div', { class: 'li click', onclick: async () => {
            if (!(await UI.confirm(`让${m.name}离开安全屋？${m.name}身上的装备会留在仓库。`, '让他走'))) return;
            done = true; sh.close(); resolve(m);
          } }, h('div', { style: { width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, m.name, h('span', { class: 'tiny muted' }, `　Lv${m.lv} ${m.job}　战力 ${G.power(m)}`)), h('div', { class: 'ds' }, m.skills.map(([s, q]) => q + '·' + s).join('　'))))));
          body.appendChild(list);
        },
      });
    });
  };

  // ---------------- 伙伴 ----------------
  X.pet = function () {
    const S = G.S; if (!S.pet) return;
    UI.sheet({
      title: '🐕 ' + S.pet.name, sub: '末日伙伴',
      render(body, tab, sh) {
        const p = S.pet; if (!p) { sh.close(); return; }
        const mx = DS.Pet.maxHp();
        body.appendChild(h('div', { class: 'row', style: { alignItems: 'flex-start' } },
          h('div', { class: 'pet-portrait' }, '🐕'),
          h('div', { class: 'grow col', style: { gap: '4px' } },
            h('div', { class: 'small' }, `Lv.${p.lv}　经验 ${p.exp}/${DS.Pet.expNeed(p.lv)}${p.hurt ? `　🩹 养伤中（${p.hurt} 天）` : ''}`),
            UI.bar('❤', p.hp, mx, '#ff5d6c', p.hp < mx * 0.3), UI.bar('🍖', p.hunger, 100, '#f0a35b', p.hunger < 25), UI.bar('💞', p.loyal, 100, '#e86a92', p.loyal < 20))));
        body.appendChild(h('div', { class: 'small muted', style: { margin: '8px 0', lineHeight: 1.7 } }, `${p.name}每天吃一顿（狗粮、变异肉最好，没有时会分一点你们的口粮）。忠诚 ≥20 时会参与战斗、跟着探索多嗅出 1 处物资；忠诚 ≥50 时全员每天心情 +1。夜里有人摸过来，它会第一个叫。`));
        const foods = ['狗粮', '变异肉', '烤变异肉', '合成肉'].filter((n) => G.qty(n));
        body.appendChild(h('h3', { class: 'sec' }, '照顾'));
        body.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          foods.map((n) => h('button', { class: 'btn small', onclick: () => { if (p.hunger >= 100) { UI.toast(`${p.name}吃不下了`); return; } DS.Pet.feedOnce(n); DS.Audio.confirm(); sh.refresh(); refresh(); } }, `喂${n}（${G.qty(n)}）`)),
          !foods.length ? h('span', { class: 'tiny muted' }, '没有狗粮和变异肉。灶台可以把变异肉和大米煮成狗粮。') : null,
          h('button', { class: 'btn small primary', onclick: () => { const e = DS.Pet.play(); if (e) { UI.toast(e); return; } DS.Audio.win(); UI.toast(`你和${p.name}在屋里疯了一会儿（忠诚 +4，心情 +3）`, 'good'); sh.refresh(); refresh(); } }, '🎾 陪它玩'),
          h('button', { class: 'btn small ghost', onclick: () => {
            const inp = h('input', { class: 'input', id: 'pet-name', value: p.name, maxlength: 4 });
            UI.modal({ title: '给它起个名字', dismiss: false, body: h('div', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, '最多 4 个字'), inp), buttons: [{ t: '取消', v: false }, { t: '就叫这个', cls: 'primary', v: true }], onMount: () => setTimeout(() => inp.focus(), 50) }).then((ok) => { const v = inp.value.trim(); if (ok && v) { p.name = v.slice(0, 4); sh.refresh(); refresh(); } });
          } }, '✏️ 改名')));
      },
    });
  };

  // ---------------- 远征 ----------------
  X.dispatch = function () {
    const S = G.S;
    const locs = DS.Dispatch.locs();
    let locId = locs.length ? locs[0].id : null;
    const pick = new Set();
    UI.sheet({
      title: '🚩 派遣远征', sub: '队员离家数天，自动搜刮物资（主角留守）',
      render(body, tab, sh) {
        sh.keepScroll = true;
        const cur = DS.Dispatch.list();
        if (cur.length) {
          body.appendChild(h('h3', { class: 'sec' }, '进行中'));
          cur.forEach((d) => body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '22px' } }, DS.Explore.loc(d.loc).icon), h('div', { class: 'grow' }, h('div', { class: 'nm' }, DS.Explore.loc(d.loc).name), h('div', { class: 'ds' }, d.ids.map((id) => (G.byId(id) || {}).name).join('、') + `　第 ${d.ret} 天早上回来`)))));
        }
        if (!locs.length) { body.appendChild(h('div', { class: 'small muted', style: { marginTop: '10px' } }, '还没有可以远征的地点。先亲自去一次，完成某个地点的“外围”线路。')); return; }
        if (S.phase !== 'apoc') { body.appendChild(h('div', { class: 'small muted' }, '末日降临后才需要远征。')); return; }
        body.appendChild(h('h3', { class: 'sec' }, '目的地'));
        body.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px' } }, locs.map((l) => h('button', { class: 'btn small' + (l.id === locId ? ' primary' : ''), onclick: () => { locId = l.id; sh.refresh(); } }, `${l.icon}${l.name}`))));
        const loc = DS.Explore.loc(locId);
        const days = DS.Dispatch.days(loc);
        body.appendChild(h('div', { class: 'small muted', style: { margin: '6px 0' } }, `敌人等级 ${loc.lv}　往返 ${days} 天　可能带回：${Object.keys(loc.loot).join('、')}　建议总战力 ≥ ${DS.Dispatch.need(loc)}`));
        body.appendChild(h('h3', { class: 'sec' }, '队员（1–3 人）'));
        const list = h('div', { class: 'list' });
        S.members.forEach((m) => {
          const why = DS.Dispatch.canSend(m); const on = pick.has(m.id);
          if (m.id === 'me') return;
          list.appendChild(h('div', { class: 'li click', style: why ? { opacity: 0.45 } : null, onclick: () => { if (why) { UI.toast(m.name + '：' + why); return; } if (on) pick.delete(m.id); else { if (pick.size >= 3) { UI.toast('最多 3 人'); return; } pick.add(m.id); } sh.refresh(); } },
            h('div', { style: { width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, m.name, h('span', { class: 'tiny muted' }, `　Lv${m.lv} ${m.job}　战力 ${G.power(m)}`)), why ? h('div', { class: 'tiny bad' }, why) : h('div', { class: 'ds' }, `生命 ${m.hp}/${G.maxHp(m)}　体力 ${Math.round(m.energy)}`)),
            h('span', { class: on ? 'ok' : 'dim', style: { fontSize: '20px' } }, on ? '✔' : '○')));
        });
        body.appendChild(list);
        const team = Array.from(pick).map((id) => G.byId(id));
        if (team.length) {
          const r = DS.Dispatch.estimate(loc, team);
          const sup = DS.Dispatch.supply(team.length, days);
          const est = r >= 1.3 ? ['十拿九稳', 'ok'] : r >= 0.9 ? ['问题不大', 'ok'] : r >= 0.6 ? ['有点悬', 'warn'] : ['凶多吉少', 'bad'];
          body.appendChild(h('div', { class: 'card small', style: { marginTop: '10px', lineHeight: 1.7 } },
            h('div', null, '把握：', h('b', { class: est[1] }, est[0]), `（战力 ${team.reduce((s, m) => s + G.power(m), 0)} / 建议 ${DS.Dispatch.need(loc)}）`),
            h('div', { class: sup.food.left || sup.water.left ? 'bad' : 'muted' }, `口粮：${sup.need} 份食物 + ${sup.need} 份水（出发时从仓库扣除）${sup.food.left || sup.water.left ? '——不够！' : ''}`)));
          body.appendChild(h('button', { class: 'btn primary block', style: { marginTop: '10px' }, onclick: () => {
            const err = DS.Dispatch.send(locId, Array.from(pick));
            if (err) { UI.toast(err, 'bad'); return; }
            DS.Audio.confirm(); UI.toast('远征队出发了', 'good'); pick.clear(); G.save(); sh.refresh(); refresh();
          } }, `出发（${days} 天）`));
        }
      },
    });
  };
  X.dispatchReports = async function () {
    const S = G.S;
    while (S.pendingReports && S.pendingReports.length) {
      const r = S.pendingReports.shift();
      const chips = [];
      if (r.crystal) chips.push({ icon: '💎', label: '晶核', v: r.crystal, good: true });
      r.got.forEach((t) => { const [n, q] = t.split('×'); chips.push({ icon: n, label: n, v: +q, good: true }); });
      r.hurt.forEach((t) => chips.push({ icon: '🩸', label: t, v: '', good: false }));
      const body = h('div', null, h('div', { class: 'exp-log' }, r.lines.map((t, i) => h('div', { class: 'small', style: { animationDelay: i * 0.12 + 's' } }, '· ' + t))), UI.chipsRow(chips));
      await UI.modal({ title: `远征归来 · ${r.loc}`, cat: ['惨败', '勉强', '顺利', '大丰收'][r.tier], catColor: ['#a03030', '#9a6a20', '#2f8a4c', '#1f7a5c'][r.tier], body });
    }
    G.save(); refresh();
  };

  // ---------------- 军械改装 ----------------
  X.armory = function () {
    const S = G.S;
    let sel = null;
    UI.sheet({
      title: '🔧 军械改装', sub: '同型号的装备共享强化等级和词条',
      render(body, tab, sh) {
        sh.keepScroll = true;
        const owned = DS.Armory.owned();
        const names = Object.keys(owned).sort((a, b) => DS.ITEM_CATS.indexOf(DS.ITEMS[a].cat) - DS.ITEM_CATS.indexOf(DS.ITEMS[b].cat) || (DS.ITEMS[b].tier || 0) - (DS.ITEMS[a].tier || 0));
        if (!names.length) { body.appendChild(h('div', { class: 'small muted' }, '还没有任何装备。')); return; }
        if (!sel || !owned[sel]) sel = names[0];
        const grid = h('div', { class: 'inv-grid' });
        names.forEach((n) => { const r = DS.Armory.rec(n); grid.appendChild(h('div', { class: 'inv-cell' + (n === sel ? ' sel' : ''), onclick: () => { sel = n; sh.refresh(); } }, A.item(n, { count: owned[n] }), h('div', { class: 'nm' }, n + (r && r.lv ? ' +' + r.lv : '')))); });
        body.appendChild(grid);
        const it = DS.ITEMS[sel]; const r = DS.Armory.rec(sel) || { lv: 0, aff: [] }; const eff = DS.Armory.eff(sel);
        body.appendChild(h('div', { class: 'card', style: { marginTop: '10px' } },
          h('div', { class: 'row' }, A.item(sel, { size: 'lg' }), h('div', { class: 'grow' }, h('div', { style: { fontWeight: 800, fontSize: '16px' } }, sel, r.lv ? h('span', { class: 'warn' }, ' +' + r.lv) : null), h('div', { class: 'small muted' }, DS.Panels.gearDesc(eff)))),
          h('div', { class: 'upbar' }, Array.from({ length: DS.GEAR_MAX }, (_, i) => h('i', { class: i < r.lv ? 'on' : '' })))));
        // 强化
        if (r.lv < DS.GEAR_MAX) {
          const cost = DS.Armory.upCost(sel); const can = G.canPay(cost);
          body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '22px' } }, '⬆️'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, `强化到 +${r.lv + 1}`), h('div', { class: 'ds' }, '主属性 +10%；+3 解锁第 1 个词条位，+7 解锁第 2 个'), h('div', { class: 'tiny ' + (can ? 'ok' : 'bad') }, '消耗：' + DS.Events.costLabel(cost).join('、'))),
            h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => { const e = DS.Armory.upgrade(sel); if (e) { UI.toast(e, 'bad'); return; } DS.Audio.win(); UI.toast(`${sel} 强化到 +${DS.Armory.rec(sel).lv}`, 'good'); sh.refresh(); refresh(); } }, '强化')));
        } else body.appendChild(h('div', { class: 'small ok', style: { margin: '6px 0' } }, '已经强化到顶了。'));
        // 词条
        const slots = DS.Armory.slots(r.lv);
        body.appendChild(h('h3', { class: 'sec' }, `改装词条（${slots}/2 个位）`));
        const pool = DS.AFFIXES[it.cat] || {};
        for (let i = 0; i < 2; i++) {
          const a = r.aff && r.aff[i];
          const open = i < slots;
          const cost = DS.Armory.affCost(sel); const can = open && G.canPay(cost);
          body.appendChild(h('div', { class: 'li', style: open ? null : { opacity: 0.45 } }, h('span', { style: { fontSize: '20px' } }, a ? '💠' : open ? '◻️' : '🔒'),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, a ? `${a}：${pool[a].d}` : open ? '空词条位' : `+${i === 0 ? 3 : 7} 解锁`), open ? h('div', { class: 'tiny ' + (can ? 'muted' : 'bad') }, '消耗：' + DS.Events.costLabel(cost).join('、')) : null),
            open ? h('button', { class: 'btn small' + (can ? '' : ' disabled'), onclick: () => { const e = DS.Armory.reroll(sel, i); if (e) { UI.toast(e, 'bad'); return; } DS.Audio.coin(); UI.toast(`改装成功：${DS.Armory.rec(sel).aff[i]}`, 'good'); sh.refresh(); refresh(); } }, a ? '重洗' : '改装') : null));
        }
        body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, '可能的词条：' + Object.keys(pool).map((k) => `${k}（${pool[k].d}）`).join('　')));
      },
    });
  };

  // ---------------- 电脑小游戏 ----------------
  X.pcBlock = function (body, f, sh) {
    const S = G.S;
    if (!DS.Mini) return;
    body.appendChild(h('h3', { class: 'sec' }, '💾 硬盘里的老游戏'));
    const off = DS.Disaster.devicesOff();
    const key = S.day * 10 + S.slot;
    const played = S.pcPlayed === key;
    const best = (G.meta.mini || {});
    body.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap' } }, Object.keys(DS.Mini.games).map((k) => {
      const g = DS.Mini.games[k];
      return h('button', { class: 'btn' + (off ? ' disabled' : ''), onclick: async () => {
        if (off) { UI.toast('电磁风暴，电脑开不了机'); return; }
        sh.close();
        const r = await DS.Mini.open(k);
        const me = G.me();
        let msg = '';
        if (r && !played && S.pcPlayed !== key) {
          const mood = k === 'g2048' ? Math.min(8, 2 + Math.floor(Math.log2(Math.max(2, r.maxTile || 2)) / 2)) : Math.min(8, 2 + Math.floor((r.score || 0) / 5));
          S.pcPlayed = key; me.mood = U.clamp(me.mood + mood, 0, 100); me.energy = U.clamp(me.energy - 2, 0, 100);
          msg = `玩了一会儿${g.name}，心情 +${mood}`;
        } else if (r) msg = '这个时段已经玩过了，再玩也不会更开心了';
        if (r && k === 'g2048' && r.maxTile >= 512) DS.Ach.unlock('g2048');
        if (r && k === 'snake' && r.score >= 30) DS.Ach.unlock('snake');
        if (msg) UI.toast(msg, 'good');
        G.save(); refresh();
      } }, `${g.icon} ${g.name}`, best[k] ? h('span', { class: 'tiny muted' }, ` 最高 ${best[k]}`) : null);
    })));
    body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, played ? '这个时段已经玩过了。' : '每个时段玩一次能让主角心情变好（分数越高越开心）。'));
  };

  // ---------------- 自由布置 ----------------
  X.startLayout = function () {
    DS.Game.layout = { sel: null };
    UI.toast('点一件家具选中，再点空地把它挪过去', '', 3);
    DS.Game.render();
  };
  X.layoutBar = function () {
    const S = G.S; const L = DS.Game.layout;
    const f = L.sel && S.house.furn.find((x) => x.id === L.sel);
    const lb = DS.Layout.bonuses();
    return h('div', { class: 'layout-bar' },
      h('div', { class: 'tiny', style: { flex: '1 1 100%', color: '#ffe1b0' } }, f ? `已选中：${f.type}` : '点一件家具选中它', lb.length ? h('span', { class: 'ok' }, '　加成：' + lb.map((b) => b.icon + b.id).join(' ')) : h('span', { class: 'muted' }, '　（还没有布局加成）')),
      h('button', { class: 'btn small' + (f ? '' : ' disabled'), onclick: () => {
        if (!f) return; const F = DS.FURNITURE[f.type]; if (F.w === F.h) { UI.toast('方的，转了也一样'); return; }
        const nw = f.rot ? F.w : F.h, nh = f.rot ? F.h : F.w;
        let ok = G.fits(f.x, f.y, nw, nh, f.id) ? [f.x, f.y] : null;
        if (!ok) { for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) if (G.fits(f.x + dx, f.y + dy, nw, nh, f.id)) ok = [f.x + dx, f.y + dy]; }
        if (!ok) { UI.toast('旁边没地方转身'); return; }
        f.rot = !f.rot; f.x = ok[0]; f.y = ok[1]; DS.Audio.tap(); DS.Sim.refreshEnv(); DS.Game.render();
      } }, '🔄 旋转'),
      h('button', { class: 'btn small' + (f ? '' : ' disabled'), onclick: () => {
        if (!f) return; S.house.furn = S.house.furn.filter((x) => x !== f); (S.house.stored = S.house.stored || []).push(f.type); G.S.members.forEach((m) => { if (m.task && m.task.fid === f.id) m.task = null; }); L.sel = null; DS.Sim.refreshEnv(); DS.Game.render();
      } }, '📦 收起'),
      h('button', { class: 'btn small', onclick: () => { L.sel = null; DS.Game.render(); X.layoutHelp(); } }, '💡 加成'),
      h('button', { class: 'btn small primary', onclick: () => { DS.Game.layout = null; G.save(); DS.Game.render(); } }, '✔ 完成'));
  };
  X.layoutHelp = function () {
    const act = DS.Layout.bonuses();
    UI.modal({ title: '布局加成', dismiss: true, buttons: [{ t: '知道了', cls: 'primary', v: true }], body: h('div', { class: 'list' }, DS.Layout.RULES.map((r) => { const on = act.find((b) => b.id === r.id); return h('div', { class: 'li' }, h('span', { style: { fontSize: '20px' } }, r.icon), h('div', { class: 'grow' }, h('div', { class: 'nm' }, r.id, on ? h('span', { class: 'ok tiny' }, `　生效中${on.n > 1 ? ' ×' + on.n : ''}`) : null), h('div', { class: 'ds' }, r.desc))); })) });
  };

  // ---------------- 天灾防备 ----------------
  X.disasterCard = function (body, sh) {
    const S = G.S; const d = S.disaster; if (!d) return;
    const D = DS.DISASTERS[d.type];
    const card = h('div', { class: 'card dis-card', style: { marginTop: '10px' } },
      h('div', { class: 'row' }, h('span', { style: { fontSize: '26px' } }, D.icon), h('div', { class: 'grow' }, h('div', { style: { fontWeight: 800 } }, d.active ? `${d.type}进行中（到第 ${d.end} 天）` : `天灾预警：${d.type}（第 ${d.start} 天来，持续 ${D.days} 天）`), h('div', { class: 'small muted' }, D.desc))));
    if (D.prep) {
      if (d.prepared) card.appendChild(h('div', { class: 'small ok', style: { marginTop: '6px' } }, `✓ 已经${D.prep.name}，损失会小很多。`));
      else {
        const can = G.canPay(D.prep.cost);
        card.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, h('div', { class: 'grow tiny ' + (can ? 'muted' : 'bad') }, `${D.prep.name}：` + DS.Events.costLabel(D.prep.cost).join('、')),
          h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => { if (DS.Disaster.prepare()) { DS.Audio.win(); UI.toast(`已${D.prep.name}`, 'good'); sh.refresh(); refresh(); } } }, D.prep.name)));
      }
    }
    body.appendChild(card);
  };

  // ---------------- 存档管理 ----------------
  X.pickSlot = function () {
    const empty = [1, 2, 3].find((k) => !G.hasSave(k));
    if (empty && (!G.hasSave(G.slot) || G.slot === 'daily')) return Promise.resolve(empty);
    return new Promise((resolve) => {
      let done = false;
      const sh = UI.sheet({
        title: '选择存档位', sub: '新的一局存在哪里？', onClose: () => { if (!done) resolve(null); },
        render(body) {
          [1, 2, 3].forEach((k) => {
            const inf = G.slotInfo(k);
            body.appendChild(h('div', { class: 'li click slot-li', onclick: async () => {
              if (inf && !(await UI.confirm(`存档${k}（${inf.name} · 第${inf.day}天）会被覆盖，确定吗？`, '覆盖'))) return;
              done = true; sh.close(); resolve(k);
            } }, h('div', { class: 'slot-no' }, k), h('div', { class: 'grow' }, inf ? h('div', null, h('div', { class: 'nm' }, `${inf.name}　第 ${inf.day} 天${inf.chapter >= 2 ? '（春天篇）' : ''}`), h('div', { class: 'ds' }, `${inf.house}　${inf.members} 人　${inf.diff}　${inf.savedAt ? new Date(inf.savedAt).toLocaleString() : ''}`)) : h('div', { class: 'nm ok' }, '空存档位')), h('span', { class: 'muted' }, inf ? '覆盖' : '使用')));
          });
        },
      });
    });
  };
  X.saves = function () {
    UI.sheet({
      title: '💾 存档管理', sub: '3 个存档位 · 存档码可以换手机/浏览器继续玩',
      render(body, tab, sh) {
        [1, 2, 3].forEach((k) => {
          const inf = G.slotInfo(k);
          const cur = G.S && G.slot === k && !G.S.ending;
          body.appendChild(h('div', { class: 'card slot-card' + (cur ? ' cur' : '') },
            h('div', { class: 'row' }, h('div', { class: 'slot-no' }, k), h('div', { class: 'grow' }, inf ? h('div', null, h('div', { class: 'nm' }, `${inf.name}（${inf.job}）　第 ${inf.day} 天${inf.chapter >= 2 ? ' · 春天篇' : ''}${cur ? '　◀ 当前' : ''}`), h('div', { class: 'ds tiny muted' }, `${inf.house}　${inf.members} 人　${inf.diff}　${inf.savedAt ? new Date(inf.savedAt).toLocaleString() : ''}`)) : h('div', { class: 'nm muted' }, '空'))),
            h('div', { class: 'row', style: { flexWrap: 'wrap', marginTop: '8px', gap: '6px' } },
              inf && !cur ? h('button', { class: 'btn small primary', onclick: () => { if (G.load(k)) { sh.close(); DS.Game.start(); } } }, '读取') : null,
              inf ? h('button', { class: 'btn small', onclick: async () => { if (cur) G.save(); const code = await G.exportCode(k); X.showCode(code, inf); } }, '📤 导出存档码') : null,
              inf ? h('button', { class: 'btn small', onclick: () => { if (cur) G.save(); const raw = localStorage.getItem(G.SLOT_KEYS[k]); download(`末日安全屋_存档${k}_第${inf.day}天.json`, raw); } }, '⬇ 下载文件') : null,
              h('button', { class: 'btn small', onclick: () => X.importCode(k, !!inf, sh) }, '📥 导入'),
              inf && !cur ? h('button', { class: 'btn small danger', onclick: async () => { if (await UI.confirm(`删除存档${k}（${inf.name} · 第${inf.day}天）？无法恢复。`, '删除')) { G.clearSave(k); sh.refresh(); } } }, '删除') : null)));
        });
        body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '8px', lineHeight: 1.7 } }, '存档只保存在这台设备的浏览器里，清理浏览器数据会丢失。想换设备或备份，就导出存档码（复制保存好），在另一台设备上“导入”。'));
      },
    });
  };
  function download(name, text) {
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) { UI.toast('下载失败：' + e.message, 'bad'); }
  }
  X.showCode = function (code, inf) {
    if (!code) { UI.toast('导出失败', 'bad'); return; }
    const ta = h('textarea', { class: 'input code-box', readonly: true }, code);
    UI.modal({ title: '存档码', dismiss: true, body: h('div', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, `${inf.name} · 第 ${inf.day} 天　共 ${code.length} 个字符`), ta), buttons: [{ t: '关闭', v: false }, { t: '📋 复制', cls: 'primary', v: 'copy' }] }).then(async (v) => {
      if (v !== 'copy') return;
      try { await navigator.clipboard.writeText(code); UI.toast('已复制到剪贴板', 'good'); } catch (e) { ta.select(); try { document.execCommand('copy'); UI.toast('已复制', 'good'); } catch (e2) { UI.toast('请手动长按复制', 'bad'); } }
    });
    setTimeout(() => { ta.focus(); ta.select(); }, 100);
  };
  X.importCode = function (k, has, parent) {
    const ta = h('textarea', { class: 'input code-box', placeholder: '把存档码粘贴到这里（DSZ1: 或 DSJ1: 开头），也可以选择 .json 存档文件' });
    const file = h('input', { type: 'file', accept: '.json,application/json,text/plain', style: { marginTop: '8px', fontSize: '12px' }, onchange: (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => (ta.value = r.result); r.readAsText(f); } });
    UI.modal({ title: `导入到存档${k}`, dismiss: false, body: h('div', null, has ? h('div', { class: 'small bad', style: { marginBottom: '6px' } }, `⚠ 会覆盖存档${k}`) : null, ta, file), buttons: [{ t: '取消', v: false }, { t: '导入', cls: 'primary', v: true }] }).then(async (v) => {
      if (!v) return;
      if (G.S && G.slot === k && !G.S.ending) { UI.toast('不能覆盖正在玩的存档', 'bad'); return; }
      const err = await G.importCode(ta.value, k);
      if (err) { UI.toast(err, 'bad', 3); return; }
      UI.toast('导入成功', 'good'); parent && parent.refresh();
    });
  };

  // ---------------- 每日挑战 ----------------
  X.daily = function () {
    const cfg = DS.Daily.config();
    const hasRun = (() => { const inf = G.slotInfo('daily'); return inf && inf.daily === cfg.date ? inf : null; })();
    UI.sheet({
      title: '📅 每日挑战', sub: `${cfg.date}（北京时间 0 点换题）`, tabs: [{ id: 'today', t: '今日挑战' }, { id: 'board', t: '今日榜' }, { id: 'all', t: '总榜' }],
      render(body, tab, sh) {
        if (tab !== 'today') return boardView(body, tab === 'board' ? 'today' : 'all');
        const J = DS.JOBS[cfg.job];
        body.appendChild(h('div', { class: 'card', style: { lineHeight: 1.8 } },
          h('div', null, '👤 角色：', h('b', null, `${J.icon} ${cfg.job}（${cfg.gender}）`)),
          h('div', null, '🎁 赠送：', cfg.perks.map((id) => { const p = DS.PERKS.find((x) => x.id === id); return h('span', { class: 'pill', style: { marginRight: '4px' } }, p.icon + p.name); })),
          h('div', null, '🎲 今日词条：'), cfg.mutators.map((k) => h('div', { class: 'small', style: { marginLeft: '12px' } }, `${DS.MUTATORS[k].icon} ${k}：`, h('span', { class: 'muted' }, DS.MUTATORS[k].desc))),
          h('div', { class: 'small muted', style: { marginTop: '6px' } }, `规则：所有人今天的角色、天气、天灾都一样。活过 ${DS.Daily.LEN} 天或中途倒下时按天数、击败、成员、晶核、完整度、改造计分。不消耗、也不获得重生点。`)));
        const best = DS.Daily.best(cfg.date);
        if (best) body.appendChild(h('div', { class: 'small ok', style: { margin: '8px 0' } }, `你今天的最高分：${best}`));
        const name = h('input', { class: 'input', value: G.meta.boardName || '', maxlength: 10, placeholder: '排行榜昵称', oninput: (e) => { G.meta.boardName = e.target.value.trim().slice(0, 10); G.saveMeta(); } });
        body.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'small muted' }, '昵称'), name));
        body.appendChild(h('div', { class: 'col', style: { marginTop: '10px' } },
          hasRun ? h('button', { class: 'btn primary block', onclick: () => { sh.close(); if (G.load('daily')) DS.Game.start(); } }, `继续挑战（第 ${hasRun.day} 天）`) : null,
          h('button', { class: 'btn block' + (hasRun ? '' : ' primary'), onclick: async () => { if (hasRun && !(await UI.confirm('重新开始今天的挑战？当前挑战进度会丢失。', '重新开始'))) return; sh.close(); X.dailyStart(cfg); } }, hasRun ? '重新开始' : '开始挑战')));
      },
    });
  };
  X.dailyStart = function (cfg) {
    G.useSlot('daily'); G.clearSave('daily');
    const rng = DS.Ext.mulberry(cfg.seed);
    DS.Ext.withRng(rng, () => {
      const look = G.randomLook(cfg.gender);
      const skills = G.rollSkills(cfg.job, cfg.perks.includes('leader'));
      G.newGame({ name: (G.meta.boardName || G.randomName(cfg.gender)).slice(0, 6), gender: cfg.gender, job: cfg.job, look, skills, perks: cfg.perks.slice(), diff: '标准', seed: cfg.seed, daily: { date: cfg.date }, mutators: cfg.mutators.slice() });
    });
    DS.Events.planDay();
    G.save();
    UI.toast('每日挑战开始！活过 30 天', 'good', 3);
    DS.Game.start();
  };
  async function boardView(body, board) {
    const box = h('div', { class: 'list' }, h('div', { class: 'small muted' }, '读取中……'));
    body.appendChild(box);
    const r = await DS.Board.get(board);
    U.clear(box);
    if (r.error || !Array.isArray(r.list)) {
      box.appendChild(h('div', { class: 'small muted', style: { lineHeight: 1.8 } }, r.error === 'no-kv' ? '排行榜还没开通（站长需要在 Cloudflare 绑定 KV 存储）。你的成绩会保存在本机。' : '连不上排行榜（离线或本地打开）。你的成绩会保存在本机。'));
      const mine = Object.entries(G.meta.daily || {}).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 10);
      if (mine.length) { box.appendChild(h('h3', { class: 'sec' }, '本机记录')); mine.forEach(([d, s]) => box.appendChild(h('div', { class: 'li' }, h('div', { class: 'grow' }, d), h('b', null, s)))); }
      return;
    }
    if (!r.list.length) box.appendChild(h('div', { class: 'small muted' }, '还没有人上榜，快来抢第一！'));
    r.list.forEach((e) => box.appendChild(h('div', { class: 'li rank-li' + (e.me ? ' me' : '') }, h('div', { class: 'rank-no' + (e.rank <= 3 ? ' top' + e.rank : '') }, e.rank), h('div', { class: 'grow nm' }, e.name + (e.me ? '（你）' : '')), h('b', null, e.score))));
    if (r.mine && r.mine > 50) box.appendChild(h('div', { class: 'small ok', style: { marginTop: '6px' } }, `你排在第 ${r.mine} 名`));
  }
  X.dailyEnd = function () {
    const S = G.S; const info = S.endingInfo || {};
    const done = S.ending === '挑战完成';
    const E = DS.ENDINGS.find((e) => e.id === S.ending);
    const status = h('div', { class: 'small muted', style: { minHeight: '20px', margin: '8px 0' } }, '正在上传成绩……');
    const el = h('div', { class: 'screen ending daily-end' },
      h('div', { class: 'big' }, done ? '🏁' : E ? E.icon : '💀'),
      h('div', { class: 'small muted', style: { letterSpacing: '4px' } }, `— 每日挑战 ${S.daily.date} —`),
      h('h2', null, done ? '挑战完成' : '倒在了第 ' + S.day + ' 天'),
      h('div', { class: 'score-big' }, info.score || 0),
      h('div', { class: 'score-parts' }, Object.entries(info.parts || {}).filter(([, v]) => v).map(([k, v]) => h('div', null, h('span', { class: 'muted' }, k), h('b', null, v)))),
      status,
      h('div', { class: 'col', style: { width: '100%', maxWidth: '300px', margin: '0 auto' } },
        h('button', { class: 'btn primary block', onclick: () => { DS.Title.show(); setTimeout(() => X.daily(), 50); } }, '🏆 查看排行榜'),
        h('button', { class: 'btn block', onclick: () => DS.Title.show() }, '返回标题')));
    UI.screen(el);
    if (done) DS.Audio.win(); else DS.Audio.lose();
    const name = G.meta.boardName || G.me().name || '无名幸存者';
    DS.Board.submit(name, info.score || 0, S.daily.date).then((r) => {
      if (r && r.ok) status.textContent = `已上榜：今日第 ${r.today || '—'} 名，总榜第 ${r.all || '—'} 名`;
      else if (r && r.error === 'bad-day') status.textContent = '挑战日期已过，成绩只记录在本机';
      else status.textContent = r && r.error === 'no-kv' ? '排行榜还没开通，成绩已保存在本机' : '没连上排行榜，成绩已保存在本机';
    });
  };

  // ---------------- 图鉴 & 成就 ----------------
  X.codex = function () {
    const cx = DS.Ach.codex();
    const nAch = Object.keys(G.meta.ach || {}).length;
    UI.sheet({
      title: '📜 图鉴', sub: `结局 ${Object.keys(G.meta.endings).length}/${DS.ENDINGS.length}　成就 ${nAch}/${DS.ACHIEVEMENTS.length}`,
      tabs: [{ id: 'end', t: '结局' }, { id: 'ach', t: '成就' }, { id: 'foe', t: '敌人' }, { id: 'item', t: '物品' }, { id: 'people', t: '人物' }],
      render(body, tab) {
        if (tab === 'end') {
          const g = h('div', { class: 'gallery' });
          DS.ENDINGS.forEach((e) => { const got = G.meta.endings[e.id]; g.appendChild(h('div', { class: 'gal' + (got ? (e.good ? ' good' : '') : ' lock') }, h('div', { class: 'ic' }, e.icon), h('div', { class: 'nm' }, got ? e.id : '？？？'), h('div', { class: 'ds' }, got ? e.text : e.how), h('div', { class: 'tiny warn', style: { marginTop: '4px' } }, `重生点 +${e.pts}` + (got ? `　达成 ${got} 次` : '')))); });
          body.appendChild(g);
        } else if (tab === 'ach') {
          const g = h('div', { class: 'gallery' });
          DS.ACHIEVEMENTS.forEach((a) => { const got = G.meta.ach && G.meta.ach[a.id]; g.appendChild(h('div', { class: 'gal' + (got ? ' good' : ' lock') }, h('div', { class: 'ic' }, got ? a.icon : '🔒'), h('div', { class: 'nm' }, a.name), h('div', { class: 'ds' }, a.desc), got ? h('div', { class: 'tiny ok', style: { marginTop: '4px' } }, new Date(got).toLocaleDateString()) : null)); });
          body.appendChild(g);
        } else if (tab === 'foe') {
          body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `累计击败 ${G.meta.kills || 0} 个敌人`));
          const g = h('div', { class: 'gallery' });
          Object.keys(DS.ENEMIES).forEach((k) => { const E = DS.ENEMIES[k]; const n = cx.foes[k]; g.appendChild(h('div', { class: 'gal' + (n ? (E.boss ? ' good' : '') : ' lock') }, h('div', { class: 'ic' }, n ? E.icon : '❔'), h('div', { class: 'nm' }, n ? k : '？？？', E.boss && n ? h('span', { class: 'tiny warn' }, ' 首领') : null), h('div', { class: 'ds' }, n ? `生命 ${E.hp}　攻击 ${E.atk}　防御 ${E.def}${E.poison ? '　会下毒' : ''}${E.bleed ? '　致流血' : ''}${E.rad ? '　带辐射' : ''}` : '尚未击败'), n ? h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `击败 ${n} 次`) : null)); });
          body.appendChild(g);
        } else if (tab === 'item') {
          const all = Object.keys(DS.ITEMS); const seen = all.filter((n) => cx.items[n]).length;
          body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `收集 ${seen}/${all.length}`));
          DS.ITEM_CATS.forEach((c) => {
            const list = all.filter((n) => DS.ITEMS[n].cat === c);
            body.appendChild(h('h3', { class: 'sec' }, `${c}（${list.filter((n) => cx.items[n]).length}/${list.length}）`));
            const grid = h('div', { class: 'inv-grid' });
            list.forEach((n) => grid.appendChild(h('div', { class: 'inv-cell' + (cx.items[n] ? '' : ' lock'), onclick: () => cx.items[n] && UI.toast(`${n}：${DS.ITEMS[n].desc}`) }, cx.items[n] ? A.item(n) : h('div', { class: 'itm' }, '❔'), h('div', { class: 'nm' }, cx.items[n] ? n : '？？？'))));
            body.appendChild(grid);
          });
        } else {
          const g = h('div', { class: 'gallery' });
          Object.keys(DS.STORY_RECRUITS).forEach((k) => { const r = DS.STORY_RECRUITS[k]; const got = cx.people[k]; g.appendChild(h('div', { class: 'gal' + (got ? ' good' : ' lock') }, h('div', { class: 'ic gal-ava', html: got ? A.avatar({ name: k, gender: r.gender, job: r.job, look: Object.assign({ skin: 1, hair: 0, eyes: 0, acc: 0, hairColor: '#222' }, r.look) }) : '' }, got ? null : '❔'), h('div', { class: 'nm' }, got ? k : '？？？'), h('div', { class: 'ds' }, got ? `${r.title}。${r.bio}` : '尚未结识'))); });
          body.appendChild(g);
        }
      },
    });
  };
})();
