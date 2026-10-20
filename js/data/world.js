/* 安全屋、家具、改造、载具、职业、技能、敌人、战斗模板、探索地点、结局、重生系统 */
(function () {
  const DS = (window.DS = window.DS || {});

  // ---------------- 安全屋类型 ----------------
  // insul: 保温（0~0.95，室内温度 = 室外 × (1-insul) + 取暖）  antirad: 防辐射  def: 防御  cap: 仓库容积
  DS.HOUSES = {
    旧公寓: { name: '旧公寓', price: 0, w: 5, h: 5, cap: 260, insul: 0.45, antirad: 0.3, def: 5, slots: 1, comfort: 0, floor: 'wood', desc: '你住了三年的出租屋，撑不过真正的寒潮。' },
    烂尾楼: { name: '烂尾楼', price: 400000, w: 8, h: 6, cap: 900, insul: 0.62, antirad: 0.45, def: 10, slots: 4, comfort: -10, floor: 'concrete', desc: '便宜、空间大，四面漏风。改造潜力巨大。', pro: '面积大、仓库大、便宜', con: '保温差、防御弱、心情-' },
    小区民房: { name: '小区民房', price: 1200000, w: 6, h: 6, cap: 600, insul: 0.74, antirad: 0.55, def: 25, slots: 3, comfort: 0, floor: 'tile', desc: '最普通的住宅，左邻右舍既是助力也是隐患。', pro: '均衡、邻里互助事件', con: '面积小、人多眼杂' },
    独栋别墅: { name: '独栋别墅', price: 2000000, w: 8, h: 7, cap: 1000, insul: 0.7, antirad: 0.5, def: 30, slots: 6, comfort: 25, floor: 'wood', desc: '房间多、住得舒服，也格外惹眼。', pro: '舒适、可住人多', con: '更容易招来觊觎' },
    地下堡垒: { name: '地下堡垒', price: 4000000, w: 7, h: 7, cap: 1500, insul: 0.88, antirad: 0.85, def: 80, slots: 6, comfort: -15, floor: 'metal', desc: '废弃人防工程改造的地下仓库，几乎坚不可摧。', pro: '保温防辐射极强、防御极高', con: '昂贵、压抑（心情-）' },
  };

  // 改造轨道：每级效果与花费（末日前用金钱，末日后用晶核+材料）
  DS.MODS = {
    保温: { name: '保温改造', icon: '🧊', max: 5, eff: { insul: 0.05 }, money: [80000, 150000, 260000, 400000, 600000], cost: [[600, '塑料纤维:4', '木头:4'], [1000, '塑料纤维:6', '木头:6'], [1600, '塑料纤维:8', '钢铁:1'], [2400, '塑料纤维:10', '钢铁:2'], [3500, '塑料纤维:12', '钢铁:3']], desc: '加装保温层与双层窗，室内更暖。' },
    防辐射: { name: '防辐射改造', icon: '☢️', max: 5, eff: { antirad: 0.07 }, money: [120000, 200000, 320000, 480000, 700000], cost: [[800, '铁板:4', '水泥:1'], [1200, '铁板:6', '水泥:1'], [1800, '铁板:8', '水泥:2'], [2600, '铁板:10', '水泥:2'], [3600, '铁板:12', '水泥:3']], desc: '铅板夹层与新风过滤，挡住辐射尘。' },
    防御: { name: '防御工事', icon: '🛡️', max: 5, eff: { def: 12 }, money: [100000, 180000, 300000, 450000, 650000], cost: [[700, '铁板:4', '木头:4'], [1100, '铁板:6', '钢铁:1'], [1700, '铁板:8', '钢铁:2'], [2500, '铁板:10', '钢铁:3'], [3500, '铁板:12', '钢铁:4']], desc: '防盗门、钢窗、拒马与射击孔。' },
    仓储: { name: '仓储扩建', icon: '📦', max: 5, eff: { cap: 250 }, money: [60000, 120000, 200000, 300000, 450000], cost: [[500, '木头:6'], [900, '木头:8', '铁板:2'], [1400, '铁板:4', '水泥:1'], [2000, '铁板:6', '水泥:2'], [2800, '钢铁:2', '水泥:3']], desc: '货架、隔层与防潮储藏间。' },
    扩建: { name: '空间扩建', icon: '📐', max: 3, eff: { rows: 1, slots: 1 }, money: [150000, 300000, 500000], cost: [[1200, '水泥:2', '钢铁:1', '木头:6'], [2200, '水泥:3', '钢铁:2', '木头:8'], [3600, '水泥:4', '钢铁:3', '木头:10']], desc: '打通隔墙、扩出一排房间（+1 行空间，+1 人员栏位）。' },
  };

  // ---------------- 家具 ----------------
  // w,h 占地；use: 指派后每个时段的效果；passive: 被动效果；users: 同时使用人数
  DS.FURNITURE = {
    床: { name: '床', icon: 'bed', w: 2, h: 3, price: 3000, cprice: 0, comfort: 3, users: 1, verb: '睡觉', use: { energy: 14, mood: 1 }, desc: '普通的单人床。夜间睡眠体力恢复 +10。' },
    豪华床: { name: '豪华床', icon: 'bed2', w: 3, h: 3, price: 46000, cprice: 3000, comfort: 10, users: 2, verb: '睡觉', use: { energy: 20, mood: 2 }, lv: { energy: 3 }, desc: '记忆棉床垫，夜间睡眠体力恢复 +20，可 2 人同睡。' },
    沙发: { name: '沙发', icon: 'sofa', w: 3, h: 2, price: 30000, cprice: 2200, comfort: 6, users: 3, verb: '躺平', use: { energy: 8, mood: 3 }, lv: { mood: 1 }, desc: '躺平，回复体力与心情。' },
    餐桌: { name: '餐桌', icon: 'table', w: 2, h: 2, price: 8000, cprice: 800, comfort: 3, users: 0, passive: { food: 2 }, lv: { food: 1 }, desc: '用餐时食物效果 +2（每级 +1）。' },
    灶台: { name: '灶台', icon: 'stove', w: 2, h: 1, price: 16000, cprice: 1500, comfort: 2, users: 1, verb: '烹饪', job: 'cook', desc: '烹饪与烧雪水必需。点开就能做饭，有厨师在家时更容易做出双份。' },
    壁炉: { name: '壁炉', icon: 'fire', w: 2, h: 1, price: 35000, cprice: 2600, comfort: 5, users: 0, passive: { heat: 30 }, lv: { heat: 5 }, fuel: 2, desc: '点燃后室内 +30℃（每级 +5℃），每天消耗 2 木柴（或 1 根木头）。' },
    书架: { name: '书架', icon: 'shelf', w: 2, h: 1, price: 5000, cprice: 600, comfort: 3, users: 2, verb: '阅读', use: { train: ['学识', 45], energy: -5, mood: 1 }, lv: { train: 10 }, desc: '阅读提升学识。' },
    健身器械: { name: '健身器械', icon: 'gym', w: 2, h: 2, price: 60000, cprice: 2500, comfort: 3, users: 2, verb: '锻炼', use: { train: ['力量', 45], energy: -10, hunger: -4 }, lv: { train: 10 }, desc: '锻炼提升力量。' },
    衣柜: { name: '衣柜', icon: 'wardrobe', w: 2, h: 1, price: 9000, cprice: 800, comfort: 3, users: 1, verb: '整理', use: { train: ['运气', 34], mood: 1 }, lv: { train: 8 }, desc: '收拾行头，提升运气。' },
    电脑桌: { name: '电脑桌', icon: 'pc', w: 2, h: 1, price: 30000, cprice: 2000, comfort: 4, users: 1, verb: '上网', use: { train: ['灵巧', 34], mood: 4 }, lv: { train: 8 }, desc: '断网前还能玩单机，提升灵巧与心情。' },
    浴缸: { name: '浴缸', icon: 'bath', w: 2, h: 1, price: 60000, cprice: 2800, comfort: 7, users: 1, verb: '泡澡', use: { hp: 0.15, mood: 5 }, cost: '木柴:1', lv: { hp: 0.03 }, desc: '热水泡澡，回复生命与心情（每次 1 木柴）。' },
    马桶: { name: '马桶', icon: 'toilet', w: 1, h: 1, price: 20000, cprice: 1500, comfort: 7, users: 0, passive: { mood: 1 }, desc: '体面的生活从卫生间开始。全员每天心情 +1。' },
    按摩椅: { name: '按摩椅', icon: 'chair', w: 1, h: 2, price: 20000, cprice: 1800, comfort: 8, users: 1, verb: '按摩', use: { energy: 10, mood: 3 }, lv: { energy: 2 }, desc: '缓解疲劳。' },
    种植箱: { name: '种植箱', icon: 'planter', w: 2, h: 2, price: 12000, cprice: 1200, comfort: 2, users: 1, verb: '照料', job: 'farm', desc: '种植青菜、土豆与培育合成肉。室温需 ≥5℃。指派人员可加速。' },
    工作台: { name: '工作台', icon: 'bench', w: 2, h: 2, price: 25000, cprice: 2000, comfort: 1, users: 1, verb: '制造', job: 'craft', desc: '制造装备、木柴、滤芯与零件。' },
    医疗床: { name: '医疗床', icon: 'medbed', w: 2, h: 1, price: 80000, cprice: 4000, comfort: 2, users: 1, verb: '休养', use: { hp: 0.15, heal: 0.25 }, lv: { hp: 0.03, heal: 0.05 }, desc: '伤病成员在此休养，回复生命并有几率自愈伤病，可救回濒死者。' },
    储物柜: { name: '储物柜', icon: 'locker', w: 1, h: 1, price: 6000, cprice: 600, comfort: 0, users: 0, passive: { cap: 80 }, lv: { cap: 25 }, desc: '仓库容积 +80（每级 +25）。' },
    收音机: { name: '收音机', icon: 'radio', w: 1, h: 1, price: 5000, cprice: 0, comfort: 2, users: 1, verb: '收听', use: { intel: 1, mood: 1 }, job: 'radio', desc: '收听广播获取情报，偶尔能联系到幸存者。' },
    监控警报: { name: '监控警报', icon: 'cam', w: 1, h: 1, price: 40000, cprice: 2500, comfort: 0, users: 0, passive: { def: 10 }, lv: { def: 4 }, desc: '防御 +10，夜袭时提前预警。' },
    电视柜: { name: '电视柜', icon: 'tv', w: 2, h: 1, price: 15000, cprice: 1200, comfort: 5, users: 3, verb: '看碟', use: { mood: 4, energy: 3 }, lv: { mood: 1 }, desc: '放一张老电影，大家都能放松一下。' },
  };
  DS.FURN_MAXLV = 5;
  DS.furnUpCost = (f, lv) => ({ crystal: Math.round((f.cprice || 1000) * 0.6 * lv), money: Math.round((f.price || 5000) * 0.5 * lv) });

  // ---------------- 配方 ----------------
  DS.RECIPES = [
    // 烹饪（灶台）
    { id: 'snow', job: 'cook', out: '净水', n: 6, in: ['木柴:1'], name: '烧雪水', desc: '辐射升高后需额外 1 个滤芯' },
    { id: 'snowraw', job: 'cook', out: '雪水', n: 6, in: ['木柴:1'], name: '烧雪水（不过滤）', minRad: 60, desc: '没有滤芯时的办法，喝了可能得辐射病' },
    { id: 'rice', job: 'cook', out: '米饭', n: 2, in: ['大米:1'] },
    { id: 'fried', job: 'cook', out: '炒饭', n: 2, in: ['大米:1', '青菜:1'] },
    { id: 'mixed', job: 'cook', out: '什锦炒饭', n: 2, in: ['大米:1', '青菜:1', '合成肉:1'] },
    { id: 'noodle', job: 'cook', out: '青菜汤面', n: 2, in: ['挂面:1', '青菜:1'] },
    { id: 'potato', job: 'cook', out: '烤土豆', n: 2, in: ['土豆:1'] },
    { id: 'yam', job: 'cook', out: '烤红薯', n: 2, in: ['红薯:1'] },
    { id: 'stew', job: 'cook', out: '炖肉汤', n: 2, in: ['合成肉:1', '土豆:1'] },
    { id: 'mmeat', job: 'cook', out: '烤变异肉', n: 1, in: ['变异肉:1'] },
    // 种植（种植箱），t = 需要的时段数
    { id: 'veg', job: 'farm', out: '青菜', n: 3, in: ['青菜种子:1', '化肥:1'], t: 4 },
    { id: 'tater', job: 'farm', out: '土豆', n: 3, in: ['土豆:1', '化肥:1'], t: 6 },
    { id: 'yam2', job: 'farm', out: '红薯', n: 3, in: ['红薯:1', '化肥:1'], t: 6 },
    { id: 'seed', job: 'farm', out: '青菜种子', n: 2, in: ['青菜:2'], t: 3, name: '留种' },
    { id: 'meat', job: 'farm', out: '合成肉', n: 2, in: ['变异肉:3'], t: 3, name: '培育合成肉' },
    // 制造（工作台）
    { id: 'wood', job: 'craft', out: '木柴', n: 3, in: ['木头:1'], t: 1 },
    { id: 'filter', job: 'craft', out: '滤芯', n: 2, in: ['塑料纤维:1', '木柴:1'], t: 1 },
    { id: 'plate', job: 'craft', out: '铁板', n: 1, in: ['钢铁:1'], t: 1, name: '切割铁板', nOut: 4 },
    { id: 'parts', job: 'craft', out: '电子零件', n: 1, in: ['铁板:1', '塑料纤维:1'], t: 2 },
    { id: 'bandage', job: 'craft', out: '止血绷带', n: 2, in: ['塑料纤维:1'], t: 1 },
    { id: 'g1', job: 'craft', out: '@装备1', n: 1, in: ['塑料纤维:2', '铁板:2'], t: 2, name: '随机初级装备' },
    { id: 'g2', job: 'craft', out: '@装备2', n: 1, in: ['塑料纤维:4', '铁板:4', '电子零件:1'], t: 3, name: '随机中级装备', minLv: 2 },
    { id: 'g3', job: 'craft', out: '@装备3', n: 1, in: ['塑料纤维:6', '铁板:6', '电子零件:3'], t: 4, name: '随机高级装备', minLv: 4 },
  ];

  // ---------------- 载具 ----------------
  DS.VEHICLES = {
    步行: { name: '步行', seats: 2, range: 3, fuel: 0, bag: 40, ram: 0, price: 0, icon: '🚶', desc: '只能去附近 3 个地点，背包 40。' },
    摩托车: { name: '摩托车', seats: 2, range: 5, fuel: 1, bag: 70, ram: 0.15, price: 65000, cprice: 6000, icon: '🏍️', desc: '2 人，可达 5 个地点，背包 70，开局冲撞 15%。' },
    轿车: { name: '轿车', seats: 3, range: 7, fuel: 2, bag: 110, ram: 0.2, price: 160000, cprice: 12000, icon: '🚗', desc: '3 人，可达 7 个地点，背包 110。' },
    越野车: { name: '越野车', seats: 5, range: 10, fuel: 3, bag: 160, ram: 0.3, price: 380000, cprice: 25000, icon: '🚙', desc: '5 人，全地图，背包 160，冲撞 30%。' },
  };

  // ---------------- 职业 ----------------
  // base: 初始属性；grow: 每级成长
  DS.JOBS = {
    格斗家: { icon: '🥊', base: { hp: 120, 力量: 9, 灵巧: 5, 学识: 2, 运气: 3, 速度: 8, 防御: 5 }, grow: { hp: 14, 力量: 2, 灵巧: 1, 速度: 1, 防御: 1 } },
    退伍兵: { icon: '🎖️', base: { hp: 115, 力量: 7, 灵巧: 7, 学识: 3, 运气: 3, 速度: 7, 防御: 6 }, grow: { hp: 12, 力量: 1.5, 灵巧: 1.5, 速度: 1, 防御: 1 } },
    医生: { icon: '🩺', base: { hp: 95, 力量: 3, 灵巧: 5, 学识: 9, 运气: 4, 速度: 6, 防御: 3 }, grow: { hp: 9, 力量: 0.5, 灵巧: 1, 学识: 2, 速度: 0.8, 防御: 0.5 } },
    厨师: { icon: '🍳', base: { hp: 105, 力量: 5, 灵巧: 6, 学识: 4, 运气: 5, 速度: 6, 防御: 3 }, grow: { hp: 10, 力量: 1, 灵巧: 1, 学识: 1, 速度: 0.8, 防御: 0.6 } },
    种植者: { icon: '🌿', base: { hp: 105, 力量: 6, 灵巧: 4, 学识: 5, 运气: 6, 速度: 5, 防御: 4 }, grow: { hp: 11, 力量: 1, 灵巧: 0.8, 学识: 1, 速度: 0.7, 防御: 0.8 } },
    工程师: { icon: '🔧', base: { hp: 100, 力量: 5, 灵巧: 6, 学识: 7, 运气: 3, 速度: 5, 防御: 4 }, grow: { hp: 10, 力量: 1, 灵巧: 1, 学识: 1.5, 速度: 0.7, 防御: 0.8 } },
    学者: { icon: '📚', base: { hp: 90, 力量: 2, 灵巧: 4, 学识: 11, 运气: 5, 速度: 5, 防御: 2 }, grow: { hp: 8, 力量: 0.4, 灵巧: 0.8, 学识: 2.5, 速度: 0.7, 防御: 0.4 } },
    冒险家: { icon: '🧭', base: { hp: 105, 力量: 5, 灵巧: 8, 学识: 4, 运气: 7, 速度: 9, 防御: 3 }, grow: { hp: 10, 力量: 1, 灵巧: 1.5, 学识: 0.8, 速度: 1.2, 防御: 0.6 } },
    特工: { icon: '🕶️', base: { hp: 105, 力量: 6, 灵巧: 9, 学识: 6, 运气: 4, 速度: 9, 防御: 4 }, grow: { hp: 10, 力量: 1, 灵巧: 1.8, 学识: 1, 速度: 1.2, 防御: 0.7 } },
    拾荒者: { icon: '🎒', base: { hp: 100, 力量: 6, 灵巧: 6, 学识: 3, 运气: 9, 速度: 7, 防御: 3 }, grow: { hp: 10, 力量: 1, 灵巧: 1, 学识: 0.6, 运气: 1, 速度: 1, 防御: 0.6 } },
  };

  // ---------------- 技能 ----------------
  // type: 探索（参与探索/战斗时生效）/ 生存（在安全屋即生效）；v: 基础数值（C 品质）
  DS.SKILLS = {
    // 探索 / 战斗
    拳王: { type: '探索', jobs: ['格斗家', '退伍兵', '拾荒者'], v: 0.12, fmt: '近战伤害 +{p}', hook: 'dmg' },
    健壮: { type: '探索', jobs: ['格斗家', '种植者', '退伍兵'], v: 0.12, fmt: '最大生命 +{p}', hook: 'hp' },
    致命: { type: '探索', jobs: ['格斗家', '特工', '冒险家'], v: 0.08, fmt: '暴击率 +{p}', hook: 'crit' },
    偷袭: { type: '探索', jobs: ['特工', '冒险家', '拾荒者'], v: 0.1, fmt: '{p} 几率攻击两次', hook: 'twice' },
    猛击: { type: '探索', jobs: ['格斗家', '种植者', '退伍兵'], v: 0.1, fmt: '{p} 几率击晕敌人', hook: 'stun' },
    狙击手: { type: '探索', jobs: ['退伍兵', '特工'], v: 0.15, fmt: '{p} 几率直接击杀残血(<20%)敌人', hook: 'execute' },
    不怒自威: { type: '探索', jobs: ['格斗家', '退伍兵'], v: 0.15, fmt: '敌人防御 -{p}', hook: 'auraDef' },
    强效镇静: { type: '探索', jobs: ['医生'], v: 0.1, fmt: '敌人攻击 -{p}', hook: 'auraAtk' },
    战地急救: { type: '探索', jobs: ['医生'], v: 0.12, fmt: '每场战斗后全队回复 {p} 生命', hook: 'postHeal' },
    改装达人: { type: '探索', jobs: ['工程师'], v: 0.15, fmt: '全队武器攻击 +{p}', hook: 'auraWeapon' },
    效率优化: { type: '探索', jobs: ['学者', '工程师'], v: 0.1, fmt: '全队速度 +{p}', hook: 'auraSpd' },
    医药知识: { type: '探索', jobs: ['医生', '学者'], v: 0.25, fmt: '探索获得医疗物资几率 +{p}', hook: 'lootMed' },
    后勤保障: { type: '探索', jobs: ['厨师', '拾荒者'], v: 0.2, fmt: '探索获得食物数量 +{p}', hook: 'lootFood' },
    就地取材: { type: '探索', jobs: ['工程师', '冒险家', '拾荒者'], v: 0.2, fmt: '探索获得材料数量 +{p}', hook: 'lootMat' },
    搜寻晶核: { type: '探索', jobs: ['冒险家', '特工', '拾荒者'], v: 0.15, fmt: '获得晶核数量 +{p}', hook: 'lootCrystal' },
    敏锐嗅觉: { type: '探索', jobs: ['冒险家', '拾荒者', '种植者'], v: 1, fmt: '探索地图额外 +{n} 个物资点', hook: 'extraLoot', int: true },
    // 生存
    健康常识: { type: '生存', jobs: ['医生', '学者'], v: 0.2, fmt: '安全屋事件受伤几率 -{p}', hook: 'lessInjury' },
    白衣天使: { type: '生存', jobs: ['医生'], v: 0.2, fmt: '全员患病几率 -{p}', hook: 'lessSick' },
    药物专精: { type: '生存', jobs: ['医生'], v: 0.2, fmt: '药品与治疗效果 +{p}', hook: 'healBoost' },
    威慑: { type: '生存', jobs: ['格斗家', '退伍兵', '特工'], v: 0.15, fmt: '夜袭/冲突几率 -{p}', hook: 'lessRaid' },
    守夜人: { type: '生存', jobs: ['退伍兵', '格斗家', '冒险家'], v: 0.2, fmt: '遇袭时完整度损失 -{p}', hook: 'lessDamage' },
    耐力: { type: '生存', jobs: ['*'], v: 0.12, fmt: '自身体力消耗 -{p}', hook: 'stamina' },
    刺探: { type: '生存', jobs: ['特工', '学者'], v: 1, fmt: '每次获得情报额外 +{n}', hook: 'intel', int: true },
    生存专家: { type: '生存', jobs: ['冒险家', '拾荒者'], v: 0.1, fmt: '仓库容积 +{p}', hook: 'cap' },
    火候掌控: { type: '生存', jobs: ['厨师'], v: 0.25, fmt: '烹饪时 {p} 几率双倍产出', hook: 'cookDouble' },
    美食家: { type: '生存', jobs: ['厨师'], v: 3, fmt: '全员进食效果 +{n}', hook: 'foodBonus', int: true },
    绿手指: { type: '生存', jobs: ['种植者'], v: 0.3, fmt: '种植产量 +{p}', hook: 'farmBoost' },
    巧手: { type: '生存', jobs: ['工程师'], v: 0.2, fmt: '制造时 {p} 几率不消耗材料', hook: 'craftSave' },
    修缮专家: { type: '生存', jobs: ['工程师', '种植者'], v: 1, fmt: '每天自动修复 {n}% 完整度', hook: 'repair', int: true },
    乐天派: { type: '生存', jobs: ['*'], v: 1, fmt: '全员每天心情 +{n}', hook: 'cheer', int: true },
    精打细算: { type: '生存', jobs: ['拾荒者', '学者', '厨师'], v: 0.08, fmt: '商店价格 -{p}', hook: 'discount' },
  };
  DS.QUALITY = { S: 2.0, A: 1.5, B: 1.2, C: 1.0 };
  DS.QUALITY_W = { S: 2, A: 8, B: 25, C: 65 };

  // ---------------- 敌人 ----------------
  // 基础（1级）+ 每级成长；tag 用于事件描述/掉落
  DS.ENEMIES = {
    混混: { icon: '😠', hp: 45, atk: 9, def: 1, spd: 6, crit: 0.03, grow: 0.15, tag: '人', drop: { crystal: [0, 0], loot: 0.3 } },
    打手: { icon: '😤', hp: 65, atk: 12, def: 3, spd: 6, crit: 0.05, grow: 0.15, tag: '人', drop: { crystal: [0, 0], loot: 0.3 } },
    变异犬: { icon: '🐕', hp: 60, atk: 13, def: 2, spd: 11, crit: 0.08, grow: 0.17, tag: '兽', drop: { crystal: [15, 40], meat: 1 } },
    变异鼠群: { icon: '🐀', hp: 40, atk: 9, def: 0, spd: 12, crit: 0.05, grow: 0.15, tag: '兽', poison: 0.15, drop: { crystal: [8, 25] } },
    冰原狼: { icon: '🐺', hp: 85, atk: 16, def: 3, spd: 12, crit: 0.1, grow: 0.17, tag: '兽', drop: { crystal: [25, 60], meat: 2 } },
    冻尸: { icon: '🧟', hp: 120, atk: 14, def: 6, spd: 4, crit: 0.02, grow: 0.17, tag: '尸', bleed: 0.15, drop: { crystal: [20, 50], loot: 0.3 } },
    暴徒: { icon: '🪓', hp: 90, atk: 15, def: 4, spd: 7, crit: 0.06, grow: 0.16, tag: '人', drop: { crystal: [20, 70], loot: 0.45 } },
    持枪匪徒: { icon: '🔫', hp: 80, atk: 19, def: 3, spd: 8, crit: 0.1, grow: 0.16, tag: '人', drop: { crystal: [30, 90], loot: 0.5 } },
    白霜教徒: { icon: '🧿', hp: 85, atk: 14, def: 4, spd: 8, crit: 0.06, grow: 0.16, tag: '人', poison: 0.25, drop: { crystal: [40, 100], loot: 0.4 } },
    辐射变异体: { icon: '👾', hp: 140, atk: 18, def: 6, spd: 7, crit: 0.06, grow: 0.18, tag: '变异', rad: true, drop: { crystal: [50, 130], meat: 1 } },
    霜甲熊: { icon: '🐻', hp: 320, atk: 26, def: 10, spd: 6, crit: 0.08, grow: 0.18, tag: '兽', boss: true, drop: { crystal: [200, 400], meat: 4 } },
    教主护法: { icon: '👹', hp: 280, atk: 24, def: 8, spd: 9, crit: 0.12, grow: 0.18, tag: '人', boss: true, poison: 0.3, drop: { crystal: [250, 500], loot: 1 } },
    变异首领: { icon: '👿', hp: 380, atk: 28, def: 12, spd: 8, crit: 0.1, grow: 0.18, tag: '变异', boss: true, drop: { crystal: [300, 600], loot: 1 } },
    雪怪: { icon: '❄️', hp: 460, atk: 30, def: 14, spd: 7, crit: 0.1, grow: 0.18, tag: '兽', boss: true, drop: { crystal: [400, 800], meat: 6 } },
    实验体: { icon: '🧬', hp: 420, atk: 32, def: 10, spd: 10, crit: 0.12, grow: 0.18, tag: '变异', boss: true, rad: true, drop: { crystal: [450, 900], loot: 1 } },
  };

  // 战斗模板：事件里用 battle:模板ID 引用。lv 为相对“当前威胁等级”的偏移
  DS.BATTLES = {
    street: { name: '街头混混', foes: [['混混', 0], ['混混', 0]], fixedLv: 1 },
    loan_shark: { name: '讨债打手', foes: [['打手', 0], ['打手', 0], ['混混', 0]], fixedLv: 2 },
    dog: { name: '变异犬', foes: [['变异犬', 0]] },
    dogs: { name: '变异犬群', foes: [['变异犬', 0], ['变异犬', -1], ['变异犬', -1]] },
    rats: { name: '变异鼠群', foes: [['变异鼠群', 0], ['变异鼠群', 0], ['变异鼠群', -1]] },
    wolves: { name: '冰原狼群', foes: [['冰原狼', 0], ['冰原狼', 0], ['冰原狼', 1]] },
    bear: { name: '霜甲熊', foes: [['霜甲熊', 0]] },
    thugs: { name: '暴徒', foes: [['暴徒', 0], ['暴徒', -1]] },
    gang: { name: '匪帮', foes: [['暴徒', 0], ['持枪匪徒', 0], ['暴徒', -1]] },
    gunmen: { name: '持枪匪徒', foes: [['持枪匪徒', 0], ['持枪匪徒', 0], ['持枪匪徒', 1]] },
    cultists: { name: '白霜教徒', foes: [['白霜教徒', 0], ['白霜教徒', 0], ['白霜教徒', -1]] },
    cult_boss: { name: '白霜教护法', foes: [['教主护法', 0], ['白霜教徒', 0], ['白霜教徒', 0]] },
    frozen: { name: '冻尸', foes: [['冻尸', 0], ['冻尸', -1]] },
    horde: { name: '冻尸潮', foes: [['冻尸', 0], ['冻尸', 0], ['冻尸', -1], ['冻尸', -1]] },
    mutant: { name: '辐射变异体', foes: [['辐射变异体', 0]] },
    mutants: { name: '变异体群', foes: [['辐射变异体', 0], ['辐射变异体', -1], ['变异犬', 0]] },
    boss_mutant: { name: '变异首领', foes: [['变异首领', 0], ['辐射变异体', -1]] },
    yeti: { name: '雪怪', foes: [['雪怪', 0]] },
    lab_boss: { name: '实验体', foes: [['实验体', 0], ['辐射变异体', -1]] },
    raiders: { name: '夜袭者', foes: [['暴徒', 0], ['持枪匪徒', 0], ['暴徒', 0], ['混混', 1]] },
  };

  // ---------------- 探索地点 ----------------
  // dist: 距离（载具 range 决定可达）；lv: 敌人等级基准；intel: 进入消耗情报；routes: 线路（地图尺寸）
  DS.LOCATIONS = [
    { id: 'hospital', name: '市一院', full: '市第一人民医院', dist: 1, lv: 1, intel: 1, icon: '🏥', loot: { 医疗: 3, 食物: 2, 材料: 1 }, foes: ['变异犬', '冻尸', '暴徒'], desc: '挂号大厅的电子屏还停在寒潮那天的日期，走廊尽头传来拖拽声。' },
    { id: 'market', name: '惠民超市', full: '惠民生活超市', dist: 2, lv: 2, intel: 2, icon: '🛒', loot: { 食物: 4, 食材: 2, 材料: 1 }, foes: ['变异鼠群', '暴徒', '变异犬'], desc: '促销横幅还挂在门口，“全场五折”四个字被冰碴糊住了一半。' },
    { id: 'defense', name: '武警营区', full: '临川武警支队营区', dist: 3, lv: 4, intel: 3, icon: '🏛️', loot: { 武器: 2, 防具: 1, 医疗: 1, 材料: 1 }, foes: ['持枪匪徒', '冻尸', '暴徒'], desc: '操场上的旗杆被冻裂了，营房的门一扇扇敞着，像在等谁回来。' },
    { id: 'hotel', name: '云顶酒店', full: '云顶大酒店', dist: 4, lv: 6, intel: 3, icon: '🏨', loot: { 食物: 3, 百货: 1, 医疗: 1, 材料: 1 }, foes: ['暴徒', '持枪匪徒', '冰原狼'], desc: '旋转门卡死在半圈，大堂钢琴上积了一指厚的霜。' },
    { id: 'pharma', name: '恒生制药', full: '恒生生物制药厂', dist: 5, lv: 8, intel: 4, icon: '🧪', loot: { 医疗: 4, 材料: 2 }, foes: ['辐射变异体', '白霜教徒', '变异鼠群'], desc: '门禁卡读卡器还亮着红灯，地下实验层的通风口往外冒着淡蓝色的雾。' },
    { id: 'furniture', name: '家居城', full: '金鼎家居城', dist: 5, lv: 9, intel: 4, icon: '🛋️', loot: { 材料: 4, 百货: 1, 食物: 1 }, foes: ['冰原狼', '暴徒', '冻尸'], desc: '样板间里摆着一家三口的假人，餐桌上的塑料水果冻得发脆。' },
    { id: 'agri', name: '农研所', full: '市农业科学研究所', dist: 6, lv: 11, intel: 5, icon: '🌾', loot: { 食材: 3, 材料: 2, 食物: 1 }, foes: ['变异鼠群', '辐射变异体', '冰原狼'], desc: '育种温室塌了一半，种子库的铁柜上贴着“严禁带出”的封条。' },
    { id: 'factory', name: '机械厂', full: '长丰重型机械厂', dist: 7, lv: 13, intel: 5, icon: '🏭', loot: { 材料: 5, 武器: 1 }, foes: ['冻尸', '持枪匪徒', '辐射变异体'], desc: '行车吊钩悬在半空，车间地上散着没来得及装箱的轴承。' },
    { id: 'metro', name: '地铁站', full: '中心广场地铁避难所', dist: 8, lv: 15, intel: 6, icon: '🚇', loot: { 食物: 2, 医疗: 2, 材料: 2, 防具: 1 }, foes: ['白霜教徒', '暴徒', '冻尸'], desc: '换乘大厅里拉满了晾衣绳，广播里循环着一段断断续续的寻人启事。' },
    { id: 'villa', name: '富人区', full: '翡翠湾别墅区', dist: 9, lv: 17, intel: 6, icon: '🏘️', loot: { 武器: 1, 防具: 1, 医疗: 2, 食物: 2, 材料: 1 }, foes: ['持枪匪徒', '冰原狼', '辐射变异体'], desc: '雕花铁门上挂着“私人领地”的铜牌，门后的草坪被雪压得平平整整，没有一个脚印。' },
  ];
  DS.ROUTE_SIZES = [{ w: 5, h: 5, loot: [3, 4], foes: [1, 2], name: '外围' }, { w: 6, h: 6, loot: [4, 6], foes: [2, 3], name: '内部' }, { w: 7, h: 7, loot: [6, 8], foes: [3, 4], name: '深处' }];

  // ---------------- 结局 ----------------
  DS.ENDINGS = [
    { id: '战斗死亡', icon: '⚔️', good: false, pts: 1, text: '冻僵的手指再也扣不动扳机，血还没流尽就凝成了冰。', how: '主角在战斗中阵亡' },
    { id: '精神崩溃', icon: '🌀', good: false, pts: 3, text: '幻觉里，那扇门后面是春天。你笑着推开了它。', how: '主角心情降到 0' },
    { id: '死于疾病', icon: '🦠', good: false, pts: 3, text: '咳嗽震裂了肺叶，药箱早就空了。', how: '主角死于伤病' },
    { id: '资源匮乏', icon: '🥫', good: false, pts: 3, text: '最后一块压缩饼干三天前就吃完了，胃开始消化绝望。', how: '主角饿死或渴死' },
    { id: '冰封', icon: '🧊', good: false, pts: 3, text: '壁炉熄灭的那晚，你梦见了夏天的海。', how: '主角死于失温' },
    { id: '锒铛入狱', icon: '🚔', good: false, pts: 5, text: '末世还没来，你先进了局子。铁窗外的雪越下越大。', how: '末日前因斗殴被拘留且没能出来' },
    { id: '末日首富', icon: '💰', good: false, pts: 5, text: '你的账户余额足以买下半座城，可它买不来一度温暖。', how: '末日降临时没有安全屋，手里却攥着巨款' },
    { id: '安全屋告破', icon: '🏚️', good: false, pts: 5, text: '防线被彻底撕开，冰风和敌人一起涌了进来。', how: '安全屋完整度降到 10% 以下' },
    { id: '地下安居', icon: '🕳️', good: true, pts: 10, text: '厚重的混凝土把末日关在门外，你们在地下守着一盏灯，等春天。', how: '以地下堡垒为安全屋，生存满 100 天' },
    { id: '社区共生', icon: '🏘️', good: true, pts: 10, text: '邻居们抱团取暖，末日也没那么可怕了。', how: '以小区民房为安全屋并建立互助会，生存满 100 天' },
    { id: '雪中暖巢', icon: '🏡', good: true, pts: 10, text: '别墅的灯一盏盏亮起，成了冰原上幸存者口口相传的“暖巢”。', how: '以独栋别墅为安全屋并收留至少 5 名成员，生存满 100 天' },
    { id: '钢铁丛林', icon: '🏗️', good: true, pts: 10, text: '你把漏风的烂尾楼改造成了钢铁要塞，废墟里长出了一座工坊城。', how: '以烂尾楼为安全屋，三项改造均达到 3 级，生存满 100 天' },
    { id: '官方据点', icon: '🎖️', good: true, pts: 12, text: '运输机的轰鸣穿透暴雪，你们被接进了官方据点。', how: '取得【军方联络】并生存满 100 天' },
    { id: '苟活', icon: '🕯️', good: true, pts: 6, text: '你活过了一百天。没有奇迹，只有又一个寒冷的早晨。', how: '生存满 100 天（未满足其它结局条件）' },
  ];

  // ---------------- 重生系统（用重生点激活） ----------------
  DS.PERKS = [
    { id: 'memory', name: '前世记忆', cost: 5, icon: '🧠', desc: '选项里埋着“隐患”时，会显示 ⚠ 提示。' },
    { id: 'fund', name: '启动资金', cost: 10, icon: '💴', desc: '开局额外获得 50 万元。' },
    { id: 'suppress', name: '战斗压制', cost: 10, icon: '🩸', desc: '战斗开始时所有敌人只有一半生命。' },
    { id: 'strong', name: '力大无穷', cost: 20, icon: '💪', desc: '主角力量 +3，每进行 5 场战斗力量再 +3。' },
    { id: 'leader', name: '领袖气质', cost: 20, icon: '👑', desc: '招募的人员必定带有一个 S 级技能。' },
    { id: 'battle', name: '战斗爽', cost: 25, icon: '⚡', desc: '主角每进行 5 场战斗自动升 1 级。' },
    { id: 'loot', name: '刀刀爆物资', cost: 25, icon: '🎁', desc: '每场战斗胜利后额外获得一件随机物资。' },
    { id: 'farmer', name: '神农', cost: 25, icon: '🌽', desc: '种植产量必定翻倍。' },
    { id: 'weapon', name: '武器大师', cost: 30, icon: '🗡️', desc: '获得安全屋时，额外获得两把高级武器。' },
    { id: 'space', name: '无限空间', cost: 40, icon: '🌌', desc: '仓库容积无限。' },
  ];
})();
