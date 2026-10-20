/* 事件条件 / 效果 DSL 解析器。引擎与校验脚本共用。 */
(function () {
  const DS = (window.DS = window.DS || {});

  const STATS = ['力量', '灵巧', '学识', '运气', '速度', '防御'];
  const NEEDS = ['hp', 'energy', 'hunger', 'thirst', 'mood'];
  const UNLOCKS = ['cook', 'farm', 'craft', 'recruit', 'explore', 'phone', 'blackmarket', 'shop', 'market', 'mods', 'vehicle'];
  const HOUSE_KEYS = ['def', 'integrity', 'insul', 'antirad', 'cap'];
  const LOOT_CATS = ['食物', '食材', '材料', '医疗', '武器1', '武器2', '武器3', '防具1', '防具2', '防具3', '鞋子1', '鞋子2', '鞋子3'];
  const CMP = /^(>=|<=|>|<|=)/;

  function num(s) { const n = Number(s); return isNaN(n) ? null : n; }
  function splitCmp(s) {
    // "力量>=7" -> ['力量','>=',7]
    const m = s.match(/^(.+?)(>=|<=|>|<|=)(-?[\d.]+%?)$/);
    if (!m) return null;
    return [m[1], m[2], m[3]];
  }
  function cmp(a, op, b) {
    switch (op) { case '>=': return a >= b; case '<=': return a <= b; case '>': return a > b; case '<': return a < b; case '=': return a == b; }
    return false;
  }

  // ---------- 条件解析 ----------
  // 返回 {k, ...} 或 {err}
  function parseCond(str) {
    let s = String(str).trim();
    let neg = false;
    if (s.startsWith('!')) { neg = true; s = s.slice(1); }
    let m;
    if (s === 'apoc') return { k: 'apoc', neg };
    if ((m = s.match(/^flag:([^><=!]+)$/))) return { k: 'flag', name: m[1], neg };
    if ((m = s.match(/^flag:(.+?)(>=|<=|>|<|=)(-?\d+)$/))) return { k: 'flagn', name: m[1], op: m[2], v: +m[3], neg };
    if ((m = s.match(/^house:(.+)$/))) return { k: 'house', v: m[1].split('|'), neg };
    if ((m = s.match(/^member:(.+)$/))) return { k: 'member', v: m[1].split('|'), neg };
    if ((m = s.match(/^job:(.+)$/))) return { k: 'job', v: m[1].split('|'), neg };
    if ((m = s.match(/^furn:(.+)$/))) return { k: 'furn', v: m[1].split('|'), neg };
    if ((m = s.match(/^vehicle:(.+)$/))) return { k: 'vehicle', v: m[1].split('|'), neg };
    if ((m = s.match(/^gender:(男|女)$/))) return { k: 'gender', v: m[1], neg };
    if ((m = s.match(/^loc:(.+)$/))) return { k: 'loc', v: m[1].split('|'), neg };
    if ((m = s.match(/^ending:(.+)$/))) return { k: 'ending', v: m[1], neg };
    if ((m = s.match(/^chance:([\d.]+)$/))) return { k: 'chance', v: +m[1], neg };
    if ((m = s.match(/^stat:(.+)$/))) { const c = splitCmp(m[1]); if (!c) return { err: '格式应为 stat:力量>=7' }; return { k: 'stat', stat: c[0], op: c[1], v: +c[2], neg }; }
    if ((m = s.match(/^item:(.+)$/))) { const c = splitCmp(m[1]); if (!c) return { err: '格式应为 item:木柴>=5' }; return { k: 'item', item: c[0], op: c[1], v: +c[2], neg }; }
    if ((m = s.match(/^mod:(.+)$/))) { const c = splitCmp(m[1]); if (!c) return { err: '格式应为 mod:防御>=2' }; return { k: 'mod', mod: c[0], op: c[1], v: +c[2], neg }; }
    if ((m = s.match(/^contact:(.+)$/))) { const c = splitCmp(m[1]); if (!c) return { err: '格式应为 contact:周恪>=20' }; return { k: 'aff', who: c[0], op: c[1], v: +c[2], neg }; }
    const c = splitCmp(s);
    if (c && ['money', 'crystal', 'intel', 'mood', 'hp', 'members', 'integrity', 'temp', 'outtemp', 'rad', 'day', 'rebirth', 'energy', 'hunger', 'thirst', 'level'].includes(c[0])) {
      let v = c[2]; let pct = false;
      if (String(v).endsWith('%')) { pct = true; v = v.slice(0, -1); }
      return { k: 'var', name: c[0], op: c[1], v: +v, pct, neg };
    }
    return { err: '无法识别的条件: ' + str };
  }

  // ---------- 效果解析 ----------
  function parseFx(str) {
    const s = String(str).trim();
    let m;
    if (s === 'apoc') return { k: 'apoc' };
    if (s === 'm.leave') return { k: 'mleave' };
    if (s === 'm.die') return { k: 'mdie' };
    if ((m = s.match(/^(money|crystal|intel):([+-]\d+)$/))) return { k: 'res', res: m[1], v: +m[2] };
    if ((m = s.match(/^item:(.+?):([+-]\d+)$/))) return { k: 'item', item: m[1], v: +m[2] };
    if ((m = s.match(/^loot:(.+?):(\d+)$/))) return { k: 'loot', cat: m[1], v: +m[2] };
    if ((m = s.match(/^(m\.|team\.)?stat:(.+?):([+-]\d+)$/))) return { k: 'stat', who: m[1] ? m[1].slice(0, -1) : 'me', stat: m[2], v: +m[3] };
    if ((m = s.match(/^(m\.|team\.)?(hp|energy|hunger|thirst|mood):([+-]\d+)(%?)$/))) return { k: 'need', who: m[1] ? m[1].slice(0, -1) : 'me', need: m[2], v: +m[3], pct: !!m[4] };
    if ((m = s.match(/^m\.loyal:([+-]\d+)$/))) return { k: 'need', who: 'm', need: 'mood', v: +m[1], pct: false };
    if ((m = s.match(/^(m\.)?status:(rnd:)?(.+)$/))) return { k: 'status', who: m[1] ? 'm' : (m[2] ? 'rnd' : 'me'), st: m[3] };
    if ((m = s.match(/^(m\.|team\.)?cure:(.+)$/))) return { k: 'cure', who: m[1] ? m[1].slice(0, -1) : 'me', st: m[2] };
    if ((m = s.match(/^flag:([^:]+)$/))) return { k: 'flag', name: m[1], v: true };
    if ((m = s.match(/^flag:(.+?):([+-]?\d+)$/))) return { k: 'flagn', name: m[1], v: +m[2], add: /^[+-]/.test(m[2]) };
    if ((m = s.match(/^unflag:(.+)$/))) return { k: 'unflag', name: m[1] };
    if ((m = s.match(/^house:get:(.+)$/))) return { k: 'gethouse', v: m[1] };
    if ((m = s.match(/^house:(\w+):([+-][\d.]+)$/))) return { k: 'house', key: m[1], v: +m[2] };
    if ((m = s.match(/^recruit:(.+)$/))) { const p = m[1].split(':'); return { k: 'recruit', who: p[0], job: p[1] || null }; }
    if ((m = s.match(/^aff:(.+?):([+-]\d+)$/))) return { k: 'aff', who: m[1], v: +m[2] };
    if ((m = s.match(/^contact:(.+)$/))) return { k: 'aff', who: m[1], v: 0 };
    if ((m = s.match(/^unlock:loc:(.+)$/))) return { k: 'unlockloc', v: m[1] };
    if ((m = s.match(/^unlock:(.+)$/))) return { k: 'unlock', v: m[1] };
    if ((m = s.match(/^shop:(.+)$/))) return { k: 'shop', v: m[1] };
    if ((m = s.match(/^furn:(.+)$/))) return { k: 'furn', v: m[1] };
    if ((m = s.match(/^vehicle:(.+)$/))) return { k: 'vehicle', v: m[1] };
    if ((m = s.match(/^sched:(\d+):(.+)$/))) return { k: 'sched', days: +m[1], id: m[2] };
    if ((m = s.match(/^battle:(.+)$/))) return { k: 'battle', v: m[1] };
    if ((m = s.match(/^goto:(.+)$/))) return { k: 'goto', id: m[1] };
    if ((m = s.match(/^ending:(.+)$/))) return { k: 'ending', v: m[1] };
    if ((m = s.match(/^log:(.+)$/))) return { k: 'log', v: m[1] };
    return { err: '无法识别的效果: ' + str };
  }

  // ---------- 校验（返回错误列表）----------
  function checkCond(c, ctx) {
    const p = parseCond(c); const e = [];
    if (p.err) return [p.err];
    if (p.k === 'house') p.v.forEach((h) => { if (h !== 'none' && !DS.HOUSES[h]) e.push('未知安全屋: ' + h); });
    if (p.k === 'member') p.v.forEach((h) => { if (!DS.STORY_RECRUITS[h]) e.push('未知剧情人物: ' + h); });
    if (p.k === 'job') p.v.forEach((h) => { if (!DS.JOBS[h]) e.push('未知职业: ' + h); });
    if (p.k === 'furn') p.v.forEach((h) => { if (!DS.FURNITURE[h]) e.push('未知家具: ' + h); });
    if (p.k === 'vehicle') p.v.forEach((h) => { if (h !== 'none' && !DS.VEHICLES[h]) e.push('未知载具: ' + h); });
    if (p.k === 'loc') p.v.forEach((h) => { if (!DS.LOCATIONS.find((l) => l.id === h)) e.push('未知地点: ' + h); });
    if (p.k === 'stat' && !STATS.includes(p.stat)) e.push('未知属性: ' + p.stat);
    if (p.k === 'item' && !DS.ITEMS[p.item]) e.push('未知物品: ' + p.item);
    if (p.k === 'mod' && !DS.MODS[p.mod]) e.push('未知改造: ' + p.mod);
    if (p.k === 'aff' && !DS.CONTACTS[p.who]) e.push('未知联系人: ' + p.who);
    if (p.k === 'ending' && !DS.ENDINGS.find((x) => x.id === p.v)) e.push('未知结局: ' + p.v);
    return e;
  }
  function checkFx(f, ctx) {
    const p = parseFx(f); const e = [];
    if (p.err) return [p.err];
    if (p.k === 'item' && !DS.ITEMS[p.item]) e.push('未知物品: ' + p.item);
    if (p.k === 'loot' && !LOOT_CATS.includes(p.cat)) e.push('未知掉落类别: ' + p.cat + '（可用: ' + LOOT_CATS.join('/') + '）');
    if (p.k === 'stat' && !STATS.includes(p.stat)) e.push('未知属性: ' + p.stat);
    if (p.k === 'status' && !DS.STATUS[p.st]) e.push('未知状态: ' + p.st);
    if (p.k === 'cure' && p.st !== '*' && !DS.STATUS[p.st]) e.push('未知状态: ' + p.st);
    if (p.k === 'house' && !HOUSE_KEYS.includes(p.key)) e.push('未知安全屋属性: ' + p.key);
    if (p.k === 'gethouse' && !DS.HOUSES[p.v]) e.push('未知安全屋: ' + p.v);
    if (p.k === 'recruit') {
      if (p.who !== 'rnd' && !DS.STORY_RECRUITS[p.who]) e.push('未知剧情人物: ' + p.who);
      if (p.job && !DS.JOBS[p.job]) e.push('未知职业: ' + p.job);
    }
    if (p.k === 'aff' && !DS.CONTACTS[p.who]) e.push('未知联系人: ' + p.who);
    if (p.k === 'unlock' && !UNLOCKS.includes(p.v)) e.push('未知解锁项: ' + p.v);
    if (p.k === 'unlockloc' && !DS.LOCATIONS.find((l) => l.id === p.v)) e.push('未知地点: ' + p.v);
    if (p.k === 'shop' && !DS.SHOPS[p.v]) e.push('未知商店: ' + p.v);
    if (p.k === 'furn' && !DS.FURNITURE[p.v]) e.push('未知家具: ' + p.v);
    if (p.k === 'vehicle' && !DS.VEHICLES[p.v]) e.push('未知载具: ' + p.v);
    if (p.k === 'battle' && !DS.BATTLES[p.v]) e.push('未知战斗模板: ' + p.v);
    if (p.k === 'ending' && !DS.ENDINGS.find((x) => x.id === p.v)) e.push('未知结局: ' + p.v);
    if ((p.k === 'sched' || p.k === 'goto') && ctx && ctx.ids && !ctx.ids.has(p.id)) e.push('引用了不存在的事件: ' + p.id);
    return e;
  }

  DS.DSL = { parseCond, parseFx, checkCond, checkFx, cmp, STATS, NEEDS, LOOT_CATS, UNLOCKS };

  // 内容注册
  DS.EVENTS = DS.EVENTS || [];
  DS.EVENT_BY_ID = DS.EVENT_BY_ID || {};
  DS.addEvents = function (pool, list) {
    list.forEach((ev) => {
      ev.pool = pool;
      DS.EVENTS.push(ev);
      if (DS.EVENT_BY_ID[ev.id]) console.warn('重复事件ID', ev.id);
      DS.EVENT_BY_ID[ev.id] = ev;
    });
  };
  DS.RECRUIT_BIOS = DS.RECRUIT_BIOS || [];
})();
