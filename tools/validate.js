#!/usr/bin/env node
/* 内容校验：node tools/validate.js [文件...]
 * 不带参数时校验 js/data/content/ 下所有文件。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); }
['js/data/items.js', 'js/data/world.js', 'js/data/cast.js', 'js/data/status.js', 'js/data/extra.js', 'js/engine/dsl.js'].forEach((f) => load(path.join(ROOT, f)));
ctx.DS = ctx.window.DS; // 浏览器里 window.DS 就是全局 DS

const contentDir = path.join(ROOT, 'js/data/content');
let files = process.argv.slice(2);
const all = fs.existsSync(contentDir) ? fs.readdirSync(contentDir).filter((f) => f.endsWith('.js')).map((f) => path.join(contentDir, f)) : [];
// 总是加载全部内容，以便检查跨文件引用；只报告指定文件的问题
all.forEach((f) => { try { load(f); } catch (e) { console.log('✖ 语法错误', path.basename(f), e.message); process.exitCode = 1; } });
if (files.length) files = files.map((f) => path.resolve(f));

const DS = ctx.window.DS;
const ids = new Set(DS.EVENTS.map((e) => e.id));
const CATS = ['剧情', '交易', '战斗', '物资', '社交', '完整度', '维护', '人员', '训练', '家具', '探索'];
const SCENES = ['snow', 'door', 'phone', 'fight', 'trade', 'storm', 'room', 'city', 'night', 'radio', 'lab', 'fire', 'blood', 'chat', 'ruin', 'car', 'hospital', 'market', 'cold', 'warm'];
const POOLS = ['prep', 'main', 'house', 'random', 'bubble', 'explore_route', 'explore_spot'];

let errCount = 0, warnCount = 0;
const seen = {};
const byFile = {};
DS.EVENTS.forEach((ev) => {
  const f = ev.__file || '?';
  (byFile[ev.pool] = byFile[ev.pool] || []).push(ev);
});

function report(ev, level, msg) {
  if (level === 'E') errCount++; else warnCount++;
  console.log(`${level === 'E' ? '✖' : '⚠'} [${ev.pool}] ${ev.id}: ${msg}`);
}

DS.EVENTS.forEach((ev) => {
  if (!ev.id) { console.log('✖ 缺少 id', JSON.stringify(ev).slice(0, 80)); errCount++; return; }
  if (seen[ev.id]) report(ev, 'E', 'ID 重复');
  seen[ev.id] = 1;
  if (!POOLS.includes(ev.pool)) report(ev, 'E', '未知 pool ' + ev.pool);
  if (ev.cat && !CATS.includes(ev.cat)) report(ev, 'E', '未知 cat ' + ev.cat);
  if (ev.scene && !SCENES.includes(ev.scene)) report(ev, 'W', '未知 scene ' + ev.scene + '（可用: ' + SCENES.join(',') + '）');
  if (!ev.text || typeof ev.text !== 'string') report(ev, 'E', '缺少 text');
  else if (ev.text.length > 260) report(ev, 'W', 'text 过长 ' + ev.text.length);
  if (ev.day !== undefined) {
    const ok = typeof ev.day === 'number' || (Array.isArray(ev.day) && ev.day.length === 2 && ev.day[0] <= ev.day[1]);
    if (!ok) report(ev, 'E', 'day 格式应为数字或 [min,max]');
  }
  (ev.cond || []).forEach((c) => DS.DSL.checkCond(c).forEach((m) => report(ev, 'E', 'cond ' + m)));
  const usesMember = /\{member\}|\{m他\}/.test(JSON.stringify(ev));
  const hasMemberCond = (ev.cond || []).some((c) => /^members>=([2-9])/.test(c) || /^job:/.test(c));
  if (usesMember && !hasMemberCond) report(ev, 'E', '使用了 {member} 但 cond 中没有 members>=2 或 job:');
  const usesMfx = /"m\.(stat|hp|energy|hunger|thirst|mood|status|leave|die|loyal|cure)/.test(JSON.stringify(ev.opts || []));
  if (usesMfx && !hasMemberCond) report(ev, 'E', '使用了 m.* 效果但 cond 中没有 members>=2 或 job:');
  const js = JSON.stringify(ev);
  const usesPair = /\{member2\}|\{m2他\}|"m2\.|"bond:|bond[<>=]/.test(js);
  const hasPairCond = (ev.cond || []).some((c) => /^members>=([3-9])/.test(c));
  if (usesPair && !hasPairCond) report(ev, 'E', '使用了 {member2} / m2.* / bond 但 cond 中没有 members>=3');
  if (usesPair && ev.pool === 'explore_route') report(ev, 'E', '探索线路事件里不能用 {member2} / bond');
  const usesPet = /\{pet\}|"pet\.|petloyal/.test(js);
  if (usesPet && !(ev.cond || []).includes('pet')) report(ev, 'E', '使用了 {pet} / pet.* 但 cond 中没有 pet');
  if (/"pet:get"/.test(js) && !(ev.cond || []).includes('!pet')) report(ev, 'E', '使用了 pet:get 但 cond 中没有 !pet');
  if (!Array.isArray(ev.opts) || !ev.opts.length) { report(ev, 'E', '缺少 opts'); return; }
  if (ev.opts.length > 4) report(ev, 'W', '选项超过 4 个');
  ev.opts.forEach((o, i) => {
    const tag = `opt${i + 1}`;
    if (!o.t) report(ev, 'E', tag + ' 缺少 t');
    else if (o.t.length > 18) report(ev, 'W', tag + ' 选项文字偏长(' + o.t.length + ')');
    (o.req || []).forEach((c) => DS.DSL.checkCond(c).forEach((m) => report(ev, 'E', tag + ' req ' + m)));
    (o.cost || []).forEach((c) => {
      if (!/^(money|crystal|intel):\d+$/.test(c) && !/^item:.+:\d+$/.test(c)) report(ev, 'E', tag + ' cost 格式应为 money:5000 / item:木柴:2');
      const m = c.match(/^item:(.+):\d+$/); if (m && !DS.ITEMS[m[1]]) report(ev, 'E', tag + ' cost 未知物品 ' + m[1]);
    });
    const branches = [];
    if (o.r !== undefined || o.fx) branches.push({ r: o.r, fx: o.fx || [] });
    if (o.rnd) {
      if (!Array.isArray(o.rnd) || !o.rnd.length) report(ev, 'E', tag + ' rnd 应为数组');
      else o.rnd.forEach((b, j) => { if (typeof b.w !== 'number') report(ev, 'E', tag + ` rnd[${j}] 缺少权重 w`); branches.push(b); });
    }
    if (o.battle) {
      if (!DS.BATTLES[o.battle]) report(ev, 'E', tag + ' 未知战斗模板 ' + o.battle);
      if (!o.win || !o.lose) report(ev, 'E', tag + ' 有 battle 时必须提供 win 和 lose');
      if (o.win) branches.push(o.win);
      if (o.lose) branches.push(o.lose);
    }
    if (o.next && !ids.has(o.next)) report(ev, 'E', tag + ' next 指向不存在的事件 ' + o.next);
    if (!branches.length && !o.next) report(ev, 'E', tag + ' 没有结果（需要 r/fx、rnd、battle 或 next）');
    branches.forEach((b) => {
      if (b.r !== undefined && typeof b.r !== 'string') report(ev, 'E', tag + ' r 应为字符串');
      if (b.r && b.r.length > 200) report(ev, 'W', tag + ' 结果文字偏长 ' + b.r.length);
      (b.fx || []).forEach((f) => DS.DSL.checkFx(f, { ids }).forEach((m) => report(ev, 'E', tag + ' fx ' + m)));
    });
  });
});

const counts = {};
DS.EVENTS.forEach((e) => (counts[e.pool] = (counts[e.pool] || 0) + 1));
console.log('\n事件数量:', JSON.stringify(counts), ' 招募简介:', (DS.RECRUIT_BIOS || []).length);
console.log(errCount ? `✖ ${errCount} 个错误` : '✔ 没有错误', warnCount ? `，⚠ ${warnCount} 个警告` : '');
if (errCount) process.exitCode = 1;
