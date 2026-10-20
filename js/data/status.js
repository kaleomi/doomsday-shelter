/* 伤病 / 负面状态
 * hpd: 每天损失最大生命比例  extra: 每天额外饱腹/饮水/体力消耗  stat: 属性系数
 * next: [每天恶化几率, 恶化为]  days: 自然痊愈天数（0=不会自愈）  death: 每天致死几率  cure: 治疗物品
 */
(function () {
  const DS = (window.DS = window.DS || {});
  DS.STATUS = {
    感冒: { icon: '🤧', color: '#7fb3d5', hpd: 0.04, extra: 3, days: 6, next: [0.08, '肺炎'], death: 0, desc: '每天 -5% 生命，消耗增加，可能恶化为肺炎。' },
    肺炎: { icon: '🫁', color: '#c0392b', hpd: 0.12, extra: 6, days: 0, next: [0, null], death: 0.04, stat: 0.8, desc: '每天 -15% 生命，有致死风险。需抗生素。' },
    失温: { icon: '🥶', color: '#5dade2', hpd: 0.08, extra: 8, days: 3, next: [0.1, '冻伤'], death: 0.03, stat: 0.8, desc: '体力消耗大增，严重时致死。暖宝宝/肾上腺素可治。' },
    冻伤: { icon: '🧊', color: '#2e86c1', hpd: 0.12, extra: 5, days: 0, next: [0, null], death: 0.04, stat: 0.7, desc: '四肢冻伤，全属性下降。需中级以上医疗包。' },
    骨折: { icon: '🦴', color: '#d4ac0d', hpd: 0, extra: 0, days: 8, next: [0, null], death: 0, stat: 0.6, noExplore: true, desc: '无法参与探索。医疗包可治。' },
    中毒: { icon: '🤢', color: '#27ae60', hpd: 0.1, extra: 2, days: 3, next: [0, null], death: 0.02, desc: '每天 -10% 生命。解毒血清可治。' },
    恶心: { icon: '😖', color: '#a9cce3', hpd: 0, extra: 6, days: 2, next: [0, null], death: 0, desc: '吃不下东西，消耗增加。维生素可治。' },
    轻伤: { icon: '🩸', color: '#e59866', hpd: 0.03, extra: 2, days: 5, next: [0.08, '感染'], death: 0, stat: 0.85, desc: '伤口未处理可能感染。绷带/医疗包可治。' },
    重伤: { icon: '🚑', color: '#cb4335', hpd: 0.12, extra: 4, days: 0, next: [0.1, '感染'], death: 0.04, stat: 0.5, noExplore: true, desc: '全属性大降，无法探索。需中级以上医疗包。' },
    感染: { icon: '🦠', color: '#7d3c98', hpd: 0.12, extra: 4, days: 0, next: [0.1, '肺炎'], death: 0.03, stat: 0.75, desc: '伤口化脓发烧。需抗生素。' },
    流血: { icon: '💧', color: '#e74c3c', hpd: 0.08, extra: 0, days: 2, next: [0.15, '感染'], death: 0, desc: '持续失血。止血绷带可治。' },
    轻度辐射: { icon: '☢️', color: '#b7950b', hpd: 0.06, extra: 3, days: 0, next: [0.1, '重度辐射'], death: 0, stat: 0.9, desc: '头晕乏力。需抗辐射药。' },
    重度辐射: { icon: '☣️', color: '#7e5109', hpd: 0.2, extra: 6, days: 0, next: [0, null], death: 0.08, stat: 0.6, desc: '脱发、出血，致命。需抗辐射药或高级医疗包。' },
    濒死: { icon: '💀', color: '#566573', hpd: 0, extra: 0, days: 0, next: [0, null], death: 0.25, stat: 0, noExplore: true, desc: '倒地不起，几天内不救治就会死去。肾上腺素 / 医疗床可救。' },
  };
  DS.SHOPS = {
    食品: { name: '食品超市', icon: '🛒', cats: ['食物', '食材'], exclude: ['净水', '米饭', '炒饭', '什锦炒饭', '青菜汤面', '烤红薯', '烤土豆', '炖肉汤', '烤变异肉', '合成肉'] },
    药店: { name: '药店', icon: '💊', cats: ['医疗'], exclude: ['解毒血清', '肾上腺素', '抗辐射药', '高级医疗包'] },
    建材: { name: '建材市场', icon: '🧱', cats: ['材料'], exclude: ['变异肉'] },
    户外: { name: '户外五金', icon: '🏕️', cats: ['百货', '防具', '鞋子'], maxTier: 1, include: ['羽绒服', '防护服', '棒球棍', '砍刀', '消防斧'] },
    黑市: { name: '黑市', icon: '🕶️', cats: ['武器', '防具', '鞋子', '医疗'], include: ['解毒血清', '肾上腺素', '抗辐射药', '高级医疗包'], minTier: 1, gate: 'blackmarket' },
    家具: { name: '家具城', icon: '🛋️', furniture: true },
    车行: { name: '车行', icon: '🚗', vehicles: true },
    装修: { name: '装修队', icon: '🔨', mods: true },
    集市: { name: '废土集市', icon: '⛺', market: true },
  };
})();
