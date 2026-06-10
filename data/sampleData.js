export const equipmentSlots = {
  head: "头部",
  chest: "胸部",
  back: "背部",
  leftHand: "左手",
  rightHand: "右手",
  waist: "腰挂",
};

export const characterClasses = {
  vanguard: {
    name: "先锋",
    tags: ["战斗", "守卫"],
    stats: { might: 7, agility: 4, wits: 3, resolve: 6 },
    maxHp: 34,
  },
  scout: {
    name: "斥候",
    tags: ["侦察", "潜入"],
    stats: { might: 4, agility: 7, wits: 5, resolve: 4 },
    maxHp: 26,
  },
  medic: {
    name: "医师",
    tags: ["医疗", "支援"],
    stats: { might: 3, agility: 4, wits: 7, resolve: 6 },
    maxHp: 24,
  },
  scholar: {
    name: "学者",
    tags: ["调查", "神秘"],
    stats: { might: 2, agility: 4, wits: 8, resolve: 6 },
    maxHp: 22,
  },
};

export const buildings = {
  tavern: { name: "酒馆", description: "提高招募池规模。", cost: 70, upkeep: 5 },
  infirmary: { name: "医务室", description: "每日降低受伤佣兵的压力。", cost: 80, upkeep: 7 },
  intel: { name: "情报室", description: "提高任务成功率。", cost: 90, upkeep: 8 },
};

export const missionTemplates = [
  { name: "护送补给车", tags: ["战斗", "守卫"], difficulty: 2, duration: 2, reward: { gold: 55, reputation: 8 } },
  { name: "调查废弃矿井", tags: ["调查", "神秘"], difficulty: 3, duration: 3, reward: { gold: 75, reputation: 12 } },
  { name: "追踪失踪信使", tags: ["侦察", "潜入"], difficulty: 2, duration: 2, reward: { gold: 50, reputation: 10 } },
  { name: "清理边境诊所", tags: ["医疗", "支援"], difficulty: 2, duration: 1, reward: { gold: 40, reputation: 7 } },
  { name: "突袭走私仓库", tags: ["战斗", "潜入"], difficulty: 4, duration: 3, reward: { gold: 110, reputation: 16 } },
];

export const sampleItems = [
  { id: "item-helmet-1", name: "过期防暴头盔", slot: "head", type: "护具", tags: ["守卫"], note: "生产批次已被召回，召回原因被重新分类。" },
  { id: "item-vest-1", name: "复合胸甲", slot: "chest", type: "护具", tags: ["战斗"], note: "能挡住大多数合理报价以内的弹药。" },
  { id: "item-pack-1", name: "战地背包", slot: "back", type: "支援", tags: ["生存"], note: "塞得下补给、赃物和一份不完整的撤离计划。" },
  { id: "item-rifle-1", name: "短管自动步枪", slot: "rightHand", type: "武器", tags: ["战斗"], note: "序列号经过礼貌性擦除。" },
  { id: "item-shield-1", name: "折叠防盾", slot: "leftHand", type: "装备", tags: ["守卫"], note: "折叠后像公文包，展开后像事故报告。" },
  { id: "item-medkit-1", name: "灰市医疗包", slot: "waist", type: "消耗支援", tags: ["医疗"], note: "标签写着民用。里面没有任何民用内容。" },
];

export const names = ["林烬", "邵岚", "维克", "阿黛", "秦砾", "诺拉", "赫森", "陆鸦", "米娅", "石泉"];
export const callsigns = ["灰刃", "短灯", "冷针", "旧钟", "黑箱", "铁账", "雾眼", "赤线"];
export const genders = ["未申报", "男", "女", "字段冲突", "档案损坏"];
export const personalities = ["谨慎", "冲动", "冷漠", "合群但只在付款后", "习惯性乐观", "对表格有敌意"];
export const origins = ["第七军区难民带", "旧联邦轨道港", "北境农业安置区", "沿海自治废墟", "矩阵断线城区", "军工企业附属镇"];
export const fears = ["被正式承认存在", "账单准时抵达", "干净的医院", "没有枪声的夜晚", "被老雇主记住真名", "系统弹出实名校验"];
export const creeds = [
  "合同之外不主动开枪，除非对方也懂合同。",
  "只要佣金到账，道德可以稍后同步。",
  "身份是租来的，命暂时还是自己的。",
  "别相信口头撤离点。",
  "能活着报销就是胜利。",
];
export const lastWords = [
  "请把我的欠款标成争议账目。",
  "我申请重新分类为设备损耗。",
  "告诉工会，我这次确实出勤了。",
  "别用真名写战损报告。",
  "如果赔偿太低，就说我从未存在。",
];
