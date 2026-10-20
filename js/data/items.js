/* 物品表：名称即 ID。内容作者只用这里出现的名称。
 * cat: 食物 / 食材 / 材料 / 医疗 / 百货 / 武器 / 防具 / 鞋子
 * price: 末日前售价（金钱）  cprice: 末日后售价（晶核）  0 = 不出售
 * eat: 食用效果（需求值为绝对点数，hp 为最大生命比例）
 */
(function () {
  const DS = (window.DS = window.DS || {});

  const I = {};
  function def(name, o) { I[name] = Object.assign({ name, vol: 1, price: 0, cprice: 0, desc: '' }, o); }

  // ---------- 食物 ----------
  def('矿泉水', { cat: '食物', icon: '💧', vol: 1, price: 10, cprice: 25, eat: { thirst: 25 }, desc: '末日里最硬的通货之一。' });
  def('净水', { cat: '食物', icon: '🥤', vol: 1, price: 0, cprice: 15, eat: { thirst: 20 }, desc: '烧开的雪水，带点铁锈味。' });
  def('雪水', { cat: '食物', icon: '🧊', vol: 1, price: 0, cprice: 5, eat: { thirst: 20 }, risk: { status: '轻度辐射', p: 0.1 }, desc: '没过滤的雪水，带着蓝辉的辐射尘。' });
  def('压缩饼干', { cat: '食物', icon: '🍪', vol: 1, price: 120, cprice: 70, eat: { hunger: 40, energy: 5, mood: -2 }, desc: '顶饿，但吃多了会怀疑人生。' });
  def('食物供给包', { cat: '食物', icon: '🥡', vol: 2, price: 200, cprice: 160, eat: { hunger: 25, thirst: 20, energy: 10 }, desc: '按基础营养配比压制的补给，省心。' });
  def('蔬菜罐头', { cat: '食物', icon: '🥫', vol: 1, price: 150, cprice: 90, eat: { hunger: 20, thirst: 10, energy: 10, mood: 2 }, desc: '最方便的维生素来源。' });
  def('午餐肉罐头', { cat: '食物', icon: '🍖', vol: 1, price: 180, cprice: 130, eat: { hunger: 30, thirst: 5, energy: 15, mood: 4 }, desc: '油润咸香，开罐声就是幸福。' });
  def('水果罐头', { cat: '食物', icon: '🍑', vol: 1, price: 150, cprice: 110, eat: { hunger: 10, thirst: 25, energy: 10, mood: 4 }, desc: '甜得发腻，在冰天雪地里格外珍贵。' });
  def('泡面', { cat: '食物', icon: '🍜', vol: 1, price: 100, cprice: 90, eat: { hunger: 22, thirst: 12, energy: 10, mood: 3 }, desc: '热气腾腾的一碗，是活着的证据。' });
  def('自热火锅', { cat: '食物', icon: '🍲', vol: 2, price: 300, cprice: 220, eat: { hunger: 35, thirst: 10, energy: 15, mood: 8 }, desc: '辣得冒汗，暂时忘了窗外零下百度。' });
  def('巧克力', { cat: '食物', icon: '🍫', vol: 1, price: 80, cprice: 120, eat: { hunger: 10, energy: 20, mood: 6 }, desc: '高热量，掰一块就能多撑一会儿。' });
  def('米饭', { cat: '食物', icon: '🍚', vol: 1, price: 0, cprice: 60, eat: { hunger: 28, energy: 5, hp: 0.05, mood: 3 }, desc: '自己煮的米饭，香。' });
  def('炒饭', { cat: '食物', icon: '🍛', vol: 1, price: 0, cprice: 90, eat: { hunger: 36, energy: 10, hp: 0.1, mood: 6 }, desc: '青菜炒饭，锅气十足。' });
  def('什锦炒饭', { cat: '食物', icon: '🥘', vol: 1, price: 0, cprice: 150, eat: { hunger: 45, energy: 15, hp: 0.2, mood: 10 }, desc: '有肉有菜，堪称末日盛宴。' });
  def('青菜汤面', { cat: '食物', icon: '🥣', vol: 1, price: 0, cprice: 90, eat: { hunger: 25, thirst: 20, energy: 5, hp: 0.1, mood: 6 }, desc: '清汤寡水，却暖胃。' });
  def('烤红薯', { cat: '食物', icon: '🍠', vol: 1, price: 0, cprice: 70, eat: { hunger: 24, energy: 5, hp: 0.08, mood: 5 }, desc: '剥开皮冒着白气。' });
  def('烤土豆', { cat: '食物', icon: '🥔', vol: 1, price: 0, cprice: 60, eat: { hunger: 22, energy: 5, hp: 0.06, mood: 3 }, desc: '撒点盐就很好吃。' });
  def('炖肉汤', { cat: '食物', icon: '🥘', vol: 2, price: 0, cprice: 200, eat: { hunger: 40, thirst: 20, energy: 15, hp: 0.25, mood: 10 }, desc: '合成肉加土豆慢炖，整个安全屋都是香味。' });
  def('烤变异肉', { cat: '食物', icon: '🥩', vol: 1, price: 0, cprice: 40, eat: { hunger: 30, energy: 10, mood: -3 }, risk: { status: '恶心', p: 0.15 }, desc: '最好别去想它原来是什么。' });

  // ---------- 食材 ----------
  def('大米', { cat: '食材', icon: '🌾', vol: 2, price: 100, cprice: 120, desc: '烹饪食材。' });
  def('挂面', { cat: '食材', icon: '🍝', vol: 1, price: 100, cprice: 120, desc: '烹饪食材。' });
  def('青菜', { cat: '食材', icon: '🥬', vol: 2, price: 100, cprice: 260, desc: '烹饪食材，末日后极其稀缺。' });
  def('土豆', { cat: '食材', icon: '🥔', vol: 2, price: 120, cprice: 200, desc: '烹饪食材，耐储存。' });
  def('红薯', { cat: '食材', icon: '🍠', vol: 2, price: 120, cprice: 200, desc: '烹饪食材，耐储存。' });
  def('合成肉', { cat: '食材', icon: '🥓', vol: 2, price: 0, cprice: 400, desc: '处理过的变异肉，可放心食用。' });

  // ---------- 材料 ----------
  def('木头', { cat: '材料', icon: '🌲', vol: 2, price: 100, cprice: 120, desc: '建材，也能劈成木柴。' });
  def('木柴', { cat: '材料', icon: '🔥', vol: 1, price: 60, cprice: 80, desc: '壁炉和灶台的燃料。' });
  def('铁板', { cat: '材料', icon: '🔩', vol: 4, price: 800, cprice: 300, desc: '加固门窗、制造装备的硬材料。' });
  def('钢铁', { cat: '材料', icon: '🏗️', vol: 5, price: 8000, cprice: 1500, desc: '安全屋升级必需的建材。' });
  def('水泥', { cat: '材料', icon: '🧱', vol: 5, price: 8000, cprice: 1500, desc: '安全屋升级必需的建材。' });
  def('塑料纤维', { cat: '材料', icon: '🧵', vol: 2, price: 150, cprice: 200, desc: '制作装备的基础素材。' });
  def('电子零件', { cat: '材料', icon: '🔌', vol: 1, price: 600, cprice: 450, desc: '旧设备里拆出来的芯片和线圈。' });
  def('青菜种子', { cat: '材料', icon: '🌱', vol: 1, price: 50, cprice: 250, desc: '种植箱里埋下希望。' });
  def('化肥', { cat: '材料', icon: '🧴', vol: 1, price: 100, cprice: 200, desc: '种菜必不可少。' });
  def('变异肉', { cat: '材料', icon: '🍖', vol: 2, price: 0, cprice: 100, desc: '变异生物身上割下的肉，需要处理。' });
  def('汽油', { cat: '材料', icon: '⛽', vol: 2, price: 2000, cprice: 900, desc: '载具燃料，越往后越金贵。' });
  def('滤芯', { cat: '材料', icon: '🧽', vol: 1, price: 300, cprice: 350, desc: '过滤雪水里的辐射尘。' });

  // ---------- 医疗 ----------
  def('止血绷带', { cat: '医疗', icon: '🩹', vol: 1, price: 300, cprice: 80, eat: { hp: 0.12, energy: 3 }, cure: ['流血', '轻伤'], desc: '止血、处理轻伤。' });
  def('感冒药', { cat: '医疗', icon: '💊', vol: 1, price: 300, cprice: 150, cure: ['感冒'], desc: '治疗感冒。' });
  def('抗生素', { cat: '医疗', icon: '🦠', vol: 1, price: 300, cprice: 250, cure: ['感染', '肺炎'], desc: '治疗感染与肺炎。' });
  def('维生素', { cat: '医疗', icon: '🍊', vol: 1, price: 200, cprice: 120, eat: { mood: 2 }, cure: ['恶心'], desc: '缓解恶心，补充营养。' });
  def('解毒血清', { cat: '医疗', icon: '🧪', vol: 1, price: 4000, cprice: 400, eat: { hp: 0.1 }, cure: ['中毒'], desc: '中和变异生物毒素。' });
  def('初级医疗包', { cat: '医疗', icon: '⛑️', tier: 1, vol: 2, price: 2400, cprice: 300, eat: { hp: 0.3 }, cure: ['轻伤', '骨折'], desc: '恢复 30% 生命，处理轻伤、骨折。' });
  def('中级医疗包', { cat: '医疗', icon: '⛑️', tier: 2, vol: 2, price: 6000, cprice: 600, eat: { hp: 0.6 }, cure: ['轻伤', '重伤', '骨折', '流血', '冻伤', '濒死'], desc: '恢复 60% 生命，处理重伤、冻伤，能救回濒死者。' });
  def('高级医疗包', { cat: '医疗', icon: '⛑️', tier: 3, vol: 3, price: 12000, cprice: 1200, eat: { hp: 1 }, cure: ['*'], desc: '恢复全部生命并清除所有伤病。' });
  def('肾上腺素', { cat: '医疗', icon: '💉', vol: 1, price: 3000, cprice: 1500, eat: { energy: 100, hp: 0.1 }, cure: ['失温', '濒死'], desc: '绝境求生，能把濒死的人拉回来。' });
  def('抗辐射药', { cat: '医疗', icon: '☢️', vol: 1, price: 5000, cprice: 800, cure: ['轻度辐射', '重度辐射'], desc: '碘片与螯合剂，清除辐射病。' });

  // ---------- 百货 ----------
  def('暖宝宝', { cat: '百货', icon: '🧤', vol: 1, price: 20, cprice: 60, eat: { mood: 2 }, cure: ['失温'], desc: '贴身发热，可缓解失温。' });
  def('羽绒睡袋', { cat: '百货', icon: '🛌', vol: 4, price: 1000, cprice: 800, desc: '仓库里每有一个，就能为一名成员降低夜间受冻几率。' });
  def('卫星电话', { cat: '百货', icon: '📡', vol: 1, price: 20000, cprice: 0, desc: '基站倒了也能联络外界。' });
  def('急救手册', { cat: '百货', icon: '📕', vol: 1, price: 300, cprice: 200, desc: '阅读后学识 +1（使用即消耗）。', eat: { mood: 1 }, read: { stat: '学识', v: 1 } });
  def('扑克牌', { cat: '百货', icon: '🃏', vol: 1, price: 30, cprice: 100, eat: { mood: 6 }, desc: '全员打一局，心情好一点（使用即消耗）。', team: true });

  // ---------- 武器（atk = 武器攻击）----------
  function gear(name, slot, tier, o) { def(name, Object.assign({ cat: slot, tier, vol: 3 }, o)); }
  gear('棒球棍', '武器', 1, { icon: 'w-bat', price: 300, cprice: 300, atk: 3, trait: { stun: 0.08 }, desc: '有几率击晕敌人。' });
  gear('砍刀', '武器', 1, { icon: 'w-blade', price: 4000, cprice: 500, atk: 4, trait: { double: 0.1 }, desc: '有几率造成双倍伤害。' });
  gear('消防斧', '武器', 1, { icon: 'w-axe', price: 6000, cprice: 700, atk: 5, trait: { armorBreak: 0.15 }, desc: '有几率破甲（受到伤害 +20%）。' });
  gear('复合弓', '武器', 1, { icon: 'w-bow', price: 30000, cprice: 900, atk: 5, trait: { bounce: 0.12 }, desc: '箭矢有几率弹射到另一个敌人。' });
  gear('手枪', '武器', 2, { icon: 'w-pistol', price: 80000, cprice: 1800, atk: 7, trait: { knock: 0.12 }, desc: '有几率击退敌人（其下次行动推迟）。' });
  gear('电击枪', '武器', 2, { icon: 'w-taser', price: 60000, cprice: 1600, atk: 6, trait: { stun: 0.18 }, desc: '有几率使敌人麻痹一回合。' });
  gear('复合弩', '武器', 2, { icon: 'w-bow', price: 90000, cprice: 2200, atk: 8, trait: { double: 0.18 }, desc: '有几率造成双倍伤害。' });
  gear('霰弹枪', '武器', 2, { icon: 'w-shotgun', price: 120000, cprice: 2600, atk: 8, trait: { splash: 0.3 }, desc: '有几率波及另一个敌人（50%伤害）。' });
  gear('突击步枪', '武器', 3, { icon: 'w-rifle', price: 260000, cprice: 4800, atk: 11, trait: { bounce: 0.25 }, desc: '子弹有几率弹射到另一个敌人。' });
  gear('自动步枪', '武器', 3, { icon: 'w-rifle', price: 240000, cprice: 4500, atk: 10, trait: { twice: 0.25 }, desc: '有几率连射两次。' });
  gear('狙击枪', '武器', 3, { icon: 'w-sniper', price: 320000, cprice: 6000, atk: 14, trait: { execute: 0.3 }, desc: '有几率直接击杀生命低于 25% 的敌人。' });
  gear('重机枪', '武器', 3, { icon: 'w-heavy', price: 400000, cprice: 7000, atk: 13, trait: { sweep: 0.25 }, desc: '有几率扫射所有敌人（40%伤害）。' });

  // ---------- 防具 ----------
  gear('羽绒服', '防具', 1, { icon: '🧥', price: 2000, cprice: 400, def: 2, hp: 15, cold: 0.15, desc: '防寒，降低感冒/失温几率。' });
  gear('防护服', '防具', 1, { icon: '🥼', price: 20000, cprice: 900, def: 5, hp: 20, rad: 0.15, desc: '降低辐射影响。' });
  gear('坚固战斗服', '防具', 1, { icon: '🦺', price: 30000, cprice: 1200, def: 7, hp: 30, str: 2, desc: '厚实耐打。' });
  gear('灵巧战斗服', '防具', 1, { icon: '🦺', price: 30000, cprice: 1200, def: 4, hp: 20, agi: 3, spd: 4, desc: '轻便灵活。' });
  gear('防弹衣', '防具', 2, { icon: '🦺', price: 90000, cprice: 2600, def: 12, hp: 50, str: 3, desc: '能挡住手枪弹。' });
  gear('极地作战服', '防具', 2, { icon: '🧥', price: 120000, cprice: 3000, def: 9, hp: 45, cold: 0.4, spd: 3, desc: '军用极寒装备，防寒效果极佳。' });
  gear('辐射防护服', '防具', 3, { icon: '🥼', price: 250000, cprice: 5000, def: 12, hp: 80, rad: 0.5, cold: 0.2, desc: '铅层夹芯，对抗高强度辐射。' });
  gear('战术外骨骼', '防具', 3, { icon: '🤖', price: 450000, cprice: 8000, def: 18, hp: 120, str: 6, spd: 2, desc: '液压助力，力量与防御大幅提升。' });

  // ---------- 鞋子 ----------
  gear('运动鞋', '鞋子', 1, { icon: '👟', price: 600, cprice: 200, hp: 10, spd: 6, dodge: 0.02, desc: '轻快。' });
  gear('登山靴', '鞋子', 1, { icon: '🥾', price: 2000, cprice: 400, hp: 25, spd: 3, cold: 0.05, desc: '稳当。' });
  gear('雪地靴', '鞋子', 1, { icon: '🥾', price: 1500, cprice: 500, hp: 15, spd: 2, cold: 0.12, desc: '防滑保暖。' });
  gear('工装靴', '鞋子', 2, { icon: '🥾', price: 60000, cprice: 1500, hp: 40, spd: 8, dodge: 0.03, desc: '钢头鞋，踢门很好用。' });
  gear('作战靴', '鞋子', 2, { icon: '🥾', price: 90000, cprice: 2200, hp: 60, spd: 12, dodge: 0.05, desc: '军规装备。' });
  gear('极地靴', '鞋子', 3, { icon: '🥾', price: 200000, cprice: 4500, hp: 100, spd: 18, dodge: 0.07, cold: 0.2, desc: '极寒环境专用。' });

  DS.ITEMS = I;
  DS.ITEM_CATS = ['食物', '食材', '材料', '医疗', '百货', '武器', '防具', '鞋子'];
  DS.CAT_COLORS = {
    食物: '#c9772b', 食材: '#5f9e4a', 材料: '#7d8a99', 医疗: '#c0454b', 百货: '#8d6bb5',
    武器: '#b8892a', 防具: '#3f7fb3', 鞋子: '#4b8f8c',
  };
  // 随机掉落池
  DS.LOOT_POOLS = {
    食物: ['矿泉水', '压缩饼干', '食物供给包', '蔬菜罐头', '午餐肉罐头', '水果罐头', '泡面', '巧克力', '自热火锅'],
    食材: ['大米', '挂面', '青菜', '土豆', '红薯'],
    材料: ['木头', '木柴', '铁板', '塑料纤维', '电子零件', '化肥', '青菜种子', '汽油', '滤芯', '钢铁', '水泥'],
    医疗: ['止血绷带', '感冒药', '抗生素', '维生素', '初级医疗包', '中级医疗包', '解毒血清', '抗辐射药', '肾上腺素', '高级医疗包'],
    武器1: ['棒球棍', '砍刀', '消防斧', '复合弓'],
    武器2: ['手枪', '电击枪', '复合弩', '霰弹枪'],
    武器3: ['突击步枪', '自动步枪', '狙击枪', '重机枪'],
    防具1: ['羽绒服', '防护服', '坚固战斗服', '灵巧战斗服'],
    防具2: ['防弹衣', '极地作战服'],
    防具3: ['辐射防护服', '战术外骨骼'],
    鞋子1: ['运动鞋', '登山靴', '雪地靴'],
    鞋子2: ['工装靴', '作战靴'],
    鞋子3: ['极地靴'],
  };
})();
