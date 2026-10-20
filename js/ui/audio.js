/* 程序化音效（WebAudio），无需任何音频文件 */
(function () {
  const DS = (window.DS = window.DS || {});
  const Au = (DS.Audio = {});
  let ctx = null, master = null, windGain = null, windNode = null, padGain = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  Au.unlock = function () { const c = ensure(); if (c && c.state === 'suspended') c.resume(); Au.ambient(); };
  const on = () => DS.G && DS.G.meta.settings.sound;

  function tone(freq, dur, type, vol, slide, delay) {
    const c = ensure(); if (!c || !on()) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, delay) {
    const c = ensure(); if (!c || !on()) return;
    const t = c.currentTime + (delay || 0);
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  Au.click = () => tone(660, 0.06, 'triangle', 0.12);
  Au.tap = () => tone(520, 0.05, 'sine', 0.08);
  Au.confirm = () => { tone(520, 0.08, 'triangle', 0.14); tone(780, 0.12, 'triangle', 0.14, null, 0.07); };
  Au.coin = () => { tone(990, 0.07, 'square', 0.06); tone(1480, 0.12, 'square', 0.06, null, 0.06); };
  Au.bad = () => { tone(300, 0.18, 'sawtooth', 0.08, 160); };
  Au.hit = () => { noise(0.12, 0.35, 900); tone(120, 0.12, 'sine', 0.25, 60); };
  Au.crit = () => { noise(0.2, 0.5, 2200); tone(90, 0.2, 'square', 0.18, 40); };
  Au.miss = () => tone(900, 0.08, 'sine', 0.06, 1400);
  Au.heal = () => { tone(660, 0.12, 'sine', 0.12); tone(990, 0.2, 'sine', 0.1, null, 0.08); };
  Au.step = () => noise(0.05, 0.12, 500);
  Au.alert = () => { tone(880, 0.15, 'square', 0.08); tone(660, 0.15, 'square', 0.08, null, 0.18); tone(880, 0.15, 'square', 0.08, null, 0.36); };
  Au.night = () => { tone(220, 0.8, 'sine', 0.08); tone(277, 0.8, 'sine', 0.06, null, 0.1); tone(330, 1.0, 'sine', 0.05, null, 0.2); };
  Au.morning = () => { tone(392, 0.25, 'triangle', 0.08); tone(523, 0.3, 'triangle', 0.08, null, 0.15); tone(659, 0.5, 'triangle', 0.07, null, 0.3); };
  Au.type = () => tone(1200 + Math.random() * 300, 0.015, 'square', 0.015);
  Au.win = () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, null, i * 0.1)); };
  Au.lose = () => { [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.06, null, i * 0.18)); };

  // 环境风声
  Au.ambient = function () {
    const c = ensure(); if (!c) return;
    const want = DS.G && DS.G.meta.settings.music;
    if (!want) { if (windGain) windGain.gain.setTargetAtTime(0, c.currentTime, 0.4); if (padGain) padGain.gain.setTargetAtTime(0, c.currentTime, 0.4); return; }
    if (!windNode) {
      const len = c.sampleRate * 4; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
      let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      windNode = c.createBufferSource(); windNode.buffer = buf; windNode.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      windGain = c.createGain(); windGain.gain.value = 0;
      windNode.connect(f); f.connect(windGain); windGain.connect(master); windNode.start();
      // 低沉的氛围垫音
      padGain = c.createGain(); padGain.gain.value = 0; padGain.connect(master);
      [55, 82.4, 110].forEach((fr, i) => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = fr; const g = c.createGain(); g.gain.value = 0.05 / (i + 1); o.connect(g); g.connect(padGain); o.start(); });
    }
    const apoc = DS.G && DS.G.S && DS.G.S.phase === 'apoc';
    windGain.gain.setTargetAtTime(apoc ? 0.16 : 0.05, c.currentTime, 1.2);
    padGain.gain.setTargetAtTime(apoc ? 0.35 : 0.18, c.currentTime, 1.5);
  };
})();
