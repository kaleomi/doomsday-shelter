/* 界面基础：屏幕、弹窗、底部面板、吐司、打字机、键盘 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = DS.U, h = U.h;
  const UI = (DS.UI = {});

  UI.app = () => document.getElementById('app');
  UI.screen = function (el) {
    const app = UI.app();
    Array.from(app.querySelectorAll('.screen')).forEach((s) => s.remove());
    Array.from(app.querySelectorAll('.layer')).forEach((s) => s.remove());
    UI.keyStack = [];
    app.insertBefore(el, app.firstChild);
    return el;
  };

  // ---------------- 键盘 ----------------
  UI.keyStack = [];
  UI.pushKeys = (fn) => { UI.keyStack.push(fn); return () => { UI.keyStack = UI.keyStack.filter((f) => f !== fn); }; };
  UI.baseKeys = null;
  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const top = UI.keyStack[UI.keyStack.length - 1];
    if (top) { if (top(e) !== false) return; }
    if (!top && UI.baseKeys) UI.baseKeys(e);
  });

  // ---------------- 层 ----------------
  UI.layer = function (cls) {
    const el = h('div', { class: 'layer ' + (cls || '') });
    UI.app().appendChild(el);
    return el;
  };

  // ---------------- 吐司 ----------------
  UI.toast = function (text, type, life) {
    let box = UI.app().querySelector('.toasts');
    if (!box) { box = h('div', { class: 'toasts' }); UI.app().appendChild(box); }
    const t = h('div', { class: 'toast ' + (type || ''), style: { '--life': (life || 2.2) + 's' } }, text);
    box.appendChild(t);
    setTimeout(() => t.remove(), ((life || 2.2) + 0.5) * 1000);
    while (box.children.length > 4) box.firstChild.remove();
  };

  // ---------------- 通用弹窗 ----------------
  // opts: { title, cat, catColor, body: el|string, buttons: [{t, cls, v}], dismiss: v }
  UI.modal = function (opts) {
    return new Promise((resolve) => {
      const layer = UI.layer();
      const back = h('div', { class: 'backdrop' });
      const body = typeof opts.body === 'string' ? h('div', { class: 'evtext', html: opts.body }) : opts.body;
      const foot = h('div', { class: 'modal-f' });
      const close = (v) => { off(); layer.remove(); resolve(v); };
      (opts.buttons || [{ t: '确定', cls: 'primary', v: true }]).forEach((b) => {
        foot.appendChild(h('button', { class: 'btn grow ' + (b.cls || ''), onclick: () => { DS.Audio.click(); close(b.v); } }, b.t));
      });
      const m = h('div', { class: 'modal' },
        opts.title ? h('div', { class: 'modal-h' }, opts.cat ? h('span', { class: 'catchip', style: { background: opts.catColor || '#3b5578' } }, opts.cat) : null, h('div', { class: 'ttl' }, opts.title),
          opts.dismiss !== undefined ? h('button', { class: 'icon-btn', style: { width: '30px', height: '30px', fontSize: '15px' }, onclick: () => close(opts.dismiss) }, '✕') : null) : null,
        h('div', { class: 'modal-b' }, body),
        opts.buttons === null ? null : foot);
      if (opts.dismiss !== undefined) back.onclick = () => close(opts.dismiss);
      layer.append(back, m);
      const off = UI.pushKeys((e) => {
        if (e.key === 'Enter' || e.key === ' ') { const b = (opts.buttons || [{ v: true }]); close(b[b.length - 1].v); e.preventDefault(); }
        else if (e.key === 'Escape' && opts.dismiss !== undefined) close(opts.dismiss);
      });
      if (opts.onMount) opts.onMount(m, close);
    });
  };
  UI.confirm = (text, ok, cancel) => UI.modal({ title: '确认', body: h('div', { class: 'evtext' }, text), buttons: [{ t: cancel || '取消', v: false }, { t: ok || '确定', cls: 'primary', v: true }], dismiss: false });
  UI.alert = (title, text) => UI.modal({ title, body: h('div', { class: 'evtext' }, text) });

  // ---------------- 底部面板 ----------------
  // opts: { title, sub, tabs:[{id,t}], tab, render(body, tab, sheet), full, onClose }
  UI.sheet = function (opts) {
    const layer = UI.layer();
    const back = h('div', { class: 'backdrop' });
    const body = h('div', { class: 'sheet-b' });
    const tabsEl = opts.tabs ? h('div', { class: 'tabs' }) : null;
    const sub = h('div', { class: 'sub' }, opts.sub || '');
    const S = { tab: opts.tab || (opts.tabs ? opts.tabs[0].id : null), body, layer, setSub: (t) => { sub.textContent = t; } };
    const close = () => { off(); layer.remove(); if (opts.onClose) opts.onClose(); };
    S.close = close;
    S.refresh = () => {
      if (tabsEl) {
        U.clear(tabsEl);
        opts.tabs.forEach((t) => { if (t.hidden) return; tabsEl.appendChild(h('button', { class: 'tab' + (t.id === S.tab ? ' on' : ''), onclick: () => { DS.Audio.tap(); S.tab = t.id; const st = body.scrollTop; S.refresh(); if (S.keepScroll) body.scrollTop = st; else body.scrollTop = 0; } }, t.t)); });
      }
      const st = body.scrollTop; U.clear(body); opts.render(body, S.tab, S); body.scrollTop = st;
    };
    back.onclick = close;
    const sheet = h('div', { class: 'sheet' + (opts.full ? ' full' : '') },
      h('div', { class: 'sheet-h' }, h('div', { class: 'grow' }, h('div', { class: 'ttl' }, opts.title), sub), opts.headExtra || null, h('button', { class: 'icon-btn', onclick: close }, '✕')),
      tabsEl, body);
    layer.append(back, sheet);
    const off = UI.pushKeys((e) => { if (e.key === 'Escape') { close(); return; } return false; });
    S.refresh();
    return S;
  };

  // ---------------- 打字机 ----------------
  UI.typewriter = function (el, text, opts) {
    opts = opts || {};
    const sp = DS.G.meta.settings.textSpeed;
    if (sp >= 3 || !text) { el.textContent = text; return { done: Promise.resolve(), skip() {} }; }
    let i = 0, stop = false, resolve;
    const done = new Promise((r) => (resolve = r));
    const cursor = h('span', { class: 'cursor' });
    const node = document.createTextNode('');
    U.clear(el); el.append(node, cursor);
    const per = sp === 2 ? 12 : 26;
    function tick() {
      if (stop) return;
      i += sp === 2 ? 2 : 1;
      node.textContent = text.slice(0, i);
      if (i % 3 === 0) DS.Audio.type();
      if (i >= text.length) { finish(); return; }
      setTimeout(tick, per);
    }
    function finish() { stop = true; node.textContent = text; cursor.remove(); resolve(); }
    setTimeout(tick, 60);
    return { done, skip: finish };
  };

  // ---------------- 小部件 ----------------
  UI.bar = function (icon, val, max, color, low) {
    const pct = Math.max(0, Math.min(100, (val / max) * 100));
    return h('div', { class: 'bar' + (low ? ' low' : '') }, h('i', null, icon), h('div', { class: 'track' }, h('div', { class: 'fill', style: { width: pct + '%', background: color } }), h('div', { class: 'val' }, Math.round(val) + '/' + Math.round(max))));
  };
  UI.mini = (v, max, color) => h('div', { class: 'mb' }, h('i', { style: { width: Math.max(0, Math.min(100, (v / max) * 100)) + '%', background: color } }));
  UI.avatar = function (m, cls) { const d = h('div', { class: cls || '', html: DS.Art.avatar(m) }); return d; };
  UI.statusTags = function (m) {
    return h('div', { class: 'sts' }, Object.keys(m.statuses || {}).map((s) => { const st = DS.STATUS[s]; return h('span', { class: 'st', style: { background: st ? st.color : '#555' } }, (st ? st.icon : '') + s); }));
  };
  UI.chipsRow = function (chips) {
    return h('div', { class: 'chips' }, chips.map((c, i) => {
      const isItem = DS.ITEMS[c.icon];
      const ic = isItem ? DS.Art.item(c.icon, { size: 'sm' }) : h('span', { style: { fontSize: '15px', width: '22px', textAlign: 'center' } }, c.icon || '•');
      let v = c.v;
      if (typeof v === 'number') v = (v > 0 ? '+' : '') + (Math.abs(v) >= 10000 ? U.money(v) : v);
      return h('span', { class: 'rchip ' + (c.good ? 'good' : 'bad'), style: { animationDelay: i * 0.05 + 's' } }, ic, h('span', null, c.label), v !== '' && v !== undefined ? h('span', { class: 'v' }, v) : null);
    }));
  };
  UI.CAT_COLOR = { 剧情: '#b5651d', 交易: '#2e86c1', 战斗: '#c0392b', 物资: '#27ae60', 社交: '#8e44ad', 完整度: '#7f8c8d', 维护: '#d35400', 人员: '#16a085', 训练: '#e67e22', 家具: '#a0522d', 探索: '#2c6e8f' };
  UI.CAT_TITLE = { 剧情: '剧情事件', 交易: '交易', 战斗: '危险', 物资: '物资', 社交: '来访', 完整度: '安全屋', 维护: '维护', 人员: '队员', 训练: '训练', 家具: '家具', 探索: '探索' };

  UI.fmtTemp = (t) => (t > 0 ? '+' : '') + t + '℃';
})();
