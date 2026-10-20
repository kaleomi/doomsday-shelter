/* 启动 */
(function () {
  const DS = window.DS;
  function boot() {
    const b = document.getElementById('boot'); if (b) b.remove();
    DS.Title.show();
    document.addEventListener('pointerdown', () => DS.Audio.unlock(), { once: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && DS.G.S && !DS.G.S.ending) DS.G.save(); });
    // 禁止双击缩放 / 长按菜单
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('#app')) e.preventDefault(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
