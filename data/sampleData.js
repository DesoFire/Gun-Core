export const equipmentSlots = {
  weapon: "武器",
  armor: "防具",
};

export const careerCategories = {
  combat: {
    name: "战斗类",
    description: "正面交火、高危突破和压制火力。",
    tags: ["战斗"],
    effects: { combatPowerBonus: 4, combatMissionChanceBonus: 5 },
  },
  survival: {
    name: "生存类",
    description: "降低死亡、受伤和长期压力。",
    tags: ["生存"],
    effects: { deathRiskReduction: 2, mentalConditionRiskReduction: 0.1 },
  },
  intel: {
    name: "情报类",
    description: "降低契约不确定性，处理隐藏风险。",
    tags: ["侦察", "调查"],
    effects: { powerIntelBonus: 1, investigateDiscount: 0.1 },
  },
  logistics: {
    name: "后勤类",
    description: "治疗、装备、收益和基地协同。",
    tags: ["支援"],
    effects: { rewardGoldBonus: 0.05, logisticsMissionChanceBonus: 4 },
  },
  abnormal: {
    name: "异常类",
    description: "处理异源、污染和精神风险。",
    tags: ["异常"],
    effects: { abnormalMissionChanceBonus: 6, mentalSeverityReduction: 0.15 },
  },
  growth: {
    name: "成长类",
    description: "初始不稳定，但更容易成长。",
    tags: ["成长"],
    effects: { combatPowerBonus: -3, growthChanceBonus: 10 },
  },
};

export const characterClasses = {
  assault: {
    name: "突击手",
    category: "combat",
    tags: ["战斗", "动能"],
    baseCombatPower: 28,
    effects: { damageTypePowerBonus: { type: "动能", value: 3 } },
  },
  marksman: {
    name: "狙击手",
    category: "combat",
    tags: ["战斗", "切割"],
    baseCombatPower: 26,
    effects: { belowMaxTeamChanceBonus: 5 },
  },
  demolisher: {
    name: "爆破手",
    category: "combat",
    tags: ["战斗", "爆风"],
    baseCombatPower: 25,
    effects: { damageTypePowerBonus: { type: "爆风", value: 4 }, tagMissionChanceBonus: { tag: "破坏", value: 5 } },
  },
  guard: {
    name: "近卫",
    category: "combat",
    tags: ["战斗", "守卫"],
    baseCombatPower: 27,
    effects: { teamDeathRiskReduction: 1 },
  },
  heavy: {
    name: "重装兵",
    category: "survival",
    tags: ["生存", "守卫"],
    baseCombatPower: 25,
    effects: { armorDeathRiskMultiplier: 0.5 },
  },
  veteran: {
    name: "老兵",
    category: "survival",
    tags: ["生存", "战斗"],
    baseCombatPower: 25,
    effects: { mentalConditionRiskReduction: 0.08 },
  },
  evac: {
    name: "撤离专家",
    category: "survival",
    tags: ["生存", "潜入"],
    baseCombatPower: 23,
    effects: { failureDeathRiskReduction: 3 },
  },
  painbearer: {
    name: "忍痛者",
    category: "survival",
    tags: ["生存"],
    baseCombatPower: 24,
    effects: { woundPenaltyReduction: 0.3 },
  },
  scout: {
    name: "侦察兵",
    category: "intel",
    tags: ["侦察", "潜入"],
    baseCombatPower: 22,
    effects: { powerIntelBonus: 1 },
  },
  listener: {
    name: "监听员",
    category: "intel",
    tags: ["侦察", "调查"],
    baseCombatPower: 20,
    effects: { investigateDiscount: 0.15 },
  },
  counterAmbush: {
    name: "反伏击专家",
    category: "intel",
    tags: ["侦察", "生存"],
    baseCombatPower: 23,
    effects: { ambushDamageReduction: 0.25 },
  },
  analyst: {
    name: "分析师",
    category: "intel",
    tags: ["调查", "支援"],
    baseCombatPower: 19,
    effects: { requirementMatchChanceBonus: 4 },
  },
  medic: {
    name: "医疗兵",
    category: "logistics",
    tags: ["医疗", "支援"],
    baseCombatPower: 20,
    effects: { teamWoundRiskReduction: 5, treatmentDiscount: 0.2 },
  },
  engineer: {
    name: "工程师",
    category: "logistics",
    tags: ["支援", "装备"],
    baseCombatPower: 21,
    effects: { armorDeathRiskBonus: 1, facilityDiscount: 0.05 },
  },
  scavenger: {
    name: "清道夫",
    category: "logistics",
    tags: ["回收", "支援"],
    baseCombatPower: 21,
    effects: { lootChanceBonus: 20 },
  },
  broker: {
    name: "黑市掮客",
    category: "logistics",
    tags: ["交易", "支援"],
    baseCombatPower: 18,
    effects: { marketDiscount: 0.1, marketRefreshDiscount: 0.1 },
  },
  anomalySpecialist: {
    name: "异常专家",
    category: "abnormal",
    tags: ["异常", "调查"],
    baseCombatPower: 21,
    effects: { damageTypeConditionReduction: { type: "异源", value: 20 } },
  },
  purifier: {
    name: "净化者",
    category: "abnormal",
    tags: ["异常", "医疗"],
    baseCombatPower: 20,
    effects: { conditionSeverityReduction: ["异源", "腐蚀", "中毒"] },
  },
  dreamRecorder: {
    name: "梦境记录员",
    category: "abnormal",
    tags: ["异常", "精神"],
    baseCombatPower: 18,
    effects: { mentalBreakHeavyReduction: 20 },
  },
  forbiddenScholar: {
    name: "禁忌学者",
    category: "abnormal",
    tags: ["异常", "调查"],
    baseCombatPower: 19,
    effects: { abnormalMissionChanceBonus: 8, mentalConditionRiskBonus: 2 },
  },
  rookie: {
    name: "新血",
    category: "growth",
    tags: ["成长"],
    baseCombatPower: 17,
    effects: { growthChanceBonus: 15, mentalConditionRiskBonus: 2 },
  },
  apprentice: {
    name: "学徒",
    category: "growth",
    tags: ["成长", "支援"],
    baseCombatPower: 18,
    effects: { extraEnhancementPointChance: 20 },
  },
  deserter: {
    name: "逃兵",
    category: "growth",
    tags: ["成长", "生存"],
    baseCombatPower: 19,
    effects: { failureDeathRiskReduction: 3, mentalConditionRiskBonus: 2 },
  },
  debtor: {
    name: "负债者",
    category: "growth",
    tags: ["成长", "交易"],
    baseCombatPower: 20,
    effects: { wageReduction: 0.15, mentalConditionRiskBonus: 1 },
  },
};

export const buildings = {
  tavern: { name: "酒馆", description: "提高招募池规模。", cost: 70, upkeep: 5, unlockCost: 70 },
  barracks: { name: "兵营", description: "提高可雇佣佣兵上限。每提升 1 级，佣兵上限 +1。", cost: 85, upkeep: 5, unlockCost: 85 },
  defenses: { name: "防御设施", description: "在基地遭遇突袭时提供额外基地战斗力。", cost: 100, upkeep: 8, unlockCost: 100 },
  blackMarket: { name: "黑市", description: "花钱购买当前评级的补给、武器、防具和机甲。", cost: 95, upkeep: 6, unlockCost: 95 },
  hospital: { name: "医疗中心", description: "花钱治疗伤病。", cost: 110, upkeep: 9, unlockCost: 110 },
  infirmary: { name: "娱乐中心", description: "通过赌博、成瘾性药物和军妓等方式缓解压力。", cost: 80, upkeep: 7, unlockCost: 80 },
  intel: { name: "情报室", description: "降低调查契约情报的费用。", cost: 90, upkeep: 8, unlockCost: 90 },
};

export const wealthCollections = [
  {
    id: "vanity",
    name: "私人欲望",
    description: "把契约账单洗成体面的生活方式。",
    items: [
      { id: "yacht", name: "大游艇", cost: 420, description: "甲板足够大，可以不听任何人的求救。" },
      { id: "villa", name: "海岸别墅", cost: 520, description: "窗外看不见战区，室内也就不必谈起战区。" },
      { id: "private_chef", name: "私人厨师团队", cost: 260, description: "有人负责把稀缺变成菜单。" },
      { id: "orbital_suite", name: "低轨套房", cost: 760, description: "离地表越远，良心噪声越小。" },
    ],
  },
  {
    id: "collection",
    name: "收藏室",
    description: "用稀有物件证明自己并不只是有钱。",
    items: [
      { id: "antique_painting", name: "古董字画", cost: 300, description: "出处干净得像被重新印刷过。" },
      { id: "war_relic", name: "战前遗物柜", cost: 360, description: "每件都配有证书，证书比故事更贵。" },
      { id: "sealed_archive", name: "封存档案墙", cost: 460, description: "买下历史之后，就能选择哪一页不展示。" },
      { id: "rare_specimen", name: "异源标本", cost: 620, description: "访客会惊叹，采样者不会出席。" },
    ],
  },
  {
    id: "power",
    name: "支配陈列",
    description: "最难看的欲望通常需要最漂亮的陈列柜。",
    items: [
      { id: "indentured_servants", name: "债役仆从", cost: 500, description: "合同写着自愿，字迹来自律师。" },
      { id: "private_security", name: "私人安保队", cost: 580, description: "他们不保护安全，只保护距离。" },
      { id: "exclusive_club", name: "封闭俱乐部席位", cost: 680, description: "里面的人都说自己只是旁观者。" },
      { id: "offshore_identity", name: "离岸身份库", cost: 740, description: "名字越多，责任越难找到门牌号。" },
    ],
  },
  {
    id: "charity",
    name: "体面工程",
    description: "把赎罪包装成剪彩，把剪彩包装成新闻。",
    items: [
      { id: "charity_gala", name: "慈善晚宴", cost: 220, description: "救助对象不会入场，但会出现在投影里。" },
      { id: "orphan_fund", name: "战争孤儿基金", cost: 360, description: "基金会照片很好看，账目更好看。" },
      { id: "memorial_square", name: "和平纪念广场", cost: 480, description: "刻了很多名字，除了付款人的。" },
      { id: "public_hospital", name: "冠名医院楼", cost: 640, description: "入口挂着你的名字，病房排着他们的队。" },
    ],
  },
];

export const facilityRanks = ["F", "E", "D", "C", "B", "A", "S"];

export const mechaFrames = [
  { name: "矿区搬运改机", role: "工程", tags: ["支援", "生存"], note: "原本用于搬矿，现在偶尔搬敌人。" },
  { name: "轻型侦察机体", role: "侦察", tags: ["侦察", "潜入"], note: "跑得快，装甲薄，账单很诚实。" },
  { name: "旧军规突击骨架", role: "突击", tags: ["战斗", "守卫"], note: "退役原因被黑市卖家略过了。" },
  { name: "移动医疗舱", role: "医疗", tags: ["医疗", "支援"], note: "能救命，也能制造非常昂贵的安慰。" },
];

export const missionTemplates = [
  { name: "护送补给车", tags: ["战斗", "守卫"], difficulty: 2, duration: 2, reward: { gold: 55, reputation: 8 } },
  { name: "调查废弃矿井", tags: ["调查", "神秘"], difficulty: 3, duration: 3, reward: { gold: 75, reputation: 12 } },
  { name: "追踪失踪信使", tags: ["侦察", "潜入"], difficulty: 2, duration: 2, reward: { gold: 50, reputation: 10 } },
  { name: "清理边境诊所", tags: ["医疗", "支援"], difficulty: 2, duration: 1, reward: { gold: 40, reputation: 7 } },
  { name: "突袭走私仓库", tags: ["战斗", "潜入"], difficulty: 4, duration: 3, reward: { gold: 110, reputation: 16 } },
];

export const contractIssuers = ["SSS", "FOF自由邦联"];

export const otherContractIssuers = [
  "未知信号",
  "流亡组织",
  "割据武装",
  "企业财团",
  "科研机构",
  "运输公司",
  "采矿集团",
  "安保公司",
  "新闻媒体",
  "地方政府",
  "纯净社区",
  "黑市商会",
  "佣兵工会",
  "个人委托",
  "突发事件",
  "天人残余",
  "响马强人",
  "天人残余",
  "天人残余",
  "天人残余",
];

export const contractTypes = [
  { name: "护送", code: "Escort", actionType: "combat", tags: ["守卫", "生存"], verbs: ["护送", "掩护"] },
  { name: "运输", code: "Transport", actionType: "logistics", tags: ["守卫", "支援"], verbs: ["转运", "押运"] },
  { name: "侦察", code: "Recon", actionType: "logistics", tags: ["侦察", "潜入"], verbs: ["侦察", "标记"] },
  { name: "搜索", code: "Search", actionType: "logistics", tags: ["调查", "侦察"], verbs: ["搜索", "定位"] },
  { name: "回收", code: "Recovery", actionType: "logistics", tags: ["调查", "生存"], verbs: ["回收", "封存"] },
  { name: "歼灭", code: "Hunt", actionType: "combat", tags: ["战斗", "守卫"], verbs: ["清剿", "猎杀"] },
  { name: "突袭", code: "Raid", actionType: "combat", tags: ["战斗", "潜入"], verbs: ["突袭", "夺取"] },
  { name: "破坏", code: "Sabotage", actionType: "combat", tags: ["潜入", "调查"], verbs: ["破坏", "瘫痪"] },
  { name: "营救", code: "Extraction", actionType: "logistics", tags: ["医疗", "支援"], verbs: ["营救", "撤离"] },
  { name: "防御", code: "Defense", actionType: "combat", tags: ["战斗", "守卫"], verbs: ["防御", "固守"] },
  { name: "占领", code: "Occupation", actionType: "combat", tags: ["战斗", "支援"], verbs: ["占领", "接管"] },
  { name: "特殊", code: "Special", actionType: "logistics", tags: ["神秘", "调查"], verbs: ["接触", "处理"] },
];

export const mercenaryRanks = ["无", "F", "E", "D", "C", "B", "A", "S"];

export const promotionChances = {
  "无": 60,
  F: 50,
  E: 40,
  D: 30,
  C: 20,
  B: 10,
  A: 5,
  S: 0,
};

export const positiveConditions = [
  // 轻度：来自一次训练、一次幸存或一次小小的自我修复，提供温和但稳定的收益。
  { name: "手感回暖", severity: "light", description: "他重新找回了扣下扳机前那半秒的判断。", tags: ["战斗"], powerBonus: 3, deathRiskReduction: 0 },
  { name: "睡过一个整觉", severity: "light", description: "没有梦见战场，这在事务所里已经算奢侈品。", tags: ["恢复"], powerBonus: 1, deathRiskReduction: 0 },
  { name: "临场冷静", severity: "light", description: "他学会了先数三秒，再决定要不要冲出去。", tags: ["心理"], powerBonus: 2, deathRiskReduction: 1 },
  { name: "装备熟悉", severity: "light", description: "枪、护甲和身体终于不再互相嫌弃。", tags: ["装备"], powerBonus: 3, deathRiskReduction: 0 },
  { name: "撤离意识", severity: "light", description: "活着回来不再只是运气，也是一种技术。", tags: ["生存"], powerBonus: 1, deathRiskReduction: 1 },

  // 中度：角色开始形成可依赖的作战习惯，能明显改变一次派遣的风险。
  { name: "稳定火线", severity: "medium", description: "混乱没有减少，只是他不再跟着混乱移动。", tags: ["战斗"], powerBonus: 6, deathRiskReduction: 1 },
  { name: "团队锚点", severity: "medium", description: "有人看着他，就会下意识相信队伍还有路可退。", tags: ["团队"], powerBonus: 4, deathRiskReduction: 1 },
  { name: "疼痛管理", severity: "medium", description: "不是不痛，而是他知道怎样不让疼痛替自己做决定。", tags: ["生存"], powerBonus: 4, deathRiskReduction: 2 },
  { name: "危险嗅觉", severity: "medium", description: "简报没写的东西，他会先皱眉。", tags: ["侦察"], powerBonus: 5, deathRiskReduction: 2 },
  { name: "战后整理", severity: "medium", description: "每次回来都把恐惧归档，虽然档案柜越来越满。", tags: ["恢复"], powerBonus: 2, deathRiskReduction: 0 },

  // 重度：少见的强正面状态，代表角色在残酷循环中长出了很硬的东西。
  { name: "死线直觉", severity: "heavy", description: "他不能预知死亡，但能听见死亡换弹匣的声音。", tags: ["生存"], powerBonus: 8, deathRiskReduction: 3 },
  { name: "火力统御", severity: "heavy", description: "他不只是开火，他让整条火线知道该往哪里塌。", tags: ["战斗"], powerBonus: 10, deathRiskReduction: 1 },
  { name: "灾后清醒", severity: "heavy", description: "见过太多坏结局后，他反而更擅长留下一个不那么坏的。", tags: ["心理"], powerBonus: 6, deathRiskReduction: 2 },
  { name: "幸存者技艺", severity: "heavy", description: "他把所有差点死掉的瞬间，都磨成了下一次活下来的工具。", tags: ["生存"], powerBonus: 7, deathRiskReduction: 3 },
];

export const negativeConditions = [
  // 轻度：可治疗、可继续出战，但会把人一点点磨坏。
  { name: "轻度骨折", category: "physical", severity: "light", description: "骨头还在原位，只是每一步都在提醒他别再相信简报。", tags: ["骨折"], woundPoints: 2, deathRiskModifier: 1 },
  { name: "肋骨裂伤", category: "physical", severity: "light", description: "呼吸、咳嗽和开枪都开始收费。", tags: ["骨折"], woundPoints: 3, deathRiskModifier: 1 },
  { name: "肩关节脱位", category: "physical", severity: "light", description: "还能抬枪，但每次抬枪都像在重新签合同。", tags: ["肢体"], woundPoints: 2, deathRiskModifier: 1 },
  { name: "脚踝扭伤", category: "physical", severity: "light", description: "撤离路线突然变得很长。", tags: ["肢体"], woundPoints: 1, deathRiskModifier: 1 },
  { name: "轻度烧伤", category: "physical", severity: "light", description: "皮肤记住了火，睡眠会负责重播。", tags: ["烧伤"], damageTypes: ["燃烧", "能量"], woundPoints: 1, deathRiskModifier: 1 },
  { name: "电击灼痕", category: "physical", severity: "light", description: "神经像接触不良的线路。", tags: ["电磁"], damageTypes: ["电磁", "能量"], woundPoints: 2, deathRiskModifier: 1 },
  { name: "轻度中毒", category: "physical", severity: "light", description: "血液报告比任务报告更诚实。", tags: ["中毒"], damageTypes: ["腐蚀"], woundPoints: 1, deathRiskModifier: 1 },
  { name: "爆震耳鸣", category: "physical", severity: "light", description: "世界安静不下来，哪怕战斗已经结束。", tags: ["爆风"], damageTypes: ["爆风"], woundPoints: 1, deathRiskModifier: 1 },
  { name: "切割裂伤", category: "physical", severity: "light", description: "缝合得住肉，缝不住手抖。", tags: ["切割"], damageTypes: ["切割"], woundPoints: 2, deathRiskModifier: 1 },

  // 中度：明显改变角色可用性，医院和休整开始有战略价值。
  { name: "重度骨折", category: "physical", severity: "medium", description: "骨骼结构还在，但已经不适合被称为完整。", tags: ["骨折"], woundPoints: 5, deathRiskModifier: 4 },
  { name: "粉碎性骨折", category: "physical", severity: "medium", description: "医生看了片子以后沉默了一会儿。", tags: ["骨折"], damageTypes: ["动能", "爆风"], woundPoints: 5, deathRiskModifier: 5 },
  { name: "内出血", category: "physical", severity: "medium", description: "外表还算体面，体内已经在撤退。", tags: ["出血"], damageTypes: ["动能", "爆风"], woundPoints: 6, deathRiskModifier: 6 },
  { name: "重度烧伤", category: "physical", severity: "medium", description: "防具没有融穿，但人不是防具的一部分。", tags: ["烧伤"], damageTypes: ["燃烧", "能量"], woundPoints: 5, deathRiskModifier: 5 },
  { name: "腐蚀创口", category: "physical", severity: "medium", description: "伤口边缘像被合同条款啃过。", tags: ["腐蚀"], damageTypes: ["腐蚀"], woundPoints: 3, deathRiskModifier: 5 },
  { name: "神经紊乱", category: "physical", severity: "medium", description: "反应慢半拍，恐惧快半拍。", tags: ["电磁"], damageTypes: ["电磁"], woundPoints: 4, deathRiskModifier: 4 },
  { name: "精神污染", category: "physical", severity: "medium", description: "他开始记得一些自己没有经历过的战场。", tags: ["异源"], damageTypes: ["异源"], woundPoints: 0, deathRiskModifier: 4 },
  { name: "重度中毒", category: "physical", severity: "medium", description: "呼吸仍在进行，只是每次都像系统错误。", tags: ["中毒"], damageTypes: ["腐蚀"], woundPoints: 5, deathRiskModifier: 6 },
  { name: "战场感染", category: "physical", severity: "medium", description: "撤回来的是佣兵，也是培养皿。", tags: ["感染"], woundPoints: 3, deathRiskModifier: 5 },

  // 重度：长期或永久损伤。名字可以很多，效果保持少数模板，便于以后维护。
  { name: "失去左手", category: "physical", severity: "heavy", description: "他还会本能地去摸不存在的扳机。", tags: ["断肢", "左手"], limb: "leftArm", woundPoints: 7, deathRiskModifier: 8 },
  { name: "失去右手", category: "physical", severity: "heavy", description: "惯用手留在了合同现场，赔偿条款没有写它。", tags: ["断肢", "右手"], limb: "rightArm", woundPoints: 7, deathRiskModifier: 9 },
  { name: "左臂截断", category: "physical", severity: "heavy", description: "伤口愈合后，空缺仍然每天上班。", tags: ["断肢", "左手"], limb: "leftArm", woundPoints: 9, deathRiskModifier: 9 },
  { name: "右臂截断", category: "physical", severity: "heavy", description: "他学会了用另一只手签收医药账单。", tags: ["断肢", "右手"], limb: "rightArm", woundPoints: 9, deathRiskModifier: 10 },
  { name: "失去左脚", category: "physical", severity: "heavy", description: "撤离不再是动作，是工程项目。", tags: ["断肢", "左脚"], limb: "leftLeg", woundPoints: 7, deathRiskModifier: 8 },
  { name: "失去右脚", category: "physical", severity: "heavy", description: "地图上的每一条线都变成了债务。", tags: ["断肢", "右脚"], limb: "rightLeg", woundPoints: 7, deathRiskModifier: 8 },
  { name: "重度器官损伤", category: "physical", severity: "heavy", description: "身体继续运行，但维护窗口变得很短。", tags: ["器官"], damageTypes: ["动能", "爆风", "能量"], woundPoints: 8, deathRiskModifier: 12 },
  { name: "深层灼伤", category: "physical", severity: "heavy", description: "火没有杀死他，只是把余生留给了疼痛。", tags: ["烧伤"], damageTypes: ["燃烧", "能量"], woundPoints: 8, deathRiskModifier: 11 },
  { name: "异源侵蚀", category: "physical", severity: "heavy", description: "医学报告拒绝使用完整句子。", tags: ["异源"], damageTypes: ["异源"], woundPoints: 6, deathRiskModifier: 10 },
];

export const mentalConditions = [
  // 轻度精神疾病：不立刻毁掉角色，但会让压力管理变成长期成本。
  { name: "战场梦魇", category: "mental", severity: "light", description: "睡眠变成另一份无人结算的合同。", tags: ["睡眠"], stressPoints: 2, deathRiskModifier: 1 },
  { name: "惊跳反应", category: "mental", severity: "light", description: "门声、脚步声、无线电噪声都会先于理智抵达。", tags: ["焦虑"], stressPoints: 2, deathRiskModifier: 1 },
  { name: "情感麻木", category: "mental", severity: "light", description: "他不是不在乎，只是系统暂时关闭了在乎。", tags: ["解离"], stressPoints: 2, deathRiskModifier: 1 },
  { name: "任务强迫", category: "mental", severity: "light", description: "不反复检查装备就无法相信自己还活着。", tags: ["强迫"], stressPoints: 4, deathRiskModifier: 1 },

  // 中度精神疾病：会明显影响战斗力和后续出战风险。
  { name: "PTSD", category: "mental", severity: "medium", description: "枪声停了，脑子里的枪声没有停。", tags: ["创伤"], stressPoints: 4, deathRiskModifier: 4 },
  { name: "幸存者负罪", category: "mental", severity: "medium", description: "活下来成了另一种惩罚。", tags: ["创伤"], stressPoints: 4, deathRiskModifier: 3 },
  { name: "战术恐慌", category: "mental", severity: "medium", description: "下一次进场前，他会多看几眼撤离路线。", tags: ["恐慌"], stressPoints: 3, deathRiskModifier: 4 },
  { name: "暴力闪回", category: "mental", severity: "medium", description: "有些回忆不需要许可就会开火。", tags: ["闪回"], stressPoints: 3, deathRiskModifier: 4 },
  { name: "药物依赖", category: "mental", severity: "medium", description: "稳定不是状态，是消耗品。", tags: ["依赖"], stressPoints: 3, deathRiskModifier: 3 },
  { name: "贪婪冲动", category: "mental", severity: "medium", description: "他开始把每个危险角落都看成没登记的战利品。", tags: ["冲动", "贪婪"], stressPoints: 3, deathRiskModifier: 5 },
  { name: "胆怯回避", category: "mental", severity: "medium", description: "他仍然会出发，只是脚步永远慢半拍。", tags: ["恐惧", "回避"], stressPoints: 3, deathRiskModifier: 2 },
  { name: "暴食依赖", category: "mental", severity: "medium", description: "补给不再只是补给，而是堵住空洞的材料。", tags: ["依赖", "暴食"], stressPoints: 3, deathRiskModifier: 3 },
  { name: "性冲动失控", category: "mental", severity: "medium", description: "亲密和控制的边界被战场磨坏，留下很难处理的冲动。", tags: ["冲动", "失控"], stressPoints: 3, deathRiskModifier: 4 },

  // 重度精神疾病：角色仍可存在，但应该让玩家感到继续压榨他的沉重代价。
  { name: "心理崩溃", category: "mental", severity: "heavy", description: "他没有拒绝命令，他只是再也无法理解命令。", tags: ["崩溃"], stressPoints: 6, deathRiskModifier: 8 },
  { name: "严重解离", category: "mental", severity: "heavy", description: "身体回来了，人还滞留在任务现场。", tags: ["解离"], stressPoints: 6, deathRiskModifier: 7 },
  { name: "自毁倾向", category: "mental", severity: "heavy", description: "他开始把危险当成安静的捷径。", tags: ["自毁"], stressPoints: 6, deathRiskModifier: 10 },
  { name: "持续性幻觉", category: "mental", severity: "heavy", description: "敌人不再需要出现，战场会自己生成。", tags: ["幻觉"], stressPoints: 6, deathRiskModifier: 9 },
  { name: "施虐冲动", category: "mental", severity: "heavy", description: "他开始从别人的恐惧里确认自己还存在。", tags: ["冲动", "施虐"], stressPoints: 5, deathRiskModifier: 11 },
  { name: "掠夺成瘾", category: "mental", severity: "heavy", description: "任务目标和私人欲望混在一起，撤离命令越来越难听见。", tags: ["贪婪", "成瘾"], stressPoints: 5, deathRiskModifier: 10 },
  { name: "极端怯战", category: "mental", severity: "heavy", description: "他不是不想活，是已经无法相信任何前进方向通向活着。", tags: ["恐惧", "崩溃"], stressPoints: 5, deathRiskModifier: 5 },
  { name: "欲望紊乱", category: "mental", severity: "heavy", description: "战场把需求、占有和恐惧搅成一团，没人知道哪一个会先失控。", tags: ["冲动", "失控"], stressPoints: 6, deathRiskModifier: 9 },
];

export const contractRequirementPool = {
  weaponTypes: ["步枪", "霰弹", "手枪", "狙击", "近战", "爆破", "医疗器械", "电子战"],
  damageTypes: ["动能", "腐蚀", "电磁", "爆风", "能量", "燃烧", "异源", "切割"],
  careerCategories: ["combat", "survival", "intel", "logistics", "abnormal", "growth"],
};

export const contractIntelFields = [
  { key: "damageTypes", label: "敌方伤害", type: "requirement" },
  { key: "careerCategories", label: "建议职业", type: "requirement" },
  { key: "weaponTypes", label: "推荐武器", type: "requirement" },
  { key: "teamSize", label: "需求人数", type: "planning" },
];

export const contractIntelPool = {
  damageTypes: ["敌方火力以动能弹药为主", "现场有燃烧武器痕迹", "电磁脉冲设备活跃", "爆风伤害风险较高", "可能接触异源污染"],
  careerCategories: ["需要战斗类佣兵压住正面冲突", "需要情报类佣兵拆解不确定性", "需要后勤类佣兵控制损耗", "需要生存类佣兵承担撤离风险", "建议战斗类与情报类混编"],
  weaponTypes: ["建议携带步枪或狙击武器", "建议携带爆破装备", "建议携带近战或霰弹武器", "建议携带电子战装备", "建议携带医疗器械"],
  teamSize: ["建议小队人数偏少，避免暴露", "建议标准小队进入", "建议满编小队执行", "人数过少会明显提高失败风险"],
  enemy: ["地方武装小队", "黑市雇佣枪手", "异源兽群", "失控安保机兵", "身份不明的第三方小队"],
  location: ["废弃矿井外环", "盐碱高速补给线", "旧城区地下站", "低轨坠落带", "边境诊所防线"],
  target: ["带有旧联邦封条的货箱", "失联信使的终端", "被劫持的技术员", "异常广播源", "客户拒绝公开的样本"],
  timeLimit: ["24小时内窗口关闭", "两天后目标转移", "夜间行动风险降低", "雨季前必须完成", "发布方随时可能撤约"],
  specialRisk: ["情报来源未核验", "可能遭遇伏击", "客户隐瞒了竞争委托", "撤离点不稳定", "目标具有污染风险"],
  careerCategories: ["需要战斗类佣兵压住正面冲突", "需要情报类佣兵拆解不确定性", "需要后勤类佣兵控制损耗", "需要生存类佣兵承担撤离风险", "建议战斗类与情报类混编", "建议生存类与后勤类混编"],
};

export const contractHiddenTwists = [
  "情报错误：目标规模比公开简报更大。",
  "第三方介入：另一支小队试图截胡。",
  "伏击：撤离路线被提前布置火力点。",
  "客户欺骗：发布方隐瞒了真实目标。",
  "隐藏奖励：目标现场存在额外可回收物资。",
  "目标背叛：被营救或护送对象临时变更立场。",
];

export const contractRandomEvents = [
  {
    id: "shared-intel-cache",
    tone: "positive",
    weight: 1.2,
    maxDifficulty: 5,
    appliesTo: ["Escort", "Transport", "Recon", "Search", "Recovery", "Hunt", "Raid", "Sabotage", "Extraction", "Defense", "Occupation", "Special"],
    title: "共享情报缓存",
    description: "路线上刚好有别队留下的标记。同行倒霉，贵司省钱。",
    effect: { gold: 10, stealth: 0, reputation: 1 },
  },
  {
    id: "improvised-supply",
    tone: "positive",
    weight: 0.8,
    maxDifficulty: 4,
    appliesTo: ["Transport", "Recovery", "Search", "Escort"],
    title: "临时补给",
    description: "车厢夹层里翻出一批没被记录的补给。账面上不存在的东西最好吃。",
    effect: { gold: 16, stealth: 0, reputation: 0 },
  },
  {
    id: "clean-extract",
    tone: "positive",
    weight: 0.7,
    minDifficulty: 2,
    appliesTo: ["Recon", "Search", "Sabotage", "Special"],
    title: "干净撤离",
    description: "撤离点比预想中干净，连尾巴都没留下。战争偶尔也会忘记打卡。",
    effect: { gold: 0, stealth: 2, reputation: 1 },
  },
  {
    id: "field-medkit",
    tone: "positive",
    weight: 0.6,
    maxDifficulty: 5,
    appliesTo: ["Extraction", "Defense", "Escort"],
    title: "现场急救包",
    description: "尸体、残骸和医药包一起出现。今天的运气勉强算有人性。",
    effect: { gold: 0, stealth: 0, reputation: 0 },
  },
  {
    id: "misread-map",
    tone: "negative",
    weight: 1.2,
    maxDifficulty: 5,
    appliesTo: ["Escort", "Transport", "Search", "Recovery", "Raid", "Defense"],
    title: "地图误读",
    description: "导航像喝醉了一样，队伍多绕了半个战区。它坚持说这叫最优路径。",
    effect: { gold: -8, stealth: 0, mentalInjury: 2, reputation: 0 },
  },
  {
    id: "ammo-burn",
    tone: "negative",
    weight: 1.3,
    minDifficulty: 2,
    appliesTo: ["Hunt", "Raid", "Defense", "Occupation"],
    title: "弹药燃烧",
    description: "交火强度高于预算，弹药和钱一样快地飞出去了。财务部会说这是热烈沟通。",
    effect: { gold: -14, stealth: 0, mentalInjury: 2, physicalInjury: 1, reputation: 0 },
  },
  {
    id: "civilian-witness",
    tone: "negative",
    weight: 0.9,
    minDifficulty: 1,
    maxDifficulty: 6,
    appliesTo: ["Search", "Recon", "Special", "Transport"],
    title: "目击者",
    description: "附近有不该看见的人看见了不该出现的队伍。历史通常从围观开始。",
    effect: { gold: -4, stealth: -4, mentalInjury: 1, reputation: 0 },
  },
  {
    id: "mission-delay",
    tone: "negative",
    weight: 1.0,
    maxDifficulty: 5,
    appliesTo: ["Escort", "Transport", "Recovery", "Extraction"],
    title: "临时延误",
    description: "目标临时改口，所有人都得在雨里再等一轮。客户称之为灵活合作。",
    effect: { gold: -6, stealth: 0, mentalInjury: 2, reputation: -1 },
  },
  {
    id: "competing-contract",
    tone: "negative",
    weight: 0.7,
    minDifficulty: 3,
    appliesTo: ["Special", "Search", "Sabotage", "Recovery"],
    title: "竞争委托",
    description: "另一单的中间人也到了，现场气氛忽然变得很贵。自由市场不自由，且很吵。",
    effect: { gold: -10, stealth: -3, mentalInjury: 2, reputation: -1 },
  },
  {
    id: "equipment-glitch",
    tone: "negative",
    weight: 1.1,
    minDifficulty: 2,
    appliesTo: ["Defense", "Hunt", "Raid", "Occupation", "Escort"],
    title: "装备失灵",
    description: "某件装备在最不合适的时候发了脾气。它可能也想休假。",
    effect: { gold: -5, stealth: 0, mentalInjury: 1, physicalInjury: 1, reputation: 0 },
  },
  {
    id: "quiet-payoff",
    tone: "positive",
    weight: 0.5,
    minDifficulty: 2,
    appliesTo: ["Special", "Search", "Recovery", "Transport"],
    title: "静默回扣",
    description: "雇主额外塞来一笔不写进简报的回扣。道德没有到账提示。",
    effect: { gold: 18, stealth: 1, reputation: 0 },
  },
  {
    id: "broken-escape",
    tone: "negative",
    weight: 0.8,
    minDifficulty: 2,
    appliesTo: ["Extraction", "Defense", "Escort"],
    title: "撤离点损坏",
    description: "撤离口坏得比说明书还彻底，队伍只能多走一程。说明书至少没有流血。",
    effect: { gold: -12, stealth: -2, mentalInjury: 2, physicalInjury: 1, reputation: 0 },
  },
  {
    id: "perfect-position",
    tone: "positive",
    weight: 0.8,
    minDifficulty: 2,
    appliesTo: ["Hunt", "Raid", "Defense", "Occupation"],
    title: "完美站位",
    description: "地形给了队伍一个很不讲理的有利角度。公平被留在了山脚下。",
    effect: { gold: 0, stealth: 0, reputation: 1 },
  },
  {
    id: "paperwork-hole",
    tone: "negative",
    weight: 0.6,
    minDifficulty: 3,
    appliesTo: ["Special", "Search", "Recovery", "Transport"],
    title: "文件漏洞",
    description: "手续里漏了一页，后来那页通常最贵。",
    effect: { gold: -8, stealth: -3, mentalInjury: 1, reputation: -1 },
  },
  {
    id: "low-rank-local-guide",
    tone: "positive",
    weight: 0.9,
    maxDifficulty: 2,
    appliesTo: ["Escort", "Transport", "Search", "Recon"],
    title: "本地向导",
    description: "一个收现金的本地人指出了近路。他不爱战争，但爱找零。",
    effect: { gold: 6, stealth: 1, reputation: 0 },
  },
  {
    id: "low-rank-rotten-bridge",
    tone: "negative",
    weight: 0.9,
    maxDifficulty: 2,
    appliesTo: ["Escort", "Transport", "Recovery"],
    title: "烂桥",
    description: "桥没塌完，只塌到足够麻烦。工程质量精准服务战争经济。",
    effect: { gold: -6, stealth: 0, mentalInjury: 1, physicalInjury: 1, reputation: 0 },
  },
  {
    id: "mid-rank-false-flag",
    tone: "negative",
    weight: 0.7,
    minDifficulty: 3,
    maxDifficulty: 5,
    appliesTo: ["Raid", "Sabotage", "Occupation", "Special"],
    title: "嫁祸标记",
    description: "现场被人提前放了另一个组织的标记。坏消息是，像真的。",
    effect: { gold: -10, stealth: -3, mentalInjury: 2, reputation: -1 },
  },
  {
    id: "mid-rank-blackmail-ledger",
    tone: "positive",
    weight: 0.55,
    minDifficulty: 3,
    maxDifficulty: 5,
    appliesTo: ["Search", "Recovery", "Special", "Sabotage"],
    title: "勒索账本",
    description: "队伍找到一本账。它不干净，所以很值钱。",
    effect: { gold: 22, stealth: 0, reputation: 1 },
  },
  {
    id: "high-rank-orbital-window",
    tone: "positive",
    weight: 0.45,
    minDifficulty: 6,
    appliesTo: ["Recon", "Raid", "Sabotage", "Hunt", "Special"],
    title: "轨道盲窗",
    description: "监控卫星短暂失明。天上的眼睛也需要眨眼。",
    effect: { gold: 0, stealth: 4, reputation: 2 },
  },
  {
    id: "high-rank-corp-cleaner",
    tone: "negative",
    weight: 0.8,
    minDifficulty: 6,
    appliesTo: ["Special", "Recovery", "Search", "Sabotage", "Occupation"],
    title: "公司清理队",
    description: "一支没有徽章的小队开始清理证据。证据包括活人。",
    effect: { gold: -24, stealth: -5, mentalInjury: 3, physicalInjury: 1, reputation: -2 },
  },
  {
    id: "high-rank-signal-bleed",
    tone: "negative",
    weight: 0.75,
    minDifficulty: 6,
    appliesTo: ["Recon", "Special", "Defense", "Hunt"],
    title: "信号渗漏",
    description: "通讯里混进了别人的祷告、报价和死亡倒计时。",
    effect: { gold: -8, stealth: -4, mentalInjury: 4, reputation: 0 },
  },
  {
    id: "high-rank-prize-target",
    tone: "positive",
    weight: 0.35,
    minDifficulty: 6,
    appliesTo: ["Hunt", "Raid", "Occupation", "Extraction"],
    title: "高价目标",
    description: "目标比简报上更重要。客户假装惊讶，并真的加钱。",
    effect: { gold: 36, stealth: -1, reputation: 2 },
  },
];

export const contractBriefFragments = [
  "发布方只愿意支付定金，细节被拆成几段加密简报。",
  "这份契约来得太快，像是有人在掩盖另一件事。",
  "公开说明干净得过分，反而让老佣兵觉得不舒服。",
  "客户承诺报销损耗，但没有说明损耗的定义。",
  "中间人强调不要追问来源，也不要把问题带回基地。",
];

export const sampleItems = [
  { id: "item-rifle-1", name: "F级 短管自动步枪", slot: "weapon", itemCategory: "weapon", rarity: "F", type: "步枪", power: 8, damageType: "动能", tags: ["战斗"], note: "序列号经过礼貌性擦除。" },
  { id: "item-vest-1", name: "F级 复合胸甲", slot: "armor", itemCategory: "armor", rarity: "F", deathRiskReduction: 1, protectionType: "动能", tags: ["守卫"], note: "能挡住大多数合理报价以内的弹药。" },
];

export const names = [
  "林烬", "邵岚", "秦砾", "陆鸦", "石泉", "顾白", "沈遥", "许燃", "周祈", "韩昼", "赵隼", "魏澜", "苏阙", "唐砚", "纪寒", "叶檀",
  "维克", "诺拉", "赫森", "米娅", "艾拉", "莱昂", "伊芙", "马克斯", "奥托", "塞拉", "凯恩", "莉娜", "罗恩", "薇拉", "艾登", "卡洛",
  "伊万", "娜塔莎", "米哈伊尔", "索菲娅", "阿廖沙", "卡佳", "列夫", "安雅", "尼古拉", "叶莲娜", "达莎", "谢尔盖",
  "隼人", "凛", "真司", "葵", "莲", "美咲", "悠真", "千夏", "拓海", "遥", "冬马", "纱夜",
  "贤宇", "智恩", "泰俊", "敏书", "道允", "瑞妍", "俊浩", "荷娜", "成民", "宥真",
  "阿米尔", "莱拉", "萨米尔", "娜迪娅", "卡里姆", "扎拉", "法里德", "萨娜", "哈桑", "玛雅",
  "迭戈", "露西亚", "马特奥", "伊莎贝尔", "卡米拉", "圣地亚哥", "瓦伦蒂娜", "拉斐尔", "伊内斯", "托马斯",
  "夸梅", "阿玛拉", "科菲", "扎uri", "恩佐", "阿约", "萨迪亚", "马利克", "妮娅", "塔里克",
];

export const nameProfiles = [
  {
    style: "中文",
    weight: 18,
    surnames: ["林", "邵", "秦", "陆", "石", "顾", "沈", "许", "周", "韩", "赵", "魏", "苏", "唐", "纪", "叶", "白", "江", "谢", "程"],
    given: ["烬", "岚", "砾", "鸦", "泉", "遥", "燃", "祈", "昼", "隼", "澜", "阙", "砚", "寒", "檀", "泊舟", "听雪", "照夜", "临川", "无咎"],
    order: "surname-first",
    joiner: "",
  },
  {
    style: "欧美",
    weight: 16,
    given: ["Victor", "Nora", "Hesson", "Mia", "Ayla", "Leon", "Eve", "Max", "Otto", "Sera", "Kane", "Lina", "Ronan", "Vera", "Aiden", "Carlo"],
    surnames: ["Voss", "Graves", "Rook", "Mercer", "Hayes", "Cross", "Blackwell", "Ashford", "Vale", "Sloane", "Keller", "Marlowe"],
    order: "given-first",
    joiner: " ",
  },
  {
    style: "东欧",
    weight: 12,
    given: ["Ivan", "Natasha", "Mikhail", "Sofia", "Alyosha", "Katya", "Lev", "Anya", "Nikolai", "Yelena", "Dasha", "Sergei"],
    surnames: ["Volkov", "Morozov", "Sokolov", "Petrov", "Kovalenko", "Orlov", "Belova", "Romanenko", "Zaitsev", "Dragunov"],
    order: "given-first",
    joiner: " ",
  },
  {
    style: "日本",
    weight: 11,
    surnames: ["黑泽", "神谷", "雨宫", "七濑", "白石", "橘", "雾岛", "早川", "东云", "月岛"],
    given: ["隼人", "凛", "真司", "葵", "莲", "美咲", "悠真", "千夏", "拓海", "遥", "冬马", "纱夜"],
    order: "surname-first",
    joiner: " ",
  },
  {
    style: "韩国",
    weight: 10,
    surnames: ["韩", "金", "朴", "崔", "姜", "尹", "徐", "柳", "文", "申"],
    given: ["贤宇", "智恩", "泰俊", "敏书", "道允", "瑞妍", "俊浩", "荷娜", "成民", "宥真"],
    order: "surname-first",
    joiner: "",
  },
  {
    style: "中东",
    weight: 10,
    given: ["Amir", "Layla", "Samir", "Nadia", "Karim", "Zara", "Farid", "Sana", "Hassan", "Maya"],
    surnames: ["al-Hadi", "Qadir", "Nasser", "Rahman", "Sayegh", "Darwish", "Azar", "Khalil", "Mansour", "Barakat"],
    order: "given-first",
    joiner: " ",
  },
  {
    style: "拉美",
    weight: 10,
    given: ["Diego", "Lucia", "Mateo", "Isabel", "Camila", "Santiago", "Valentina", "Rafael", "Ines", "Tomas"],
    surnames: ["Vega", "Rojas", "Silva", "Navarro", "Cruz", "Herrera", "Mendoza", "Ortega", "Santos", "Ibarra"],
    order: "given-first",
    joiner: " ",
  },
  {
    style: "非洲",
    weight: 9,
    given: ["Kwame", "Amara", "Kofi", "Zuri", "Enzo", "Ayo", "Sadia", "Malik", "Nia", "Tariq"],
    surnames: ["Okonkwo", "Mensah", "Diop", "Keita", "Ndlovu", "Bello", "Traore", "Abebe", "Kamara", "Diallo"],
    order: "given-first",
    joiner: " ",
  },
  {
    style: "单名",
    weight: 4,
    given: ["凛", "遥", "莲", "葵", "列夫", "安雅", "扎拉", "科菲", "恩佐", "妮娅"],
    surnames: [""],
    order: "single",
    joiner: "",
  },
];

export const epithetTemplates = [
  "在{place}{verb}的{role}",
  "把{object}{verb}进{container}的{role}",
  "{number}个{adjective}{role}",
  "被{force}{verb}的{role}",
  "{place}的{adjective}{object}",
  "向{force}讨债的{role}",
  "带着{object}回来的{role}",
  "不会忘记{object}的{role}",
  "{adjective}{force}的{role}",
  "听见{place}在{verb}的人",
  "卖掉{object}之后活下来的{role}",
  "把{force}写进遗言的{role}",
];

export const epithetPlaces = [
  "雨夜", "盐湖", "矿井", "旧月台", "防线尽头", "低轨残骸", "黑市后门", "地下诊所", "断桥", "无灯街区", "废弃教堂", "风暴眼",
];

export const epithetVerbs = [
  "听钟", "数弹壳", "缝合坏消息", "等待撤离", "偷走名字", "擦掉血迹", "梦见火光", "归还账单", "咀嚼沉默", "修理谎言", "点燃收据", "清点尸袋",
];

export const epithetRoles = [
  "人", "孩子", "医生", "逃兵", "证人", "猎手", "搬运工", "祈祷者", "清道夫", "债务人", "记录员", "无名者", "守夜人", "幸存者",
];

export const epithetObjects = [
  "断裂的枪", "坏掉的钟", "一枚弹壳", "潮湿地图", "过期药片", "空罐头", "未寄出的信", "烧焦绷带", "假身份", "红色收据", "旧军牌", "半句遗言",
];

export const epithetContainers = [
  "绷带", "账本", "雨衣", "弹匣", "棺材", "黑箱", "医嘱", "合同", "旧地图", "酒杯", "防毒面具", "祷词",
];

export const epithetForces = [
  "战争", "账单", "月亮", "黑市", "旧神", "撤离点", "雨", "电台", "医院", "工会", "债主", "空弹匣",
];

export const epithetAdjectives = [
  "灰色", "破碎", "沉默", "冷冽", "失眠", "燃烧", "空心", "迟到", "带刺", "潮湿", "过期", "逆光", "低温", "无名", "盐渍", "褪色",
];

export const epithetNumbers = ["第七", "最后一", "第三", "零号", "第十三", "唯一", "多余的", "迟到的", "被遗漏的", "未登记的"];
export const shortEpithetAdjectives = [
  "坏账", "断线", "空弹", "冷笑", "欠薪", "夜班", "灰烬", "逃票", "黑箱", "过期", "低温", "裂镜", "废墟", "失眠", "赊账", "回声",
];
export const shortEpithetNouns = [
  "医生", "债主", "证人", "守夜人", "账房", "逃兵", "猎手", "搬运工", "祈祷机", "清道夫", "记录员", "替身", "遗嘱", "枪匠", "酒保", "黑函",
];

export const callsigns = epithetRoles;
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
