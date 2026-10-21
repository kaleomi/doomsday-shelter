/* 小游戏：电脑桌上那台捡来的旧电脑 —— 2048 / 贪吃蛇
 * DS.Mini.open('g2048' | 'snake', { title }) → Promise<{ kind, score, best, maxTile(仅 2048), quit }>
 *   离开时 resolve；quit = 离开时这一局还没结束。重新开始后什么都没动就离开，则汇报上一局。
 * 最高分：DS.G.meta.mini = { g2048, snake }，刷新纪录时调用 DS.G.saveMeta()。
 * 依赖 DS.U（h / clear）；DS.UI、DS.Audio、DS.G 均为可选（缺失时自动降级）。
 */
(function () {
  'use strict';
  const DS = (window.DS = window.DS || {});

  const GAMES = {
    g2048: { name: '2048', icon: '🔢', desc: '滑动合并相同的数字，拼出 2048——拼出来也可以接着玩。' },
    snake: { name: '贪吃蛇', icon: '🐍', desc: '吃得越多跑得越快，撞墙或咬到自己就结束。' },
  };
  const EXE = { g2048: 'C:\\GAMES\\2048.EXE', snake: 'C:\\GAMES\\SNAKE.EXE' };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const ARROW = { up: '▲', down: '▼', left: '◀', right: '▶' };
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };

  // ---------------- 小工具 ----------------
  function sfx(n) { const A = DS.Audio; if (A && typeof A[n] === 'function') { try { A[n](); } catch (e) { /* 静音即可 */ } } }
  const memBest = { g2048: 0, snake: 0 };
  function bestTable() {
    const G = DS.G;
    if (G && G.meta && typeof G.meta === 'object') {
      if (!G.meta.mini || typeof G.meta.mini !== 'object') G.meta.mini = {};
      const t = G.meta.mini;
      for (const k in GAMES) if (typeof t[k] !== 'number' || !isFinite(t[k])) t[k] = 0;
      return t;
    }
    return memBest;
  }
  const getBest = (kind) => Math.max(0, Number(bestTable()[kind]) || 0);
  function commitBest(kind, score) {
    const t = bestTable();
    if (!(score > (Number(t[kind]) || 0))) return false;
    t[kind] = score;
    if (t !== memBest && typeof DS.G.saveMeta === 'function') { try { DS.G.saveMeta(); } catch (e) { /* 存不了也不影响游戏 */ } }
    return true;
  }
  const mq = (q) => { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } };

  // ---------------- 样式（只注入一次） ----------------
  const CSS = `
.mg-layer{--mono:ui-monospace,'SFMono-Regular','Cascadia Mono',Consolas,Menlo,'Liberation Mono',monospace;--mtitle:var(--title,'PingFang SC','Microsoft YaHei',sans-serif);
  display:flex;flex-direction:column;justify-content:center;gap:10px;overflow:hidden;
  padding:calc(10px + env(safe-area-inset-top,0px)) calc(10px + env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) calc(10px + env(safe-area-inset-left,0px));
  background:radial-gradient(120% 70% at 50% 28%,#14233c 0%,#080e1a 58%,#03050a 100%);
  color:var(--text,#e8eef7);font-family:var(--font,system-ui,sans-serif);
  touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;overscroll-behavior:contain;animation:mgFade .2s ease}
.mg-layer,.mg-layer *{box-sizing:border-box}
.mg-layer.mg-fixed{position:fixed;inset:0;z-index:1000}
.mg-layer.mg-closing{animation:mgFadeOut .28s ease forwards;pointer-events:none}
.mg-top{flex:0 1 auto;min-height:0;display:flex;flex-direction:column}
.mg-mon{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;padding:12px 12px 0;border-radius:24px;position:relative;
  background:linear-gradient(165deg,#2d374a 0%,#1d2534 46%,#141a25 100%);border:1px solid #3a4860;
  box-shadow:0 18px 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08),inset 0 -2px 0 rgba(0,0,0,.45)}
.mg-scr{--phr:255,181,71;--ph:rgb(var(--phr));flex:0 1 auto;min-height:0;display:flex;flex-direction:column;position:relative;overflow:hidden;
  padding:8px 12px 6px;border-radius:20px/16px;border:3px solid #06080c;color:var(--ph);
  background:radial-gradient(ellipse 90% 80% at 50% 45%,rgba(var(--phr),.075) 0%,#080906 62%,#030403 100%);
  box-shadow:0 0 0 1px #3d4b63,inset 0 0 42px rgba(0,0,0,.85);animation:mgOn .5s cubic-bezier(.2,.8,.2,1)}
.mg-scr.mg-green{--phr:125,255,166}
.mg-scr.mg-off{animation:mgOff .28s ease-in forwards}
.mg-scr::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:6;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.26) 0 1px,transparent 1px 3px)}
.mg-scr::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:7;border-radius:inherit;
  background:radial-gradient(ellipse 55% 34% at 24% 8%,rgba(255,255,255,.075),transparent 70%),radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.5) 100%)}
.mg-roll{position:absolute;left:0;right:0;top:0;height:28%;pointer-events:none;z-index:5;background:linear-gradient(transparent,rgba(var(--phr),.045),transparent);animation:mgRoll 7s linear infinite}
.mg-head{flex:none;display:flex;align-items:center;gap:8px;padding:2px 0 8px;position:relative;z-index:2}
.mg-ttl{flex:1;min-width:0}
.mg-path{font:600 10px/1.3 var(--mono);color:rgba(var(--phr),.55);letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-name{font-family:var(--mtitle);font-size:22px;line-height:1.15;letter-spacing:2px;color:var(--ph);text-shadow:0 0 8px rgba(var(--phr),.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-stat{position:relative;flex:none;min-width:62px;padding:3px 8px 4px;border:1px solid rgba(var(--phr),.38);border-radius:6px;background:rgba(var(--phr),.06);text-align:center;transition:box-shadow .3s,border-color .3s}
.mg-stat i{display:block;font-style:normal;font-size:10px;letter-spacing:3px;color:rgba(var(--phr),.62)}
.mg-stat b{display:block;font:800 18px/1.15 var(--mono);color:var(--ph);text-shadow:0 0 6px rgba(var(--phr),.55)}
.mg-stat.mg-hot{border-color:var(--ph);box-shadow:0 0 12px rgba(var(--phr),.45)}
.mg-plus{position:absolute;right:calc(100% + 6px);top:6px;font:800 13px var(--mono);color:var(--ph);text-shadow:0 0 6px rgba(var(--phr),.8);pointer-events:none;animation:mgPlus .7s ease-out forwards}
.mg-stage{position:relative;flex:0 1 auto;min-height:0;width:100%;aspect-ratio:1/1;z-index:1}
.mg-board{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:0;height:0}
.mg-foot{flex:none;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0 2px;position:relative;z-index:2;font:600 11px/1.3 var(--mono);color:rgba(var(--phr),.62);white-space:nowrap}
.mg-info{flex:none}
.mg-hint{min-width:0;overflow:hidden;text-overflow:ellipsis}
.mg-cur{display:inline-block;width:.55em;height:1em;margin-left:3px;vertical-align:-2px;background:currentColor;animation:mgBlink 1s steps(1) infinite}
.mg-chin{flex:none;display:flex;align-items:center;gap:10px;height:30px;padding:0 6px}
.mg-brand{font:700 10px var(--mono);letter-spacing:3px;color:#7d8ba3;text-shadow:0 1px 0 #000a}
.mg-vent{flex:1;height:7px;border-radius:2px;opacity:.75;background:repeating-linear-gradient(90deg,#0b1018 0 3px,transparent 3px 7px)}
.mg-pw{font:700 9px var(--mono);letter-spacing:1px;color:#6c7a92}
.mg-led{width:8px;height:8px;border-radius:50%;background:#6fd08c;box-shadow:0 0 7px #6fd08c,inset 0 0 2px #fff}
.mg-stand{flex:none;height:16px;position:relative}
.mg-stand::before{content:'';position:absolute;left:36%;right:36%;top:0;height:10px;background:linear-gradient(#141a25,#0b1018);clip-path:polygon(8% 0,92% 0,100% 100%,0 100%)}
.mg-stand::after{content:'';position:absolute;left:26%;right:26%;top:10px;height:6px;border-radius:3px 3px 6px 6px;background:linear-gradient(#232c3c,#121822);box-shadow:0 4px 8px rgba(0,0,0,.5)}
.mg-deck{flex:none;display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;border-radius:16px;
  background:linear-gradient(#151d2b,#0c121c);border:1px solid #26354d;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 8px 20px rgba(0,0,0,.4)}
.mg-col{flex:1;min-width:0;align-self:stretch;display:flex;flex-direction:column;gap:8px}
.mg-col .mg-key{flex:1;padding:6px 10px}
.mg-key{appearance:none;-webkit-appearance:none;font-family:inherit;cursor:pointer;color:#d6e2f1;font-weight:700;font-size:14px;letter-spacing:2px;
  padding:10px 12px;border-radius:10px;border:1px solid #3a4a63;border-bottom:4px solid #0a0e15;background:linear-gradient(#2b3649,#1c2433);
  box-shadow:0 2px 4px rgba(0,0,0,.4);display:inline-flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;transition:transform .06s,border-bottom-width .06s,filter .15s}
.mg-key:hover{filter:brightness(1.12)}
.mg-key:active,.mg-key.mg-press{transform:translateY(3px);border-bottom-width:1px}
.mg-key.mg-amber{background:linear-gradient(#ffc463,#f08b1c);border-color:#ffd28a;border-bottom-color:#7a4100;color:#2a1600;text-shadow:0 1px 0 rgba(255,255,255,.35)}
.mg-deck.mg-row .mg-key{flex:1}
.mg-pad{--k:clamp(42px,7vh,58px);flex:none;display:grid;grid-template-columns:repeat(3,var(--k));grid-template-rows:repeat(3,var(--k));gap:4px}
.mg-pad .mg-key{padding:0;font-size:calc(var(--k) * .36);letter-spacing:0;color:#bfe3ff}
.mg-pad .mg-d-up{grid-area:1/2}.mg-pad .mg-d-left{grid-area:2/1}.mg-pad .mg-d-right{grid-area:2/3}.mg-pad .mg-d-down{grid-area:3/2}
.mg-nub{grid-area:2/2;margin:9px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#253046,#0b1018);box-shadow:inset 0 2px 5px #000b}
.mg-ov{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:12px;text-align:center;border-radius:8px;background:rgba(3,5,4,.8);animation:mgFade .25s ease}
.mg-ov.mg-ov-ready{background:linear-gradient(transparent 45%,rgba(3,5,4,.82) 72%);justify-content:flex-end;padding-bottom:9%}
.mg-ov.mg-ov-ready h2{font-size:24px}
.mg-ov h2{margin:0 0 4px;font-family:var(--mtitle);font-weight:400;font-size:30px;letter-spacing:5px;color:var(--ph);text-shadow:0 0 14px rgba(var(--phr),.85)}
.mg-ov p{margin:0;font:600 13px/1.6 var(--mono);color:rgba(var(--phr),.85)}
.mg-ov p.mg-big{font-size:20px;color:var(--ph);text-shadow:0 0 8px rgba(var(--phr),.6)}
.mg-ov p.mg-rec{color:#fff3d6;text-shadow:0 0 10px var(--ph);animation:mgPulse 1.2s ease-in-out infinite}
.mg-btns{display:flex;gap:10px;margin-top:10px}
.mg-sb{appearance:none;-webkit-appearance:none;font-family:inherit;cursor:pointer;font-size:14px;font-weight:700;letter-spacing:2px;padding:8px 16px;border-radius:6px;
  border:1px solid var(--ph);color:var(--ph);background:rgba(var(--phr),.08);text-shadow:0 0 6px rgba(var(--phr),.5)}
.mg-sb:hover{background:rgba(var(--phr),.18)}
.mg-sb.mg-fill{background:var(--ph);color:#0b0700;text-shadow:none;box-shadow:0 0 14px rgba(var(--phr),.5)}
/* 2048 */
.mg-g{position:absolute;inset:0;border-radius:10px;background:rgba(var(--phr),.035);border:1px solid rgba(var(--phr),.28);box-shadow:inset 0 0 18px rgba(var(--phr),.08)}
.mg-gc,.mg-t{position:absolute;left:0;top:0;width:var(--c);height:var(--c);
  transform:translate(calc(var(--g) + var(--x) * (var(--c) + var(--g))),calc(var(--g) + var(--y) * (var(--c) + var(--g))))}
.mg-gc{border-radius:7px;border:1px dashed rgba(var(--phr),.16);background:rgba(var(--phr),.025)}
.mg-tl{position:absolute;inset:-1px}
.mg-t{z-index:2;transition:transform .11s ease-out;will-change:transform}
.mg-g.mg-still .mg-t{transition:none}
.mg-t.mg-dy{z-index:1}
.mg-t b{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:calc(var(--c) * .1);border:1px solid;
  font:800 calc(var(--c) * .46)/1 var(--mono);letter-spacing:-.02em}
.mg-t[data-d="3"] b{font-size:calc(var(--c) * .38)}.mg-t[data-d="4"] b{font-size:calc(var(--c) * .3)}.mg-t[data-d="5"] b{font-size:calc(var(--c) * .24)}
.mg-t.mg-new b{animation:mgAppear .18s ease-out .1s backwards}
.mg-t.mg-mg b{animation:mgPop .22s ease-out .09s backwards}
.mg-t[data-v="2"] b{background:rgba(255,181,71,.06);border-color:rgba(255,181,71,.34);color:#e0ad66}
.mg-t[data-v="4"] b{background:rgba(255,181,71,.11);border-color:rgba(255,181,71,.48);color:#f2bb6c}
.mg-t[data-v="8"] b{background:rgba(255,181,71,.17);border-color:rgba(255,181,71,.6);color:#ffc777;text-shadow:0 0 6px rgba(255,181,71,.5)}
.mg-t[data-v="16"] b{background:rgba(255,181,71,.25);border-color:rgba(255,181,71,.72);color:#ffd08a;text-shadow:0 0 6px rgba(255,181,71,.6)}
.mg-t[data-v="32"] b{background:rgba(255,181,71,.35);border-color:rgba(255,181,71,.84);color:#ffdaa0;text-shadow:0 0 7px rgba(255,181,71,.7);box-shadow:0 0 8px rgba(255,181,71,.22)}
.mg-t[data-v="64"] b{background:rgba(255,181,71,.48);border-color:#ffb547;color:#ffe6bf;text-shadow:0 0 8px rgba(255,181,71,.8);box-shadow:0 0 10px rgba(255,181,71,.32)}
.mg-t[data-v="128"] b{background:#ffb547;border-color:#ffd28a;color:#2a1600;box-shadow:0 0 12px rgba(255,181,71,.55)}
.mg-t[data-v="256"] b{background:#ffc463;border-color:#ffdca0;color:#2a1600;box-shadow:0 0 14px rgba(255,190,90,.62)}
.mg-t[data-v="512"] b{background:#ffd27a;border-color:#ffe6b8;color:#2a1600;box-shadow:0 0 16px rgba(255,200,110,.7)}
.mg-t[data-v="1024"] b{background:#ffe1a6;border-color:#fff0d2;color:#3a1d00;box-shadow:0 0 20px rgba(255,210,130,.8)}
.mg-t[data-v="2048"] b{background:#fff4dc;border-color:#fff;color:#5a2600;box-shadow:0 0 24px #ffb547,0 0 4px #fff}
.mg-t[data-v="big"] b{background:#bfe3ff;border-color:#e6f4ff;color:#062038;box-shadow:0 0 22px rgba(120,190,255,.8)}
/* 贪吃蛇 */
.mg-board.mg-sk{border-radius:3px;background:rgba(var(--phr),.03);box-shadow:0 0 0 2px rgba(var(--phr),.55),0 0 14px rgba(var(--phr),.22)}
.mg-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
@keyframes mgFade{from{opacity:0}}
@keyframes mgFadeOut{to{opacity:0}}
@keyframes mgOn{0%{transform:scale(.6,.006);filter:brightness(4);opacity:.5}40%{transform:scale(1,.006);filter:brightness(3);opacity:1}100%{transform:none;filter:none}}
@keyframes mgOff{55%{transform:scale(1,.006);filter:brightness(3)}100%{transform:scale(0,.006);opacity:0}}
@keyframes mgRoll{from{transform:translateY(-100%)}to{transform:translateY(360%)}}
@keyframes mgBlink{50%{opacity:0}}
@keyframes mgPulse{50%{opacity:.45}}
@keyframes mgPlus{from{opacity:1;transform:translateY(4px)}to{opacity:0;transform:translateY(-10px)}}
@keyframes mgAppear{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes mgPop{0%{opacity:0;transform:scale(.9)}15%{opacity:1}55%{transform:scale(1.16)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.mg-layer,.mg-layer *,.mg-layer *::before,.mg-layer *::after{animation:none!important;transition:none!important}}
`;
  function ensureStyle() {
    if (document.getElementById('mg-style')) return;
    const st = document.createElement('style');
    st.id = 'mg-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------------- 2048 ----------------
  function make2048(api, h, U) {
    const N = 4;
    const grid = h('div', { class: 'mg-g' });
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid.appendChild(h('div', { class: 'mg-gc', style: { '--x': x, '--y': y } }));
    const tl = h('div', { class: 'mg-tl' });
    grid.appendChild(tl);
    api.board.classList.add('mg-gb');
    api.board.appendChild(grid);
    let cells = [], score = 0, over = false, won = false, dying = [], timers = [];

    function mk(v, x, y, cls) {
      const el = h('div', { class: 'mg-t' + (cls ? ' ' + cls : ''), 'data-v': v > 2048 ? 'big' : v, 'data-d': Math.min(5, String(v).length), style: { '--x': x, '--y': y } }, h('b', null, String(v)));
      tl.appendChild(el);
      const t = { v, x, y, el };
      cells[y][x] = t;
      return t;
    }
    const place = (t) => { t.el.style.setProperty('--x', t.x); t.el.style.setProperty('--y', t.y); };
    function empties() { const out = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!cells[y][x]) out.push([x, y]); return out; }
    function spawn() { const e = empties(); if (!e.length) return null; const [x, y] = e[Math.floor(Math.random() * e.length)]; return mk(Math.random() < 0.9 ? 2 : 4, x, y, 'mg-new'); }
    function maxTile() { let m = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (cells[y][x]) m = Math.max(m, cells[y][x].v); return m; }
    function canMove() {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const t = cells[y][x]; if (!t) return true;
        if (x < N - 1 && cells[y][x + 1] && cells[y][x + 1].v === t.v) return true;
        if (y < N - 1 && cells[y + 1][x] && cells[y + 1][x].v === t.v) return true;
      }
      return false;
    }
    // 上一次移动的动画还没播完就来了新操作：立刻收尾
    function flush() {
      timers.forEach(clearTimeout); timers = [];
      dying.forEach((t) => t.el.remove()); dying = [];
      tl.querySelectorAll('.mg-new,.mg-mg').forEach((el) => el.classList.remove('mg-new', 'mg-mg'));
    }
    function reset(vals, sc) {
      flush(); U.clear(tl);
      cells = Array.from({ length: N }, () => Array(N).fill(null));
      score = sc || 0; over = false;
      if (vals) vals.forEach((row, y) => row.forEach((v, x) => { if (v) mk(v, x, y); }));
      else { spawn(); spawn(); }
      won = maxTile() >= 2048;
      api.update({ score, maxTile: maxTile(), started: !!vals });
      api.info('最大 ' + maxTile());
    }
    function move(dir) {
      if (over) return false;
      flush();
      const [dx, dy] = DIRS[dir];
      const far = dx > 0 || dy > 0; // 从移动方向的那一侧开始排
      let moved = false, gained = 0, top = 0;
      for (let line = 0; line < N; line++) {
        const pos = [];
        for (let k = 0; k < N; k++) { const i = far ? N - 1 - k : k; pos.push(dx !== 0 ? [i, line] : [line, i]); }
        const list = pos.map(([x, y]) => cells[y][x]).filter(Boolean);
        pos.forEach(([x, y]) => { cells[y][x] = null; });
        let slot = 0;
        for (let j = 0; j < list.length; j++) {
          const a = list[j], b = list[j + 1];
          const [x, y] = pos[slot++];
          if (b && b.v === a.v) { // 每块每次移动只合并一次
            j++;
            [a, b].forEach((t) => { t.x = x; t.y = y; place(t); t.el.classList.add('mg-dy'); dying.push(t); });
            const v = a.v * 2;
            mk(v, x, y, 'mg-mg');
            gained += v; top = Math.max(top, v); moved = true;
          } else {
            if (a.x !== x || a.y !== y) { a.x = x; a.y = y; place(a); moved = true; }
            cells[y][x] = a;
          }
        }
      }
      if (!moved) return false;
      timers.push(setTimeout(() => { dying.forEach((t) => t.el.remove()); dying = []; }, 140));
      score += gained;
      spawn();
      const mt = maxTile();
      api.update({ score, gained, maxTile: mt, started: true });
      api.info('最大 ' + mt);
      sfx(top >= 128 ? 'coin' : gained ? 'click' : 'tap');
      if (!won && mt >= 2048) { won = true; api.toast('拼出了 2048！还能接着往上冲'); sfx('win'); }
      if (!canMove()) { over = true; api.over(['最大方块 ' + mt], 520); }
      return true;
    }
    function resize(bs) {
      const g = Math.max(4, Math.round(bs * 0.03));
      grid.classList.add('mg-still');
      grid.style.setProperty('--g', g + 'px');
      grid.style.setProperty('--c', (bs - g * (N + 1)) / N + 'px');
      requestAnimationFrame(() => grid.classList.remove('mg-still'));
    }
    return {
      reset: () => reset(), input: move, resize, destroy: flush,
      debug: { get: () => ({ cells: cells.map((r) => r.map((t) => (t ? t.v : 0))), score, over, maxTile: maxTile() }), set: (vals, sc) => reset(vals, sc), move },
    };
  }

  // ---------------- 贪吃蛇 ----------------
  function makeSnake(api, h) {
    const N = 15;
    const cv = h('canvas', { class: 'mg-cv' });
    api.board.classList.add('mg-sk');
    api.board.appendChild(cv);
    const ctx = cv.getContext('2d');
    const GREEN = '#7dffa6', RED = '#ff5a4f', FOOD = '#ffc463';
    let bs = 0, dpr = 1, raf = 0, lastT = 0, deadAt = 0;
    let body, prev, stepped, grew, moveDir, dir, queue, food, eaten, score, state, acc, interval;
    const speed = (s) => Math.max(70, Math.round(200 * Math.pow(0.975, s))); // 起步 200ms/格，越吃越快
    const level = (s) => Math.min(10, 1 + Math.floor(s / 5));
    const info = () => api.info('长度 ' + body.length + ' · 速度 ' + level(score));

    function placeFood() {
      const occ = new Set(body.map(([x, y]) => y * N + x));
      const free = [];
      for (let i = 0; i < N * N; i++) if (!occ.has(i)) free.push(i);
      if (!free.length) return null;
      const i = free[Math.floor(Math.random() * free.length)];
      return [i % N, Math.floor(i / N)];
    }
    function reset() {
      const c = Math.floor(N / 2);
      body = [[c, c], [c - 1, c], [c - 2, c]];
      prev = body.map((p) => p.slice()); stepped = false; grew = false; eaten = null;
      dir = moveDir = 'right'; queue = []; score = 0; state = 'ready'; acc = 0; interval = speed(0);
      food = placeFood();
      api.update({ score: 0 });
      info();
      api.overlay('ready', '准备开始', [api.coarse ? '在屏幕上滑动或点方向键出发' : '按 方向键 / WASD 出发', '吃得越多越快 · 撞墙就完了'], []);
      api.pauseLabel(false, true);
    }
    function input(d) {
      if (state === 'dead') return;
      if (state === 'ready') {
        if (d === OPP[dir]) { body.reverse(); prev = body.map((p) => p.slice()); } // 向反方向出发：掉个头
        dir = moveDir = d; queue = []; state = 'run'; acc = 0;
        api.hideOverlay(); api.update({ started: true }); api.pauseLabel(false, false);
        return;
      }
      if (state === 'pause') resume();
      const last = queue.length ? queue[queue.length - 1] : dir;
      if (d === last || d === OPP[last]) return; // 不能原地掉头；同向忽略
      if (queue.length < 3) queue.push(d); // 缓冲快速连按
    }
    function step() {
      if (queue.length) dir = queue.shift();
      const [dx, dy] = DIRS[dir];
      const hx = body[0][0] + dx, hy = body[0][1] + dy;
      const eat = !!food && food[0] === hx && food[1] === hy;
      let hit = hx < 0 || hy < 0 || hx >= N || hy >= N; // 不穿墙
      if (!hit) { const lim = eat ? body.length : body.length - 1; for (let i = 0; i < lim; i++) if (body[i][0] === hx && body[i][1] === hy) { hit = true; break; } }
      if (hit) { die(); return; }
      prev = body.map((p) => p.slice()); stepped = true; grew = eat; moveDir = dir; eaten = null;
      body.unshift([hx, hy]);
      if (eat) {
        eaten = food; score++; interval = speed(score);
        food = placeFood();
        sfx('coin');
        api.update({ score, gained: 1 });
        info();
        if (!food) { state = 'dead'; deadAt = performance.now(); api.over(['你把整个屏幕都填满了！'], 600); api.pauseLabel(false, true); }
      } else body.pop();
    }
    function die() {
      state = 'dead'; deadAt = performance.now();
      sfx('hit');
      api.over(['长度 ' + body.length], 900);
      api.pauseLabel(false, true);
    }
    function pause() {
      if (state !== 'run') return;
      state = 'pause';
      api.overlay('pause', '已暂停', ['分数 ' + score, api.coarse ? '点“继续”或滑动继续' : '空格 / 方向键 继续'], [{ t: '继续', fill: true, fn: resume }]);
      api.pauseLabel(true, false);
    }
    function resume() {
      if (state !== 'pause') return;
      state = 'run'; lastT = 0;
      api.hideOverlay(); api.pauseLabel(false, false);
    }
    const togglePause = () => (state === 'run' ? pause() : state === 'pause' ? resume() : null);
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis);

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!lastT) lastT = ts;
      const dt = Math.min(100, Math.max(0, ts - lastT)); lastT = ts;
      if (state === 'run') {
        acc += dt;
        let guard = 0;
        while (acc >= interval && state === 'run' && guard++ < 3) { acc -= interval; step(); }
      }
      draw(ts);
    }
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    function draw(ts) {
      if (!bs) return;
      const cs = bs / N, P = (v) => (v + 0.5) * cs;
      const t = state === 'run' ? Math.min(1, acc / interval) : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bs, bs);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(125,255,166,.11)';
      const dot = Math.max(1.2, cs * 0.08);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) ctx.fillRect(P(x) - dot / 2, P(y) - dot / 2, dot, dot);
      // 食物
      const blob = (p, r, a) => { ctx.globalAlpha = a; ctx.shadowColor = FOOD; ctx.shadowBlur = cs * 0.7; ctx.fillStyle = FOOD; ctx.beginPath(); ctx.arc(P(p[0]), P(p[1]), r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0; };
      if (food) blob(food, cs * 0.27 * (0.86 + 0.14 * Math.sin(ts / 150)), 1);
      if (eaten && t < 1) blob(eaten, cs * 0.27 * (1 + t * 0.8), 1 - t);
      // 蛇身：头、尾在两格之间插值，中间各节停在格心，拐角不会被切掉
      let pts;
      if (!stepped) pts = body;
      else {
        const n = prev.length;
        pts = [lerp(prev[0], body[0], t)].concat(prev.slice(0, n - 1), [grew ? prev[n - 1] : lerp(prev[n - 1], prev[n - 2], t)]);
      }
      const dead = state === 'dead', since = ts - deadAt;
      const col = dead ? RED : GREEN;
      ctx.globalAlpha = dead && since < 960 && since % 240 < 120 ? 0.35 : 1;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(P(p[0]), P(p[1])) : ctx.moveTo(P(p[0]), P(p[1]))));
      ctx.strokeStyle = col; ctx.lineWidth = cs * 0.66; ctx.shadowColor = col; ctx.shadowBlur = cs * 0.5;
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = cs * 0.2; ctx.strokeStyle = dead ? 'rgba(255,215,205,.5)' : 'rgba(225,255,235,.42)';
      ctx.stroke();
      // 头和眼睛
      const hx = P(pts[0][0]), hy = P(pts[0][1]);
      const [fx, fy] = DIRS[stepped ? moveDir : dir];
      ctx.fillStyle = dead ? '#ffb4ab' : '#dcffe8'; ctx.shadowColor = col; ctx.shadowBlur = cs * 0.6;
      ctx.beginPath(); ctx.arc(hx, hy, cs * 0.41, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#03140a';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(hx + fx * cs * 0.14 - fy * s * cs * 0.17, hy + fy * cs * 0.14 + fx * s * cs * 0.17, cs * 0.07, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    function resize(size) {
      bs = size;
      dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(bs * dpr)); cv.height = cv.width;
      draw(performance.now());
    }
    raf = requestAnimationFrame(frame);
    return {
      reset, input, resize, togglePause,
      destroy() { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); },
      debug: {
        get: () => ({ body: body.map((p) => p.slice()), dir, queue: queue.slice(), food: food && food.slice(), score, state, interval }),
        setFood: (x, y) => { food = [x, y]; },
      },
    };
  }

  // ---------------- 外壳：显示器、键盘、滑动、结算 ----------------
  let current = null;

  function open(kind, opts) {
    if (!GAMES[kind]) return Promise.reject(new Error('未知的小游戏：' + kind));
    const U = DS.U;
    if (!U || !U.h) return Promise.reject(new Error('DS.U 未加载'));
    const h = U.h;
    opts = opts || {};
    if (current) current.leave();
    ensureStyle();

    return new Promise((resolve) => {
      const info = GAMES[kind], isSnake = kind === 'snake';
      const coarse = mq('(hover: none) and (pointer: coarse)');
      const reduced = mq('(prefers-reduced-motion: reduce)');
      const UI = DS.UI;
      let layer;
      if (UI && typeof UI.layer === 'function' && UI.app && UI.app()) layer = UI.layer('mg-layer');
      else { layer = h('div', { class: 'layer mg-layer mg-fixed' }); document.body.appendChild(layer); }
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-label', info.name);
      layer.setAttribute('data-kind', kind);

      // —— 屏幕 ——
      const scoreEl = h('b', null, '0'), bestEl = h('b', null, String(getBest(kind)));
      const scoreBox = h('div', { class: 'mg-stat' }, h('i', null, '分数'), scoreEl);
      const bestBox = h('div', { class: 'mg-stat' }, h('i', null, '最高'), bestEl);
      const head = h('div', { class: 'mg-head' }, h('div', { class: 'mg-ttl' }, h('div', { class: 'mg-path' }, EXE[kind]), h('div', { class: 'mg-name' }, opts.title || info.name)), scoreBox, bestBox);
      const board = h('div', { class: 'mg-board' });
      const stage = h('div', { class: 'mg-stage' }, board);
      const infoEl = h('span', { class: 'mg-info' });
      const hint = coarse ? (isSnake ? '滑动 / 方向键 转向' : '在屏幕上滑动来移动') : (isSnake ? '方向键/WASD 转向 · 空格 暂停 · Esc 离开' : '方向键/WASD 移动 · Esc 离开');
      const foot = h('div', { class: 'mg-foot' }, infoEl, h('span', { class: 'mg-hint' }, hint, h('i', { class: 'mg-cur' })));
      const scr = h('div', { class: 'mg-scr' + (isSnake ? ' mg-green' : '') }, h('div', { class: 'mg-roll' }), head, stage, foot);
      const mon = h('div', { class: 'mg-mon' }, scr, h('div', { class: 'mg-chin' }, h('span', { class: 'mg-brand' }, 'SHELTER-386'), h('span', { class: 'mg-vent' }), h('span', { class: 'mg-pw' }, 'POWER'), h('span', { class: 'mg-led' })));
      const deck = h('div', { class: 'mg-deck' });
      layer.append(h('div', { class: 'mg-top' }, mon, h('div', { class: 'mg-stand' })), deck);

      // —— 本局状态 ——
      let round = { score: 0, maxTile: 0, over: false, started: false }, last = null;
      let ov = null, ovType = null, overTimer = 0, closed = false, lastBs = 0;

      function setBestUI() {
        const b = getBest(kind);
        bestEl.textContent = String(Math.max(b, round.score));
        bestBox.classList.toggle('mg-hot', round.score > 0 && round.score > b);
      }
      function hideOverlay() { if (ov) ov.remove(); ov = null; ovType = null; }
      function overlay(type, title, lines, buttons) {
        hideOverlay();
        ovType = type;
        ov = h('div', { class: 'mg-ov mg-ov-' + type }, h('h2', null, title),
          lines.map((l) => (typeof l === 'string' ? h('p', null, l) : l)),
          buttons && buttons.length ? h('div', { class: 'mg-btns' }, buttons.map((b) => h('button', { class: 'mg-sb' + (b.fill ? ' mg-fill' : ''), type: 'button', onclick: (e) => { e.stopPropagation(); sfx('click'); b.fn(); } }, b.t))) : null);
        board.appendChild(ov);
      }
      let pauseBtn = null;
      const api = {
        board, coarse, layer, overlay, hideOverlay,
        info: (t) => { infoEl.textContent = t; },
        toast: (t) => { if (UI && UI.toast) UI.toast(t, 'good'); },
        pauseLabel: (paused, disabled) => {
          if (!pauseBtn) return;
          pauseBtn.textContent = paused ? '▶ 继续' : 'Ⅱ 暂停';
          pauseBtn.disabled = !!disabled;
          pauseBtn.style.opacity = disabled ? '.45' : '';
        },
        update(o) {
          if (o.started) round.started = true;
          if (typeof o.maxTile === 'number') round.maxTile = o.maxTile;
          if (typeof o.score === 'number') {
            round.score = o.score;
            scoreEl.textContent = String(o.score);
            if (o.gained > 0) { const p = h('span', { class: 'mg-plus' }, '+' + o.gained); scoreBox.appendChild(p); setTimeout(() => p.remove(), 720); }
            setBestUI();
          }
        },
        over(lines, delay) {
          if (round.over) return;
          round.over = true; round.started = true;
          const prevBest = getBest(kind);
          const rec = round.score > prevBest;
          commitBest(kind, round.score);
          setBestUI();
          clearTimeout(overTimer);
          overTimer = setTimeout(() => {
            if (closed) return;
            sfx(rec ? 'win' : 'lose');
            overlay('over', '游戏结束', [h('p', { class: 'mg-big' }, '分数 ' + round.score)].concat(lines, [rec ? h('p', { class: 'mg-rec' }, '★ 新纪录 ★') : '最高 ' + getBest(kind)]),
              [{ t: '再来一局', fill: true, fn: restart }, { t: '离开', fn: () => leave() }]);
          }, delay || 0);
        },
      };

      const game = isSnake ? makeSnake(api, h, U) : make2048(api, h, U);
      layer.mgDebug = game.debug; // 仅供测试脚本读取

      function restart() {
        if (closed) return;
        clearTimeout(overTimer); hideOverlay();
        if (round.started) { commitBest(kind, round.score); last = round; }
        round = { score: 0, maxTile: 0, over: false, started: false };
        game.reset();
        setBestUI();
      }
      function input(d) { if (!closed && ovType !== 'over') game.input(d); }

      // —— 操作区 ——
      const key = (label, cls, fn, extra) => h('button', Object.assign({ class: 'mg-key' + (cls ? ' ' + cls : ''), type: 'button', onclick: (e) => { sfx('click'); e.currentTarget.blur(); fn(); } }, extra || {}), label);
      const btnRestart = key('↻ 重新开始', 'mg-amber', restart);
      const btnLeave = key('⏻ 离开', '', () => leave());
      if (isSnake) {
        pauseBtn = key('Ⅱ 暂停', '', () => game.togglePause());
        const pad = h('div', { class: 'mg-pad' }, ['up', 'left', 'right', 'down'].map((d) => {
          const b = h('button', { class: 'mg-key mg-d-' + d, type: 'button', 'aria-label': { up: '上', down: '下', left: '左', right: '右' }[d], tabindex: '-1' }, ARROW[d]);
          b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('mg-press'); input(d); });
          ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => b.classList.remove('mg-press')));
          return b;
        }), h('i', { class: 'mg-nub' }));
        deck.append(h('div', { class: 'mg-col' }, btnRestart, pauseBtn, btnLeave), pad);
      } else {
        deck.classList.add('mg-row');
        deck.append(btnRestart, btnLeave);
      }

      // —— 键盘（压栈，主游戏的快捷键不会触发） ——
      function onKey(e) {
        if (closed) return;
        const k = e.key || '';
        const d = KEYS[k] || KEYS[k.toLowerCase()] || KEYS[e.code];
        if (k === 'Escape') { e.preventDefault(); leave(); return; }
        if (d) { e.preventDefault(); if (!e.repeat || isSnake) input(d); return; }
        if (k === 'Enter' || k === ' ' || e.code === 'Space') {
          e.preventDefault();
          if (ovType === 'over') restart();
          else if (game.togglePause && !e.repeat) game.togglePause();
          return;
        }
        if ((k === 'p' || k === 'P') && game.togglePause) { game.togglePause(); return; }
        // 其余按键一律吞掉（返回 undefined）
      }
      const offKeys = UI && typeof UI.pushKeys === 'function' ? UI.pushKeys(onKey) : (document.addEventListener('keydown', onKey), () => document.removeEventListener('keydown', onKey));

      // —— 滑动（指针事件；贪吃蛇一次拖动可连续转向） ——
      let sw = null;
      const swipeTh = () => Math.max(16, Math.min(36, (lastBs || 300) * 0.07));
      function swipeDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
      stage.addEventListener('pointerdown', (e) => {
        if (e.button > 0 || (e.target.closest && e.target.closest('button'))) return;
        e.preventDefault();
        sw = { id: e.pointerId, x: e.clientX, y: e.clientY, fired: false };
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器 */ }
      });
      stage.addEventListener('pointermove', (e) => {
        if (!sw || e.pointerId !== sw.id || (sw.fired && !isSnake)) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < swipeTh()) return;
        input(swipeDir(dx, dy));
        sw.fired = true; sw.x = e.clientX; sw.y = e.clientY;
      });
      const endSwipe = (e) => {
        if (!sw || e.pointerId !== sw.id) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (!sw.fired && e.type === 'pointerup' && Math.max(Math.abs(dx), Math.abs(dy)) >= swipeTh()) input(swipeDir(dx, dy));
        sw = null;
      };
      stage.addEventListener('pointerup', endSwipe);
      stage.addEventListener('pointercancel', endSwipe);
      // 禁止页面滚动 / 下拉刷新 / 双指缩放
      const noTouch = (e) => { if (e.cancelable) e.preventDefault(); };
      layer.addEventListener('touchmove', noTouch, { passive: false });
      layer.addEventListener('gesturestart', noTouch);

      // —— 自适应棋盘 ——
      function fit() {
        if (closed) return;
        const bs = Math.floor(Math.min(stage.clientWidth, stage.clientHeight));
        if (bs <= 0 || bs === lastBs) return;
        lastBs = bs;
        board.style.width = bs + 'px'; board.style.height = bs + 'px';
        game.resize(bs);
      }
      let ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(fit); ro.observe(stage); }
      window.addEventListener('resize', fit);
      // 被外部移除（如切换屏幕清空所有层）时也要善后
      let mo = null;
      if (layer.parentNode && typeof MutationObserver === 'function') {
        mo = new MutationObserver(() => { if (!layer.isConnected) leave(true); });
        mo.observe(layer.parentNode, { childList: true });
      }

      function leave(detached) {
        if (closed) return;
        closed = true;
        if (current && current.layer === layer) current = null;
        clearTimeout(overTimer);
        game.destroy();
        offKeys();
        if (ro) ro.disconnect();
        if (mo) mo.disconnect();
        window.removeEventListener('resize', fit);
        commitBest(kind, round.score);
        const r = round.started || !last ? round : last;
        const res = { kind, score: r.score, best: getBest(kind), quit: !r.over };
        if (!isSnake) res.maxTile = r.maxTile;
        const finish = () => { layer.remove(); resolve(res); };
        if (detached || reduced) finish();
        else { scr.classList.add('mg-off'); layer.classList.add('mg-closing'); setTimeout(finish, 280); }
      }

      current = { layer, leave };
      game.reset();
      setBestUI();
      fit();
      requestAnimationFrame(fit);
      sfx('confirm');
    });
  }

  DS.Mini = { games: GAMES, open };
})();
