/* 战斗界面 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, G = DS.G, h = U.h, UI = DS.UI, A = DS.Art, C = DS.Combat;
  const B = (DS.BattleUI = {});

  // opts: { ctx (事件上下文), team: [members], explore: exploreCtx, foes: custom }
  B.run = function (tpl, opts) {
    opts = opts || {};
    const S = G.S;
    const ex = opts.explore || (opts.ctx && opts.ctx.explore);
    let team;
    if (ex) team = ex.team.filter((m) => G.S.members.includes(m));
    else {
      const home = G.home().filter((m) => !m.statuses.濒死);
      const me = G.me();
      const others = home.filter((m) => m !== me).sort((a, b) => G.power(b) - G.power(a)).slice(0, 4);
      team = [me, ...others];
    }
    const lvBase = ex ? DS.Explore.loc(ex.loc).lv + (S.exploring ? S.exploring.route : 0) : G.threat();
    const V = DS.VEHICLES[S.vehicle];
    const b = C.create(tpl, team, { lvBase, ctx: ex ? 'explore' : 'home', ram: ex ? V.ram : 0, ramN: ex ? Math.max(1, Math.round(V.seats / 2)) : 0 });
    return new Promise((resolve) => {
      const layer = UI.layer();
      const scr = h('div', { class: 'screen battle', style: { position: 'absolute' } });
      layer.appendChild(scr);
      const foesEl = h('div', { class: 'bside' }), allyEl = h('div', { class: 'bside' });
      const logEl = h('div', { class: 'blog' });
      const spdBtn = h('button', { class: 'btn small' });
      const head = h('div', { class: 'battle-h' }, h('div', { class: 'ttl' }, '⚔ ' + b.name), spdBtn);
      const ctl = h('div', { class: 'bctl' },
        h('button', { class: 'btn grow', onclick: () => itemMenu() }, '💊 道具'),
        h('button', { class: 'btn grow', onclick: () => tryRetreat() }, '🏃 撤退'),
        h('button', { class: 'btn primary grow', onclick: () => { skip = true; } }, '⏩ 跳过'));
      scr.append(head, foesEl, h('div', { class: 'vs' }, 'V S'), allyEl, logEl, ctl);
      let skip = false, paused = false, ended = false;
      const unitEls = {};
      function setSpd() { spdBtn.textContent = '速度 ' + G.meta.settings.battleSpeed + '×'; }
      spdBtn.onclick = () => { const s = G.meta.settings; s.battleSpeed = s.battleSpeed === 1 ? 2 : s.battleSpeed === 2 ? 4 : 1; G.saveMeta(); setSpd(); };
      setSpd();
      function unitCard(u) {
        const face = u.side === 'a' ? h('div', { class: 'face', html: A.avatar(u.m) }) : h('div', { class: 'face' }, u.icon);
        const el = h('div', { class: 'bunit ' + (u.side === 'a' ? 'ally' : 'foe'), onclick: () => { if (u.side === 'f' && u.alive) { b.focus = u.uid; DS.Audio.tap(); renderUnits(); } } },
          u.boss ? h('div', { class: 'boss' }, 'BOSS') : null, face, h('div', { class: 'nm' }, u.name + (u.lv ? ' Lv' + u.lv : '')), h('div', { class: 'hpb' }, h('i')), h('div', { class: 'hpt' }));
        unitEls[u.uid] = el; return el;
      }
      b.foes.forEach((u) => foesEl.appendChild(unitCard(u)));
      b.allies.forEach((u) => allyEl.appendChild(unitCard(u)));
      function renderUnits() {
        b.foes.concat(b.allies).forEach((u) => {
          const el = unitEls[u.uid];
          el.querySelector('.hpb i').style.width = Math.max(0, u.hp / u.maxHp * 100) + '%';
          el.querySelector('.hpt').textContent = Math.max(0, Math.round(u.hp)) + '/' + u.maxHp + (u.st.poison ? ' 🤢' : '') + (u.st.stun ? ' 💫' : '') + (u.st.bleed ? ' 🩸' : '');
          el.classList.toggle('dead', !u.alive);
          el.classList.toggle('focus', b.focus === u.uid && u.alive);
        });
      }
      function addLog(text, cls) { if (!text) return; logEl.insertBefore(h('div', { class: cls || '' }, text), logEl.firstChild); }
      b.log.forEach((r) => addLog(r.t, 'n'));
      addLog(`遭遇 ${b.name}！点击敌人可以集火。`, 'n');
      renderUnits();
      function floatDmg(uid, text, cls) { const el = unitEls[uid]; if (!el) return; const d = h('div', { class: 'dmg ' + (cls || '') }, text); el.appendChild(d); setTimeout(() => d.remove(), 900); if (cls !== 'heal' && cls !== 'miss') { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } }
      function play(rec) {
        if (!rec) return;
        Object.values(unitEls).forEach((e) => e.classList.remove('acting'));
        if (rec.actor && unitEls[rec.actor]) unitEls[rec.actor].classList.add('acting');
        let crit = false;
        rec.hits.forEach((x) => {
          if (x.miss) { floatDmg(x.uid, '闪避', 'miss'); DS.Audio.miss(); }
          else if (x.heal) { floatDmg(x.uid, '+', 'heal'); DS.Audio.heal(); }
          else { floatDmg(x.uid, (x.dot ? x.dot : '-') + x.dmg, x.crit ? 'crit' : ''); if (x.crit) crit = true; }
        });
        if (rec.hits.some((x) => x.dmg)) (crit ? DS.Audio.crit : DS.Audio.hit)();
        addLog(rec.text + (rec.notes.length ? '　' + rec.notes.join('，') : ''));
        renderUnits();
      }
      async function loop() {
        await U.sleep(500);
        while (!b.over) {
          if (paused) { await U.sleep(100); continue; }
          if (skip) { C.resolveAll(b); renderUnits(); break; }
          const rec = C.step(b);
          play(rec);
          await U.sleep(620 / G.meta.settings.battleSpeed);
        }
        finish();
      }
      async function tryRetreat() {
        if (b.over || ended) return;
        paused = true;
        const r = C.retreat(b);
        if (r.ok) { addLog('你们成功撤退了！', 'n'); DS.Audio.confirm(); }
        else { play(r.rec); DS.Audio.bad(); }
        paused = false;
      }
      function itemMenu() {
        if (b.over || ended) return;
        paused = true;
        const meds = Object.keys(S.inv).filter((n) => { const it = DS.ITEMS[n]; return (it.cat === '医疗' && (it.eat && it.eat.hp || it.cure)) || (it.cat === '食物' && it.eat && it.eat.hp); });
        if (!meds.length) { UI.toast('没有能在战斗中用的药品'); paused = false; return; }
        const sh = UI.sheet({
          title: '使用道具（' + (3 - b.items) + ' 次）', onClose: () => (paused = false),
          render(body) {
            const list = h('div', { class: 'list' });
            meds.forEach((n) => list.appendChild(h('div', { class: 'li' }, A.item(n, { count: S.inv[n] }), h('div', { class: 'grow' }, h('div', { class: 'nm' }, n), h('div', { class: 'ds' }, DS.Panels.effDesc(DS.ITEMS[n]))),
              h('div', { class: 'row', style: { flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '150px' } }, b.allies.filter((u) => u.alive).map((u) => h('button', { class: 'btn small', onclick: () => { const err = C.useItem(b, u.uid, n); if (err) UI.toast(err); else { play(b.log[b.log.length - 1]); } sh.close(); } }, u.name))))));
            body.appendChild(list);
          },
        });
      }
      function finish() {
        if (ended) return; ended = true;
        Object.values(unitEls).forEach((e) => e.classList.remove('acting'));
        const out = C.finish(b, { explore: ex, home: !ex && opts.raid !== false && (opts.raid || !opts.ctx) });
        if (out.meDead) {
          DS.Audio.lose();
          setTimeout(() => { layer.remove(); DS.Sim.kill(G.me(), 'battle'); resolve(out); }, 1200);
          addLog('你倒在了血泊里……', 'n');
          return;
        }
        (out.win ? DS.Audio.win : DS.Audio.lose)();
        const chips = [];
        if (out.crystal) chips.push({ icon: '💎', label: '晶核', v: out.crystal, good: true });
        Object.keys(out.loot).forEach((k) => chips.push({ icon: k, label: k, v: out.loot[k], good: true }));
        Object.keys(out.exp).forEach((k) => chips.push({ icon: '✨', label: k + ' 经验', v: out.exp[k], good: true }));
        out.ups.forEach((t) => chips.push({ icon: '⬆️', label: t, v: '', good: true }));
        out.hurt.forEach((t) => chips.push({ icon: '🩸', label: t, v: '', good: false }));
        out.down.forEach((t) => chips.push({ icon: '💀', label: t + ' 濒死', v: '', good: false }));
        if (out.integrity) chips.push({ icon: '🧱', label: '完整度', v: out.integrity + '%', good: false });
        (out.lost || []).forEach((t) => chips.push({ icon: '📦', label: '被抢走 ' + t, v: '', good: false }));
        const body = h('div', null, h('div', { class: 'result-text' }, out.win ? '战斗胜利！' : out.fled ? '你们撤了出来。' : '战斗失败……'), UI.chipsRow(chips));
        setTimeout(() => {
          UI.modal({ title: out.win ? '胜利' : out.fled ? '撤退' : '失败', cat: '战斗', catColor: out.win ? '#2f8a4c' : '#a03030', body }).then(() => { layer.remove(); resolve(out); });
        }, 500);
      }
      loop();
    });
  };
})();
