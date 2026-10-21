/* 扩展数据：难度、天灾、装备词条、成就、伙伴、春天篇（敌人 / 地点 / 结局）、陷阱物品 */
(function () {
  const DS = (window.DS = window.DS || {});

  // ---------------- 难度 ----------------
  // consume 消耗倍率 / enemy 敌人强度 / temp 室外温度偏移 / money 初始资金倍率 / integ 完整度损失倍率 / pts 重生点倍率
  DS.DIFFS = {
    休闲: { icon: '🌱', consume: 0.75, enemy: 0.8, temp: 8, rad: 0.75, money: 1.3, integ: 0.7, pts: 0.5, desc: '消耗更少、敌人更弱、没那么冷、辐射更低。适合第一次玩。' },
    标准: { icon: '❄️', consume: 1, enemy: 1, temp: 0, money: 1, integ: 1, pts: 1, desc: '设计好的平衡。' },
    硬核: { icon: '☠️', consume: 1.2, enemy: 1.25, temp: -8, rad: 1.15, money: 0.85, integ: 1.3, pts: 1.6, desc: '更饿、更冷、更狠，辐射更强。' },
  };

  // ---------------- 天灾 ----------------
  // days 持续天数；chapter 出现章节（0 = 两章都有）；prep 防备（预警期间在【安全屋】里花材料准备）
  DS.DISASTERS = {
    雪崩: { icon: '🏔️', chapter: 1, days: 1, warn: '山脊积雪过厚，气象站提醒：后天可能发生雪崩。', desc: '屋顶和外墙会被积雪砸中，完整度大幅下降。', prep: { cost: ['item:木头:4', 'item:铁板:2'], name: '加固屋顶' } },
    冰雹: { icon: '🧊', chapter: 0, days: 1, warn: '冷锋过境，后天会有拳头大的冰雹。', desc: '完整度下降，当天出门探索的人可能受伤。', prep: { cost: ['item:铁板:3'], name: '给窗户钉铁板' } },
    太阳风暴: { icon: '🌞', chapter: 0, days: 3, warn: '太阳又一次剧烈爆发，后天电磁风暴会到达地面。', desc: '收音机、电脑、监控失灵 3 天，制造变慢。', prep: { cost: ['item:电子零件:1', 'item:铁板:1'], name: '给电器做屏蔽' } },
    超级寒潮: { icon: '🥶', chapter: 1, days: 3, warn: '北方冷空气倾泻而下，后天起气温还要再降二三十度。', desc: '连续 3 天额外降温 25℃。', prep: { cost: ['item:塑料纤维:3', 'item:木头:2'], name: '封窗堵缝' } },
    辐射尘暴: { icon: '☢️', chapter: 1, days: 2, warn: '蓝辉浓度监测异常，后天会刮起带辐射尘的大风。', desc: '连续 2 天室外辐射翻倍。', prep: { cost: ['item:塑料纤维:2', 'item:滤芯:2'], name: '密封门窗' } },
    冰雾: { icon: '🌫️', chapter: 1, days: 3, warn: '低温冰雾正在聚集，后天起能见度会降到几米。', desc: '3 天里夜袭几率翻倍，探索视野变小。', prep: { cost: ['item:电子零件:1'], name: '架设绊线警报' } },
    极光夜: { icon: '🌌', chapter: 0, days: 1, warn: '天文爱好者在广播里说：后天夜里会有一场大极光。', desc: '全员心情大涨，但当天辐射升高。', prep: null },
    洪水: { icon: '🌊', chapter: 2, days: 2, warn: '上游冰坝开裂，后天融水会冲进城区。', desc: '连续 2 天完整度大幅下降，食物和食材会被泡坏一部分。', prep: { cost: ['item:水泥:2', 'item:木头:4'], name: '垒沙袋' } },
    孢子雨: { icon: '🍄', chapter: 2, days: 2, warn: '变异植物进入繁殖期，后天的雨里会混着孢子。', desc: '2 天里所有人容易恶心、中毒。', prep: { cost: ['item:滤芯:2', 'item:塑料纤维:1'], name: '装新风过滤' } },
  };

  // ---------------- 每日挑战：词条 ----------------
  DS.MUTATORS = {
    物价飞涨: { icon: '💸', desc: '所有商店价格 +30%', shop: 1.3 },
    极寒之年: { icon: '🥶', desc: '室外温度额外 -10℃', temp: -10 },
    暴力之城: { icon: '🔪', desc: '战斗类事件多 50%，晶核掉落 +30%', fight: 1.5, crystal: 1.3 },
    天选之人: { icon: '🍀', desc: '主角运气 +4', luck: 4 },
    晶核狂潮: { icon: '💎', desc: '战斗晶核 +60%，商店价格 +15%', crystal: 1.6, shop: 1.15 },
    纸糊的家: { icon: '🧱', desc: '安全屋完整度损失 +40%', integ: 1.4 },
    丰收年: { icon: '🌾', desc: '种植产量 +50%', farm: 1.5 },
    独行侠: { icon: '🐺', desc: '招募栏位 -1，主角生命 +30%', slots: -1, meHp: 0.3 },
    多事之秋: { icon: '⛈️', desc: '天灾更频繁', disaster: 1.8 },
    饥荒: { icon: '🥫', desc: '饱腹与饮水消耗 +20%', consume: 1.2 },
  };

  // ---------------- 春天篇人物 ----------------
  Object.assign(DS.STORY_RECRUITS, {
    林檎: { gender: '女', age: 27, job: '种植者', title: '植物学研究生', skills: [['敏锐嗅觉', 'A'], ['绿手指', 'S']], look: { hair: 9, hairColor: '#3a2a1a', skin: 1 }, bio: '在植物园的温室里躲了一百天，靠给变异藤蔓做笔记保持清醒。她知道母株怕什么。' },
    铁头: { gender: '男', age: 34, job: '工程师', title: '前掠夺车队技师', skills: [['就地取材', 'A'], ['巧手', 'A']], look: { hair: 6, hairColor: '#222', skin: 3 }, bio: '给老鸦的车队改了一百天的车，后脑勺上有道疤。他说自己受够了。' },
  });
  Object.assign(DS.CONTACTS, {
    沈砚秋: { aff: 0, role: '临川重建会召集人', gender: '女' },
    老鸦: { aff: -20, role: '掠夺车队头目', gender: '男' },
    青姥: { aff: -30, role: '绿潮会大祭司', gender: '女' },
    林檎: { aff: 0, role: '植物学研究生' },
    铁头: { aff: -5, role: '前掠夺车队技师' },
  });

  // ---------------- 装备词条（改装） ----------------
  DS.AFFIXES = {
    武器: { 锋利: { atk: 0.15, d: '攻击 +15%' }, 精准: { crit: 0.08, d: '暴击 +8%' }, 连发: { twice: 0.08, d: '8% 几率追击' }, 吸血: { drain: 0.15, d: '回复造成伤害的 15%' }, 破甲: { ab: 0.12, d: '12% 几率破甲' } },
    防具: { 坚韧: { def: 0.2, d: '防御 +20%' }, 保暖: { cold: 0.2, d: '防寒 +20%' }, 铅衬: { rad: 0.2, d: '防辐射 +20%' }, 敏捷: { dodge: 0.05, d: '闪避 +5%' }, 活力: { hp: 0.12, d: '生命 +12%' } },
    鞋子: { 轻盈: { spd: 0.15, d: '速度 +15%' }, 防滑: { dodge: 0.05, d: '闪避 +5%' }, 加绒: { cold: 0.12, d: '防寒 +12%' }, 疾行: { spd: 0.08, dodge: 0.03, d: '速度 +8%、闪避 +3%' } },
  };
  DS.GEAR_MAX = 10;
  DS.gearUpCost = (it, lv) => ({ crystal: Math.round((it.tier || 1) * 120 * (lv + 1)), money: Math.round((it.tier || 1) * 6000 * (lv + 1)), mat: it.cat === '鞋子' ? `塑料纤维:${lv + 1}` : `铁板:${Math.ceil((lv + 1) / 2)}`, parts: lv >= 5 ? lv - 3 : 0 });
  DS.affixCost = (it) => ({ parts: it.tier || 1, crystal: (it.tier || 1) * 250, money: (it.tier || 1) * 15000 });

  // ---------------- 伙伴（狗） ----------------
  DS.PET = { hp: 90, atk: 14, def: 3, spd: 12, crit: 0.1, dodge: 0.12, grow: 0.14, names: ['小黑', '大黄', '雪球', '土豆', '铁蛋', '旺财', '豆包', '可乐', '馒头', '阿福'] };

  // ---------------- 春天篇：敌人 / 战斗 / 地点 / 结局 ----------------
  Object.assign(DS.ENEMIES, {
    藤蔓怪: { icon: '🌿', hp: 160, atk: 20, def: 6, spd: 6, crit: 0.05, grow: 0.17, tag: '植物', stunAtk: 0.2, drop: { crystal: [40, 100] } },
    孢子体: { icon: '🍄', hp: 110, atk: 16, def: 3, spd: 8, crit: 0.05, grow: 0.17, tag: '植物', poison: 0.35, drop: { crystal: [40, 90] } },
    泥沼鳄: { icon: '🐊', hp: 240, atk: 26, def: 10, spd: 6, crit: 0.08, grow: 0.17, tag: '兽', drop: { crystal: [80, 160], meat: 3 } },
    掠夺者: { icon: '🏴', hp: 150, atk: 24, def: 6, spd: 9, crit: 0.1, grow: 0.17, tag: '人', drop: { crystal: [60, 140], loot: 0.5 } },
    绿潮祭司: { icon: '🧙', hp: 380, atk: 30, def: 10, spd: 9, crit: 0.12, grow: 0.18, tag: '人', boss: true, poison: 0.3, drop: { crystal: [400, 800], loot: 1 } },
    母株: { icon: '🌺', hp: 620, atk: 34, def: 14, spd: 5, crit: 0.08, grow: 0.18, tag: '植物', boss: true, stunAtk: 0.25, drop: { crystal: [600, 1200], loot: 1 } },
  });
  Object.assign(DS.BATTLES, {
    vines: { name: '藤蔓怪', foes: [['藤蔓怪', 0], ['藤蔓怪', -1]] },
    spores: { name: '孢子体群', foes: [['孢子体', 0], ['孢子体', 0], ['孢子体', -1]] },
    croc: { name: '泥沼鳄', foes: [['泥沼鳄', 0]] },
    looters: { name: '掠夺车队', foes: [['掠夺者', 0], ['掠夺者', 0], ['持枪匪徒', 0]] },
    green_cult: { name: '绿潮会', foes: [['绿潮祭司', 0], ['孢子体', 0], ['藤蔓怪', -1]] },
    mother_plant: { name: '母株', foes: [['母株', 0], ['藤蔓怪', 0], ['孢子体', 0]] },
  });
  DS.LOCATIONS.push(
    { id: 'riverbank', name: '解冻江滩', full: '临川江解冻江滩', dist: 4, lv: 16, intel: 5, icon: '🏞️', chapter: 2, loot: { 食物: 2, 材料: 3, 食材: 1 }, foes: ['泥沼鳄', '掠夺者', '藤蔓怪'], desc: '冰面一块块裂开，冻了三个月的车辆和货柜从泥浆里露了出来。' },
    { id: 'greenhouse', name: '植物园', full: '临川市植物园', dist: 6, lv: 18, intel: 6, icon: '🌺', chapter: 2, loot: { 食材: 3, 医疗: 2, 材料: 1 }, foes: ['藤蔓怪', '孢子体', '绿潮祭司'], desc: '玻璃温室被疯长的藤蔓撑破了，空气里是甜得发腻的花粉味。' },
    { id: 'downtown', name: '市中心', full: '市中心广场废墟', dist: 8, lv: 20, intel: 7, icon: '🏙️', chapter: 2, loot: { 武器: 1, 防具: 1, 医疗: 2, 材料: 2, 食物: 1 }, foes: ['掠夺者', '辐射变异体', '藤蔓怪'], desc: '各方势力在这里划地盘，谁先插上旗，谁就能分到解冻后的城市。' },
  );
  DS.ENDINGS.push(
    { id: '春回大地', icon: '🌱', good: true, pts: 15, text: '最后一块冰从屋檐上滑落。你推开门，泥土里冒出一点绿色。', how: '进入春天篇，活到第 160 天' },
    { id: '新城奠基', icon: '🏛️', good: true, pts: 20, text: '幸存者们在解冻的广场上立起第一根柱子。新的城市，从你的安全屋开始。', how: '春天篇中联合各方势力，取得【新城奠基】' },
  );

  // ---------------- 陷阱（夜袭守卫战用） ----------------
  function defTrap(name, o) { DS.ITEMS[name] = Object.assign({ name, cat: '百货', vol: 2, price: 0, desc: '' }, o); }
  defTrap('尖刺陷阱', { icon: '📍', price: 3000, cprice: 300, trap: { kind: 'spike', v: 0.3 }, desc: '守卫战：每波开始时对 1 个敌人造成 30% 最大生命伤害。' });
  defTrap('燃烧瓶', { icon: '🍾', price: 4000, cprice: 400, trap: { kind: 'fire', v: 0.15 }, desc: '守卫战：每波开始时对所有敌人造成 15% 最大生命伤害。' });
  defTrap('绊线雷', { icon: '🧨', price: 5000, cprice: 500, trap: { kind: 'stun', v: 2 }, desc: '守卫战：每波开始时击晕 2 个敌人。' });
  DS.RECIPES.push(
    { id: 'spike', job: 'craft', out: '尖刺陷阱', n: 2, in: ['铁板:1', '木头:1'], t: 1 },
    { id: 'molotov', job: 'craft', out: '燃烧瓶', n: 2, in: ['汽油:1', '塑料纤维:1'], t: 1 },
    { id: 'trip', job: 'craft', out: '绊线雷', n: 2, in: ['电子零件:1', '铁板:1'], t: 2 },
    { id: 'kibble', job: 'cook', out: '狗粮', n: 3, in: ['变异肉:1', '大米:1'], name: '煮狗粮' },
  );
  DS.ITEMS.狗粮 = { name: '狗粮', cat: '食物', icon: '🦴', vol: 1, price: 30, cprice: 40, petFood: 30, desc: '给伙伴吃的。人也能吃，但不太好吃。', eat: { hunger: 10, mood: -2 } };
  DS.LOOT_POOLS.百货 = ['暖宝宝', '扑克牌', '急救手册', '尖刺陷阱', '燃烧瓶'];

  // 守卫战布防位置
  DS.DEF_POS = {
    正门: { icon: '🚪', desc: '第一个挨打，防御 +30%', def: 0.3, taunt: 2 },
    窗口: { icon: '🪟', desc: '远程武器伤害 +25%', ranged: 0.25, taunt: 1 },
    屋顶: { icon: '🏚️', desc: '暴击 +12%，第一波不会被攻击', crit: 0.12, hidden: true, taunt: 0.5 },
  };

  // ---------------- 成就 ----------------
  DS.ACHIEVEMENTS = [
    { id: 'day1', icon: '🌅', name: '重来一次', desc: '度过重生后的第一天' },
    { id: 'apoc', icon: '❄️', name: '末日降临', desc: '迎来第 15 天' },
    { id: 'd30', icon: '🗓️', name: '一个月', desc: '活到第 30 天' },
    { id: 'd50', icon: '⛺', name: '半程', desc: '活到第 50 天' },
    { id: 'd100', icon: '🏆', name: '第一百天', desc: '活到第 100 天' },
    { id: 'd160', icon: '🌱', name: '春天来了', desc: '活到第 160 天' },
    { id: 'win1', icon: '⚔️', name: '首战告捷', desc: '第一次赢下战斗' },
    { id: 'kill100', icon: '💀', name: '百人斩', desc: '累计击败 100 个敌人（跨周目）' },
    { id: 'boss', icon: '👑', name: '屠龙者', desc: '击败一个首领' },
    { id: 'explorer', icon: '🗺️', name: '踏遍临川', desc: '在一局里完成 10 个地点的全部线路' },
    { id: 'story3', icon: '🤝', name: '老友重逢', desc: '在一局里招募 3 名剧情人物' },
    { id: 'crowd', icon: '🏘️', name: '人丁兴旺', desc: '同时拥有 6 名成员' },
    { id: 'lonewolf', icon: '🐺', name: '孤狼', desc: '一个人活过第 50 天' },
    { id: 'chef', icon: '🍳', name: '末日大厨', desc: '在一局里做 50 份饭' },
    { id: 'farmer', icon: '🌾', name: '神农', desc: '在一局里收获 100 份作物' },
    { id: 'crafter', icon: '🔧', name: '工匠', desc: '在一局里制造 20 次' },
    { id: 'cozy', icon: '🛋️', name: '安居乐业', desc: '舒适度达到 100' },
    { id: 'fortress', icon: '🛡️', name: '铜墙铁壁', desc: '三项改造达到 4 级' },
    { id: 'warm', icon: '🔥', name: '室内暖春', desc: '室外低于 -90℃ 时，室内高于 20℃' },
    { id: 'dog', icon: '🐕', name: '好狗狗', desc: '收养一只末日伙伴' },
    { id: 'dog5', icon: '🦮', name: '忠犬', desc: '伙伴升到 5 级' },
    { id: 'bond80', icon: '💞', name: '生死之交', desc: '两名队员羁绊达到 80' },
    { id: 'prepared', icon: '📋', name: '未雨绸缪', desc: '天灾来临前做好防备（累计 3 次）' },
    { id: 'haul', icon: '🎒', name: '满载而归', desc: '一次探索带回 60 体积以上的物资' },
    { id: 'plus10', icon: '✨', name: '强化狂人', desc: '把一件装备强化到 +10' },
    { id: 'guard5', icon: '🏰', name: '守夜人', desc: '赢下 5 场夜袭守卫战' },
    { id: 'dispatch10', icon: '🚩', name: '远征军', desc: '派遣远征成功 10 次（跨周目）' },
    { id: 'daily', icon: '📅', name: '每日挑战者', desc: '完成一次每日挑战' },
    { id: 'hardcore', icon: '☠️', name: '硬核玩家', desc: '硬核难度活过第 100 天' },
    { id: 'end5', icon: '📜', name: '结局收集家', desc: '达成 5 种结局' },
    { id: 'rebirth3', icon: '🔁', name: '前世今生', desc: '重生 3 次' },
    { id: 'g2048', icon: '🔢', name: '合成大师', desc: '在电脑上的 2048 里合出 512' },
    { id: 'snake', icon: '🐍', name: '贪吃蛇', desc: '贪吃蛇拿到 30 分' },
  ];
})();
