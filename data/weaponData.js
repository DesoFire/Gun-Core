export const weaponTypes = ["手枪", "微型冲锋枪", "霰弹枪", "突击步枪", "狙击步枪", "机枪", "火箭筒", "特殊"];

export const specialWeaponChance = 2;

export const weaponTemplates = {
  手枪: { weight: [0, 1], size: [0, 1], range: [0, 2], power: [1, 2] },
  微型冲锋枪: { weight: [1, 2], size: [1, 2], range: [1, 3], power: [1, 3] },
  霰弹枪: { weight: [3, 4], size: [3, 4], range: [0, 2], power: [3, 5] },
  突击步枪: { weight: [2, 3], size: [2, 3], range: [2, 4], power: [2, 3] },
  狙击步枪: { weight: [3, 4], size: [4, 5], range: [4, 5], power: [4, 5] },
  机枪: { weight: [4, 5], size: [4, 5], range: [2, 4], power: [3, 5] },
  火箭筒: { weight: [4, 5], size: [4, 5], range: [3, 5], power: [5, 5] },
  特殊: { weight: [0, 5], size: [0, 5], range: [0, 5], power: [0, 5] },
};

export const rarityWeights = [
  { rarity: "S", weight: 2 },
  { rarity: "A", weight: 8 },
  { rarity: "B", weight: 20 },
  { rarity: "C", weight: 30 },
  { rarity: "D", weight: 20 },
  { rarity: "E", weight: 15 },
  { rarity: "F", weight: 5 },
];

export const rarityMaintenance = { F: 5, E: 10, D: 20, C: 40, B: 80, A: 160, S: 320 };

export const rarityModifiers = {
  F: { positive: 0, negative: 3 },
  E: { positive: 0, negative: 2 },
  D: { positive: 0, negative: 1 },
  C: { positive: 1, negative: 1 },
  B: { positive: 1, negative: 0 },
  A: { positive: 2, negative: 0 },
  S: { positive: 3, negative: 0 },
};

export const damageTypes = ["动能", "腐蚀", "电磁", "爆风", "能量", "燃烧", "异源", "切割"];

export const weaponTags = [
  "精准",
  "轻量化",
  "重型",
  "可靠",
  "廉价",
  "破甲",
  "长枪管",
  "短枪管",
  "强化结构",
  "实验型号",
  "军用剩余",
  "黑市改装",
];

export const positiveTags = ["精准", "轻量化", "可靠", "破甲", "长枪管", "强化结构", "实验型号"];
export const negativeTags = ["重型", "廉价", "短枪管", "军用剩余", "黑市改装"];

export const attributeLabels = {
  weight: "重量",
  size: "体积",
  range: "范围",
  power: "威力",
};

export const attributeScaleLabels = {
  weight: ["羽量", "超轻", "轻", "中", "重", "超重"],
  size: ["袖珍", "微型", "小型", "中型", "大型", "巨型"],
  range: ["极近", "近", "中", "远", "超远", "超视距"],
  power: ["极弱", "弱", "普通", "强", "极强", "屌爆了"]
};

export const weaponNamePrefixes = ["灰市", "制式", "退役", "拼装", "加急验收", "未备案", "短账期", "过保"];
export const weaponNameSuffixes = ["合同执行器", "风险清算器", "门禁说服器", "现场解释器", "预算外样品", "证据删除器"];

export const baseDamageDiceByPower = { 0: "1d1", 1: "1d2", 2: "1d3", 3: "1d6", 4: "1d10", 5: "1d12" };
export const rocketDamageDiceByPower = { 0: "1d2", 1: "1d3", 2: "1d6", 3: "1d10", 4: "1d12", 5: "1d20" };
export const specialDamageDiceByPower = { 0: "1d1", 1: "1d2", 2: "1d6", 3: "1d10", 4: "1d20", 5: "1d100" };
