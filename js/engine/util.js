/* 通用工具 */
(function () {
  const DS = (window.DS = window.DS || {});
  const U = {};

  U.rand = Math.random;
  U.ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.rf = (a, b) => a + Math.random() * (b - a);
  U.chance = (p) => Math.random() < p;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  U.wpick = (list, wfn) => {
    const ws = list.map(wfn); const tot = ws.reduce((s, w) => s + Math.max(0, w), 0);
    if (tot <= 0) return null;
    let r = Math.random() * tot;
    for (let i = 0; i < list.length; i++) { r -= Math.max(0, ws[i]); if (r <= 0) return list[i]; }
    return list[list.length - 1];
  };
  U.range = (s) => { // "3-5" or [3,5] or 3
    if (Array.isArray(s)) return U.ri(s[0], s[1]);
    if (typeof s === 'string' && s.includes('-')) { const [a, b] = s.split('-').map(Number); return U.ri(a, b); }
    return Number(s) || 0;
  };
  U.uid = () => Math.random().toString(36).slice(2, 9);
  U.deep = (o) => JSON.parse(JSON.stringify(o));

  U.money = (n) => {
    const neg = n < 0; n = Math.abs(Math.round(n));
    let s;
    if (n >= 100000000) s = (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '亿';
    else if (n >= 10000) s = (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
    else s = String(n);
    return (neg ? '-' : '') + s;
  };
  U.num = (n) => { n = Math.round(n); return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '万' : String(n); };
  U.pct = (v) => Math.round(v * 100) + '%';
  U.sign = (n) => (n > 0 ? '+' : '') + n;
  U.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // DOM 小工具
  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (v[sk] === null || v[sk] === undefined) continue; if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach((c) => { if (c === null || c === undefined || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  };
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 安全的本地存储
  U.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  DS.U = U;
})();
