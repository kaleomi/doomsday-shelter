/* 程序化美术：头像、家具俯视图、武器图标、事件插图、标题画、城市地图 */
(function () {
  const DS = (window.DS = window.DS || {});
  const A = (DS.Art = {});

  // 简单的可复现随机
  function rng(seed) { let s = 0; for (let i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  A.rng = rng;

  // ---------------- 头像 ----------------
  const SKIN = ['#f6d3b5', '#ecbf98', '#d79e72', '#a8714a'];
  const JOB_COLOR = { 格斗家: '#c0392b', 退伍兵: '#556b2f', 医生: '#e8eef2', 厨师: '#f4f1ea', 种植者: '#4f8a3a', 工程师: '#d9822b', 学者: '#5b6e8c', 冒险家: '#8b6a3e', 特工: '#22262e', 拾荒者: '#6d5a4a', 重生者: '#3b5878' };
  const JOB_BG = { 格斗家: ['#5a1f22', '#2a1012'], 退伍兵: ['#38432a', '#1a2014'], 医生: ['#21485e', '#10222e'], 厨师: ['#5e4421', '#2a1e10'], 种植者: ['#2c4a25', '#132310'], 工程师: ['#5a3a1a', '#26180a'], 学者: ['#2c3756', '#141a2a'], 冒险家: ['#4a3a22', '#211a0f'], 特工: ['#2a2f3a', '#101218'], 拾荒者: ['#3e3429', '#1b1712'], 重生者: ['#253a5a', '#0f1a2c'] };
  function hairPath(style, g) {
    switch (style) {
      case 0: return '<path d="M30 40c0-16 9-24 20-24s20 8 20 24c-3-6-8-10-20-10s-17 4-20 10z"/>';
      case 1: return '<path d="M29 41c-1-15 6-25 21-25 14 0 22 9 21 25l-4-8-3 5-4-7-4 6-5-7-4 6-4-6-4 7-3-5z"/>';
      case 2: return '<path d="M28 44c-2-18 8-28 22-28s24 10 22 28l2 26h-8l-2-24c-4-6-10-9-14-9s-11 3-14 9l-2 24h-8z"/>';
      case 3: return '<path d="M28 42c-1-16 8-26 22-26s23 10 22 26l1 14h-7l-2-16c-3-4-8-8-14-8s-11 4-14 8l-2 16h-7z"/>';
      case 4: return '<path d="M29 42c-1-16 8-26 21-26s22 10 21 26c-4-7-10-11-21-11s-17 4-21 11z"/><path d="M66 30c10 4 12 18 6 30l-4-2c4-9 3-18-4-24z"/>';
      case 5: return '<path d="M28 42c0-17 9-27 22-27 14 0 23 10 22 27-2-4-5-7-8-8 1 3 0 5-2 6-2-4-6-7-12-7-5 0-9 2-12 6-1-2-2-4-1-6-4 2-7 5-9 9z"/>';
      case 6: return '<path d="M31 38c1-13 9-20 19-20s18 7 19 20c-5-4-11-6-19-6s-14 2-19 6z" opacity=".9"/>';
      case 7: return '<path d="M30 40c0-15 9-23 20-23s20 8 20 23c-2-5-6-8-9-9-3 2-7 3-11 3s-8-1-11-3c-4 1-7 4-9 9z"/>';
      case 8: return '<path d="M27 46c-3-19 8-30 23-30s26 11 23 30c2 10 4 18 1 26h-6c1-8-1-16-3-24-3-7-9-11-15-11s-12 4-15 11c-2 8-4 16-3 24h-6c-3-8-1-16 1-26z"/>';
      case 9: return '<circle cx="50" cy="13" r="8"/><path d="M29 42c-1-16 8-26 21-26s22 10 21 26c-4-7-10-11-21-11s-17 4-21 11z"/>';
    }
    return '';
  }
  A.avatar = function (m, opts) {
    const look = m.look || {}; const job = m.id === 'me' ? (m.job || '重生者') : m.job;
    const skin = SKIN[look.skin || 0]; const hc = look.hairColor || '#222';
    const cloth = JOB_COLOR[job] || '#3b5878'; const bg = JOB_BG[job] || JOB_BG.重生者;
    const id = 'a' + Math.random().toString(36).slice(2, 7);
    const eyes = look.eyes || 0;
    let acc = '';
    const glasses = look.acc === 1 || job === '学者';
    if (glasses) acc += `<g fill="none" stroke="#1b1b1b" stroke-width="1.6"><circle cx="42" cy="45" r="5"/><circle cx="58" cy="45" r="5"/><path d="M47 45h6"/></g>`;
    if (job === '特工' || look.acc === 2) acc += `<path d="M35 42h30v5c0 3-3 5-6 5h-4c-2 0-3-2-5-2s-3 2-5 2h-4c-3 0-6-2-6-5z" fill="#111"/>`;
    if (job === '格斗家') acc += `<path d="M30 34c8-3 32-3 40 0v5c-8-3-32-3-40 0z" fill="#d63031"/><path d="M69 36l8 4-7 2z" fill="#d63031"/>`;
    if (job === '退伍兵') acc += `<path d="M28 34c4-12 40-12 44 0z" fill="#4b5a2a"/><rect x="26" y="32" width="48" height="5" rx="2" fill="#3a4620"/>`;
    if (job === '厨师') acc += `<path d="M33 30c-6-2-6-12 2-12 2-6 12-7 15-2 3-5 13-4 15 2 8 0 8 10 2 12z" fill="#fff"/><rect x="33" y="27" width="34" height="6" fill="#f0f0f0"/>`;
    if (job === '冒险家') acc += `<path d="M24 35c6-1 10-2 12-10 4-8 24-8 28 0 2 8 6 9 12 10-10 3-42 3-52 0z" fill="#7a5c33"/>`;
    if (job === '工程师') acc += `<rect x="31" y="27" width="38" height="5" rx="2" fill="#333"/><circle cx="42" cy="30" r="4" fill="#79c1e8" stroke="#333"/><circle cx="58" cy="30" r="4" fill="#79c1e8" stroke="#333"/>`;
    if (job === '拾荒者') acc += `<path d="M36 56c4 6 24 6 28 0v8H36z" fill="#7a6a58"/>`;
    if (job === '医生') acc += `<path d="M40 74c0 6 4 10 10 10s10-4 10-10" fill="none" stroke="#333" stroke-width="2"/><circle cx="50" cy="85" r="2.5" fill="#888"/>`;
    if (job === '种植者') acc += `<path d="M62 78c4-6 10-6 12-2-4 1-7 3-12 2z" fill="#6fd08c"/>`;
    const eye = eyes === 1 ? `<path d="M39 46q3-3 6 0M55 46q3-3 6 0" stroke="#222" stroke-width="2" fill="none"/>` : eyes === 2 ? `<circle cx="42" cy="46" r="2.6" fill="#222"/><circle cx="58" cy="46" r="2.6" fill="#222"/><circle cx="43" cy="45" r=".8" fill="#fff"/><circle cx="59" cy="45" r=".8" fill="#fff"/>` : `<ellipse cx="42" cy="46" rx="2" ry="2.4" fill="#222"/><ellipse cx="58" cy="46" rx="2" ry="2.4" fill="#222"/>`;
    const brow = `<path d="M37 40l8-1M55 39l8 1" stroke="${hc}" stroke-width="2.2" stroke-linecap="round"/>`;
    const mouth = m.mood !== undefined && m.mood < 30 ? `<path d="M44 59q6-4 12 0" stroke="#7a3b2e" stroke-width="2" fill="none"/>` : `<path d="M44 57q6 4 12 0" stroke="#7a3b2e" stroke-width="2" fill="none"/>`;
    const female = m.gender === '女';
    const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="${id}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient></defs>
      <rect width="100" height="100" fill="url(#${id})"/>
      ${look.hair === 2 || look.hair === 8 ? `<g fill="${hc}">${hairPath(look.hair)}</g>` : ''}
      <path d="M18 100c2-18 14-26 32-26s30 8 32 26z" fill="${cloth}"/>
      <path d="M42 74l8 10 8-10" fill="${female ? '#fff' : '#ddd'}" opacity=".8"/>
      <rect x="44" y="60" width="12" height="14" rx="4" fill="${skin}" />
      <ellipse cx="50" cy="45" rx="19" ry="21" fill="${skin}"/>
      <ellipse cx="31.5" cy="47" rx="3" ry="5" fill="${skin}"/><ellipse cx="68.5" cy="47" rx="3" ry="5" fill="${skin}"/>
      ${eye}${brow}<path d="M50 48v5l-2 1" stroke="#0003" stroke-width="1.5" fill="none"/>${mouth}
      ${female ? '<ellipse cx="40" cy="53" rx="3" ry="1.6" fill="#f08a8a55"/><ellipse cx="60" cy="53" rx="3" ry="1.6" fill="#f08a8a55"/>' : ''}
      ${look.hair === 2 || look.hair === 8 ? '' : `<g fill="${hc}">${hairPath(look.hair || 0)}</g>`}
      ${look.hair === 2 || look.hair === 8 ? `<path d="M31 40c2-12 10-19 19-19s17 7 19 19c-5-6-11-9-19-9s-14 3-19 9z" fill="${hc}"/>` : ''}
      ${acc}
    </svg>`;
    return svg;
  };
  A.avatarEl = function (m) { const d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%'; d.innerHTML = A.avatar(m); return d; };

  // ---------------- 家具（俯视图）----------------
  const C = 20; // 每格 20 单位
  function wrap(w, h, inner) { return `<svg viewBox="0 0 ${w * C} ${h * C}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`; }
  const sh = (x, y, w, h, r) => `<rect x="${x + 1.5}" y="${y + 2.5}" width="${w}" height="${h}" rx="${r || 2}" fill="#0005"/>`;
  A.furniture = function (type, lv, state) {
    const F = DS.FURNITURE[type]; const w = F.w, h = F.h; const W = w * C, H = h * C;
    let s = '';
    switch (F.icon) {
      case 'bed': case 'bed2': {
        const dbl = F.icon === 'bed2';
        s += sh(3, 3, W - 6, H - 6, 3);
        s += `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="3" fill="${dbl ? '#5a3a24' : '#6b4a32'}"/>`;
        s += `<rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="3" fill="#e8e3d8"/>`;
        if (dbl) { s += `<rect x="8" y="7" width="${W / 2 - 11}" height="11" rx="4" fill="#fff"/><rect x="${W / 2 + 3}" y="7" width="${W / 2 - 11}" height="11" rx="4" fill="#fff"/>`; }
        else s += `<rect x="9" y="7" width="${W - 18}" height="11" rx="4" fill="#fff"/>`;
        s += `<path d="M5 ${H * 0.38}h${W - 10}v${H * 0.62 - 6}a3 3 0 0 1-3 3h${-(W - 16)}a3 3 0 0 1-3-3z" fill="${dbl ? '#3f6fa8' : '#3b7a9e'}"/>`;
        s += `<path d="M5 ${H * 0.38}h${W - 10}v4h${-(W - 10)}z" fill="#ffffff44"/>`;
        s += `<path d="M10 ${H * 0.55}h${W - 20}M10 ${H * 0.72}h${W - 20}" stroke="#ffffff22" stroke-width="2"/>`;
        break;
      }
      case 'sofa':
        s += sh(2, 4, W - 4, H - 6, 6);
        s += `<rect x="2" y="4" width="${W - 4}" height="${H - 6}" rx="6" fill="#7a3b46"/><rect x="2" y="4" width="${W - 4}" height="10" rx="5" fill="#5e2b35"/>`;
        s += `<rect x="2" y="6" width="9" height="${H - 9}" rx="4" fill="#5e2b35"/><rect x="${W - 11}" y="6" width="9" height="${H - 9}" rx="4" fill="#5e2b35"/>`;
        for (let i = 0; i < 3; i++) s += `<rect x="${12 + i * ((W - 24) / 3)}" y="15" width="${(W - 24) / 3 - 2}" height="${H - 20}" rx="3" fill="#8f4a56"/>`;
        break;
      case 'table':
        s += `<rect x="1" y="12" width="7" height="12" rx="2" fill="#4a3322"/><rect x="${W - 8}" y="12" width="7" height="12" rx="2" fill="#4a3322"/><rect x="12" y="1" width="12" height="7" rx="2" fill="#4a3322"/><rect x="12" y="${H - 8}" width="12" height="7" rx="2" fill="#4a3322"/>`;
        s += sh(7, 7, W - 14, H - 14, 3) + `<rect x="7" y="7" width="${W - 14}" height="${H - 14}" rx="3" fill="#9a6b40"/><rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="2" fill="#b07c4b"/>`;
        s += `<circle cx="${W / 2}" cy="${H / 2}" r="4" fill="#fff" opacity=".85"/>`;
        break;
      case 'stove':
        s += sh(2, 2, W - 4, H - 4) + `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="2" fill="#9aa4ad"/><rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="2" fill="#2d3238"/>`;
        [W * 0.27, W * 0.73].forEach((cx) => (s += `<circle cx="${cx}" cy="${H / 2}" r="6" fill="#1b1e22" stroke="#6b737c" stroke-width="1.5"/>${state && state.cooking ? `<circle cx="${cx}" cy="${H / 2}" r="3.5" fill="#4ea4ff"/>` : ''}`));
        break;
      case 'fire':
        s += sh(1, 1, W - 2, H - 2) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="#7b6d63"/>`;
        for (let i = 0; i < 4; i++) s += `<rect x="${2 + i * ((W - 4) / 4)}" y="2" width="${(W - 4) / 4 - 1}" height="5" fill="#8f8177" stroke="#5f544c" stroke-width=".5"/>`;
        s += `<rect x="6" y="7" width="${W - 12}" height="${H - 9}" rx="2" fill="#1a1210"/>`;
        if (state && state.lit) s += `<path d="M${W / 2 - 10} ${H - 3}c0-6 4-7 4-11 3 3 2 6 6 6 0-3 2-5 4-6 1 4 6 5 6 11z" fill="#ff7a1a"/><path d="M${W / 2 - 5} ${H - 3}c0-4 3-4 3-7 2 2 2 4 4 4 1-2 1-3 3-4 1 3 3 4 3 7z" fill="#ffd447"/>`;
        else s += `<path d="M${W / 2 - 10} ${H - 4}h20" stroke="#444" stroke-width="3"/>`;
        break;
      case 'shelf':
        s += sh(1, 1, W - 2, H - 2) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="1.5" fill="#5a3d26"/>`;
        { const cols = ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#d35400', '#16a085', '#ecf0f1']; let x = 3; let i = 0; while (x < W - 5) { const bw = 3 + (i * 7) % 3; s += `<rect x="${x}" y="4" width="${bw}" height="${H - 8}" fill="${cols[i % cols.length]}"/>`; x += bw + 0.6; i++; } }
        break;
      case 'gym':
        s += sh(4, 10, W - 8, 12, 3) + `<rect x="4" y="12" width="${W - 8}" height="14" rx="4" fill="#2a2a2a"/><rect x="6" y="14" width="${W - 12}" height="10" rx="3" fill="#c0392b"/>`;
        s += `<rect x="3" y="4" width="${W - 6}" height="3" fill="#bbb"/><rect x="5" y="1" width="5" height="9" rx="1" fill="#333"/><rect x="${W - 10}" y="1" width="5" height="9" rx="1" fill="#333"/>`;
        s += `<rect x="6" y="${H - 10}" width="9" height="5" rx="2" fill="#333"/><rect x="${W - 15}" y="${H - 10}" width="9" height="5" rx="2" fill="#333"/>`;
        break;
      case 'wardrobe':
        s += sh(1, 1, W - 2, H - 2) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="1.5" fill="#8a6542"/><path d="M${W / 2} 2v${H - 4}" stroke="#5a3d26" stroke-width="1.5"/><circle cx="${W / 2 - 3}" cy="${H / 2}" r="1.3" fill="#e0c080"/><circle cx="${W / 2 + 3}" cy="${H / 2}" r="1.3" fill="#e0c080"/>`;
        break;
      case 'pc':
        s += sh(1, 1, W - 2, 12) + `<rect x="1" y="1" width="${W - 2}" height="12" rx="1.5" fill="#3b3f47"/><rect x="${W / 2 - 9}" y="2" width="18" height="4" rx="1" fill="#111"/><rect x="${W / 2 - 8}" y="2.6" width="16" height="2.8" fill="${state && state.on ? '#4ea4ff' : '#1d2a3a'}"/><rect x="${W / 2 - 7}" y="8" width="14" height="3" rx="1" fill="#222"/>`;
        s += `<circle cx="${W / 2}" cy="${H - 4}" r="4" fill="#222"/>`;
        break;
      case 'bath':
        s += sh(1, 1, W - 2, H - 2, 8) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="#f2f4f6"/><rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="6" fill="#9fd3f0"/><circle cx="${W - 8}" cy="${H / 2}" r="2" fill="#bbb"/>`;
        break;
      case 'toilet':
        s += sh(3, 2, 14, 16, 6) + `<rect x="4" y="1" width="12" height="6" rx="2" fill="#e7ecef"/><ellipse cx="10" cy="12" rx="6" ry="7" fill="#f4f7f9"/><ellipse cx="10" cy="12.5" rx="3.5" ry="4.5" fill="#bfe0f2"/>`;
        break;
      case 'chair':
        s += sh(2, 2, W - 4, H - 4, 6) + `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="7" fill="#2b2b33"/><rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="5" fill="#5a5f6b"/><rect x="6" y="8" width="${W - 12}" height="2" fill="#7c8290"/><rect x="6" y="14" width="${W - 12}" height="2" fill="#7c8290"/>`;
        break;
      case 'planter': {
        s += sh(1, 1, W - 2, H - 2) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="#6b4a32"/><rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="2" fill="#3d2a1c"/>`;
        const plots = (state && state.plots) || [];
        for (let i = 0; i < 4; i++) { const px = 8 + (i % 2) * (W / 2 - 4), py = 8 + Math.floor(i / 2) * (H / 2 - 4); const p = plots[i]; if (p) { const g = Math.min(1, p.prog / p.t); const r = 2 + g * 5; s += `<circle cx="${px + 4}" cy="${py + 4}" r="${r}" fill="${p.cold ? '#7a8a6a' : '#5fbf4a'}"/><circle cx="${px + 2}" cy="${py + 2}" r="${r * 0.6}" fill="${p.cold ? '#6a7a5a' : '#7fdc5f'}"/>`; } else s += `<circle cx="${px + 4}" cy="${py + 4}" r="1.5" fill="#5a4030"/>`; }
        break;
      }
      case 'bench':
        s += sh(1, 4, W - 2, H - 6) + `<rect x="1" y="4" width="${W - 2}" height="${H - 6}" rx="2" fill="#8a6a44"/><rect x="3" y="6" width="${W - 6}" height="${H - 10}" fill="#a58053"/>`;
        s += `<rect x="6" y="9" width="10" height="3" fill="#777"/><rect x="${W - 16}" y="${H - 13}" width="8" height="5" rx="1" fill="#c0392b"/><circle cx="${W / 2}" cy="${H / 2}" r="3" fill="#555"/>`;
        if (state && state.busy) s += `<circle cx="${W / 2}" cy="${H / 2}" r="5" fill="none" stroke="#ffd447" stroke-width="1.5" stroke-dasharray="3 2"/>`;
        break;
      case 'medbed':
        s += sh(1, 1, W - 2, H - 2) + `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="#cfd8dc"/><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="2" fill="#f5f8fa"/><rect x="4" y="5" width="9" height="${H - 10}" rx="3" fill="#fff" stroke="#ddd"/><path d="M${W - 12} ${H / 2}h6M${W - 9} ${H / 2 - 3}v6" stroke="#e74c3c" stroke-width="2"/>`;
        break;
      case 'locker':
        s += sh(2, 1, 16, 18) + `<rect x="2" y="1" width="16" height="18" rx="1.5" fill="#5f7d8c"/><path d="M10 2v16" stroke="#3f5560"/><rect x="4" y="4" width="4" height="1" fill="#3f5560"/><rect x="12" y="4" width="4" height="1" fill="#3f5560"/>`;
        break;
      case 'radio':
        s += sh(2, 4, 16, 12) + `<rect x="2" y="4" width="16" height="12" rx="2" fill="#6d5644"/><circle cx="7" cy="10" r="3.5" fill="#2a2a2a"/><rect x="11" y="7" width="5" height="2" fill="#e0c080"/><rect x="11" y="11" width="5" height="2" fill="#444"/><path d="M15 4l3-4" stroke="#999"/>`;
        break;
      case 'cam':
        s += sh(4, 4, 12, 12, 6) + `<circle cx="10" cy="10" r="7" fill="#e0e4e8"/><circle cx="10" cy="10" r="4" fill="#222"/><circle cx="11" cy="9" r="1.2" fill="#fff"/><circle cx="16" cy="4" r="1.6" fill="${state && state.blink ? '#ff3b3b' : '#a33'}"/>`;
        break;
      case 'tv':
        s += sh(1, 4, W - 2, 12) + `<rect x="1" y="5" width="${W - 2}" height="12" rx="1.5" fill="#6b4a32"/><rect x="5" y="1" width="${W - 10}" height="5" rx="1" fill="#111"/><rect x="6" y="2" width="${W - 12}" height="3" fill="#24364f"/>`;
        break;
      default:
        s += `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="3" fill="#666"/>`;
    }
    return wrap(w, h, s);
  };

  // ---------------- 武器图标 ----------------
  const WP = {
    'w-bat': '<path d="M6 42l4 4 30-28c3-3 5-8 2-11s-8-1-11 2z" fill="#c8945a"/><path d="M6 42l4 4-3 3-4-4z" fill="#333"/>',
    'w-blade': '<path d="M10 40l26-26c4-4 9-6 10-5s-1 6-5 10L15 45z" fill="#d6dde4"/><path d="M6 44l6-6 4 4-6 6z" fill="#5a3a24"/>',
    'w-axe': '<path d="M12 44l24-24" stroke="#8a5a32" stroke-width="5" stroke-linecap="round"/><path d="M28 10c8-2 14 4 12 12l-6-2-6-4z" fill="#c0392b"/><path d="M28 10l12 12" stroke="#ddd" stroke-width="2"/>',
    'w-bow': '<path d="M14 6c16 4 26 14 30 30" stroke="#8a5a32" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 6L44 36" stroke="#ddd" stroke-width="1.2"/><path d="M8 42l30-30" stroke="#c9b28a" stroke-width="2"/><path d="M36 10l6-2-2 6z" fill="#ccc"/>',
    'w-pistol': '<path d="M8 16h32v8H22l-3 4-4 12H8l3-14H8z" fill="#3a3f47"/><rect x="38" y="17" width="4" height="4" fill="#222"/><path d="M18 24l3 6" stroke="#222" stroke-width="2"/>',
    'w-taser': '<path d="M8 18h28l4 4v4H24l-4 14h-8l3-14H8z" fill="#f1c40f"/><path d="M36 20h6M36 24h6" stroke="#4ea4ff" stroke-width="2"/>',
    'w-shotgun': '<path d="M4 20h36v5H20l-8 6-2 10H4l3-14z" fill="#5a3a24"/><rect x="16" y="17" width="28" height="4" fill="#333"/>',
    'w-rifle': '<path d="M2 22h12l2-4h22v4h8v4h-8l-2 3h-8l-2 10h-6l1-10H14l-6 6H2z" fill="#2f353d"/><rect x="24" y="14" width="10" height="3" fill="#111"/>',
    'w-sniper': '<path d="M2 24h40v3H2z" fill="#2f353d"/><path d="M4 27h14l-4 10H8z" fill="#4a5a3a"/><rect x="18" y="16" width="14" height="5" rx="2" fill="#111"/><circle cx="32" cy="18.5" r="2" fill="#4ea4ff"/>',
    'w-heavy': '<path d="M2 20h30v10H2z" fill="#2f353d"/><path d="M32 22h14M32 25h14M32 28h14" stroke="#222" stroke-width="2"/><path d="M12 30l-4 10M22 30l4 10" stroke="#555" stroke-width="2"/>',
  };
  A.weapon = (key) => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">${WP[key] || WP['w-blade']}</svg>`;

  // ---------------- 物品图标元素 ----------------
  A.item = function (name, opts) {
    opts = opts || {};
    const it = DS.ITEMS[name];
    const el = document.createElement('div');
    el.className = 'itm' + (opts.size ? ' ' + opts.size : '');
    if (!it) { el.textContent = typeof name === 'string' && name.length <= 2 ? name : '❔'; return el; }
    el.style.setProperty('--ic', DS.CAT_COLORS[it.cat] || '#445');
    if (it.icon && it.icon.startsWith('w-')) el.innerHTML = A.weapon(it.icon); else el.textContent = it.icon || '📦';
    if (it.tier) { const t = document.createElement('span'); t.className = 'tier'; t.textContent = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][it.tier]; el.appendChild(t); }
    if (opts.count !== undefined) { const c = document.createElement('span'); c.className = 'cnt'; c.textContent = opts.count; el.appendChild(c); }
    return el;
  };

  // ---------------- 事件插图 ----------------
  function skyline(r, y, color, n, hmin, hmax, W) {
    let s = ''; let x = -5;
    while (x < W) { const w = 18 + r() * 34; const h = hmin + r() * (hmax - hmin); s += `<rect x="${x}" y="${y - h}" width="${w}" height="${h + 40}" fill="${color}"/>`;
      if (r() < 0.5) s += `<rect x="${x + w * 0.3}" y="${y - h - 8}" width="${w * 0.2}" height="8" fill="${color}"/>`;
      x += w + r() * 4; }
    return s;
  }
  function windows(r, y, W, lit, k) {
    let s = '';
    for (let i = 0; i < k; i++) { const x = r() * W, yy = y - 10 - r() * 60; s += `<rect x="${x}" y="${yy}" width="3" height="4" fill="${r() < lit ? '#ffcf6a' : '#22324a'}"/>`; }
    return s;
  }
  function snowflakes(r, W, H, n, heavy) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, rr = 0.6 + r() * (heavy ? 2 : 1.4), d = 3 + r() * 5;
      s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity="${0.4 + r() * 0.5}"><animateTransform attributeName="transform" type="translate" from="0 ${-H}" to="${heavy ? -40 : -10} ${H}" dur="${d}s" begin="-${r() * d}s" repeatCount="indefinite"/></circle>`;
    }
    return s;
  }
  function skyGrad(id, hour, apoc) {
    let a, b;
    if (hour === undefined) hour = 12;
    if (hour >= 21 || hour < 5) { a = '#050a16'; b = '#12203a'; }
    else if (hour < 8) { a = '#2b3b63'; b = '#d08a6a'; }
    else if (hour >= 18) { a = '#1b2448'; b = '#b0603e'; }
    else { a = apoc ? '#5d6f86' : '#3d7cc9'; b = apoc ? '#aab7c6' : '#9fd0f5'; }
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  }
  A.scene = function (key, seed, opts) {
    opts = opts || {};
    const W = 400, H = 150; const r = rng((seed || 'x') + key);
    const id = 's' + Math.random().toString(36).slice(2, 7);
    const hour = opts.hour, apoc = opts.apoc !== false;
    const night = hour !== undefined && (hour >= 21 || hour < 5);
    let defs = skyGrad(id + 'g', hour, apoc);
    let s = `<rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
    const snowy = apoc;
    const ground = (c) => `<path d="M0 ${H - 22}q100 -10 200 0t200 0V${H}H0z" fill="${c || (snowy ? '#e6eef6' : '#5a6b4a')}"/>`;
    switch (key) {
      case 'door': case 'room': case 'warm': {
        const wall = key === 'warm' ? '#4a3326' : '#2a3242';
        s = `<rect width="${W}" height="${H}" fill="${wall}"/>`;
        if (key === 'door') {
          s += `<rect x="150" y="18" width="100" height="132" fill="#5a3a24" stroke="#2a1a10" stroke-width="4"/><rect x="160" y="28" width="80" height="50" fill="#4a2f1d"/><rect x="160" y="86" width="80" height="54" fill="#4a2f1d"/><circle cx="232" cy="92" r="4" fill="#d9b25a"/><circle cx="200" cy="50" r="3" fill="#111" stroke="#d9b25a"/>`;
          s += `<rect x="150" y="146" width="100" height="4" fill="#ffcf6a" opacity=".6"/><path d="M60 150l20-60h20l20 60z" fill="#ffffff08"/>`;
        } else {
          s += `<rect x="40" y="20" width="110" height="80" fill="url(#${id}g)" stroke="#1a1a1a" stroke-width="5"/><path d="M95 20v80M40 60h110" stroke="#1a1a1a" stroke-width="3"/>`;
          if (snowy) s += `<g clip-path="url(#${id}w)">${snowflakes(r, 150, 100, 14)}</g>`;
          defs += `<clipPath id="${id}w"><rect x="40" y="20" width="110" height="80"/></clipPath>`;
          s += `<rect x="0" y="118" width="${W}" height="32" fill="#00000044"/>`;
          if (key === 'warm') s += `<rect x="250" y="60" width="90" height="70" fill="#6a5a50"/><rect x="262" y="78" width="66" height="52" fill="#1a1210"/><path d="M280 130c0-14 8-14 8-24 6 6 4 12 12 12 0-6 4-10 8-12 2 8 10 10 10 24z" fill="#ff7a1a"/><circle cx="295" cy="110" r="60" fill="#ff9a3c" opacity=".12"/>`;
          else s += `<rect x="240" y="70" width="110" height="40" rx="6" fill="#384a66"/><rect x="250" y="62" width="40" height="14" rx="5" fill="#f2f2f2"/>`;
        }
        break;
      }
      case 'phone': case 'chat':
        s = `<rect width="${W}" height="${H}" fill="#101a2c"/>` + windows(r, 150, W, 0.1, 30).replace(/#22324a/g, '#16233a');
        s += `<rect x="150" y="12" width="100" height="150" rx="14" fill="#0b0f16" stroke="#3b4b66" stroke-width="3"/><rect x="157" y="24" width="86" height="130" rx="6" fill="#1d3557"/>`;
        s += `<rect x="164" y="34" width="56" height="14" rx="7" fill="#3a5a86"/><rect x="180" y="56" width="56" height="14" rx="7" fill="#2f6e3c"/><rect x="164" y="78" width="66" height="14" rx="7" fill="#3a5a86"/><rect x="164" y="100" width="40" height="14" rx="7" fill="#3a5a86"/>`;
        s += `<circle cx="200" cy="80" r="70" fill="#4ea4ff" opacity=".08"/>`;
        break;
      case 'fight': case 'blood':
        s += skyline(r, H - 20, night ? '#0b1220' : '#2a3242', 10, 30, 90, W) + ground(snowy ? '#cfd8e3' : null);
        s += `<rect width="${W}" height="${H}" fill="${key === 'blood' ? '#8a0000' : '#5a0d0d'}" opacity=".35"/>`;
        s += `<path d="M150 30l100 90M250 30l-100 90" stroke="#ddd" stroke-width="7" stroke-linecap="round"/><path d="M150 30l100 90M250 30l-100 90" stroke="#555" stroke-width="2"/>`;
        s += `<path d="M300 40l-12 40M318 44l-14 44M336 52l-12 36" stroke="#d63031" stroke-width="4" stroke-linecap="round" opacity=".85"/>`;
        if (snowy) s += snowflakes(r, W, H, 18);
        break;
      case 'trade': case 'market':
        s += skyline(r, H - 20, night ? '#0b1220' : '#3a4558', 10, 20, 70, W) + ground();
        if (key === 'market') s += `<rect x="90" y="40" width="220" height="90" fill="#cfd5dc"/><rect x="90" y="40" width="220" height="16" fill="#c0392b"/><text x="200" y="52" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">惠 民 超 市</text><rect x="110" y="70" width="60" height="60" fill="#22324a"/><rect x="230" y="70" width="60" height="60" fill="#22324a"/><rect x="180" y="80" width="40" height="50" fill="#14202f"/>`;
        else s += `<path d="M120 60l80-20 80 20v10H120z" fill="#3b6ea5"/><rect x="130" y="70" width="140" height="56" fill="#2a1e14"/><rect x="140" y="96" width="30" height="30" fill="#8a6a44"/><rect x="176" y="100" width="26" height="26" fill="#6b4a32"/><rect x="208" y="92" width="34" height="34" fill="#8a6a44"/><circle cx="256" cy="80" r="5" fill="#ffcf6a"/><circle cx="256" cy="80" r="20" fill="#ffcf6a" opacity=".2"/>`;
        if (snowy) s += snowflakes(r, W, H, 16);
        break;
      case 'storm': case 'cold':
        s = `<rect width="${W}" height="${H}" fill="${key === 'storm' ? '#4a5668' : '#6f8aa8'}"/>` + skyline(r, H - 20, '#3a4454', 10, 20, 80, W) + ground('#eef3f8');
        s += `<rect width="${W}" height="${H}" fill="#fff" opacity=".25"/>`;
        if (key === 'cold') s += `<rect x="186" y="20" width="28" height="110" rx="14" fill="#e8eef4" stroke="#6b7c90" stroke-width="3"/><rect x="194" y="70" width="12" height="50" rx="6" fill="#4ea4ff"/><circle cx="200" cy="122" r="12" fill="#4ea4ff"/>`;
        s += snowflakes(r, W, H, key === 'storm' ? 60 : 30, true);
        break;
      case 'night':
        s = `<rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
        defs = skyGrad(id + 'g', 23, apoc);
        s += `<circle cx="320" cy="34" r="16" fill="#f4f1de"/><circle cx="326" cy="30" r="14" fill="#0d1830"/>`;
        s += skyline(r, H - 18, '#060b14', 14, 30, 100, W) + windows(r, H - 18, W, 0.12, 50) + ground(snowy ? '#9fb0c4' : '#1a2418');
        if (snowy) s += snowflakes(r, W, H, 18);
        break;
      case 'radio':
        s = `<rect width="${W}" height="${H}" fill="#14202f"/>`;
        s += `<rect x="130" y="50" width="140" height="80" rx="8" fill="#6d5644"/><circle cx="170" cy="90" r="24" fill="#2a2a2a"/><circle cx="170" cy="90" r="16" fill="#3a3a3a"/><rect x="210" y="70" width="44" height="10" fill="#e0c080"/><rect x="210" y="88" width="44" height="6" fill="#444"/><circle cx="220" cy="110" r="6" fill="#333"/><circle cx="244" cy="110" r="6" fill="#333"/><path d="M250 50l30-40" stroke="#aaa" stroke-width="3"/>`;
        for (let i = 1; i <= 3; i++) s += `<path d="M${290 + i * 10} ${10 + i * 6}a${i * 14} ${i * 14} 0 0 1 0 ${40}" stroke="#4ea4ff" stroke-width="2" fill="none" opacity="${1 - i * 0.25}"/>`;
        break;
      case 'lab': case 'hospital':
        s = `<rect width="${W}" height="${H}" fill="${key === 'lab' ? '#0c1d26' : '#1b2633'}"/>`;
        if (key === 'hospital') { s += `<rect x="80" y="20" width="240" height="130" fill="#cfd8e0"/>` + Array.from({ length: 18 }, (_, i) => `<rect x="${94 + (i % 6) * 38}" y="${34 + Math.floor(i / 6) * 32}" width="22" height="18" fill="${r() < 0.2 ? '#ffcf6a' : '#2a3a4f'}"/>`).join('') + `<rect x="184" y="2" width="32" height="32" fill="#fff"/><path d="M200 8v20M190 18h20" stroke="#e74c3c" stroke-width="6"/>`; if (snowy) s += ground('#eef3f8') + snowflakes(r, W, H, 14); }
        else { s += `<rect x="0" y="110" width="${W}" height="40" fill="#08141a"/>`; [100, 170, 240, 310].forEach((x, i) => (s += `<rect x="${x - 18}" y="40" width="36" height="80" rx="18" fill="#4ea4ff" opacity=".25"/><rect x="${x - 18}" y="40" width="36" height="80" rx="18" fill="none" stroke="#7fd1ff" stroke-width="2"/><circle cx="${x}" cy="${70 + i * 6}" r="5" fill="#bdf" opacity=".6"/>`)); s += `<rect width="${W}" height="${H}" fill="#4ea4ff" opacity=".07"/>`; }
        break;
      case 'fire':
        s += skyline(r, H - 20, '#1a1010', 10, 30, 90, W) + ground('#3a2a2a');
        s += `<path d="M150 130c0-40 30-40 30-80 20 20 10 40 40 40 0-20 15-35 30-40 6 30 40 40 40 80z" fill="#ff5a1a"/><path d="M175 130c0-25 18-25 18-48 14 14 10 26 26 26 2-12 8-20 16-24 4 20 22 26 22 46z" fill="#ffc447"/><circle cx="210" cy="90" r="90" fill="#ff7a1a" opacity=".15"/>`;
        break;
      case 'car':
        s += skyline(r, H - 20, night ? '#0b1220' : '#3a4558', 10, 20, 70, W) + ground();
        s += `<path d="M110 118l18-30h130l26 30h20v18H90v-18z" fill="#3b5878"/><path d="M136 92h50v24h-64zM192 92h60l18 24h-78z" fill="#9fd0f5" opacity=".8"/><circle cx="140" cy="136" r="13" fill="#111"/><circle cx="270" cy="136" r="13" fill="#111"/><path d="M110 110h190" stroke="#fff" stroke-width="2" opacity=".3"/><path d="M95 104h24v6H95z" fill="#ffcf6a"/>`;
        if (snowy) s += `<path d="M120 92q60-14 140 0l-6-6q-60-10-128 0z" fill="#fff"/>` + snowflakes(r, W, H, 16);
        break;
      case 'ruin':
        s += skyline(r, H - 20, '#2a3242', 8, 20, 60, W) + ground();
        s += `<path d="M120 130l10-80 30-10 10 30 40-20 20 50 30-30 20 60z" fill="#4a5262"/><path d="M140 70h6v60h-6zM210 90h6v40h-6z" fill="#2a3040"/><path d="M130 60l40 10M200 80l30-6" stroke="#8a6a44" stroke-width="3"/>`;
        if (snowy) s += snowflakes(r, W, H, 18);
        break;
      case 'city': default:
        s += `<circle cx="${night ? 330 : 320}" cy="34" r="${night ? 14 : 18}" fill="${night ? '#f4f1de' : apoc ? '#fff8e0' : '#fff3b0'}" opacity="${apoc && !night ? 0.6 : 1}"/>`;
        s += skyline(r, H - 30, night ? '#0b1424' : apoc ? '#7d8a9c' : '#6b84a8', 10, 30, 80, W);
        s += skyline(r, H - 18, night ? '#060b14' : apoc ? '#525e70' : '#4a5f80', 12, 20, 70, W);
        if (night) s += windows(r, H - 18, W, 0.1, 40);
        s += ground();
        if (snowy) s += snowflakes(r, W, H, key === 'snow' ? 40 : 22, key === 'snow');
    }
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${s}</svg>`;
  };

  // ---------------- 标题画 ----------------
  A.titleHouse = function () {
    const W = 480, H = 420; const r = rng('title');
    let s = '';
    s += skyline(r, 230, '#16243a', 16, 30, 120, W) + windows(r, 230, W, 0.06, 40);
    s += `<path d="M0 260q120-30 240-10t240-10V${H}H0z" fill="#c9d6e4"/>`;
    // 建筑
    const bx = 150, by = 90, bw = 260;
    s += `<rect x="${bx}" y="${by}" width="${bw}" height="250" fill="#3a4250"/>`;
    for (let f = 0; f < 3; f++) {
      const y = by + 14 + f * 78;
      s += `<rect x="${bx + 14}" y="${y}" width="${bw - 28}" height="60" fill="#1a1410"/>`;
      s += `<rect x="${bx + 18}" y="${y + 4}" width="${bw - 36}" height="52" fill="url(#tw)"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${bx + 30 + i * 58}" y="${y + 22 + (i % 2) * 6}" width="${22 + (i % 3) * 6}" height="${30 - (i % 2) * 6}" fill="#6b4a32" opacity=".8"/>`;
      s += `<circle cx="${bx + 70 + f * 50}" cy="${y + 10}" r="5" fill="#ffd27a"/><path d="M${bx + 70 + f * 50} ${y}v5" stroke="#222"/>`;
      s += `<path d="M${bx} ${y + 62}h${bw}" stroke="#e8f1fa" stroke-width="6"/>`;
      for (let i = 0; i < 12; i++) s += `<path d="M${bx + 10 + i * 21} ${y + 64}l3 ${8 + (i % 3) * 6}l3 -${8 + (i % 3) * 6}z" fill="#dfeaf5"/>`;
    }
    s += `<rect x="${bx - 6}" y="${by - 10}" width="${bw + 12}" height="14" fill="#2a303a"/><path d="M${bx - 6} ${by - 10}h${bw + 12}" stroke="#eef4fa" stroke-width="6"/>`;
    s += `<path d="M${bx + 220} ${by - 10}v-70" stroke="#5a6270" stroke-width="4"/><g transform="translate(${bx + 220} ${by - 82})"><path d="M0 0l-26 -6M0 0l14 22M0 0l12 -20" stroke="#c9d3de" stroke-width="5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite"/></path><circle r="4" fill="#ff5a4f"/></g>`;
    s += `<path d="M${bx + 40} ${by - 10}v-30M${bx + 30} ${by - 30}h20" stroke="#5a6270" stroke-width="3"/><ellipse cx="${bx + 90}" cy="${by - 22}" rx="16" ry="8" fill="#9aa4ad" transform="rotate(-20 ${bx + 90} ${by - 22})"/>`;
    // 栅栏
    for (let i = 0; i < 9; i++) s += `<path d="M${20 + i * 15} 300v-46" stroke="#4a5262" stroke-width="3"/>`;
    s += `<path d="M18 262h124M18 280h124" stroke="#4a5262" stroke-width="2"/><path d="M18 258q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0" stroke="#8a95a3" stroke-width="1.5" fill="none"/>`;
    s += `<path d="M0 330q140-40 260-10t220-10V${H}H0z" fill="#eef4fa"/>`;
    s += snowflakes(r, W, H, 50);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf7a"/><stop offset="1" stop-color="#d07a2a"/></linearGradient></defs>${s}</svg>`;
  };

  // ---------------- 城市地图 ----------------
  A.PIN_POS = { hospital: [30, 68], market: [56, 74], defense: [20, 46], hotel: [64, 52], pharma: [80, 66], furniture: [42, 38], agri: [84, 30], factory: [16, 22], metro: [52, 22], villa: [74, 12], riverbank: [10, 62], greenhouse: [88, 47], downtown: [40, 55] };
  A.HOME_POS = [44, 86];
  A.cityMap = function (apoc) {
    const W = 400, H = 600; const r = rng('city');
    let s = `<rect width="${W}" height="${H}" fill="${apoc ? '#cfd9e4' : '#2f3a2c'}"/>`;
    // 街区
    for (let y = 0; y < 15; y++) for (let x = 0; x < 10; x++) {
      if (r() < 0.12) continue;
      const bx = x * 42 + 4, byy = y * 42 + 4;
      s += `<rect x="${bx}" y="${byy}" width="${30 + r() * 6}" height="${30 + r() * 6}" rx="2" fill="${apoc ? (r() < 0.5 ? '#b9c5d2' : '#aab7c6') : (r() < 0.5 ? '#46523f' : '#3c4836')}"/>`;
      if (apoc && r() < 0.4) s += `<rect x="${bx + 3}" y="${byy + 3}" width="${18 + r() * 10}" height="${18 + r() * 10}" fill="#e8eef4"/>`;
    }
    // 河
    s += `<path d="M-10 300C80 260 120 360 200 330S330 240 410 280" stroke="${apoc ? '#9fc4e0' : '#2a6f9e'}" stroke-width="34" fill="none"/>`;
    s += `<path d="M-10 300C80 260 120 360 200 330S330 240 410 280" stroke="${apoc ? '#e6f2fb' : '#3d89bd'}" stroke-width="22" fill="none" opacity=".7"/>`;
    // 主路
    s += `<path d="M0 420H400M180 0V600M0 160L400 220" stroke="${apoc ? '#8b97a6' : '#5a5a4a'}" stroke-width="9" fill="none"/>`;
    s += `<path d="M0 420H400M180 0V600M0 160L400 220" stroke="${apoc ? '#f2f6fa' : '#77775f'}" stroke-width="1.5" stroke-dasharray="8 8" fill="none"/>`;
    return `<svg class="map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  };
})();
