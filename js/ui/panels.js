/* 面板：人员、仓库、商店、安全屋、家具（烹饪/种植/制造）、手机、设置 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art;
  const P = (DS.Panels = {});
  const refreshGame = () => DS.Game.render();

  // ---------------- 技能行 ----------------
  P.skillRow = function (m, s, q) {
    const sk = DS.SKILLS[s]; const v = G.skillVal(m, s);
    const ds = sk.fmt.replace('{p}', Math.round(v * 100) + '%').replace('{n}', Math.max(1, Math.round(v)));
    return h('div', { class: 'skill' }, h('div', { class: 'ic' }, sk.type === '探索' ? '⚔️' : '🏠'),
      h('div', { class: 'grow' }, h('div', { class: 'nm' }, h('span', { class: 'tag-q q-' + q }, q), ' ', s, h('span', { class: 'tiny muted' }, '　' + sk.type + '能力')), h('div', { class: 'ds' }, ds)));
  };

  // ---------------- 人员 ----------------
  P.members = function () {
    const S = G.S;
    UI.sheet({
      title: '人员', sub: `${S.members.length}/${G.memberSlots() + 1} 人　${S.unlocked.recruit ? '' : '（招募未解锁）'}`,
      render(body, tab, sh) {
        body.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } }, h('button', { class: 'btn small primary', onclick: () => { DS.ExtUI.autoAssign(); sh.refresh(); } }, '⚡ 一键安排'), h('span', { class: 'tiny muted grow' }, '伤病的去休养，累的去躺平，其余的按职业去干活或训练')));
        const list = h('div', { class: 'list' });
        S.members.forEach((m) => list.appendChild(memCard(m, () => { sh.close(); P.memberDetail(m); })));
        body.appendChild(list);
        if (S.pet) body.appendChild(h('div', { class: 'li click', style: { marginTop: '8px' }, onclick: () => { sh.close(); DS.ExtUI.pet(); } }, h('div', { style: { width: '52px', height: '52px', borderRadius: '12px', display: 'grid', placeItems: 'center', fontSize: '30px', background: '#1a2a40', flex: 'none' } }, '🐕'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, S.pet.name, h('span', { class: 'tiny muted' }, `　伙伴 Lv${S.pet.lv}`)), h('div', { class: 'ds' }, `忠诚 ${S.pet.loyal}　饱腹 ${S.pet.hunger}　生命 ${S.pet.hp}/${DS.Pet.maxHp()}${S.pet.hurt ? '　🩹养伤中' : ''}`)), h('span', { class: 'muted' }, '›')));
        if (S.deadList.length) body.appendChild(h('div', { class: 'small dim', style: { marginTop: '12px' } }, '🕯 逝者：' + S.deadList.join('、')));
        body.appendChild(h('div', { class: 'small muted', style: { marginTop: '12px', lineHeight: 1.7 } }, '点击队员查看详情、装备与指派任务。点击安全屋里的家具也可以安排谁去使用它。'));
      },
    });
  };
  function memCard(m, onclick) {
    const mx = G.maxHp(m);
    const task = m.task && G.S.house.furn.find((f) => f.id === m.task.fid);
    return h('div', { class: 'mem-card' + (m.id === 'me' ? ' me' : ''), onclick },
      h('div', { class: 'ava', html: A.avatar(m) }, h('div', { class: 'lv' }, 'Lv.' + m.lv)),
      h('div', { class: 'grow' },
        h('div', { class: 'row' }, h('b', null, m.name), h('span', { class: 'small muted' }, `${DS.JOBS[m.job].icon}${m.id === 'me' ? '重生者 · ' + m.job : m.title}`), h('span', { class: 'grow' }), h('span', { class: 'tiny muted' }, '战力 ' + G.power(m))),
        h('div', { class: 'minibars' }, UI.mini(m.hp, mx, '#ff5d6c'), UI.mini(m.energy, 100, '#ffd447'), UI.mini(m.hunger, 100, '#f0a35b'), UI.mini(m.thirst, 100, '#4fb6ff')),
        h('div', { class: 'row tiny muted', style: { marginTop: '4px' } }, `心情 ${m.mood}`, m.away === 'dispatch' ? (() => { const d = DS.Dispatch.awayOf(m); return d ? `　🚩 远征${DS.Explore.loc(d.loc).name}，第${d.ret}天回` : '　🚩 远征中'; })() : m.away ? '　🧭 外出探索' : task ? `　🔧 ${DS.FURNITURE[task.type].verb}中` : '　空闲'),
        UI.statusTags(m)));
  }

  P.memberDetail = function (m) {
    const S = G.S;
    UI.sheet({
      title: m.name, sub: m.id === 'me' ? '你自己 · 重生者' : m.title,
      render(body, tab, sh) {
        if (!S.members.includes(m)) { sh.close(); return; }
        const mx = G.maxHp(m);
        body.appendChild(h('div', { class: 'row', style: { alignItems: 'flex-start' } },
          h('div', { style: { width: '88px', height: '88px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #4a6386', flex: 'none' }, html: A.avatar(m) }),
          h('div', { class: 'grow col', style: { gap: '4px' } },
            h('div', { class: 'small' }, `${DS.JOBS[m.job].icon} ${m.job}　${m.gender} · ${m.age}岁　Lv.${m.lv}`),
            h('div', { class: 'tiny muted' }, `经验 ${m.exp}/${G.expNeed(m.lv)}　战力 ${G.power(m)}`),
            UI.bar('❤', m.hp, mx, '#ff5d6c', m.hp < mx * 0.3), UI.bar('⚡', m.energy, 100, '#ffd447'), UI.bar('🍖', m.hunger, 100, '#f0a35b'), UI.bar('💧', m.thirst, 100, '#4fb6ff'), UI.bar('🙂', m.mood, 100, '#c48bff', m.mood < 20))));
        if (m.bio) body.appendChild(h('div', { class: 'small muted', style: { marginTop: '8px', lineHeight: 1.6 } }, m.bio));
        if (Object.keys(m.statuses).length) {
          body.appendChild(h('h3', { class: 'sec' }, '伤病'));
          Object.keys(m.statuses).forEach((s) => { const st = DS.STATUS[s]; body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '20px' } }, st.icon), h('div', { class: 'grow' }, h('div', { class: 'nm' }, s), h('div', { class: 'ds' }, st.desc)), h('button', { class: 'btn small', onclick: () => useOn(m, sh) }, '用药'))); });
        }
        body.appendChild(h('h3', { class: 'sec' }, '属性'));
        body.appendChild(h('div', { class: 'statgrid' }, ['力量', '灵巧', '学识', '运气', '速度', '防御'].map((s) => h('div', { class: 's' }, s, h('b', null, G.stat(m, s), (m.train[s] ? h('span', { class: 'tiny muted' }, ' ' + Math.round(m.train[s]) + '%') : null))))));
        body.appendChild(h('h3', { class: 'sec' }, '技能'));
        body.appendChild(h('div', { class: 'col' }, m.skills.map(([s, q]) => P.skillRow(m, s, q))));
        body.appendChild(h('h3', { class: 'sec' }, '装备'));
        body.appendChild(h('div', { class: 'row' }, ['武器', '防具', '鞋子'].map((sl) => {
          const g = m.gear[sl]; const r = g && DS.Armory.rec(g);
          return h('div', { class: 'gear-slot', onclick: () => { if (m.away) { UI.toast(m.name + '不在安全屋'); return; } chooseGear(m, sl, sh); } }, g ? A.item(g) : h('div', { class: 'itm', style: { opacity: 0.35 } }, sl === '武器' ? '🗡️' : sl === '防具' ? '🦺' : '👟'), h('div', { class: 'nm' + (g ? '' : ' dim') }, g ? g + (r && r.lv ? ' +' + r.lv : '') : '空 · ' + sl));
        })));
        if (m.id !== 'me') {
          const bl = DS.Bond.list(m);
          if (bl.length) {
            body.appendChild(h('h3', { class: 'sec' }, '羁绊'));
            body.appendChild(h('div', { class: 'list' }, bl.map(({ m: o, v }) => h('div', { class: 'li' }, h('div', { style: { width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flex: 'none' }, html: A.avatar(o) }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, o.name, h('span', { class: 'tiny ' + (v >= 20 ? 'ok' : v <= -20 ? 'bad' : 'muted') }, `　${DS.Bond.stage(v)} ${v}`)), h('div', { class: 'bagbar', style: { marginTop: '3px' } }, h('i', { style: { width: Math.abs(v) + '%', background: v >= 0 ? '#e86a92' : '#7f8c8d' } })))))));
            body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, '一起干活、并肩作战、远征都会加深羁绊。挚友（50+）同队攻击 +5%；生死之交（80+）会在战斗中替对方挡下致命一击。'));
          }
        }
        body.appendChild(h('h3', { class: 'sec' }, '行动'));
        const task = m.task && S.house.furn.find((f) => f.id === m.task.fid);
        if (m.away) { body.appendChild(h('div', { class: 'small warn' }, m.away === 'dispatch' ? `🚩 ${m.name}正在远征，回来之前什么也做不了。` : `🧭 ${m.name}正在外面探索。`)); return; }
        body.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          h('button', { class: 'btn', onclick: () => useOn(m, sh) }, '🍽 吃喝/用药'),
          h('button', { class: 'btn', onclick: () => assignMenu(m, sh) }, '🔧 ' + (task ? '任务：' + DS.FURNITURE[task.type].verb : '指派任务')),
          m.id !== 'me' ? h('button', { class: 'btn danger', onclick: async () => { if (await UI.confirm(`让${m.name}离开安全屋？${m.name}会带走身上的装备以外的东西都留下。`, '遣散')) { DS.Sim.removeMember(m); G.log(`${m.name}离开了安全屋。`); m.gear = { 武器: null, 防具: null, 鞋子: null }; sh.close(); refreshGame(); } } }, '遣散') : null));
      },
    });
  };
  function chooseGear(m, slot, parent) {
    const S = G.S;
    const cands = Object.keys(S.inv).filter((n) => DS.ITEMS[n].cat === slot);
    UI.sheet({
      title: '选择' + slot, sub: m.name,
      render(body, tab, sh) {
        const list = h('div', { class: 'list' });
        if (m.gear[slot]) list.appendChild(h('div', { class: 'li click', onclick: () => { G.addItem(m.gear[slot], 1, true); m.gear[slot] = null; sh.close(); parent.refresh(); refreshGame(); } }, h('div', { class: 'itm' }, '⬇️'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, '卸下 ' + m.gear[slot]))));
        cands.forEach((n) => {
          const it = DS.ITEMS[n];
          list.appendChild(h('div', { class: 'li click', onclick: () => { G.removeItem(n, 1); if (m.gear[slot]) G.addItem(m.gear[slot], 1, true); m.gear[slot] = n; m.hp = Math.min(m.hp, G.maxHp(m)); DS.Audio.confirm(); sh.close(); parent.refresh(); refreshGame(); } },
            A.item(n, { count: S.inv[n] }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, n, (DS.Armory.rec(n) || {}).lv ? ' +' + DS.Armory.rec(n).lv : '', ' ', h('span', { class: 'tiny warn' }, ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][it.tier || 0])), h('div', { class: 'ds' }, gearDesc(DS.Armory.eff(n))))));
        });
        if (!cands.length && !m.gear[slot]) list.appendChild(h('div', { class: 'muted small' }, '仓库里没有可用的' + slot + '。可以在商店购买、探索获得或用工作台制造。'));
        body.appendChild(list);
        if (G.hasFurn('工作台')) body.appendChild(h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: () => { sh.close(); DS.ExtUI.armory(); } }, '🔧 去工作台改装'));
      },
    });
  }
  function gearDesc(it) {
    const p = [];
    if (it.atk) p.push('攻击 +' + Math.round(it.atk * 3)); if (it.def) p.push('防御 +' + it.def); if (it.hp) p.push('生命 +' + it.hp);
    if (it.crit) p.push('暴击 +' + Math.round(it.crit * 100) + '%'); if (it.drain) p.push('吸血 ' + Math.round(it.drain * 100) + '%');
    if (it.affixes && it.affixes.length) p.push('【' + it.affixes.join('·') + '】');
    if (it.str) p.push('力量 +' + it.str); if (it.agi) p.push('灵巧 +' + it.agi); if (it.spd) p.push('速度 +' + it.spd);
    if (it.dodge) p.push('闪避 +' + Math.round(it.dodge * 100) + '%'); if (it.cold) p.push('防寒 ' + Math.round(it.cold * 100) + '%'); if (it.rad) p.push('防辐射 ' + Math.round(it.rad * 100) + '%');
    return p.join('　') + (it.desc ? '。' + it.desc : '');
  }
  P.gearDesc = gearDesc;

  function useOn(m, parent) {
    const S = G.S;
    UI.sheet({
      title: '给 ' + m.name + ' 使用', sub: `饱腹 ${Math.round(m.hunger)} · 饮水 ${Math.round(m.thirst)} · 体力 ${Math.round(m.energy)} · 生命 ${m.hp}/${G.maxHp(m)}`,
      tabs: [{ id: '食物', t: '食物' }, { id: '医疗', t: '医疗' }, { id: '百货', t: '其它' }],
      render(body, tab, sh) {
        sh.keepScroll = true;
        sh.setSub(`饱腹 ${Math.round(m.hunger)} · 饮水 ${Math.round(m.thirst)} · 体力 ${Math.round(m.energy)} · 生命 ${m.hp}/${G.maxHp(m)}`);
        const items = Object.keys(S.inv).filter((n) => DS.ITEMS[n].cat === tab && (DS.ITEMS[n].eat || DS.ITEMS[n].cure || DS.ITEMS[n].read));
        if (!items.length) { body.appendChild(h('div', { class: 'muted small' }, '没有可用的物品。')); return; }
        const list = h('div', { class: 'list' });
        items.forEach((n) => {
          const it = DS.ITEMS[n]; const useful = DS.Sim.itemUseful(m, n);
          list.appendChild(h('div', { class: 'li' }, A.item(n, { count: S.inv[n] }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, n), h('div', { class: 'ds' }, effDesc(it))),
            h('button', { class: 'btn small ' + (useful ? 'primary' : ''), onclick: () => { const notes = DS.Sim.useItem(m, n); DS.Audio.heal(); UI.toast(`${m.name}使用了${n}${notes && notes.length ? '，' + notes.join('、') : ''}`, 'good'); sh.refresh(); parent && parent.refresh(); refreshGame(); } }, '使用')));
        });
        body.appendChild(list);
      },
    });
  }
  P.useOn = useOn;
  function effDesc(it) {
    const e = it.eat || {}; const p = [];
    if (e.hunger) p.push('饱腹' + U.sign(e.hunger)); if (e.thirst) p.push('饮水' + U.sign(e.thirst)); if (e.energy) p.push('体力' + U.sign(e.energy));
    if (e.hp) p.push('生命+' + Math.round(e.hp * 100) + '%'); if (e.mood) p.push('心情' + U.sign(e.mood));
    if (it.cure) p.push('治疗：' + (it.cure.includes('*') ? '全部伤病' : it.cure.join('、')));
    if (it.risk) p.push(`${Math.round(it.risk.p * 100)}%几率${it.risk.status}`);
    if (it.team) p.push('全员生效');
    return p.join('　') || it.desc;
  }
  P.effDesc = effDesc;

  function assignMenu(m, parent) {
    const S = G.S;
    const usable = S.house.furn.filter((f) => { const F = DS.FURNITURE[f.type]; return F.use || F.job === 'farm' || F.job === 'craft'; });
    UI.sheet({
      title: '指派 ' + m.name, sub: '每次【行动】推进时间时，指派的任务会自动进行',
      render(body, tab, sh) {
        const list = h('div', { class: 'list' });
        list.appendChild(h('div', { class: 'li click', onclick: () => { m.task = null; sh.close(); parent && parent.refresh(); refreshGame(); } }, h('div', { class: 'itm' }, '💤'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, '空闲'), h('div', { class: 'ds' }, '不做任何事')), !m.task ? h('span', { class: 'ok' }, '✓') : null));
        usable.forEach((f) => {
          const F = DS.FURNITURE[f.type];
          const users = G.home().filter((x) => x.task && x.task.fid === f.id && x !== m);
          const cap = F.users || 1;
          const full = users.length >= cap;
          list.appendChild(h('div', { class: 'li click' + (full ? '' : ''), style: full ? { opacity: 0.5 } : null, onclick: () => { if (full) { UI.toast(F.name + '已经有人在用了'); return; } m.task = { fid: f.id }; DS.Audio.confirm(); sh.close(); parent && parent.refresh(); refreshGame(); } },
            h('div', { class: 'itm', style: { padding: '4px' }, html: A.furniture(f.type, f.lv, {}) }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, `${F.verb || F.name}　`, h('span', { class: 'tiny muted' }, F.name + (f.lv > 1 ? ' Lv' + f.lv : ''))), h('div', { class: 'ds' }, useDesc(f))),
            m.task && m.task.fid === f.id ? h('span', { class: 'ok' }, '✓') : h('span', { class: 'tiny muted' }, `${users.length}/${cap}`)));
        });
        if (!usable.length) list.appendChild(h('div', { class: 'small muted' }, '安全屋里还没有可以使用的家具。去商店的家具城看看。'));
        body.appendChild(list);
      },
    });
  }
  P.assignMenu = assignMenu;
  function useDesc(f) {
    const F = DS.FURNITURE[f.type]; const u = F.use || {}; const L = F.lv || {}; const p = [];
    if (F.job === 'farm') return '照料作物，生长速度 ×1.5（种植者更快）';
    if (F.job === 'craft') return '加快制造进度（工程师更快）';
    if (u.energy) p.push('体力' + U.sign(u.energy + (u.energy > 0 ? (f.lv - 1) * (L.energy || 0) : 0)));
    if (u.mood) p.push('心情+' + (u.mood + (f.lv - 1) * (L.mood || 0)));
    if (u.hp) p.push('生命+' + Math.round((u.hp + (f.lv - 1) * (L.hp || 0)) * 100) + '%');
    if (u.train) p.push(`${u.train[0]}进度 +${u.train[1] + (f.lv - 1) * (L.train || 0)}%`);
    if (u.heal) p.push('伤病自愈几率');
    if (u.intel) p.push('可能获得情报');
    if (u.hunger) p.push('饱腹' + u.hunger);
    if (F.cost) p.push('消耗' + F.cost.replace(':', '×'));
    return p.join('　') + '／每时段';
  }

  // ---------------- 仓库 ----------------
  P.inventory = function () {
    const S = G.S;
    const tabs = [{ id: '全部', t: '全部' }, { id: '食物', t: '食物' }, { id: '食材', t: '食材' }, { id: '材料', t: '材料' }, { id: '医疗', t: '医疗' }, { id: '装备', t: '装备' }, { id: '百货', t: '百货' }];
    UI.sheet({
      title: '仓库', tabs,
      render(body, tab, sh) {
        sh.keepScroll = true;
        const cap = G.hstat('cap'); const vol = G.invVol();
        sh.setSub(`容积 ${vol}/${cap > 99999 ? '∞' : cap}`);
        body.appendChild(h('div', { class: 'bagbar', style: { marginBottom: '10px' } }, h('i', { style: { width: Math.min(100, vol / cap * 100) + '%', background: vol > cap * 0.9 ? 'var(--danger)' : null } })));
        const names = Object.keys(S.inv).filter((n) => { const c = DS.ITEMS[n].cat; return tab === '全部' || c === tab || (tab === '装备' && ['武器', '防具', '鞋子'].includes(c)); })
          .sort((a, b) => DS.ITEM_CATS.indexOf(DS.ITEMS[a].cat) - DS.ITEM_CATS.indexOf(DS.ITEMS[b].cat));
        if (!names.length) { body.appendChild(h('div', { class: 'muted small' }, '空空如也。')); return; }
        const grid = h('div', { class: 'inv-grid' });
        names.forEach((n) => grid.appendChild(h('div', { class: 'inv-cell', onclick: () => itemDetail(n, sh) }, A.item(n, { count: S.inv[n] }), h('div', { class: 'nm' }, n))));
        body.appendChild(grid);
        // 汇总
        const food = names.length && tab === '全部' ? summary() : null;
        if (food) body.appendChild(food);
      },
    });
  };
  function summary() {
    const S = G.S; let hu = 0, th = 0;
    Object.keys(S.inv).forEach((n) => { const e = DS.ITEMS[n].eat; if (DS.ITEMS[n].cat === '食物' && e) { hu += (e.hunger || 0) * S.inv[n]; th += (e.thirst || 0) * S.inv[n]; } });
    const per = S.members.length;
    const dh = Math.round(hu / (per * 30)), dt = Math.round(th / (per * 42));
    return h('div', { class: 'card small', style: { marginTop: '12px', lineHeight: 1.7 } }, `🍖 现有食物约够 ${per} 人吃 ${dh} 天　💧 饮水约够 ${dt} 天`, h('div', { class: 'tiny muted' }, '（按每人每天约消耗 30 饱腹 / 42 饮水估算；末日后可以用灶台烧雪水）'));
  }
  function itemDetail(n, parent) {
    const S = G.S; const it = DS.ITEMS[n];
    const gear = ['武器', '防具', '鞋子'].includes(it.cat);
    const body = h('div', null, h('div', { class: 'row', style: { alignItems: 'flex-start' } }, A.item(n, { size: 'lg' }), h('div', { class: 'grow' }, h('div', { style: { fontSize: '17px', fontWeight: 800 } }, n), h('div', { class: 'small muted' }, `${it.cat}　体积 ${it.vol}　持有 ${S.inv[n] || 0}`))),
      h('div', { class: 'small', style: { marginTop: '10px', lineHeight: 1.7 } }, gear ? gearDesc(it) : effDesc(it)), it.desc && !gear ? h('div', { class: 'small muted', style: { marginTop: '4px' } }, it.desc) : null);
    const btns = [{ t: '丢弃 1 个', v: 'drop' }];
    if (it.eat || it.cure || it.read) btns.push({ t: '使用', cls: 'primary', v: 'use' });
    if (gear) btns.push({ t: '装备给…', cls: 'primary', v: 'equip' });
    UI.modal({ title: '物品', body, buttons: btns, dismiss: null }).then((v) => {
      if (v === 'drop') { G.removeItem(n, 1); parent.refresh(); refreshGame(); }
      if (v === 'use') pickMember((m) => { const notes = DS.Sim.useItem(m, n); DS.Audio.heal(); UI.toast(`${m.name}使用了${n}${notes && notes.length ? '，' + notes.join('、') : ''}`, 'good'); parent.refresh(); refreshGame(); }, n);
      if (v === 'equip') pickMember((m) => { G.removeItem(n, 1); if (m.gear[it.cat]) G.addItem(m.gear[it.cat], 1, true); m.gear[it.cat] = n; UI.toast(`${m.name}装备了${n}`, 'good'); parent.refresh(); refreshGame(); });
    });
  }
  function pickMember(fn, item) {
    const S = G.S;
    if (S.members.length === 1) return fn(S.members[0]);
    UI.sheet({
      title: '选择成员',
      render(body, tab, sh) {
        const list = h('div', { class: 'list' });
        G.home().forEach((m) => list.appendChild(h('div', { onclick: () => { sh.close(); fn(m); } }, memCard(m, null), item && DS.Sim.itemUseful(m, item) ? h('div', { class: 'tiny ok', style: { margin: '-4px 0 0 70px' } }, '✓ 用得上') : null)));
        body.appendChild(list);
      },
    });
  }
  P.pickMember = pickMember;

  // ---------------- 商店 ----------------
  P.shop = function (which, wait) {
    const S = G.S;
    return new Promise((resolve) => {
      const apoc = S.phase === 'apoc';
      let tabs;
      if (!apoc) tabs = ['食品', '药店', '建材', '户外', '黑市', '家具', '车行', '装修'].map((id) => ({ id, t: DS.SHOPS[id].icon + DS.SHOPS[id].name, hidden: id === '黑市' && !S.unlocked.blackmarket }));
      else tabs = [{ id: '集市', t: '⛺ 集市' }, { id: '出售', t: '💰 出售' }, { id: '家具', t: '🛋️ 旧货家具' }, { id: '装修', t: '🔨 改造' }, { id: '车行', t: '🔧 修车铺' }];
      if (apoc && !S.unlocked.market) tabs = tabs.filter((t) => t.id !== '集市' && t.id !== '出售');
      let tab = which && tabs.find((t) => t.id === which) ? which : tabs[0] && tabs[0].id;
      if (apoc && which && !tabs.find((t) => t.id === which)) tab = tabs[0].id;
      if (!tabs.length) { UI.toast('附近没有能交易的地方'); resolve(); return; }
      if (apoc) DS.Sim.refreshMarket();
      const qty = {};
      UI.sheet({
        title: apoc ? '交易' : '商店', tabs, tab, onClose: resolve,
        render(body, t, sh) {
          sh.keepScroll = true;
          const cap = G.hstat('cap');
          sh.setSub(`${apoc ? '💎 ' + U.num(S.crystal) : '💴 ' + U.money(S.money)}　📦 ${G.invVol()}/${cap > 99999 ? '∞' : cap}`);
          const shop = DS.SHOPS[t];
          if (t === '家具') return furnShop(body, sh, apoc);
          if (t === '车行') return carShop(body, sh, apoc);
          if (t === '装修') return P.modsList(body, sh);
          if (t === '集市') return market(body, sh);
          if (t === '出售') return sellList(body, sh);
          // 普通商店
          const items = Object.values(DS.ITEMS).filter((it) => {
            if (!it.price) return false;
            if (shop.exclude && shop.exclude.includes(it.name)) return false;
            if (shop.include && shop.include.includes(it.name)) return true;
            if (!shop.cats.includes(it.cat)) return false;
            if (shop.maxTier && it.tier > shop.maxTier) return false;
            if (t === '户外' && it.cat === '武器' && !shop.include.includes(it.name)) return false;
            if (t === '黑市' && it.cat === '医疗') return false;
            if (t === '黑市' && (it.cat === '防具' || it.cat === '鞋子') && it.tier < 2) return false;
            return true;
          });
          if (t === '黑市') body.appendChild(h('div', { class: 'card small warn', style: { marginBottom: '8px' } }, '🕶 枪支管制品，交易要小心。末日之后，这些东西就是命。'));
          const list = h('div', { class: 'list' });
          const disc = DS.Sim.discount();
          items.forEach((it) => {
            const price = Math.round(it.price * disc);
            const q = qty[it.name] || 1;
            const row = h('div', { class: 'li' }, A.item(it.name, { count: S.inv[it.name] || undefined }),
              h('div', { class: 'grow' }, h('div', { class: 'nm' }, it.name), h('div', { class: 'ds' }, ['武器', '防具', '鞋子'].includes(it.cat) ? gearDesc(it) : effDesc(it)), h('div', { class: 'tiny dim' }, '体积 ' + it.vol)),
              h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '4px' } }, h('div', { class: 'price' }, '¥' + U.money(price * q)),
                h('div', { class: 'qty-ctl' }, h('button', { onclick: () => { qty[it.name] = Math.max(1, q - (q > 10 ? 10 : 1)); sh.refresh(); } }, '−'), h('span', { class: 'q' }, q), h('button', { onclick: () => { qty[it.name] = q + (q >= 10 ? 10 : 1); sh.refresh(); } }, '+')),
                h('button', { class: 'btn small primary', onclick: () => buy(it.name, q, price, 'money', sh) }, '购买')));
            list.appendChild(row);
          });
          body.appendChild(list);
        },
      });
    });
  };
  function buy(name, q, unit, cur, sh) {
    const S = G.S; const total = unit * q;
    if (S[cur] < total) { UI.toast(cur === 'money' ? '钱不够了' : '晶核不够', 'bad'); DS.Audio.bad(); return false; }
    const it = DS.ITEMS[name];
    if (G.freeVol() < it.vol * q) { UI.toast('仓库放不下了（需要扩建仓储或买储物柜）', 'bad'); DS.Audio.bad(); return false; }
    S[cur] -= total; G.addItem(name, q);
    DS.Audio.coin(); UI.toast(`买入 ${name}×${q}`, 'good');
    sh.refresh(); refreshGame();
    return true;
  }
  function market(body, sh) {
    const S = G.S; const disc = DS.Sim.discount();
    body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, '幸存者们在地下通道里摆摊，货品每天更换。'));
    const list = h('div', { class: 'list' });
    S.market.offers.forEach((o) => {
      const it = DS.ITEMS[o.item]; const price = Math.round(o.price * disc);
      list.appendChild(h('div', { class: 'li', style: o.qty <= 0 ? { opacity: 0.4 } : null }, A.item(o.item, { count: S.inv[o.item] || undefined }),
        h('div', { class: 'grow' }, h('div', { class: 'nm' }, o.item, h('span', { class: 'tiny muted' }, '　剩 ' + o.qty)), h('div', { class: 'ds' }, ['武器', '防具', '鞋子'].includes(it.cat) ? gearDesc(it) : effDesc(it))),
        h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '4px' } }, h('div', { class: 'price' }, '💎' + price),
          h('button', { class: 'btn small primary' + (o.qty <= 0 ? ' disabled' : ''), onclick: () => { if (buy(o.item, 1, price, 'crystal', sh)) { o.qty--; sh.refresh(); } } }, '买 1'))));
    });
    body.appendChild(list);
  }
  function sellList(body, sh) {
    const S = G.S;
    body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, '把用不上的东西换成晶核（按市价四成收购）。'));
    const list = h('div', { class: 'list' });
    Object.keys(S.inv).forEach((n) => {
      const p = DS.Sim.sellPrice(n);
      list.appendChild(h('div', { class: 'li' }, A.item(n, { count: S.inv[n] }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, n), h('div', { class: 'ds' }, '收购价 💎' + p)),
        h('button', { class: 'btn small', onclick: () => { G.removeItem(n, 1); S.crystal += p; DS.Audio.coin(); sh.refresh(); refreshGame(); } }, '卖 1'),
        S.inv[n] > 1 ? h('button', { class: 'btn small', onclick: () => { const k = S.inv[n]; G.removeItem(n, k); S.crystal += p * k; DS.Audio.coin(); sh.refresh(); refreshGame(); } }, '全卖') : null));
    });
    if (!Object.keys(S.inv).length) list.appendChild(h('div', { class: 'muted small' }, '仓库是空的。'));
    body.appendChild(list);
  }
  function furnShop(body, sh, apoc) {
    const S = G.S; const disc = DS.Sim.discount();
    body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, `安全屋空间 ${G.hstat('cols')}×${G.hstat('rows')} 格。买下后会自动摆进屋里。`));
    const list = h('div', { class: 'list' });
    Object.values(DS.FURNITURE).forEach((F) => {
      const price = Math.round((apoc ? F.cprice : F.price) * disc);
      if (apoc && !F.cprice) return;
      const have = G.furnOf(F.name).length;
      const spot = G.findSpot(F.name);
      list.appendChild(h('div', { class: 'li' }, h('div', { class: 'itm lg', style: { padding: '4px', '--ic': '#5a3d26' }, html: A.furniture(F.name, 1, { lit: true }) }),
        h('div', { class: 'grow' }, h('div', { class: 'nm' }, F.name, have ? h('span', { class: 'tiny ok' }, '　已有' + have) : null), h('div', { class: 'ds' }, F.desc), h('div', { class: 'tiny dim' }, `占地 ${F.w}×${F.h}　舒适 +${F.comfort}`)),
        h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '4px' } }, h('div', { class: 'price' }, (apoc ? '💎' : '¥') + U.money(price)),
          h('button', { class: 'btn small primary' + (spot ? '' : ' disabled'), onclick: () => {
            const cur = apoc ? 'crystal' : 'money';
            if (S[cur] < price) { UI.toast('不够钱', 'bad'); DS.Audio.bad(); return; }
            const f = G.placeFurniture(F.name); if (!f) { UI.toast('没有空间了', 'bad'); return; }
            S[cur] -= price; DS.Audio.coin(); UI.toast(`${F.name} 已摆放`, 'good'); DS.Sim.refreshEnv(); sh.refresh(); refreshGame();
          } }, spot ? '购买' : '没空间'))));
    });
    body.appendChild(list);
  }
  function carShop(body, sh, apoc) {
    const S = G.S;
    body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, '载具决定探索能去多远、能带几个人、能背回多少东西。每次出行消耗汽油。'));
    const list = h('div', { class: 'list' });
    Object.values(DS.VEHICLES).forEach((V) => {
      if (V.name === '步行') return;
      const own = S.vehicles.includes(V.name);
      const price = apoc ? V.cprice : V.price;
      list.appendChild(h('div', { class: 'li' }, h('div', { class: 'itm lg', style: { '--ic': '#3b5878' } }, V.icon), h('div', { class: 'grow' }, h('div', { class: 'nm' }, V.name), h('div', { class: 'ds' }, V.desc + `　油耗 ${V.fuel}/次`)),
        own ? h('span', { class: 'ok small' }, S.vehicle === V.name ? '使用中' : '已拥有') :
          h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '4px' } }, h('div', { class: 'price' }, (apoc ? '💎' : '¥') + U.money(price)),
            h('button', { class: 'btn small primary', onclick: () => {
              const cur = apoc ? 'crystal' : 'money'; if (S[cur] < price) { UI.toast('不够', 'bad'); DS.Audio.bad(); return; }
              S[cur] -= price; S.vehicles.push(V.name); S.vehicle = DS.Events.bestVehicle(); DS.Audio.coin(); UI.toast(`买下了${V.name}`, 'good'); sh.refresh(); refreshGame();
            } }, '购买'))));
    });
    body.appendChild(list);
    if (S.vehicles.length > 1) {
      body.appendChild(h('h3', { class: 'sec' }, '出行载具'));
      body.appendChild(h('div', { class: 'seg' }, S.vehicles.map((v) => h('button', { class: S.vehicle === v ? 'on' : '', onclick: () => { S.vehicle = v; sh.refresh(); } }, v))));
    }
  }

  // ---------------- 改造列表 ----------------
  P.modsList = function (body, sh) {
    const S = G.S; const apoc = S.phase === 'apoc';
    if (S.house.type === '旧公寓') { body.appendChild(h('div', { class: 'muted small' }, '出租屋不值得改造。先找到真正的安全屋。')); return; }
    const list = h('div', { class: 'list' });
    Object.keys(DS.MODS).forEach((k) => {
      const M = DS.MODS[k]; const lv = S.house.mods[k] || 0;
      const max = lv >= M.max;
      let costEl, can;
      if (!max) {
        if (!apoc) { const p = M.money[lv]; can = S.money >= p; costEl = h('div', { class: 'price' }, '¥' + U.money(p)); }
        else { const c = M.cost[lv]; const list2 = ['crystal:' + c[0], ...c.slice(1).map((x) => 'item:' + x)]; can = G.canPay(list2); costEl = h('div', { class: 'tiny', style: { textAlign: 'right', lineHeight: 1.5 } }, h('div', { class: 'price' }, '💎' + c[0]), c.slice(1).map((x) => { const [n, q] = x.split(':'); return h('div', { class: G.qty(n) >= +q ? 'ok' : 'bad' }, `${n}×${q}（${G.qty(n)}）`); })); }
      }
      const effTxt = Object.entries(M.eff).map(([a, b]) => ({ insul: '保温', antirad: '防辐射', def: '防御', cap: '仓库', rows: '空间', slots: '人员栏位' }[a] + ' +' + (a === 'insul' || a === 'antirad' ? Math.round(b * 100) + '%' : b))).join('　');
      list.appendChild(h('div', { class: 'li' }, h('div', { class: 'itm', style: { '--ic': '#3f5a7a' } }, M.icon), h('div', { class: 'grow' }, h('div', { class: 'nm' }, M.name, h('span', { class: 'tiny warn' }, `　${lv}/${M.max} 级`)), h('div', { class: 'ds' }, M.desc), h('div', { class: 'tiny ok' }, '每级 ' + effTxt)),
        max ? h('span', { class: 'ok small' }, '已满级') : h('div', { class: 'col', style: { alignItems: 'flex-end', gap: '4px' } }, costEl, h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => doMod(k, sh) }, '改造'))));
    });
    body.appendChild(list);
  };
  function doMod(k, sh) {
    const S = G.S; const M = DS.MODS[k]; const lv = S.house.mods[k] || 0; const apoc = S.phase === 'apoc';
    if (!apoc) { const p = M.money[lv]; if (S.money < p) return; S.money -= p; }
    else { const c = M.cost[lv]; const l = ['crystal:' + c[0], ...c.slice(1).map((x) => 'item:' + x)]; if (!G.canPay(l)) return; G.pay(l); }
    S.house.mods[k] = lv + 1;
    if (k === '扩建') G.relayout();
    DS.Sim.refreshEnv();
    DS.Audio.win(); UI.toast(`${M.name}升到 ${lv + 1} 级`, 'good');
    G.log(`${M.name}提升到 ${lv + 1} 级。`, 'good');
    sh.refresh(); refreshGame();
  }

  // ---------------- 安全屋 ----------------
  P.house = function () {
    const S = G.S;
    UI.sheet({
      title: S.house.type, sub: DS.HOUSES[S.house.type].desc,
      tabs: [{ id: 'info', t: '概况' }, { id: 'mods', t: '改造' }, { id: 'furn', t: '家具' }],
      render(body, tab, sh) {
        sh.keepScroll = true;
        if (tab === 'mods') return P.modsList(body, sh);
        if (tab === 'furn') return furnList(body, sh);
        const H = DS.HOUSES[S.house.type];
        const stat = (ic, a, b, sub) => h('div', { class: 'card', style: { flex: '1 1 30%', minWidth: '96px' } }, h('div', { class: 'tiny muted' }, ic + ' ' + a), h('div', { style: { fontWeight: 800, fontSize: '16px' } }, b), sub ? h('div', { class: 'tiny dim' }, sub) : null);
        body.appendChild(h('div', { class: 'row', style: { flexWrap: 'wrap' } },
          stat('🧱', '完整度', S.house.integrity + '%', S.house.integrity < 30 ? '危险！' : ''),
          stat('🧊', '保温', U.pct(G.hstat('insul'))),
          stat('☢️', '防辐射', U.pct(G.hstat('antirad'))),
          stat('🛡️', '防御', G.hstat('def')),
          stat('📦', '仓库', G.hstat('cap') > 99999 ? '∞' : G.hstat('cap')),
          stat('🛋️', '舒适', G.hstat('comfort'), '每 25 点每天心情+1'),
          stat('👥', '人员栏位', (S.members.length - 1) + '/' + G.memberSlots()),
          stat('🌡️', '室内', UI.fmtTemp(S.env.inT)),
          stat(DS.VEHICLES[S.vehicle].icon, '载具', S.vehicle)));
        if (H.pro) body.appendChild(h('div', { class: 'small muted', style: { marginTop: '8px' } }, `优点：${H.pro}　缺点：${H.con}`));
        DS.ExtUI.disasterCard(body, sh);
        const lb = DS.Layout.bonuses();
        if (lb.length) { body.appendChild(h('h3', { class: 'sec' }, '布局加成')); lb.forEach((b) => body.appendChild(h('div', { class: 'small', style: { margin: '3px 0' } }, `${b.icon} ${b.id}${b.n > 1 ? ' ×' + b.n : ''}：`, h('span', { class: 'muted' }, b.desc)))); }
        // 壁炉
        if (G.hasFurn('壁炉')) {
          body.appendChild(h('h3', { class: 'sec' }, '壁炉'));
          body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '22px' } }, '🔥'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, S.fireOn ? (S.env.fireOut ? '已熄灭（没燃料）' : `燃烧中 +${DS.Sim.heat()}℃`) : '已关闭'), h('div', { class: 'ds' }, `每天早上消耗 ${G.furnOf('壁炉').slice(0, 2).length * DS.FURNITURE.壁炉.fuel} 木柴（不够时劈木头），木柴 ${G.qty('木柴')}　木头 ${G.qty('木头')}`)),
            h('button', { class: 'btn small', onclick: () => { S.fireOn = !S.fireOn; if (S.fireOn && S.env.fireOut && (G.qty('木柴') >= 1 || G.qty('木头') >= 1)) { if (G.qty('木柴')) G.removeItem('木柴', 1); else G.removeItem('木头', 1); S.env.fireOut = false; } DS.Sim.refreshEnv(); sh.refresh(); refreshGame(); } }, S.fireOn ? '熄火' : '点火')));
        }
        // 维修
        if (S.house.type !== '旧公寓') {
          body.appendChild(h('h3', { class: 'sec' }, '修缮'));
          const miss = 100 - S.house.integrity;
          const step = Math.min(10, miss);
          const cost = [`item:木头:${Math.max(1, Math.ceil(step * 0.3))}`, `item:铁板:${Math.max(1, Math.ceil(step / 10))}`];
          if (S.phase === 'apoc') cost.push('crystal:' + step * 12); else cost.push('money:' + step * 3000);
          body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '22px' } }, '🔨'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, `修复 ${step}% 完整度`), h('div', { class: 'ds' }, '消耗：' + DS.Events.costLabel(cost).join('、')), h('div', { class: 'tiny dim' }, '完整度低于 10% 时安全屋会失守；越低越容易遭遇袭击、室温也会下降')),
            h('button', { class: 'btn small primary' + (miss > 0 && G.canPay(cost) ? '' : ' disabled'), onclick: () => { G.pay(cost); S.house.integrity = Math.min(100, S.house.integrity + step); DS.Audio.confirm(); DS.Sim.refreshEnv(); sh.refresh(); refreshGame(); } }, '修复')));
          const patch = ['item:木头:2', S.phase === 'apoc' ? 'crystal:30' : 'money:5000'];
          body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '22px' } }, '🪵'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, '临时加固 5%'), h('div', { class: 'ds' }, '消耗：' + DS.Events.costLabel(patch).join('、') + '（没有铁板时的应急办法）')),
            h('button', { class: 'btn small' + (miss > 0 && G.canPay(patch) ? '' : ' disabled'), onclick: () => { G.pay(patch); S.house.integrity = Math.min(100, S.house.integrity + 5); DS.Audio.confirm(); DS.Sim.refreshEnv(); sh.refresh(); refreshGame(); } }, '加固')));
        }
      },
    });
  };
  function furnList(body, sh) {
    const S = G.S;
    if ((S.house.stored || []).length) {
      body.appendChild(h('h3', { class: 'sec' }, '收起来的家具'));
      const l = h('div', { class: 'list' });
      S.house.stored.forEach((t, i) => l.appendChild(h('div', { class: 'li' }, h('div', { class: 'itm', style: { padding: '4px' }, html: A.furniture(t, 1, {}) }), h('div', { class: 'grow nm' }, t),
        h('button', { class: 'btn small primary', onclick: () => { if (G.placeFurniture(t)) { S.house.stored.splice(i, 1); sh.refresh(); refreshGame(); } else UI.toast('没有足够的空间', 'bad'); } }, '摆放'))));
      body.appendChild(l);
    }
    body.appendChild(h('button', { class: 'btn primary block', style: { marginTop: '6px' }, onclick: () => { sh.close(); DS.ExtUI.startLayout(); } }, '🧩 自由布置（移动、旋转家具）'));
    body.appendChild(h('div', { class: 'tiny muted', style: { margin: '6px 0' } }, '摆得巧有加成：' + DS.Layout.RULES.map((r) => r.icon + r.id).join(' ')));
    body.appendChild(h('h3', { class: 'sec' }, '屋内家具'));
    const l = h('div', { class: 'list' });
    S.house.furn.forEach((f) => l.appendChild(h('div', { class: 'li click', onclick: () => { sh.close(); P.furniture(f); } }, h('div', { class: 'itm', style: { padding: '4px' }, html: A.furniture(f.type, f.lv, {}) }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, f.type + (f.lv > 1 ? ' Lv' + f.lv : '')), h('div', { class: 'ds' }, DS.FURNITURE[f.type].desc)), h('span', { class: 'muted' }, '›'))));
    body.appendChild(l);
  }

  // ---------------- 家具交互 ----------------
  P.furniture = function (f) {
    const S = G.S; const F = DS.FURNITURE[f.type];
    if (F.job === 'cook') return P.cooking(f);
    if (F.job === 'farm') return P.farming(f);
    if (F.job === 'craft') return P.crafting(f);
    UI.sheet({
      title: F.name + (f.lv > 1 ? ' Lv' + f.lv : ''), sub: F.desc,
      render(body, tab, sh) { furnHeader(body, f, sh); if (f.type === '电脑桌') DS.ExtUI.pcBlock(body, f, sh); if (F.use) assignBlock(body, f, sh); if (f.type === '壁炉') body.appendChild(h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: () => { sh.close(); P.house(); } }, '🔥 壁炉设置')); },
    });
  };
  function furnHeader(body, f, sh) {
    const S = G.S; const F = DS.FURNITURE[f.type];
    const up = DS.furnUpCost(F, f.lv);
    const apoc = S.phase === 'apoc';
    const price = apoc ? up.crystal : up.money;
    const canUp = f.lv < DS.FURN_MAXLV && (F.lv || F.passive || F.job) && (apoc ? S.crystal >= price : S.money >= price);
    body.appendChild(h('div', { class: 'row' }, h('div', { style: { width: '72px', height: '72px', padding: '6px', background: '#0b1424', borderRadius: '12px', border: '1px solid var(--line)' }, html: A.furniture(f.type, f.lv, { lit: true }) }),
      h('div', { class: 'grow small muted', style: { lineHeight: 1.6 } }, F.use ? useDesc(f) : F.desc, h('div', { class: 'tiny dim' }, `舒适 +${Math.round(F.comfort * (1 + 0.2 * (f.lv - 1)))}　同时使用 ${F.users || '—'} 人`)),
      h('div', { class: 'col', style: { gap: '4px', alignItems: 'flex-end' } },
        f.lv < DS.FURN_MAXLV && (F.lv || F.passive || F.job) ? h('button', { class: 'btn small primary' + (canUp ? '' : ' disabled'), onclick: () => { if (apoc) S.crystal -= price; else S.money -= price; f.lv++; DS.Audio.win(); DS.Sim.refreshEnv(); sh.refresh(); refreshGame(); } }, `升级 ${apoc ? '💎' : '¥'}${U.money(price)}`) : h('span', { class: 'tiny dim' }, f.lv >= DS.FURN_MAXLV ? '已满级' : ''),
        h('button', { class: 'btn small ghost', onclick: async () => { if (await UI.confirm(`把${F.name}收起来？（可以在安全屋→家具里重新摆放）`, '收起')) { S.house.furn = S.house.furn.filter((x) => x !== f); (S.house.stored = S.house.stored || []).push(f.type); G.S.members.forEach((m) => { if (m.task && m.task.fid === f.id) m.task = null; }); sh.close(); DS.Sim.refreshEnv(); refreshGame(); } } }, '收起'))));
  }
  function assignBlock(body, f, sh) {
    const S = G.S; const F = DS.FURNITURE[f.type];
    body.appendChild(h('h3', { class: 'sec' }, `谁来${F.verb}？（${G.home().filter((m) => m.task && m.task.fid === f.id).length}/${F.users}）`));
    const list = h('div', { class: 'list' });
    G.home().forEach((m) => {
      const on = m.task && m.task.fid === f.id;
      const other = m.task && !on && S.house.furn.find((x) => x.id === m.task.fid);
      list.appendChild(h('div', { class: 'li click', onclick: () => {
        if (on) m.task = null;
        else { const n = G.home().filter((x) => x.task && x.task.fid === f.id).length; if (n >= F.users) { UI.toast('已经满员了'); return; } m.task = { fid: f.id }; }
        DS.Audio.tap(); sh.refresh(); refreshGame();
      } }, h('div', { style: { width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flex: 'none' }, html: A.avatar(m) }),
        h('div', { class: 'grow' }, h('div', { class: 'nm' }, m.name), h('div', { class: 'ds' }, `体力 ${Math.round(m.energy)}　心情 ${m.mood}` + (other ? `　（正在${DS.FURNITURE[other.type].verb}）` : ''))),
        h('span', { class: on ? 'ok' : 'dim', style: { fontSize: '18px' } }, on ? '✔' : '○')));
    });
    body.appendChild(list);
    body.appendChild(h('div', { class: 'tiny muted', style: { marginTop: '8px' } }, '指派后，每按一次【行动】（时间推进 3 小时）都会自动结算一次效果。夜里大家都会去睡觉。'));
  }

  // 烹饪
  P.cooking = function (f) {
    const S = G.S;
    UI.sheet({
      title: '灶台' + (f.lv > 1 ? ' Lv' + f.lv : ''), sub: '做饭能让食材变成更顶饱、更开心的食物',
      render(body, tab, sh) {
        sh.keepScroll = true;
        furnHeader(body, f, sh);
        const cook = G.home().find((m) => m.job === '厨师');
        const dbl = G.teamSkill('火候掌控') + (cook ? 0.15 : 0) + (f.lv - 1) * 0.05;
        body.appendChild(h('div', { class: 'small muted', style: { margin: '8px 0' } }, `每做一份消耗主角 2 点体力。双倍产出几率 ${Math.round(dbl * 100)}%${cook ? '（厨师' + cook.name + '在帮忙）' : ''}`));
        const list = h('div', { class: 'list' });
        DS.RECIPES.filter((r) => r.job === 'cook' && (!r.minRad || S.env.rad >= r.minRad)).forEach((r) => {
          const ins = [...r.in];
          if (r.id === 'snow' && S.env.rad >= 60) ins.push('滤芯:1');
          const cost = ins.map((x) => 'item:' + x);
          const can = G.canPay(cost) && G.me().energy >= 2;
          const out = DS.ITEMS[r.out];
          list.appendChild(h('div', { class: 'li' }, A.item(r.out, { count: S.inv[r.out] || undefined }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, (r.name || r.out) + ' ×' + r.n), h('div', { class: 'ds' }, ins.map((x) => { const [n, q] = x.split(':'); return h('span', { class: G.qty(n) >= +q ? '' : 'bad' }, `${n}×${q}(${G.qty(n)}) `); })), h('div', { class: 'tiny dim' }, effDesc(out))),
            h('div', { class: 'col', style: { gap: '4px' } },
              h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => cookIt(r, cost, dbl, 1, sh) }, '做'),
              h('button', { class: 'btn small' + (can ? '' : ' disabled'), onclick: () => cookIt(r, cost, dbl, 5, sh) }, '×5'))));
        });
        body.appendChild(list);
        if (S.phase === 'apoc' && S.env.rad >= 60) body.appendChild(h('div', { class: 'tiny warn', style: { marginTop: '8px' } }, '☢ 雪里有辐射尘，烧雪水需要额外消耗滤芯（工作台可制造）。'));
      },
    });
  };
  function cookIt(r, cost, dbl, times, sh) {
    const S = G.S; const me = G.me(); let made = 0;
    for (let i = 0; i < times; i++) {
      if (!G.canPay(cost) || me.energy < 2) break;
      G.pay(cost); me.energy -= 2;
      const n = r.n * (Math.random() < dbl ? 2 : 1);
      made += G.addItem(r.out, n, true);
      S.stats.cooked++;
    }
    if (made) { DS.Audio.confirm(); UI.toast(`做好了 ${r.out}×${made}`, 'good'); }
    sh.refresh(); refreshGame();
  }

  // 种植
  P.farming = function (f) {
    const S = G.S;
    UI.sheet({
      title: '种植箱' + (f.lv > 1 ? ' Lv' + f.lv : ''), sub: '室温 ≥5℃ 时作物会随时间生长',
      render(body, tab, sh) {
        sh.keepScroll = true;
        furnHeader(body, f, sh);
        const slots = 2 + (f.lv - 1);
        f.plots = f.plots || [];
        body.appendChild(h('h3', { class: 'sec' }, `地块 ${f.plots.length}/${slots}　室温 ${UI.fmtTemp(S.env.inT)}${S.env.inT < 5 ? '（太冷，停止生长）' : ''}`));
        const plots = h('div', { class: 'list' });
        f.plots.forEach((p) => { const r = DS.RECIPES.find((x) => x.id === p.rid); plots.appendChild(h('div', { class: 'li' }, A.item(r.out), h('div', { class: 'grow' }, h('div', { class: 'nm' }, (r.name || r.out) + (p.cold ? ' ❄' : '')), h('div', { class: 'bagbar', style: { marginTop: '4px' } }, h('i', { style: { width: Math.min(100, p.prog / r.t * 100) + '%' } })), h('div', { class: 'tiny dim' }, `${Math.floor(p.prog)}/${r.t} 时段`)))); });
        for (let i = f.plots.length; i < slots; i++) plots.appendChild(h('div', { class: 'li', style: { opacity: 0.5 } }, h('div', { class: 'itm' }, '🟫'), h('div', { class: 'grow small muted' }, '空地块')));
        body.appendChild(plots);
        body.appendChild(h('h3', { class: 'sec' }, '播种'));
        const list = h('div', { class: 'list' });
        const boost = (1 + G.teamSkill('绿手指')) * (S.perks.includes('farmer') ? 2 : 1);
        DS.RECIPES.filter((r) => r.job === 'farm').forEach((r) => {
          const cost = r.in.map((x) => 'item:' + x);
          const can = G.canPay(cost) && f.plots.length < slots;
          list.appendChild(h('div', { class: 'li' }, A.item(r.out, { count: S.inv[r.out] || undefined }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, (r.name || '种' + r.out) + ` → ${r.out}×${Math.round(r.n * boost)}`), h('div', { class: 'ds' }, r.in.map((x) => { const [n, q] = x.split(':'); return h('span', { class: G.qty(n) >= +q ? '' : 'bad' }, `${n}×${q}(${G.qty(n)}) `); }), `　${r.t} 时段`)),
            h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => { G.pay(cost); f.plots.push({ rid: r.id, prog: 0 }); DS.Audio.confirm(); sh.refresh(); refreshGame(); } }, '种下')));
        });
        body.appendChild(list);
        assignBlock(body, f, sh);
      },
    });
  };

  // 制造
  P.crafting = function (f) {
    const S = G.S;
    UI.sheet({
      title: '工作台' + (f.lv > 1 ? ' Lv' + f.lv : ''), sub: '一次进行一项制造；有人照看会更快',
      render(body, tab, sh) {
        sh.keepScroll = true;
        furnHeader(body, f, sh);
        if (f.job) {
          const r = DS.RECIPES.find((x) => x.id === f.job.rid);
          body.appendChild(h('div', { class: 'card', style: { marginTop: '8px' } }, h('div', { class: 'row' }, A.item(r.out.startsWith('@') ? '塑料纤维' : r.out), h('div', { class: 'grow' }, h('div', { class: 'nm' }, '制造中：' + (r.name || r.out) + (f.job.n > 1 ? ' ×' + f.job.n : '')), h('div', { class: 'bagbar', style: { marginTop: '4px' } }, h('i', { style: { width: Math.min(100, f.job.prog / r.t * 100) + '%' } })), h('div', { class: 'tiny dim' }, `${f.job.prog.toFixed(1)}/${r.t}（无人照看每时段 +0.5，有人 +1，工程师 +1.5）`)))));
        }
        body.appendChild(h('button', { class: 'btn block', style: { marginTop: '8px' }, onclick: () => DS.ExtUI.armory() }, '🔧 军械改装：强化装备、加装词条'));
        body.appendChild(h('h3', { class: 'sec' }, '配方'));
        const list = h('div', { class: 'list' });
        const save = G.teamSkill('巧手');
        DS.RECIPES.filter((r) => r.job === 'craft').forEach((r) => {
          const cost = r.in.map((x) => 'item:' + x);
          const lvOk = !r.minLv || f.lv >= r.minLv;
          const can = !f.job && G.canPay(cost) && lvOk;
          list.appendChild(h('div', { class: 'li' }, r.out.startsWith('@') ? h('div', { class: 'itm', style: { '--ic': '#b8892a' } }, '🎲') : A.item(r.out, { count: S.inv[r.out] || undefined }),
            h('div', { class: 'grow' }, h('div', { class: 'nm' }, (r.name || r.out) + (r.out.startsWith('@') ? '' : ' ×' + (r.nOut || r.n))), h('div', { class: 'ds' }, r.in.map((x) => { const [n, q] = x.split(':'); return h('span', { class: G.qty(n) >= +q ? '' : 'bad' }, `${n}×${q}(${G.qty(n)}) `); }), `　${r.t} 时段`), !lvOk ? h('div', { class: 'tiny bad' }, `需要工作台 Lv${r.minLv}`) : null),
            h('button', { class: 'btn small primary' + (can ? '' : ' disabled'), onclick: () => { if (!(save && Math.random() < save)) G.pay(cost); else UI.toast('巧手：这次没有消耗材料', 'good'); f.job = { rid: r.id, prog: 0, n: 1 }; DS.Audio.confirm(); sh.refresh(); refreshGame(); } }, '制造')));
        });
        body.appendChild(list);
        assignBlock(body, f, sh);
      },
    });
  };

  // ---------------- 手机 / 日志 ----------------
  P.phone = function () {
    const S = G.S;
    const tabs = [{ id: 'log', t: '日志' }];
    if (S.unlocked.phone || S.chats.length) tabs.push({ id: 'chat', t: '消息' }, { id: 'contacts', t: '联系人' });
    tabs.push({ id: 'goal', t: '目标' });
    UI.sheet({
      title: S.unlocked.phone ? '卫星电话' : '日志', tabs,
      render(body, tab) {
        if (tab === 'log') {
          const list = h('div', { class: 'list' });
          S.log.slice().reverse().slice(0, 150).forEach((l) => list.appendChild(h('div', { class: 'small', style: { padding: '6px 2px', borderBottom: '1px dashed #22344f', lineHeight: 1.6, color: l.type === 'bad' ? '#ff9b92' : l.type === 'good' ? '#9be3b0' : l.type === 'story' ? '#ffe1b0' : null } }, h('span', { class: 'tiny dim' }, `第${l.d}天 ${l.t}　`), l.text)));
          body.appendChild(list);
        } else if (tab === 'chat') {
          if (!S.chats.length) body.appendChild(h('div', { class: 'muted small' }, '还没有消息。'));
          S.chats.slice().reverse().forEach((c) => body.appendChild(h('div', { class: 'card', style: { marginBottom: '8px' } }, h('div', { class: 'tiny muted' }, `第${c.d}天 · ${c.who}`), h('div', { class: 'chat', style: { marginTop: '6px' } }, h('div', { class: 'msg them' }, c.text), h('div', { class: 'msg me' }, c.me), c.r ? h('div', { class: 'tiny muted' }, c.r) : null))));
        } else if (tab === 'contacts') {
          const list = h('div', { class: 'list' });
          Object.keys(S.contacts).forEach((who) => {
            const a = S.contacts[who]; const c = DS.CONTACTS[who] || {};
            const stage = a >= 80 ? '知己' : a >= 60 ? '手足' : a >= 40 ? '挚友' : a >= 20 ? '伙伴' : a >= 6 ? '熟人' : a >= 0 ? '中立' : a >= -19 ? '冷淡' : a >= -39 ? '疏远' : a >= -59 ? '厌恶' : a >= -79 ? '仇视' : '死敌';
            list.appendChild(h('div', { class: 'li' }, h('div', { style: { width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', flex: 'none', background: '#223' }, html: A.avatar({ name: who, gender: DS.STORY_RECRUITS[who] ? DS.STORY_RECRUITS[who].gender : (c.gender || (/芳|姑|姥/.test(who) ? '女' : '男')), job: DS.STORY_RECRUITS[who] ? DS.STORY_RECRUITS[who].job : '拾荒者', look: DS.STORY_RECRUITS[who] ? DS.STORY_RECRUITS[who].look : { hair: 0, skin: 1 } }) }),
              h('div', { class: 'grow' }, h('div', { class: 'nm' }, who, h('span', { class: 'tiny muted' }, '　' + (c.role || ''))), h('div', { class: 'row tiny' }, h('span', { class: a >= 0 ? 'ok' : 'bad' }, stage + ' ' + a), S.members.some((m) => m.name === who) ? h('span', { class: 'warn' }, '　在队') : null))));
          });
          if (!Object.keys(S.contacts).length) list.appendChild(h('div', { class: 'muted small' }, '通讯录是空的。'));
          body.appendChild(list);
        } else {
          const t = S.house.type;
          const goals = [
            ['活过 100 天', `当前第 ${S.day} 天`, S.day >= 100],
            ['【地下安居】以地下堡垒为安全屋', t === '地下堡垒' ? '✓ 条件满足' : '需要地下堡垒', t === '地下堡垒'],
            ['【社区共生】小区民房 + 成立互助会', t === '小区民房' ? (S.flags.互助会 ? '✓ 互助会已成立' : '互助会尚未成立') : '需要小区民房', t === '小区民房' && S.flags.互助会],
            ['【雪中暖巢】独栋别墅 + 至少 5 名成员', t === '独栋别墅' ? `当前 ${S.members.length} 人` : '需要独栋别墅', t === '独栋别墅' && S.members.length >= 5],
            ['【钢铁丛林】烂尾楼 + 保温/防辐射/防御改造都达到 3 级', t === '烂尾楼' ? `保温${S.house.mods.保温} 防辐射${S.house.mods.防辐射} 防御${S.house.mods.防御}` : '需要烂尾楼', t === '烂尾楼' && S.house.mods.保温 >= 3 && S.house.mods.防辐射 >= 3 && S.house.mods.防御 >= 3],
            ['【官方据点】取得军方联络（优先级最高）', S.flags.军方联络 ? '✓ 已取得' : '线索：老报务员、军用频段……', !!S.flags.军方联络],
          ];
          goals.forEach(([a, b, ok]) => body.appendChild(h('div', { class: 'li' }, h('span', { style: { fontSize: '18px' } }, ok ? '✅' : '⬜'), h('div', { class: 'grow' }, h('div', { class: 'nm' }, a), h('div', { class: 'ds' }, b)))));
          body.appendChild(h('h3', { class: 'sec' }, '已达成的结局'));
          body.appendChild(h('div', { class: 'small muted' }, Object.keys(G.meta.endings).join('、') || '还没有'));
        }
      },
    });
  };

  // ---------------- 设置 ----------------
  P.settings = function () {
    const st = G.meta.settings;
    UI.sheet({
      title: '设置',
      render(body, tab, sh) {
        const tog = (k, label, desc) => h('div', { class: 'li click', onclick: () => { st[k] = !st[k]; G.saveMeta(); DS.Audio.ambient(); sh.refresh(); } }, h('div', { class: 'grow' }, h('div', { class: 'nm' }, label), desc ? h('div', { class: 'ds' }, desc) : null), h('span', { style: { fontSize: '20px' } }, st[k] ? '🟢' : '⚪'));
        body.appendChild(h('div', { class: 'list' },
          tog('sound', '音效'), tog('music', '环境音（风声）'),
          tog('autoSupply', '自动补给', '饱腹或饮水低于 40 时，自动从仓库拿最划算的食物和水'),
          h('div', { class: 'li' }, h('div', { class: 'grow nm' }, '文字速度'), h('div', { class: 'seg', style: { width: '180px' } }, [[1, '正常'], [2, '快'], [3, '瞬间']].map(([v, t]) => h('button', { class: st.textSpeed === v ? 'on' : '', onclick: () => { st.textSpeed = v; G.saveMeta(); sh.refresh(); } }, t)))),
          h('div', { class: 'li' }, h('div', { class: 'grow nm' }, '战斗速度'), h('div', { class: 'seg', style: { width: '180px' } }, [[1, '1×'], [2, '2×'], [4, '4×']].map(([v, t]) => h('button', { class: st.battleSpeed === v ? 'on' : '', onclick: () => { st.battleSpeed = v; G.saveMeta(); sh.refresh(); } }, t))))));
        body.appendChild(h('h3', { class: 'sec' }, '存档'));
        body.appendChild(h('div', { class: 'small muted', style: { marginBottom: '8px' } }, '游戏每次行动后自动保存在本机浏览器里。'));
        body.appendChild(h('div', { class: 'col' },
          h('button', { class: 'btn block', onclick: () => { G.save(); UI.toast('已保存', 'good'); } }, '💾 立即保存'),
          G.S && !G.S.daily ? h('button', { class: 'btn block', onclick: () => { G.save(); DS.ExtUI.saves(); } }, '📤 存档管理 / 导出存档码') : null,
          h('button', { class: 'btn block', onclick: () => { G.save(); sh.close(); DS.Title.show(); } }, '🏠 返回标题'),
          h('button', { class: 'btn danger block', onclick: async () => { if (await UI.confirm('放弃这一局，重新开始？当前进度会被删除（不会获得重生点）。', '放弃')) { G.clearSave(); sh.close(); DS.Title.show(); } } }, '放弃本局')));
        body.appendChild(h('h3', { class: 'sec' }, '操作提示'));
        body.appendChild(h('div', { class: 'small muted', style: { lineHeight: 1.8 } }, '空格/回车：行动　数字键：选择选项　P 人员　B 仓库　S 商店　E 探索　H 安全屋　L 日志　探索时用方向键/WASD 移动'));
      },
    });
  };
})();
