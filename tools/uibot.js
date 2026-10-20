/* 界面机器人：通过点击 DOM 推进游戏，用来测试真实界面流程 */
(function () {
  const B = (window.UIBOT = {});
  const vis = (el) => el && el.offsetParent !== null;
  B.errors = [];
  window.addEventListener('error', (e) => B.errors.push(e.message));
  B.step = function () {
    const q = (s) => Array.from(document.querySelectorAll(s)).filter(vis);
    // 打字中 → 跳过
    const cur = q('.evtext .cursor');
    if (cur.length) { cur[0].parentElement.click(); return 'skip'; }
    // 战斗 → 跳过
    const battle = q('.battle .bctl .btn.primary');
    if (battle.length && !q('.modal').length) { battle[0].click(); return 'battle-skip'; }
    // 事件选项
    const opts = q('.opt:not(.disabled)');
    if (opts.length) { const o = opts[Math.floor(Math.random() * opts.length)]; const t = o.textContent; o.click(); return 'opt:' + t.slice(0, 20); }
    // 弹窗按钮（优先 primary 且未禁用）
    const prim = q('.modal-f .btn.primary:not(.disabled)');
    if (prim.length) { prim[prim.length - 1].click(); return 'modal-ok'; }
    const mb = q('.modal-f .btn:not(.disabled)');
    if (mb.length) { mb[mb.length - 1].click(); return 'modal-btn'; }
    // 面板 → 关闭
    const sheetClose = q('.sheet-h .icon-btn');
    if (sheetClose.length) { sheetClose[sheetClose.length - 1].click(); return 'close-sheet'; }
    // 开场
    const intro = q('.layer > div[style*="cursor: pointer"]');
    if (intro.length) { intro[0].click(); return 'intro'; }
    // 结局
    if (q('.ending').length) return 'ending';
    // 探索格子：随机走
    if (q('.crawl').length) { const d = q('.dpad button:not(.c)'); const dirs = [d[0], d[1], d[3], d[4]].filter(Boolean); dirs[Math.floor(Math.random() * dirs.length)].click(); return 'crawl'; }
    const act = q('.act-btn:not(.busy)');
    if (act.length) { act[0].click(); return 'act'; }
    return 'idle';
  };
  B.run = async function (n, delay) {
    const log = [];
    for (let i = 0; i < n; i++) { let r; try { r = B.step(); } catch (e) { B.errors.push('bot:' + e.message); r = 'err'; } log.push(r); if (r === 'ending') break; await new Promise((res) => setTimeout(res, delay || 120)); }
    const S = window.DS.G.S;
    return { steps: log.length, last: log.slice(-8), day: S && S.day, time: window.DS.G.S && window.DS.G.timeStr(), ending: S && S.ending, errors: B.errors.slice(-10) };
  };
})();
