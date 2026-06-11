export const armorTypes = ["防护型", "载荷型", "机动型", "防护载荷型", "防护机动型", "载荷机动型", "平衡型"];

export const armorTemplates = {
  防护型: {
    armor: [4, 5],
    payload: [0, 2],
    weight: [2, 5],
    mobility: [0, 2],
  },
  载荷型: {
    armor: [0, 2],
    payload: [4, 5],
    weight: [2, 4],
    mobility: [0, 2],
  },
  机动型: {
    armor: [0, 2],
    payload: [0, 2],
    weight: [3, 5],
    mobility: [4, 5],
  },
  防护载荷型: {
    armor: [3, 5],
    payload: [3, 5],
    weight: [2, 4],
    mobility: [0, 2],
  },
  防护机动型: {
    armor: [3, 5],
    payload: [0, 2],
    weight: [3, 5],
    mobility: [3, 5],
  },
  载荷机动型: {
    armor: [0, 2],
    payload: [3, 5],
    weight: [3, 5],
    mobility: [3, 5],
  },
  平衡型: {
    armor: [2, 4],
    payload: [2, 4],
    weight: [2, 4],
    mobility: [2, 4],
  },
};

export const armorRarityWeights = [
  { rarity: "S", weight: 2 },
  { rarity: "A", weight: 8 },
  { rarity: "B", weight: 20 },
  { rarity: "C", weight: 30 },
  { rarity: "D", weight: 20 },
  { rarity: "E", weight: 15 },
  { rarity: "F", weight: 5 },
];

export const armorRarityMaintenance = { F: 5, E: 10, D: 20, C: 40, B: 80, A: 160, S: 320 };

export const armorRarityModifiers = {
  F: { positive: 0, negative: 3 },
  E: { positive: 0, negative: 2 },
  D: { positive: 0, negative: 1 },
  C: { positive: 1, negative: 1 },
  B: { positive: 1, negative: 0 },
  A: { positive: 2, negative: 0 },
  S: { positive: 3, negative: 0 },
};

export const armorTags = [
  "轻量化",
  "模块化",
  "军规制造",
  "异金强化",
  "抗冲击",
  "扩容设计",
  "快速穿脱",
  "自适应结构",
  "战术挂载",
  "稳定支撑",
  "廉价材料",
  "笨重",
  "磨损严重",
  "军用剩余",
  "过时型号",
  "结构脆弱",
  "黑市拼装",
  "维修困难",
  "体积过大",
  "实验失败品",
];

export const armorPositiveTags = [
  "轻量化",
  "模块化",
  "军规制造",
  "异金强化",
  "抗冲击",
  "扩容设计",
  "快速穿脱",
  "自适应结构",
  "战术挂载",
  "稳定支撑",
];

export const armorNegativeTags = [
  "廉价材料",
  "笨重",
  "磨损严重",
  "军用剩余",
  "过时型号",
  "结构脆弱",
  "黑市拼装",
  "维修困难",
  "体积过大",
  "实验失败品",
];

export const armorNamePrefixes = ["标准", "战术", "军用", "重型", "轻型", "先进", "实验", "异金", "改装", "黑市"];

export const armorAttributeLabels = {
  armor: "护甲",
  payload: "载荷",
  weight: "重量",
  mobility: "机动",
};

export const armorAttributeScaleLabels = {
  armor: ["更脆弱", "无防护", "弱防护", "标准防护", "强防护", "超强防护"],
  payload: ["载荷降低", "无载荷提升", "载荷提升（小）", "载荷提升（中）", "载荷提升（大）", "载荷提升（超大）"],
  weight: ["羽量", "超轻", "轻", "中", "重", "超重"],
  mobility: ["极其笨重", "笨重", "标准", "灵活", "高机动", "超高机动"],
};
