/* 事件引擎：条件判断、调度、抽取、效果执行 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, DSL = DS.DSL;
  const E = (DS.Events = {});
  const STORY = ['prep', 'main', 'house'];

  // 解析缓存
  const condCache = {}, fxCache = {};
  const pc = (s) => condCache[s] || (condCache[s] = DSL.parseCond(s));
  const pf = (s) => fxCache[s] || (fxCache[s] = DSL.parseFx(s));

  // 只能被引用触发的事件（被 sched/goto/next 引用且没有 day）
  let refOnly = null;
  function buildRefs() {
    refOnly = new Set();
    DS.EVENTS.forEach((ev) => (ev.opts || []).forEach((o) => {
      const all = [o, ...(o.rnd || []), o.win || {}, o.lose || {}];
      all.forEach((b) => {
        if (b.next) refOnly.add(b.next);
        (b.fx || []).forEach((f) => { const p = pf(f); if (p.k === 'sched' || p.k === 'goto') refOnly.add(p.id); });
      });
    }));
    // 有 day 的事件仍可自然触发
    Array.from(refOnly).forEach((id) => { const ev = DS.EVENT_BY_ID[id]; if (ev && ev.day !== undefined) refOnly.delete(id); });
  }
  E.isRefOnly = (id) => { if (!refOnly) buildRefs(); return refOnly.has(id); };

  // ---------------- 上下文 ----------------
  // ctx: { member, explore:{loc, team} }
  function people(ctx) { return ctx && ctx.explore ? ctx.explore.team : G.home(); }
  function leader(ctx) { return ctx && ctx.explore ? ctx.explore.team[0] : G.me(); }

  function varVal(name, ctx) {
    const S = G.S; const me = leader(ctx);
    switch (name) {
      case 'money': return S.money; case 'crystal': return S.crystal; case 'intel': return S.intel;
      case 'mood': return me.mood; case 'energy': return me.energy; case 'hunger': return me.hunger; case 'thirst': return me.thirst;
      case 'hp': return me.hp / G.maxHp(me) * 100;
      case 'members': return people(ctx).length;
      case 'integrity': return S.house.integrity;
      case 'temp': return S.env.inT; case 'outtemp': return S.env.outT; case 'rad': return S.env.inRad;
      case 'day': return S.day; case 'rebirth': return S.rebirth || 0; case 'level': return me.lv;
      case 'chapter': return S.chapter || 1;
      case 'petloyal': return S.pet ? S.pet.loyal : 0;
      case 'bond': return ctx && ctx.member && ctx.member2 ? DS.Bond.get(ctx.member, ctx.member2) : 0;
    }
    return 0;
  }

  E.evalCond = function (str, ctx) {
    const S = G.S; const p = pc(str);
    if (p.err) return false;
    let r = false;
    switch (p.k) {
      case 'apoc': r = S.phase === 'apoc'; break;
      case 'flag': r = !!S.flags[p.name]; break;
      case 'flagn': r = DSL.cmp(Number(S.flags[p.name]) || 0, p.op, p.v); break;
      case 'house': r = p.v.includes(S.house.type === '旧公寓' ? 'none' : S.house.type); break;
      case 'member': r = p.v.some((n) => S.members.some((m) => m.name === n)); break;
      case 'job': r = people(ctx).some((m) => m.id !== 'me' && p.v.includes(m.job)); break;
      case 'furn': r = p.v.some((n) => G.hasFurn(n)); break;
      case 'vehicle': r = p.v.some((v) => (v === 'none' ? S.vehicles.length <= 1 : S.vehicles.includes(v))); break;
      case 'gender': r = G.me().gender === p.v; break;
      case 'loc': r = !!(ctx && ctx.explore && p.v.includes(ctx.explore.loc)); break;
      case 'ending': r = !!G.meta.endings[p.v]; break;
      case 'chance': r = Math.random() < p.v; break;
      case 'stat': r = DSL.cmp(G.stat(leader(ctx), p.stat), p.op, p.v); break;
      case 'item': r = DSL.cmp(G.qty(p.item) + (ctx && ctx.explore ? (ctx.explore.bag[p.item] || 0) : 0), p.op, p.v); break;
      case 'mod': r = DSL.cmp(S.house.mods[p.mod] || 0, p.op, p.v); break;
      case 'aff': r = DSL.cmp(E.aff(p.who), p.op, p.v); break;
      case 'var': r = DSL.cmp(varVal(p.name, ctx), p.op, p.v); break;
      case 'pet': r = !!S.pet; break;
      case 'disaster': r = !!(S.disaster && S.disaster.active && p.v.includes(S.disaster.type)); break;
      case 'forecast': r = !!(S.disaster && !S.disaster.active && p.v.includes(S.disaster.type)); break;
      case 'prep': r = !!(S.disaster && S.disaster.type === p.v && S.disaster.prepared); break;
      case 'diff': r = p.v.includes(S.diff || '标准'); break;
      case 'daily': r = !!S.daily; break;
    }
    return p.neg ? !r : r;
  };
  E.aff = (who) => { const S = G.S; return S.contacts[who] !== undefined ? S.contacts[who] : (DS.CONTACTS[who] ? DS.CONTACTS[who].aff : 0); };

  function pickMember(ev, ctx) {
    const list = people(ctx).filter((m) => m.id !== 'me' && (!ctx.explore || m !== ctx.explore.team[0]));
    if (!list.length) return null;
    const jobC = (ev.cond || []).map(pc).find((p) => p.k === 'job' && !p.neg);
    let cand = jobC ? list.filter((m) => jobC.v.includes(m.job)) : list;
    if (!cand.length) cand = list;
    const healthy = cand.filter((m) => !m.statuses.濒死);
    return U.pick(healthy.length ? healthy : cand);
  }

  function dayOk(ev) {
    const d = G.S.day;
    if (ev.day === undefined) return true;
    if (typeof ev.day === 'number') return d === ev.day;
    return d >= ev.day[0] && d <= ev.day[1];
  }
  function cdOk(ev) {
    const S = G.S; const last = S.fired[ev.id];
    if (last === undefined) return true;
    const repeat = ev.pool === 'random' || ev.pool === 'bubble' || ev.pool === 'explore_spot' ? ev.once !== true : ev.repeat === true;
    if (!repeat) return false;
    const cd = ev.cd !== undefined ? ev.cd : ev.pool === 'bubble' ? 4 : ev.pool === 'explore_spot' ? 2 : 12;
    return S.day - last >= cd;
  }
  // 需要两名队员的事件（{member2} / m2. / bond）
  const pairCache = {};
  E.usesPair = (ev) => { if (pairCache[ev.id] === undefined) pairCache[ev.id] = /\{member2\}|\{m2他\}|"m2\.|"bond:|"bond[<>=]/.test(JSON.stringify(ev)); return pairCache[ev.id]; };
  function pairs(ev, ctx) {
    const list = people(ctx).filter((m) => m.id !== 'me' && !m.statuses.濒死 && (!ctx.explore || m !== ctx.explore.team[0]));
    const jobC = (ev.cond || []).map(pc).find((p) => p.k === 'job' && !p.neg);
    const out = [];
    list.forEach((a) => { if (jobC && !jobC.v.includes(a.job)) return; list.forEach((b) => { if (a !== b) out.push([a, b]); }); });
    return out;
  }
  function pairOk(ev, ctx, a, b) { const c2 = Object.assign({}, ctx, { member: a, member2: b }); return (ev.cond || []).every((c) => E.evalCond(c, c2)); }
  E.eligible = function (ev, ctx, opts) {
    opts = opts || {};
    if (!opts.ignoreFired && !cdOk(ev)) return false;
    if (!opts.ignoreDay && !dayOk(ev)) return false;
    if (ev.slot === 'night' && !opts.night) return false;
    if (ev.slot === 'day' && opts.night) return false;
    if (E.usesPair(ev)) return pairs(ev, ctx || {}).some(([a, b]) => pairOk(ev, ctx || {}, a, b));
    return (ev.cond || []).every((c) => E.evalCond(c, ctx));
  };
  E.instance = function (ev, ctx) {
    ctx = Object.assign({}, ctx || {});
    if (E.usesPair(ev) && !(ctx.member && ctx.member2)) {
      const ok = pairs(ev, ctx).filter(([a, b]) => pairOk(ev, ctx, a, b));
      const pr = ok.length ? U.pick(ok) : U.pick(pairs(ev, ctx));
      if (pr) { ctx.member = pr[0]; ctx.member2 = pr[1]; }
    }
    if (!ctx.member) ctx.member = pickMember(ev, ctx);
    return { ev, ctx };
  };

  // ---------------- 每日计划 ----------------
  E.planDay = function () {
    const S = G.S; const q = [];
    // 到期的预约事件
    S.sched = S.sched.filter((s) => { if (s.day <= S.day) { q.push(s.id); return false; } return true; });
    // 当天的剧情
    DS.EVENTS.forEach((ev) => {
      if (!STORY.includes(ev.pool) || S.fired[ev.id] !== undefined || ev.day === undefined) return;
      if (typeof ev.day === 'number') { if (ev.day === S.day) q.push(ev.id); return; }
      const [a, b] = ev.day;
      if (S.day < a || S.day > b) return;
      if (E.usesPair(ev) ? !pairs(ev, {}).some(([x, y]) => pairOk(ev, {}, x, y)) : !(ev.cond || []).every((c) => E.evalCond(c, {}))) return;
      const left = b - S.day + 1;
      if (left <= 1 || Math.random() < 1 / left) q.push(ev.id);
    });
    S.queue = q;
  };

  // 本时段的事件
  E.pickSlot = function () {
    const S = G.S; const night = false;
    if (!refOnly) buildRefs();
    while (S.queue && S.queue.length) {
      const id = S.queue.shift(); const ev = DS.EVENT_BY_ID[id];
      if (!ev) continue;
      if (ev.slot === 'night') { S.queue.push(id); if (S.queue.every((x) => (DS.EVENT_BY_ID[x] || {}).slot === 'night')) break; continue; }
      const ctx = {};
      const ok = E.usesPair(ev) ? pairs(ev, ctx).some(([x, y]) => pairOk(ev, ctx, x, y)) : (ev.cond || []).every((c) => E.evalCond(c, ctx));
      if (ok && (S.fired[id] === undefined || ev.repeat)) return E.instance(ev, ctx);
    }
    // 浮动剧情（无 day、未被引用、条件满足）
    if (Math.random() < 0.3) {
      const floats = DS.EVENTS.filter((ev) => STORY.includes(ev.pool) && ev.day === undefined && !refOnly.has(ev.id) && E.eligible(ev, {}));
      if (floats.length) return E.instance(U.pick(floats), {});
    }
    // 随机事件
    const chance = S.phase === 'apoc' ? 0.58 : 0.42;
    if (Math.random() > chance) return null;
    return pickRandom(false);
  };
  E.storyLeft = () => (G.S.queue || []).length;

  const CAT_W_DAY = { 交易: 16, 战斗: 13, 物资: 18, 社交: 13, 完整度: 8, 维护: 10, 人员: 14 };
  const CAT_W_NIGHT = { 战斗: 46, 完整度: 11, 维护: 12, 人员: 12, 社交: 6, 物资: 6 };
  const chCache = {};
  const isCh2 = (ev) => { if (chCache[ev.id] === undefined) chCache[ev.id] = (ev.cond || []).some((c) => /^chapter>=?2/.test(c)); return chCache[ev.id]; };
  const disCache = {};
  const isDis = (ev) => { if (disCache[ev.id] === undefined) disCache[ev.id] = (ev.cond || []).some((c) => /^(disaster|forecast):/.test(c)); return disCache[ev.id]; };
  function pickRandom(night) {
    const S = G.S;
    let pool = DS.EVENTS.filter((ev) => ev.pool === 'random' && !refOnly.has(ev.id) && E.eligible(ev, {}, { night }));
    if (!pool.length) return null;
    // 天灾当天/预警期：优先出天灾小故事
    const dis = pool.filter(isDis);
    if (dis.length && Math.random() < 0.6) return E.instance(U.pick(dis), {});
    // 春天篇：多数时候抽春天篇事件
    if ((S.chapter || 1) >= 2) { const sp = pool.filter(isCh2); if (sp.length && Math.random() < 0.7) pool = sp; }
    const W = Object.assign({}, night ? CAT_W_NIGHT : CAT_W_DAY);
    // 完整度越低越容易遇到战斗；威慑降低；别墅更惹眼
    const integ = S.house.integrity;
    const k = integ >= 90 ? 0.85 : integ >= 70 ? 0.95 : integ >= 50 ? 1.1 : integ >= 30 ? 1.25 : 1.5;
    W.战斗 = (W.战斗 || 0) * k * (1 - G.teamSkill('威慑')) * (S.house.type === '独栋别墅' ? 1.25 : 1) * (S.house.type === '地下堡垒' ? 0.8 : 1) * DS.Ext.mut('fight', 1);
    const cats = Object.keys(W).filter((c) => pool.some((e) => (e.cat || '物资') === c));
    const cat = U.wpick(cats, (c) => W[c]);
    const list = pool.filter((e) => (e.cat || '物资') === cat);
    const ev = U.wpick(list.length ? list : pool, (e) => e.w || 10);
    return ev ? E.instance(ev, {}) : null;
  }
  E.pickNight = function () {
    const S = G.S; if (!refOnly) buildRefs();
    // 夜间剧情
    if (S.queue && S.queue.length) {
      const i = S.queue.findIndex((id) => (DS.EVENT_BY_ID[id] || {}).slot === 'night');
      if (i >= 0) { const id = S.queue.splice(i, 1)[0]; return E.instance(DS.EVENT_BY_ID[id], {}); }
    }
    let p = S.phase === 'apoc' ? 0.42 : 0.12;
    if (S.disaster && S.disaster.active && S.disaster.type === '冰雾') p = Math.min(0.85, p * (S.disaster.prepared ? 1.2 : 2));
    if (Math.random() > p) return null;
    return pickRandom(true);
  };

  // ---------------- 气泡 ----------------
  E.spawnBubbles = function () {
    const S = G.S; if (!refOnly) buildRefs();
    S.bubbles = [];
    const n = U.ri(0, 1) + (S.members.length >= 3 ? 1 : 0) + (S.day <= 3 ? 1 : 0);
    const pool = DS.EVENTS.filter((ev) => ev.pool === 'bubble' && E.eligible(ev, {}));
    U.shuffle(pool).slice(0, n).forEach((ev) => {
      let anchor = 'window', mid = null;
      if (ev.anchor && ev.anchor !== 'member' && ev.anchor !== 'window') {
        const fs = G.furnOf(ev.anchor); if (!fs.length) return; anchor = 'furn:' + U.pick(fs).id;
      } else if (ev.anchor === 'member') {
        const ms = S.members.filter((m) => m.id !== 'me'); if (!ms.length) return; const m = U.pick(ms); anchor = 'member:' + m.id; mid = m.id;
      }
      S.bubbles.push({ id: ev.id, anchor, mid });
    });
  };
  E.bubbleInstance = function (b) {
    const ev = DS.EVENT_BY_ID[b.id]; if (!ev) return null;
    const ctx = {}; if (b.mid) ctx.member = G.byId(b.mid);
    return E.instance(ev, ctx);
  };

  // ---------------- 文本 ----------------
  E.text = function (s, ctx) {
    if (!s) return '';
    const me = G.me(); const m = ctx && ctx.member; const m2 = ctx && ctx.member2;
    return String(s).replace(/\{name\}/g, me.name).replace(/\{他\}/g, me.gender === '女' ? '她' : '他')
      .replace(/\{member\}/g, m ? m.name : '同伴').replace(/\{m他\}/g, m ? (m.gender === '女' ? '她' : '他') : 'TA')
      .replace(/\{member2\}/g, m2 ? m2.name : '另一个同伴').replace(/\{m2他\}/g, m2 ? (m2.gender === '女' ? '她' : '他') : 'TA')
      .replace(/\{pet\}/g, G.S && G.S.pet ? G.S.pet.name : '狗');
  };

  // ---------------- 选项状态 ----------------
  E.optState = function (inst, opt) {
    const reasons = [];
    (opt.req || []).forEach((c) => { if (!E.evalCond(c, inst.ctx)) reasons.push(E.condLabel(c)); });
    const costOk = G.canPay(opt.cost) && (!inst.ctx.explore || true);
    const danger = hasDanger(opt);
    return { ok: !reasons.length && costOk, reasons, costOk, danger };
  };
  function hasDanger(opt) {
    const all = [opt, ...(opt.rnd || []), opt.win || {}, opt.lose || {}];
    return all.some((b) => (b.fx || []).some((f) => /^flag:隐患_/.test(f)));
  }
  const CMPW = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '=': '=' };
  E.condLabel = function (c) {
    const p = pc(c); if (p.err) return c;
    const neg = p.neg ? '非' : '';
    switch (p.k) {
      case 'stat': return `${p.stat}${CMPW[p.op]}${p.v}`;
      case 'item': return `${p.item}${CMPW[p.op]}${p.v}`;
      case 'var': return ({ money: '金钱', crystal: '晶核', intel: '情报', mood: '心情', hp: '生命', members: '人数', integrity: '完整度', temp: '室温', rad: '辐射', day: '天数', energy: '体力', hunger: '饱腹', thirst: '饮水', level: '等级', chapter: '章节', petloyal: '伙伴忠诚', bond: '羁绊' }[p.name] || p.name) + CMPW[p.op] + (p.name === 'money' ? U.money(p.v) : p.v) + (p.pct ? '%' : '');
      case 'member': return `${neg}需要${p.v.join('/')}在队`;
      case 'job': return `需要${p.v.join('/')}`;
      case 'furn': return `${neg}需要${p.v.join('/')}`;
      case 'house': return `${neg}${p.v.join('/')}`;
      case 'flag': case 'flagn': return neg + '条件不足';
      case 'mod': return `${p.mod}改造${CMPW[p.op]}${p.v}`;
      case 'vehicle': return `需要${p.v.join('/')}`;
      case 'aff': return `${p.who}好感${CMPW[p.op]}${p.v}`;
      case 'pet': return p.neg ? '没有伙伴' : '需要伙伴';
      case 'prep': return `${neg}已防备${p.v}`;
      case 'disaster': return `${p.v.join('/')}期间`;
      case 'diff': return `${p.v.join('/')}难度`;
      default: return '条件不足';
    }
  };
  E.costLabel = function (list) {
    return G.parseCostList(list).map((c) => c.item ? `${c.item}×${c.n}` : `${{ money: '¥', crystal: '晶核', intel: '情报' }[c.res]}${c.res === 'money' ? U.money(c.n) : c.n}`);
  };

  // ---------------- 选择 ----------------
  E.choose = function (inst, idx) {
    const S = G.S; const ev = inst.ev; const opt = ev.opts[idx];
    S.fired[ev.id] = S.day;
    S.stats.events++;
    if (opt.cost) G.pay(opt.cost);
    let branch = opt;
    if (opt.rnd) {
      const luck = G.stat(leader(inst.ctx), '运气');
      branch = U.wpick(opt.rnd, (b, i) => b.w * (b === opt.rnd[0] ? 1 + Math.max(0, luck - 4) * 0.04 : 1));
      if (!branch) branch = opt.rnd[0];
    }
    const res = { text: E.text(branch.r || '', inst.ctx), chips: [], actions: {} };
    if (branch !== opt && opt.fx) E.applyFx(opt.fx, inst.ctx, res); // 选项公共效果
    E.applyFx(branch.fx || [], inst.ctx, res);
    if (opt.battle) res.actions.battle = { id: opt.battle, win: opt.win, lose: opt.lose };
    if (opt.next) res.actions.next = opt.next;
    // 日志
    const logText = res.text || E.text(opt.t, inst.ctx);
    if (ev.pool !== 'bubble') G.log(`【${ev.title || ev.cat || '事件'}】${logText}`, STORY.includes(ev.pool) ? 'story' : 'info');
    if ((ev.scene === 'phone' || ev.scene === 'chat') && ev.who) {
      S.chats.push({ who: ev.who, d: S.day, text: E.text(ev.text, inst.ctx), me: E.text(opt.t, inst.ctx), r: res.text });
      if (S.chats.length > 150) S.chats.splice(0, S.chats.length - 150);
      if (S.contacts[ev.who] === undefined && DS.CONTACTS[ev.who]) S.contacts[ev.who] = DS.CONTACTS[ev.who].aff;
    }
    return res;
  };
  E.applyBranch = function (branch, ctx) {
    const res = { text: E.text(branch.r || '', ctx), chips: [], actions: {} };
    E.applyFx(branch.fx || [], ctx, res);
    return res;
  };

  // ---------------- 效果 ----------------
  function chip(res, icon, label, v, good) { res.chips.push({ icon, label, v, good: good === undefined ? v > 0 : good }); }
  const NEED_NAME = { hp: '生命', energy: '体力', hunger: '饱腹', thirst: '饮水', mood: '心情' };
  const NEED_ICON = { hp: '❤️', energy: '⚡', hunger: '🍖', thirst: '💧', mood: '🙂' };

  function bagAdd(ctx, name, n) {
    if (!ctx || !ctx.explore) return G.addItem(name, n);
    const bag = ctx.explore.bag; const cap = ctx.explore.cap;
    let vol = 0; for (const k in bag) vol += (DS.ITEMS[k].vol || 1) * bag[k];
    const it = DS.ITEMS[name]; const can = Math.max(0, Math.min(n, Math.floor((cap - vol) / (it.vol || 1))));
    if (can > 0) bag[name] = (bag[name] || 0) + can;
    return can;
  }
  E.bagAdd = bagAdd;

  function targets(who, ctx) {
    if (who === 'team') return people(ctx);
    if (who === 'm') return ctx.member ? [ctx.member] : [];
    if (who === 'm2') return ctx.member2 ? [ctx.member2] : [];
    return [leader(ctx)];
  }

  E.applyFx = function (list, ctx, res) {
    const S = G.S; ctx = ctx || {}; res = res || { chips: [], actions: {} };
    list.forEach((s) => {
      const p = pf(s); if (p.err) { console.warn(p.err); return; }
      switch (p.k) {
        case 'res': {
          let v = p.v;
          if (p.res === 'intel' && v > 0) v = DS.Sim.gainIntel(v);
          else {
            if (p.res === 'crystal' && v > 0 && ctx.explore) v = Math.round(v * (1 + G.teamSkill('搜寻晶核', ctx.explore.team)));
            if (p.res === 'money' && v > 0) v = Math.round(v * DS.Ext.k('money'));
            S[p.res] = (S[p.res] || 0) + v;
            if (p.res !== 'money' && S[p.res] < 0) S[p.res] = 0;
          }
          chip(res, { money: '💴', crystal: '💎', intel: '📡' }[p.res], { money: '金钱', crystal: '晶核', intel: '情报' }[p.res], v);
          break;
        }
        case 'item': {
          if (p.v > 0) {
            const got = bagAdd(ctx, p.item, p.v);
            chip(res, p.item, p.item, got, true);
            if (got < p.v) chip(res, '📦', (ctx.explore ? '背包' : '仓库') + '满了，丢弃' + p.item, -(p.v - got), false);
          } else {
            let n = -p.v; let r = G.removeItem(p.item, n);
            if (ctx.explore && r < n) { const b = ctx.explore.bag; const k = Math.min(b[p.item] || 0, n - r); if (k) { b[p.item] -= k; if (!b[p.item]) delete b[p.item]; r += k; } }
            if (r) chip(res, p.item, p.item, -r, false);
          }
          break;
        }
        case 'loot': {
          const pool = DS.LOOT_POOLS[p.cat] || []; const picks = U.shuffle(pool).slice(0, p.v);
          let mult = 1;
          if (ctx.explore) {
            const t = ctx.explore.team;
            if (p.cat === '食物' || p.cat === '食材') mult += G.teamSkill('后勤保障', t);
            if (p.cat === '材料') mult += G.teamSkill('就地取材', t);
            if (p.cat === '医疗') mult += G.teamSkill('医药知识', t) * 0.5;
          }
          picks.forEach((name) => {
            const gear = /\d$/.test(p.cat);
            let n = gear ? 1 : Math.max(1, Math.round(U.ri(1, 3) * mult));
            const got = bagAdd(ctx, name, n);
            if (got) chip(res, name, name, got, true);
            else chip(res, '📦', '装不下了：' + name, -n, false);
          });
          break;
        }
        case 'stat': targets(p.who, ctx).forEach((m) => { m.stats[p.stat] = Math.max(1, (m.stats[p.stat] || 0) + p.v); chip(res, '📈', (p.who === 'me' ? '' : m.name + ' ') + p.stat, p.v); }); break;
        case 'need': {
          const ts = targets(p.who, ctx);
          ts.forEach((m) => {
            if (p.need === 'hp') {
              const d = p.pct ? Math.round(G.maxHp(m) * p.v / 100) : p.v;
              m.hp = U.clamp(m.hp + d, 1, G.maxHp(m));
            } else m[p.need] = U.clamp(m[p.need] + p.v, 0, 100);
          });
          if (ts.length) chip(res, NEED_ICON[p.need], (p.who === 'team' ? '全员' : p.who === 'm' || p.who === 'm2' ? ts[0].name : '') + NEED_NAME[p.need], p.pct ? p.v + '%' : p.v, p.v > 0);
          break;
        }
        case 'status': {
          const ts = p.who === 'rnd' ? [U.pick(people(ctx))] : targets(p.who, ctx);
          ts.forEach((m) => {
            // 医生技能降低受伤/患病
            const injury = ['轻伤', '重伤', '骨折', '流血'].includes(p.st);
            if (!ctx.explore && injury && Math.random() < G.teamSkill('健康常识')) { chip(res, '🛡️', '健康常识避免了' + p.st, 0, true); return; }
            if (DS.Sim.addStatus(m, p.st)) chip(res, DS.STATUS[p.st].icon, m.name + ' ' + p.st, '', false);
          });
          break;
        }
        case 'cure': targets(p.who, ctx).forEach((m) => { Object.keys(m.statuses).forEach((s) => { if (p.st === '*' || s === p.st) { delete m.statuses[s]; chip(res, '💚', m.name + ' 治愈' + s, '', true); } }); }); break;
        case 'flag': S.flags[p.name] = true; break;
        case 'flagn': S.flags[p.name] = p.add ? (Number(S.flags[p.name]) || 0) + p.v : p.v; break;
        case 'unflag': delete S.flags[p.name]; break;
        case 'house': {
          const b = (S.house.bonus = S.house.bonus || {});
          if (p.key === 'integrity') { let v = p.v; if (v < 0) v = Math.min(-1, Math.round(v * (1 - Math.min(0.5, G.hstat('def') / 200)) * DS.Ext.k('integ'))); S.house.integrity = U.clamp(S.house.integrity + v, 0, 100); chip(res, '🏠', '完整度', v + '%'); }
          else { b[p.key] = (b[p.key] || 0) + p.v; chip(res, { def: '🛡️', insul: '🧊', antirad: '☢️', cap: '📦' }[p.key], { def: '防御', insul: '保温', antirad: '防辐射', cap: '仓库' }[p.key], p.key === 'insul' || p.key === 'antirad' ? Math.round(p.v * 100) + '%' : p.v, p.v > 0); }
          DS.Sim.refreshEnv();
          break;
        }
        case 'gethouse': E.getHouse(p.v, res); break;
        case 'recruit': {
          if (p.who === 'rnd') { S.pendingRecruit = G.randomRecruit(p.job); res.actions.recruit = true; }
          else if (!S.members.some((m) => m.name === p.who)) {
            const m = G.storyRecruit(p.who);
            if (G.canRecruit()) { S.members.push(m); chip(res, '🤝', p.who + ' 加入了', '', true); G.log(`${p.who}加入了安全屋。`, 'good'); }
            else { S.pendingRecruit = m; res.actions.recruit = true; }
            if (S.contacts[p.who] === undefined && DS.CONTACTS[p.who]) S.contacts[p.who] = DS.CONTACTS[p.who].aff + 20;
          }
          break;
        }
        case 'aff': {
          const cur = E.aff(p.who); S.contacts[p.who] = U.clamp(cur + p.v, -100, 100);
          if (p.v) chip(res, '💬', p.who + ' 好感', p.v);
          break;
        }
        case 'unlock': if (!S.unlocked[p.v]) { S.unlocked[p.v] = true; chip(res, '🔓', '解锁 ' + ({ cook: '烹饪', farm: '种植', craft: '制造', recruit: '招募', explore: '探索', phone: '手机', blackmarket: '黑市', shop: '商店', market: '废土集市', mods: '改造', vehicle: '车行' }[p.v] || p.v), '', true); } break;
        case 'unlockloc': if (!S.explore.locs.includes(p.v)) { S.explore.locs.push(p.v); S.unlocked.explore = true; chip(res, '🗺️', '新地点：' + DS.LOCATIONS.find((l) => l.id === p.v).name, '', true); } break;
        case 'shop': res.actions.shop = p.v; break;
        case 'furn': {
          const f = G.placeFurniture(p.v);
          if (f) chip(res, '🛋️', '获得家具 ' + p.v, '', true);
          else { (S.house.stored = S.house.stored || []).push(p.v); chip(res, '🛋️', p.v + '（没地方放，先收起来）', '', true); }
          break;
        }
        case 'vehicle': if (!S.vehicles.includes(p.v)) { S.vehicles.push(p.v); S.vehicle = E.bestVehicle(); chip(res, DS.VEHICLES[p.v].icon, '获得载具 ' + p.v, '', true); } break;
        case 'sched': S.sched.push({ day: S.day + p.days, id: p.id }); break;
        case 'battle': res.actions.battle = res.actions.battle || { id: p.v, win: null, lose: null }; break;
        case 'goto': res.actions.next = p.id; break;
        case 'ending': res.actions.ending = p.v; break;
        case 'apoc': DS.Sim.apocalypse(); break;
        case 'log': G.log(p.v); break;
        case 'mleave': if (ctx.member && ctx.member.id !== 'me') { DS.Sim.removeMember(ctx.member); chip(res, '🚪', ctx.member.name + ' 离开了', '', false); G.log(ctx.member.name + '离开了。', 'bad'); } break;
        case 'mdie': if (ctx.member && ctx.member.id !== 'me') { chip(res, '🕯️', ctx.member.name + ' 死了', '', false); DS.Sim.kill(ctx.member, 'event'); } break;
        case 'petget': if (!S.pet) { const pet = DS.Pet.adopt(); chip(res, '🐕', '新伙伴：' + pet.name, '', true); } break;
        case 'petleave': if (S.pet) { chip(res, '🐕', S.pet.name + ' 离开了', '', false); DS.Pet.leave(); } break;
        case 'pet': if (S.pet) { const d = DS.Pet.change(p.key, p.v, p.pct); chip(res, '🐕', S.pet.name + ({ loyal: ' 忠诚', hp: ' 生命', hunger: ' 饱腹' }[p.key]), p.pct ? p.v + '%' : d, p.v > 0); } break;
        case 'bond': if (ctx.member && ctx.member2) { const v = DS.Bond.add(ctx.member, ctx.member2, p.v); chip(res, p.v > 0 ? '💞' : '💢', `${ctx.member.name}&${ctx.member2.name} 羁绊`, p.v); if (v >= 80) DS.Ach.unlock('bond80'); } break;
        case 'prep': if (S.disaster && S.disaster.type === p.v && !S.disaster.prepared) { S.disaster.prepared = true; S.prepCount = (S.prepCount || 0) + 1; chip(res, DS.DISASTERS[p.v].icon, '已防备' + p.v, '', true); } break;
      }
    });
    return res;
  };

  E.bestVehicle = () => { const order = ['越野车', '轿车', '摩托车', '步行']; return order.find((v) => G.S.vehicles.includes(v)); };

  E.getHouse = function (type, res) {
    const S = G.S; const old = S.house.type;
    S.house.type = type;
    const lost = G.relayout();
    lost.forEach((f) => (S.house.stored = S.house.stored || []).push(f.type));
    if (res) chip(res, '🏠', '获得安全屋：' + type, '', true);
    G.log(`你拿到了${type}的钥匙。`, 'story');
    if (S.perks.includes('weapon') && !S.flags._weaponPerk) {
      S.flags._weaponPerk = true;
      const a = U.shuffle(DS.LOOT_POOLS.武器3).slice(0, 2);
      a.forEach((w) => { G.addItem(w, 1, true); if (res) chip(res, w, w, 1, true); });
    }
    DS.Sim.refreshEnv();
    return old;
  };
})();
