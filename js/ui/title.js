/* 标题、创建角色（重生系统）、结局图鉴、开场 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art;
  const T = (DS.Title = {});

  T.show = function () {
    UI.baseKeys = null;
    const has = G.hasSave();
    const el = h('div', { class: 'screen title-screen' },
      h('div', { class: 'title-house', html: A.titleHouse() }),
      h('div', { class: 'title-foot' }, h('span', null, '🔁 重生点 ', h('b', { class: 'pts' }, G.meta.points)), h('span', null, G.meta.runs ? `已轮回 ${G.meta.runs} 次 · 最长 ${G.meta.best} 天` : 'v1.0')),
      h('div', { class: 'title-logo' }, h('h1', null, '末日安全屋'), h('div', { class: 'sub' }, '重 生 · 极 寒 · 求 生'), h('div', { class: 'tag' }, '距离末日还有 14 天')),
      h('div', { class: 'title-menu' },
        has ? h('button', { class: 'btn primary', onclick: () => { DS.Audio.unlock(); if (G.load()) DS.Game.start(); } }, '继续游戏') : null,
        h('button', { class: 'btn ' + (has ? '' : 'primary'), onclick: async () => { DS.Audio.unlock(); if (has && !(await UI.confirm('开始新的一局会覆盖当前存档，确定吗？', '重新开始'))) return; T.create(); } }, '新的开始'),
        h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => T.gallery() }, '📜 结局图鉴'), h('button', { class: 'btn small', onclick: () => T.help() }, '❓ 玩法说明'))));
    UI.screen(el);
    UI.baseKeys = (e) => { if (e.key === 'Enter') { if (has) { if (G.load()) DS.Game.start(); } else T.create(); } };
  };

  T.gallery = function () {
    UI.sheet({
      title: '结局图鉴', sub: `已达成 ${Object.keys(G.meta.endings).length}/${DS.ENDINGS.length}`,
      render(body) {
        const g = h('div', { class: 'gallery' });
        DS.ENDINGS.forEach((e) => {
          const got = G.meta.endings[e.id];
          g.appendChild(h('div', { class: 'gal' + (got ? (e.good ? ' good' : '') : ' lock') }, h('div', { class: 'ic' }, e.icon), h('div', { class: 'nm' }, got ? e.id : '？？？'), h('div', { class: 'ds' }, got ? e.text : e.how), h('div', { class: 'tiny warn', style: { marginTop: '4px' } }, `重生点 +${e.pts}` + (got ? `　达成 ${got} 次` : ''))));
        });
        body.appendChild(g);
      },
    });
  };

  T.help = function () {
    const p = (t) => h('p', { style: { margin: '0 0 10px', lineHeight: 1.8 } }, t);
    UI.sheet({
      title: '玩法说明',
      render(body) {
        body.append(
          p('🔁 你重生回到了极寒末日降临前的第 14 天。前世你死于好兄弟的背刺，这一次，你要活下去。'),
          p('⏩ 每按一次【行动】，时间推进 3 小时，可能会发生事件。每天 6 个时段，晚上【就寝】进入下一天。'),
          p('💴 末日前（第 1–14 天）用金钱：贷款、卖房，选一处安全屋，买家具、囤物资、做改造。第 15 天末日降临后，金钱作废，晶核才是硬通货。'),
          p('🍖 注意饱腹、饮水、体力和心情。仓库里有吃的时会自动补给。饿死、渴死、病死、冻死、战死、精神崩溃……都会结束这一世。'),
          p('🌡️ 室外会冷到零下一百多度。室内温度取决于保温改造和壁炉（每天烧木柴）。之后还有“蓝辉”辐射，需要防辐射改造。'),
          p('🛋️ 点击屋里的家具，可以指派队员去睡觉、锻炼、阅读、种菜、做饭、制造……时间推进时自动结算。'),
          p('🧭 末日后可以组队探索城市：在格子地图里捡物资、躲开或击败敌人，走到 ❗ 完成线路。'),
          p('🏆 活过 100 天会根据安全屋和你的选择进入不同结局。每个结局都会给重生点，用来在下一世激活“重生系统”。'),
          p('⌨️ 电脑上：空格行动，数字键选择选项，方向键在探索中移动。'));
      },
    });
  };

  // ---------------- 创建角色 ----------------
  T.create = function () {
    let gender = U.pick(['男', '女']);
    let name = G.randomName(gender);
    const jobs = Object.keys(DS.JOBS);
    let job = U.pick(jobs);
    let rerolls = 5;
    let look = G.randomLook(gender);
    let skills = G.rollSkills(job, false);
    const chosen = new Set();
    const el = h('div', { class: 'screen create' });
    function spent() { let s = 0; chosen.forEach((id) => (s += DS.PERKS.find((p) => p.id === id).cost)); return s; }
    function reroll() { job = U.pick(jobs); skills = G.rollSkills(job, false); look = G.randomLook(gender); }
    function render() {
      U.clear(el);
      const m = { name, gender, job, look, id: 'preview' };
      const J = DS.JOBS[job];
      const qBest = skills.map((s) => s[1]).sort((a, b) => 'SABC'.indexOf(a) - 'SABC'.indexOf(b))[0];
      el.append(
        h('h2', null, '重生者'),
        h('div', { class: 'row', style: { alignItems: 'stretch' } },
          h('div', { class: 'portrait', html: A.avatar(m) }, h('span', { class: 'q tag-q q-' + qBest }, qBest)),
          h('div', { class: 'grow col' },
            h('div', { class: 'seg' }, ['男', '女'].map((g) => h('button', { class: gender === g ? 'on' : '', onclick: () => { if (gender !== g) { gender = g; name = G.randomName(g); look = G.randomLook(g); render(); } } }, g))),
            h('div', { class: 'row' }, h('input', { class: 'input', value: name, maxlength: 6, oninput: (e) => (name = e.target.value.trim() || name) }), h('button', { class: 'icon-btn', title: '随机名字', onclick: () => { name = G.randomName(gender); render(); } }, '🎲')),
            h('div', { class: 'row' }, h('div', { class: 'pill', style: { fontSize: '13px', padding: '6px 10px' } }, J.icon + ' 前世职业：' + job), h('div', { class: 'grow' }),
              h('button', { class: 'btn small primary' + (rerolls ? '' : ' disabled'), onclick: () => { if (!rerolls) return; rerolls--; reroll(); DS.Audio.tap(); render(); } }, `刷新 ${rerolls}/5`)))),
        h('h3', { class: 'sec' }, '能力'),
        h('div', { class: 'col' }, skills.map(([s, q]) => DS.Panels.skillRow({ lv: 1, skills }, s, q))),
        h('h3', { class: 'sec' }, '初始属性'),
        h('div', { class: 'statgrid' }, ['力量', '灵巧', '学识', '运气', '速度', '防御'].map((s) => h('div', { class: 's' }, s, h('b', null, (J.base[s] || 3) + (s === '力量' && chosen.has('strong') ? 3 : 0)))), h('div', { class: 's' }, '生命', h('b', null, J.base.hp))),
        h('h3', { class: 'sec' }, `重生系统　🔁 ${G.meta.points - spent()} / ${G.meta.points}`),
        G.meta.points === 0 && !G.meta.runs ? h('div', { class: 'small muted', style: { marginBottom: '8px' } }, '第一世没有重生点。达成结局后获得重生点，下一世可以激活这些系统。') : null,
        h('div', { class: 'col' }, DS.PERKS.map((p) => {
          const on = chosen.has(p.id); const can = on || G.meta.points - spent() >= p.cost;
          return h('div', { class: 'perk' + (on ? ' on' : '') + (can ? '' : ' lock'), onclick: () => { if (on) chosen.delete(p.id); else if (can) chosen.add(p.id); else { UI.toast('重生点不足'); return; } DS.Audio.tap(); render(); } },
            h('div', { class: 'ic' }, p.icon), h('div', { class: 'grow' }, h('div', { class: 'nm', style: { fontWeight: 700 } }, p.name), h('div', { class: 'small muted' }, p.desc)), h('div', { class: 'price' }, on ? '✔' : '🔁' + p.cost));
        })),
        h('div', { style: { height: '10px' } }),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => T.show() }, '返回'), h('button', { class: 'btn primary grow', style: { padding: '13px', fontSize: '16px', letterSpacing: '3px' }, onclick: start }, '开始重生')));
    }
    function start() {
      const cost = spent();
      G.meta.points -= cost; G.saveMeta();
      G.clearSave();
      G.newGame({ name: name.slice(0, 6), gender, job, look, skills, perks: Array.from(chosen) });
      DS.Events.planDay();
      G.save();
      T.intro().then(() => DS.Game.start());
    }
    render();
    UI.screen(el);
  };

  // ---------------- 开场 ----------------
  T.intro = function () {
    return new Promise((resolve) => {
      const lines = [
        ['night', '暴雪夜。你蜷在废墟里，把最后半块饼干递给了认识十年的兄弟——周恪。'],
        ['blood', '刀尖从背后刺进来的时候，你甚至没听见他的脚步声。“对不住，物资只够一个人活。”'],
        ['room', '……你猛地坐起。窗外是刺眼的夏日阳光，空调嗡嗡作响。'],
        ['phone', '手机屏幕亮着：2049 年 8 月 1 日 05:50。距离那场寒潮，还有 14 天。'],
        ['city', '这一次，你知道会发生什么。'],
      ];
      let i = 0;
      const layer = UI.layer();
      const box = h('div', { style: { position: 'absolute', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', cursor: 'pointer' } });
      const pic = h('div', { class: 'scene', style: { height: '180px', marginBottom: '20px', transition: 'opacity .4s' } });
      const txt = h('div', { class: 'evtext', style: { fontSize: '17px', minHeight: '90px', textAlign: 'center' } });
      const skip = h('button', { class: 'btn small ghost', style: { position: 'absolute', right: '12px', top: 'calc(12px + var(--safe-t))' }, onclick: (e) => { e.stopPropagation(); done(); } }, '跳过 ›');
      const hint = h('div', { class: 'tiny dim', style: { position: 'absolute', bottom: 'calc(24px + var(--safe-b))', left: 0, right: 0, textAlign: 'center' } }, '点击继续');
      box.append(pic, txt, skip, hint);
      layer.appendChild(box);
      let tw = null;
      function show() {
        const [sc, t] = lines[i];
        pic.innerHTML = A.scene(sc, 'intro' + i, { hour: i < 2 ? 23 : 6, apoc: i < 2 });
        tw = UI.typewriter(txt, t);
      }
      function next() { if (tw && txt.querySelector('.cursor')) { tw.skip(); return; } i++; if (i >= lines.length) return done(); show(); }
      function done() { off(); layer.remove(); resolve(); }
      box.onclick = next;
      const off = UI.pushKeys((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); } else if (e.key === 'Escape') done(); });
      show();
    });
  };
})();
